
const express = require("express");
const mongoose = require("mongoose");

const Ticket = require("../models/Ticket");
const User = require("../models/User");

const { protect, authorize } = require("../middleware/auth");
const createAuditLog = require("../utils/audit");

const router = express.Router();

router.use(protect);

/* =====================================================
   HELPERS
===================================================== */

const isValidId = (id) => {
    return mongoose.Types.ObjectId.isValid(id);
};

const emitTicketEvent = (req, event, payload) => {
    const io = req.app.get("io");

    if (io) {
        io.emit(event, payload);
    }
};

const populateTicket = (query) => {
    return query
        .populate("assignedTo", "name email role")
        .populate("createdBy", "name email")
        .populate("replies.sender", "name email role");
};

const escapeRegex = (value) => {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

/* =====================================================
   GET ALL TICKETS
   GET /api/tickets
===================================================== */

router.get("/", async (req, res, next) => {
    try {
        const {
            status,
            priority,
            search,
            assignedTo
        } = req.query;

        const filter = {};

        if (status && status !== "all") {
            filter.status = status;
        }

        if (priority && priority !== "all") {
            filter.priority = priority;
        }

        if (assignedTo && assignedTo !== "all") {
            if (!isValidId(assignedTo)) {
                return res.status(400).json({
                    message: "Invalid assigned user ID."
                });
            }

            filter.assignedTo = assignedTo;
        }

        if (search && search.trim()) {
            const regex = new RegExp(
                escapeRegex(search.trim()),
                "i"
            );

            filter.$or = [
                { ticketNumber: regex },
                { subject: regex },
                { customerName: regex },
                { customerEmail: regex }
            ];
        }

        const tickets = await populateTicket(
            Ticket.find(filter).sort({ updatedAt: -1 })
        );

        res.json(tickets);

    } catch (error) {
        next(error);
    }
});

/* =====================================================
   CREATE TICKET
   POST /api/tickets
===================================================== */

router.post("/", async (req, res, next) => {
    try {
        const {
            customerName,
            customerEmail,
            subject,
            description,
            priority,
            assignedTo,
            tags
        } = req.body;

        if (
            !customerName?.trim() ||
            !customerEmail?.trim() ||
            !subject?.trim() ||
            !description?.trim()
        ) {
            return res.status(400).json({
                message:
                    "Customer name, email, subject and description are required."
            });
        }

        const validPriorities = [
            "Low",
            "Medium",
            "High",
            "Urgent"
        ];

        const selectedPriority = priority || "Medium";

        if (!validPriorities.includes(selectedPriority)) {
            return res.status(400).json({
                message: "Invalid ticket priority."
            });
        }

        let assignedUser = null;

        if (assignedTo) {
            if (!isValidId(assignedTo)) {
                return res.status(400).json({
                    message: "Invalid assigned user ID."
                });
            }

            assignedUser = await User.findOne({
                _id: assignedTo,
                active: true
            });

            if (!assignedUser) {
                return res.status(404).json({
                    message: "Assigned team member not found."
                });
            }
        }

        const ticket = await Ticket.create({
            customerName: customerName.trim(),
            customerEmail: customerEmail.trim().toLowerCase(),
            subject: subject.trim(),
            description: description.trim(),
            priority: selectedPriority,
            status: "Open",
            assignedTo: assignedUser?._id || null,
            createdBy: req.user._id,
            tags: Array.isArray(tags) ? tags : []
        });

        const populatedTicket = await populateTicket(
            Ticket.findById(ticket._id)
        );

        await createAuditLog({
            user: req.user._id,
            action: "TICKET_CREATED",
            resource: "Ticket",
            resourceId: ticket._id.toString(),
            details: {
                ticketNumber: ticket.ticketNumber,
                subject: ticket.subject
            },
            ipAddress: req.ip
        });

        emitTicketEvent(
            req,
            "ticket:created",
            populatedTicket
        );

        res.status(201).json({
            message: "Ticket created successfully.",
            ticket: populatedTicket
        });

    } catch (error) {
        next(error);
    }
});

/* =====================================================
   GET SINGLE TICKET
   GET /api/tickets/:id
===================================================== */

router.get("/:id", async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return res.status(400).json({
                message: "Invalid ticket ID."
            });
        }

        const ticket = await populateTicket(
            Ticket.findById(id)
        );

        if (!ticket) {
            return res.status(404).json({
                message: "Ticket not found."
            });
        }

        res.json({
            ticket
        });

    } catch (error) {
        next(error);
    }
});

/* =====================================================
   UPDATE TICKET
   PATCH /api/tickets/:id

   Uses findByIdAndUpdate instead of document.save().
   This prevents unrelated required fields from causing
   validation failures during partial updates.
===================================================== */

router.patch("/:id", async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return res.status(400).json({
                message: "Invalid ticket ID."
            });
        }

        const existingTicket = await Ticket.findById(id);

        if (!existingTicket) {
            return res.status(404).json({
                message: "Ticket not found."
            });
        }

        const {
            status,
            priority,
            assignedTo,
            subject,
            description
        } = req.body;

        const validStatuses = [
            "Open",
            "Pending",
            "Resolved",
            "Closed"
        ];

        const validPriorities = [
            "Low",
            "Medium",
            "High",
            "Urgent"
        ];

        const updates = {};

        /* Update status */

        if (status !== undefined) {
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    message: "Invalid ticket status."
                });
            }

            updates.status = status;
        }

        /* Update priority */

        if (priority !== undefined) {
            if (!validPriorities.includes(priority)) {
                return res.status(400).json({
                    message: "Invalid ticket priority."
                });
            }

            updates.priority = priority;
        }

        /* Update subject */

        if (subject !== undefined) {
            if (
                typeof subject !== "string" ||
                !subject.trim()
            ) {
                return res.status(400).json({
                    message: "Subject cannot be empty."
                });
            }

            updates.subject = subject.trim();
        }

        /* Update description */

        if (description !== undefined) {
            if (
                typeof description !== "string" ||
                !description.trim()
            ) {
                return res.status(400).json({
                    message: "Description cannot be empty."
                });
            }

            updates.description = description.trim();
        }

        /* Update assigned agent */

        if (assignedTo !== undefined) {
            if (assignedTo === null || assignedTo === "") {
                updates.assignedTo = null;
            } else {
                if (!isValidId(assignedTo)) {
                    return res.status(400).json({
                        message: "Invalid assigned user ID."
                    });
                }

                const assignedUser = await User.findOne({
                    _id: assignedTo,
                    active: true
                });

                if (!assignedUser) {
                    return res.status(404).json({
                        message: "Assigned team member not found."
                    });
                }

                updates.assignedTo = assignedUser._id;
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                message: "No valid ticket updates were provided."
            });
        }

        const updatedTicket = await populateTicket(
            Ticket.findByIdAndUpdate(
                id,
                {
                    $set: updates
                },
                {
                    new: true,
                    runValidators: true
                }
            )
        );

        await createAuditLog({
            user: req.user._id,
            action: "TICKET_UPDATED",
            resource: "Ticket",
            resourceId: id,
            details: updates,
            ipAddress: req.ip
        });

        emitTicketEvent(
            req,
            "ticket:updated",
            updatedTicket
        );

        res.json({
            message: "Ticket updated successfully.",
            ticket: updatedTicket
        });

    } catch (error) {
        next(error);
    }
});

/* =====================================================
   ADD REPLY
   POST /api/tickets/:id/replies
===================================================== */

router.post("/:id/replies", async (req, res, next) => {
    try {
        const { id } = req.params;
        const { message } = req.body;

        if (!isValidId(id)) {
            return res.status(400).json({
                message: "Invalid ticket ID."
            });
        }

        if (
            typeof message !== "string" ||
            !message.trim()
        ) {
            return res.status(400).json({
                message: "Reply message is required."
            });
        }

        const ticket = await Ticket.findById(id);

        if (!ticket) {
            return res.status(404).json({
                message: "Ticket not found."
            });
        }

        ticket.replies.push({
            message: message.trim(),
            sender: req.user._id,
            senderName: req.user.name,
            senderRole: req.user.role
        });

        await ticket.save();

        const updatedTicket = await populateTicket(
            Ticket.findById(id)
        );

        await createAuditLog({
            user: req.user._id,
            action: "TICKET_REPLY_ADDED",
            resource: "Ticket",
            resourceId: id,
            details: {
                sender: req.user.name
            },
            ipAddress: req.ip
        });

        emitTicketEvent(
            req,
            "ticket:updated",
            updatedTicket
        );

        res.status(201).json({
            message: "Reply added successfully.",
            ticket: updatedTicket
        });

    } catch (error) {
        next(error);
    }
});

/* =====================================================
   DELETE TICKET
   DELETE /api/tickets/:id

   Admin and manager only.
===================================================== */

router.delete(
    "/:id",
    authorize("admin", "manager"),
    async (req, res, next) => {
        try {
            const { id } = req.params;

            if (!isValidId(id)) {
                return res.status(400).json({
                    message: "Invalid ticket ID."
                });
            }

            const ticket = await Ticket.findById(id);

            if (!ticket) {
                return res.status(404).json({
                    message: "Ticket not found."
                });
            }

            await createAuditLog({
                user: req.user._id,
                action: "TICKET_DELETED",
                resource: "Ticket",
                resourceId: id,
                details: {
                    ticketNumber: ticket.ticketNumber,
                    subject: ticket.subject
                },
                ipAddress: req.ip
            });

            await ticket.deleteOne();

            emitTicketEvent(req, "ticket:deleted", {
                id: ticket._id.toString()
            });

            res.json({
                message: "Ticket deleted successfully."
            });

        } catch (error) {
            next(error);
        }
    }
);

module.exports = router;
