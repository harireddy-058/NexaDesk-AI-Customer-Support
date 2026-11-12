
const express = require("express");

const User = require("../models/User");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(protect);

/* GET TEAM MEMBERS */

router.get("/", authorize("admin", "manager"), async (req, res, next) => {
    try {
        const users = await User.find()
            .select("name email role active createdAt")
            .sort({ createdAt: -1 });

        res.json(users);
    } catch (error) {
        next(error);
    }
});

/* UPDATE TEAM MEMBER ROLE */

router.patch(
    "/:id/role",
    authorize("admin"),
    async (req, res, next) => {
        try {
            const { role } = req.body;

            const allowedRoles = [
                "admin",
                "manager",
                "agent"
            ];

            if (!allowedRoles.includes(role)) {
                return res.status(400).json({
                    message: "Invalid team member role."
                });
            }

            const user = await User.findById(req.params.id);

            if (!user) {
                return res.status(404).json({
                    message: "Team member not found."
                });
            }

            user.role = role;

            await user.save();

            res.json({
                message: "Team member role updated.",
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    active: user.active
                }
            });
        } catch (error) {
            next(error);
        }
    }
);

/* ACTIVATE OR DEACTIVATE TEAM MEMBER */

router.patch(
    "/:id/status",
    authorize("admin"),
    async (req, res, next) => {
        try {
            const { active } = req.body;

            if (typeof active !== "boolean") {
                return res.status(400).json({
                    message: "Active must be true or false."
                });
            }

            if (req.params.id === req.user._id.toString()) {
                return res.status(400).json({
                    message: "You cannot deactivate your own account."
                });
            }

            const user = await User.findByIdAndUpdate(
                req.params.id,
                { active },
                {
                    new: true,
                    runValidators: true
                }
            ).select("name email role active");

            if (!user) {
                return res.status(404).json({
                    message: "Team member not found."
                });
            }

            res.json({
                message: "Team member status updated.",
                user
            });
        } catch (error) {
            next(error);
        }
    }
);

module.exports = router;
