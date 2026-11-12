
require("dotenv").config();

const express = require("express");
const http = require("http");
const path = require("path");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const User = require("./models/User");

const authRoutes = require("./routes/auth");
const ticketRoutes = require("./routes/tickets");
const knowledgeRoutes = require("./routes/knowledge");
const teamRoutes = require("./routes/team");

const {
    notFound,
    errorHandler
} = require("./middleware/errors");

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5002;

const CLIENT_ORIGIN =
    process.env.CLIENT_ORIGIN || "http://localhost:5002";

/* =====================================================
   SOCKET.IO
===================================================== */

const io = new Server(server, {
    cors: {
        origin: CLIENT_ORIGIN,
        methods: ["GET", "POST", "PATCH", "DELETE"]
    }
});

app.set("io", io);

/* Authenticate Socket.IO connections */

io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth?.token;

        if (!token) {
            return next(new Error("Authentication required."));
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        const user = await User.findById(decoded.id);

        if (!user || !user.active) {
            return next(new Error("Invalid user session."));
        }

        socket.user = {
            id: user._id.toString(),
            name: user.name,
            role: user.role
        };

        next();
    } catch (error) {
        next(new Error("Invalid or expired token."));
    }
});

io.on("connection", socket => {
    console.log(
        `Socket connected: ${socket.user.name} (${socket.user.role})`
    );

    socket.on("disconnect", () => {
        console.log(`Socket disconnected: ${socket.user.name}`);
    });
});

/* =====================================================
   GLOBAL MIDDLEWARE
===================================================== */

app.use(cors({
    origin: CLIENT_ORIGIN,
    credentials: true
}));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

/* =====================================================
   API RATE LIMITING
===================================================== */

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
        message: "Too many authentication attempts. Please try again later."
    }
});

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

/* =====================================================
   HEALTH CHECK
===================================================== */

app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        service: "NexaDesk API",
        environment: process.env.NODE_ENV || "development",
        timestamp: new Date().toISOString()
    });
});

/* =====================================================
   API ROUTES
===================================================== */

app.use("/api/auth", authRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/knowledge", knowledgeRoutes);
app.use("/api/team", teamRoutes);

/* =====================================================
   FRONTEND STATIC FILES
===================================================== */

// Frontend files are stored in the project root:
// index.html, styles.css and app.js

const frontendPath = path.resolve(__dirname, "../../");

app.use(express.static(frontendPath, {
    index: "index.html",
    dotfiles: "ignore"
}));

app.get("/", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
});

/* =====================================================
   ERROR HANDLING
===================================================== */

app.use(notFound);
app.use(errorHandler);

/* =====================================================
   DATABASE AND SERVER STARTUP
===================================================== */

const startServer = async () => {
    try {
        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is missing from server/.env");
        }

        if (process.env.JWT_SECRET.length < 32) {
            throw new Error("JWT_SECRET must contain at least 32 characters.");
        }

        await connectDB();

        server.listen(PORT, () => {
            console.log("--------------------------------------");
            console.log("       NEXADESK API STARTED");
            console.log("--------------------------------------");
            console.log(`Server: http://localhost:${PORT}`);
            console.log(`Health: http://localhost:${PORT}/api/health`);
            console.log(`Frontend: http://localhost:${PORT}`);
            console.log("--------------------------------------");
        });

    } catch (error) {
        console.error("Server startup failed:", error.message);
        process.exit(1);
    }
};

startServer();

/* =====================================================
   GRACEFUL SHUTDOWN
===================================================== */

const shutdown = async () => {
    console.log("Shutting down NexaDesk...");

    io.close();

    server.close(async () => {
        const mongoose = require("mongoose");

        await mongoose.disconnect();

        process.exit(0);
    });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
