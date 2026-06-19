const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const logger = require('./utils/logger');

const { apiLimiter } = require('./middlewares/rateLimiter');
const performanceMiddleware = require('./middlewares/performance');

// Load environment variables
dotenv.config();

const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Performance monitoring middleware
app.use(performanceMiddleware);

// Data sanitization against NoSQL query injection
// Fix for "Cannot set property query of #<IncomingMessage>" error
app.use((req, res, next) => {
    // This makes req.query writable for mongoSanitize
    Object.defineProperty(req, 'query', {
        writable: true,
        enumerable: true,
        configurable: true,
        value: req.query
    });
    next();
});
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(hpp());

app.use(apiLimiter);
app.use(express.urlencoded({ extended: true }));

// Routes
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const dataRoutes = require('./routes/dataRoutes');
const mlRoutes = require('./routes/mlRoutes');
const reportRoutes = require('./routes/reportRoutes');
const regionRoutes = require('./routes/regionRoutes');
const riskZoneRoutes = require('./routes/riskZoneRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const jobRoutes = require('./routes/jobRoutes');
const monitoringRoutes = require('./routes/monitoringRoutes');

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/data', dataRoutes);
app.use('/api/v1/ml', mlRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/regions', regionRoutes);
app.use('/api/v1/risk-zones', riskZoneRoutes);
app.use('/api/v1/feedback', feedbackRoutes);
app.use('/api/v1/jobs', jobRoutes);
app.use('/api/v1/monitoring', monitoringRoutes);

app.get('/api/v1/health', (req, res) => {
    const performanceMonitor = require('./services/performanceMonitor');
    const healthStatus = performanceMonitor.getHealthStatus();

    res.json({
        status: healthStatus.status,
        timestamp: healthStatus.timestamp,
        uptime: healthStatus.uptime,
        issues: healthStatus.issues,
        memoryUsage: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0'
    });
});

app.get('/', (req, res) => {
    res.json({ message: 'Welcome to ForestVision API' });
});

// 404 Handler for undefined routes
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: `Route not found - ${req.originalUrl}`
    });
});

// Centralized Error Handler
app.use((err, req, res, next) => {
    // Log the error
    logger.error(`${err.name}: ${err.message}\n${err.stack}`);

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    res.status(statusCode).json({
        success: false,
        message: message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

module.exports = app;
