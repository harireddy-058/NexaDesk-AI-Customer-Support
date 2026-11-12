
const express = require("express");
const mongoose = require("mongoose");

const KnowledgeDocument = require("../models/KnowledgeDocument");
const { protect, authorize } = require("../middleware/auth");
const createAuditLog = require("../utils/audit");
const { generateAnswer } = require("../services/ai");

const router = express.Router();

router.use(protect);

/* =====================================================
   GET KNOWLEDGE ARTICLES
   GET /api/knowledge
===================================================== */

router.get("/", async (req, res, next) => {
    try {
        const documents = await KnowledgeDocument.find({
            active: true
        })
            .populate("createdBy", "name email")
            .sort({ updatedAt: -1 });

        res.json(documents);
    } catch (error) {
        next(error);
    }
});

/* =====================================================
   CREATE KNOWLEDGE ARTICLE
   POST /api/knowledge
===================================================== */

router.post(
    "/",
    authorize("admin", "manager"),
    async (req, res, next) => {
        try {
            const {
                title,
                category,
                content
            } = req.body;

            if (!title || !content) {
                return res.status(400).json({
                    message: "Article title and content are required."
                });
            }

            const document = await KnowledgeDocument.create({
                title: title.trim(),
                category: category?.trim() || "General",
                content: content.trim(),
                createdBy: req.user._id,
                updatedBy: req.user._id
            });

            await createAuditLog({
                user: req.user._id,
                action: "KNOWLEDGE_CREATED",
                resource: "KnowledgeDocument",
                resourceId: document._id.toString(),
                ipAddress: req.ip
            });

            res.status(201).json({
                message: "Knowledge article created successfully.",
                document
            });
        } catch (error) {
            next(error);
        }
    }
);

/* =====================================================
   ASK AI
   POST /api/knowledge/ask
===================================================== */

router.post("/ask", async (req, res, next) => {
    try {
        const { question } = req.body;

        if (!question || !question.trim()) {
            return res.status(400).json({
                message: "Please enter a question."
            });
        }

        const documents = await KnowledgeDocument.find({
            active: true
        }).limit(100);

        const result = await generateAnswer(
            question.trim(),
            documents
        );

        res.json({
            answer: result.answer,
            sources: result.sources || [],
            provider: result.provider || "local-knowledge"
        });
    } catch (error) {
        next(error);
    }
});

/* =====================================================
   UPDATE KNOWLEDGE ARTICLE
   PATCH /api/knowledge/:id
===================================================== */

router.patch(
    "/:id",
    authorize("admin", "manager"),
    async (req, res, next) => {
        try {
            const { id } = req.params;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    message: "Invalid article ID."
                });
            }

            const document = await KnowledgeDocument.findById(id);

            if (!document || !document.active) {
                return res.status(404).json({
                    message: "Knowledge article not found."
                });
            }

            const {
                title,
                category,
                content
            } = req.body;

            if (title !== undefined) {
                document.title = title.trim();
            }

            if (category !== undefined) {
                document.category = category.trim();
            }

            if (content !== undefined) {
                document.content = content.trim();
            }

            document.updatedBy = req.user._id;

            await document.save();

            await createAuditLog({
                user: req.user._id,
                action: "KNOWLEDGE_UPDATED",
                resource: "KnowledgeDocument",
                resourceId: document._id.toString(),
                ipAddress: req.ip
            });

            res.json({
                message: "Knowledge article updated successfully.",
                document
            });
        } catch (error) {
            next(error);
        }
    }
);

/* =====================================================
   DELETE KNOWLEDGE ARTICLE
   DELETE /api/knowledge/:id
===================================================== */

router.delete(
    "/:id",
    authorize("admin", "manager"),
    async (req, res, next) => {
        try {
            const { id } = req.params;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    message: "Invalid article ID."
                });
            }

            const document = await KnowledgeDocument.findById(id);

            if (!document || !document.active) {
                return res.status(404).json({
                    message: "Knowledge article not found."
                });
            }

            document.active = false;
            document.updatedBy = req.user._id;

            await document.save();

            await createAuditLog({
                user: req.user._id,
                action: "KNOWLEDGE_DELETED",
                resource: "KnowledgeDocument",
                resourceId: document._id.toString(),
                ipAddress: req.ip
            });

            res.json({
                message: "Knowledge article deleted successfully."
            });
        } catch (error) {
            next(error);
        }
    }
);

module.exports = router;
