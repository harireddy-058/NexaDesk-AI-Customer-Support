
const AuditLog = require("../models/AuditLog");

const createAuditLog = async ({
    user,
    action,
    resource = "",
    resourceId = "",
    details = {},
    ipAddress = ""
}) => {
    try {
        await AuditLog.create({
            user: user?._id || user || null,
            action,
            resource,
            resourceId,
            details,
            ipAddress
        });
    } catch (error) {
        console.error("Audit log error:", error.message);
    }
};

module.exports = createAuditLog;
