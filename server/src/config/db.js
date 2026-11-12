
const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        const connection = await mongoose.connect(
            process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/nexadesk"
        );

        console.log(
            `MongoDB connected: ${connection.connection.host}`
        );

        return connection;
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        process.exit(1);
    }
};

module.exports = connectDB;
