
const mongoose = require("mongoose");

const replySchema = new mongoose.Schema(
    {
        message: {
            type: String,
            required: true,
            trim: true
        },

        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },

        senderName: {
            type: String,
            default: "Support Agent"
        },

        senderRole: {
            type: String,
            enum: ["admin", "manager", "agent", "customer"],
            default: "agent"
        },

        createdAt: {
            type: Date,
            default: Date.now
        }
    },
    { _id: true }
);

const ticketSchema = new mongoose.Schema(
    {
        ticketNumber: {
            type: String,
            unique: true,
            index: true
        },

        customerName: {
            type: String,
            required: true,
            trim: true
        },

        customerEmail: {
            type: String,
            required: true,
            lowercase: true,
            trim: true
        },

        subject: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            required: true,
            trim: true
        },

        status: {
            type: String,
            enum: ["Open", "Pending", "Resolved", "Closed"],
            default: "Open"
        },

        priority: {
            type: String,
            enum: ["Low", "Medium", "High", "Urgent"],
            default: "Medium"
        },

        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        replies: {
            type: [replySchema],
            default: []
        },

        tags: {
            type: [String],
            default: []
        }
    },
    {
        timestamps: true
    }
);

ticketSchema.pre("validate", function () {
    if (!this.ticketNumber) {
        const randomPart = Math.random()
            .toString(36)
            .slice(2, 7)
            .toUpperCase();

        this.ticketNumber =
            `NX-${Date.now()}-${randomPart}`;
    }
});

module.exports = mongoose.model("Ticket", ticketSchema);
