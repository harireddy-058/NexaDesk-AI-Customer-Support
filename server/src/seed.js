
require("dotenv").config();

const mongoose = require("mongoose");

const connectDB = require("./config/db");

const User = require("./models/User");
const Ticket = require("./models/Ticket");
const KnowledgeDocument = require("./models/KnowledgeDocument");

const seedDatabase = async () => {
    try {
        await connectDB();

        console.log("Starting NexaDesk database seeding...");

        /* =============================================
           ADMIN ACCOUNT
        ============================================= */

        const adminEmail = "admin@nexadesk.local";

        let admin = await User.findOne({
            email: adminEmail
        });

        if (!admin) {
            admin = await User.create({
                name: "NexaDesk Administrator",
                email: adminEmail,
                password: process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!",
                role: "admin",
                active: true
            });

            console.log("Admin account created.");
        } else {
            console.log("Admin account already exists.");
        }

        /* =============================================
           DEMO MANAGER AND AGENT
        ============================================= */

        let manager = await User.findOne({
            email: "manager@nexadesk.local"
        });

        if (!manager) {
            manager = await User.create({
                name: "Alex Morgan",
                email: "manager@nexadesk.local",
                password: process.env.SEED_MANAGER_PASSWORD || "ChangeMe123!",
                role: "manager",
                active: true
            });

            console.log("Demo manager created.");
        }

        let agent = await User.findOne({
            email: "agent@nexadesk.local"
        });

        if (!agent) {
            agent = await User.create({
                name: "Jordan Lee",
                email: "agent@nexadesk.local",
                password: process.env.SEED_AGENT_PASSWORD || "ChangeMe123!",
                role: "agent",
                active: true
            });

            console.log("Demo agent created.");
        }

        /* =============================================
           DEMO TICKETS
        ============================================= */

        const demoTickets = [
            {
                ticketNumber: "NX-SEED-1001",
                customerName: "Sarah Johnson",
                customerEmail: "sarah@example.com",
                subject: "Order delivery is delayed",
                description:
                    "My order has not arrived yet. Could you please check the delivery status?",
                status: "Open",
                priority: "High",
                assignedTo: agent._id,
                createdBy: admin._id,
                tags: ["delivery", "order"]
            },
            {
                ticketNumber: "NX-SEED-1002",
                customerName: "Michael Brown",
                customerEmail: "michael@example.com",
                subject: "Request for a product refund",
                description:
                    "I received the wrong product and would like to know how to request a refund.",
                status: "Pending",
                priority: "Urgent",
                assignedTo: manager._id,
                createdBy: admin._id,
                tags: ["refund", "product"]
            },
            {
                ticketNumber: "NX-SEED-1003",
                customerName: "Emily Davis",
                customerEmail: "emily@example.com",
                subject: "Unable to update account details",
                description:
                    "I am unable to update my account information from the customer portal.",
                status: "Resolved",
                priority: "Medium",
                assignedTo: agent._id,
                createdBy: admin._id,
                tags: ["account", "technical"]
            }
        ];

        for (const ticket of demoTickets) {
            await Ticket.updateOne(
                { ticketNumber: ticket.ticketNumber },
                { $setOnInsert: ticket },
                { upsert: true }
            );
        }

        console.log("Demo tickets checked.");

        /* =============================================
           KNOWLEDGE ARTICLES
        ============================================= */

        const articles = [
            {
                title: "Customer Refund Process",
                category: "Billing",
                content:
                    "Customers should submit a refund request with their order number and reason for the request. The support team must verify the order and review the applicable refund policy before confirming eligibility. Do not promise a refund until the request has been approved."
            },
            {
                title: "Delayed Order Support",
                category: "Delivery",
                content:
                    "When a customer reports a delayed order, first verify the order number and delivery status. Check the latest available tracking information. Explain the verified status clearly and escalate the case to the delivery team when required. Do not invent delivery dates."
            },
            {
                title: "Handling Customer Complaints",
                category: "Customer Service",
                content:
                    "Listen carefully to the customer's concern, acknowledge the inconvenience, and communicate politely. Collect relevant details, investigate the issue, and provide the next appropriate step. Escalate unresolved or sensitive complaints to a manager."
            }
        ];

        for (const article of articles) {
            await KnowledgeDocument.updateOne(
                { title: article.title },
                {
                    $setOnInsert: {
                        ...article,
                        createdBy: admin._id,
                        updatedBy: admin._id,
                        active: true
                    }
                },
                { upsert: true }
            );
        }

        console.log("Knowledge articles checked.");

        console.log("--------------------------------------");
        console.log("NEXADESK SEED COMPLETED");
        console.log("--------------------------------------");
        console.log("Admin:   admin@nexadesk.local");
        console.log("Manager: manager@nexadesk.local");
        console.log("Agent:   agent@nexadesk.local");
        console.log("Use the passwords configured in server/.env.");
        console.log("--------------------------------------");

    } catch (error) {
        console.error("Database seeding failed:", error);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
};

seedDatabase();
