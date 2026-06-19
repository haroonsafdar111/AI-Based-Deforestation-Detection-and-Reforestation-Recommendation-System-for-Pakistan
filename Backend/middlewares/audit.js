const AuditLog = require('../models/AuditLog');

const logAuditAction = (action) => {
    return async (req, res, next) => {
        // We might want to log AFTER the response is sent or if successful
        res.on('finish', async () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                try {
                    await AuditLog.create({
                        userId: req.user ? req.user._id : null,
                        action: action,
                        details: {
                            method: req.method,
                            url: req.originalUrl,
                            body: req.body, // Be careful with sensitive data in production
                            params: req.params,
                            query: req.query,
                            statusCode: res.statusCode
                        },
                        ipAddress: req.ip
                    });
                } catch (err) {
                    console.error('Audit logging failed:', err);
                }
            }
        });
        next();
    };
};

module.exports = { logAuditAction };
