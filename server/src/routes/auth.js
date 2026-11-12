
const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { protect } = require("../middleware/auth");
const createAuditLog = require("../utils/audit");

const router = express.Router();

const generateToken = (userId) => {
    return jwt.sign(
        { id: userId },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || "1d"
        }
    );
};

const publicUser = (user) => ({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active
});

/* REGISTER */

router.post("/register", async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email and password are required."
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must contain at least 8 characters."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await User.findOne({
            email: normalizedEmail
        });

        if (existingUser) {
            return res.status(409).json({
                message: "An account with this email already exists."
            });
        }

        // Public registrations always receive the agent role.
        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password,
            role: "agent"
        });

        const token = generateToken(user._id);

        await createAuditLog({
            user: user._id,
            action: "USER_REGISTERED",
            resource: "User",
            resourceId: user._id.toString(),
            ipAddress: req.ip
        });

        res.status(201).json({
            message: "Account created successfully.",
            token,
            user: publicUser(user)
        });
    } catch (error) {
        next(error);
    }
});

/* LOGIN */

router.post("/login", async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required."
            });
        }

        const user = await User.findOne({
            email: email.trim().toLowerCase()
        }).select("+password");

        if (!user || !user.active) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        const passwordMatches = await user.comparePassword(password);

        if (!passwordMatches) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        const token = generateToken(user._id);

        await createAuditLog({
            user: user._id,
            action: "USER_LOGIN",
            resource: "User",
            resourceId: user._id.toString(),
            ipAddress: req.ip
        });

        res.json({
            message: "Login successful.",
            token,
            user: publicUser(user)
        });
    } catch (error) {
        next(error);
    }
});

/* CURRENT USER */

router.get("/me", protect, (req, res) => {
    res.json({
        user: publicUser(req.user)
    });
});

/* UPDATE PROFILE */

router.patch("/profile", protect, async (req, res, next) => {
    try {
        const { name } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                message: "A valid name is required."
            });
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            {
                name: name.trim()
            },
            {
                new: true,
                runValidators: true
            }
        );

        await createAuditLog({
            user: user._id,
            action: "PROFILE_UPDATED",
            resource: "User",
            resourceId: user._id.toString(),
            ipAddress: req.ip
        });

        res.json({
            message: "Profile updated successfully.",
            user: publicUser(user)
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
