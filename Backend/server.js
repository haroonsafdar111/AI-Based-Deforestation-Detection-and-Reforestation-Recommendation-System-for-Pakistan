const app = require('./app');
const connectDB = require('./config/db');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

const server = app.listen(PORT, async () => {
    logger.info(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);

    // Initialize ML Service Manager
    try {
        const mlServiceManager = require('./services/mlServiceManager');
        await mlServiceManager.start();
        logger.info('ML Service Manager initialized successfully');
    } catch (error) {
        logger.warn('ML Service Manager failed to start, falling back to spawn method:', error.message);
    }

    // Initialize Job Queue Service
    try {
        const jobQueueService = require('./services/jobQueueService');
        await jobQueueService.initialize();
        logger.info('Job Queue Service initialized successfully');
    } catch (error) {
        logger.warn('Job Queue Service failed to initialize:', error.message);
    }

    // Initialize Background Scheduler
    const schedulerService = require('./services/schedulerService');
    schedulerService.init();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    logger.error(`Unhandled Rejection at: ${promise}, reason: ${err.message}`);
    if (err.stack) logger.error(err.stack);
    // Close server & exit process
    server.close(() => process.exit(1));
});
