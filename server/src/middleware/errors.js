
const notFound = (req, res, next) => {
    res.status(404).json({
        message: `Route not found: ${req.method} ${req.originalUrl}`
    });
};

const errorHandler = (err, req, res, next) => {
    console.error(err.stack || err);

    let statusCode = err.statusCode || res.statusCode || 500;

    if (statusCode < 400) {
        statusCode = 500;
    }

    if (err.name === "ValidationError") {
        statusCode = 400;
    }

    if (err.name === "CastError") {
        statusCode = 400;
    }

    if (err.code === 11000) {
        statusCode = 409;
    }

    res.status(statusCode).json({
        message:
            err.code === 11000
                ? "A record with this value already exists."
                : err.message || "Internal server error",

        ...(process.env.NODE_ENV === "development" && {
            stack: err.stack
        })
    });
};

module.exports = {
    notFound,
    errorHandler
};
