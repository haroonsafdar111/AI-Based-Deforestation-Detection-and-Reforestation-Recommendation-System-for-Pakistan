const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false // Some actions might be anonymous or system-level
    },
    action: {
        type: String,
        required: true
    },
    details: {
        type: Object,
        required: true
    },
    ipAddress: {
        type: String
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    collection: 'audit_logs'
});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
module.exports = AuditLog;
