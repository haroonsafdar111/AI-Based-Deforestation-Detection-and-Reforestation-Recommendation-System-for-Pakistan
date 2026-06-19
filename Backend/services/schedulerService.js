const Config = require('../models/Config');
const Data = require('../models/Data');
const mlService = require('./mlService');
const logger = require('../utils/logger');

/**
 * Scheduler Service
 * Handles periodic tasks like automated ML retraining
 */

const checkRetrainingStatus = async () => {
    try {
        logger.info('[SCHEDULER] Checking ML retraining criteria...');

        let config = await Config.findOne();
        if (!config) {
            config = await Config.create({});
        }

        const now = new Date();
        const lastRetrain = config.lastRetrainedAt || new Date(0);

        // 1. Time-based check
        const intervalInMs = {
            'Daily': 24 * 60 * 60 * 1000,
            'Weekly': 7 * 24 * 60 * 60 * 1000,
            'Monthly': 30 * 24 * 60 * 60 * 1000,
            'Quarterly': 90 * 24 * 60 * 60 * 1000
        };

        const scheduledInterval = intervalInMs[config.retrainingInterval] || intervalInMs['Monthly'];
        const timeElapsed = now - lastRetrain;
        const needsTimeRetrain = timeElapsed >= scheduledInterval;

        // 2. Volume-based check (Data collected since last retrain)
        const newRecordsCount = await Data.countDocuments({
            createdAt: { $gt: lastRetrain }
        });
        const needsVolumeRetrain = newRecordsCount >= config.retrainingDataThreshold;

        logger.info(`[SCHEDULER] Status: Time elapsed: ${Math.round(timeElapsed / 3600000)}h, New records: ${newRecordsCount}`);

        if (needsTimeRetrain || needsVolumeRetrain) {
            const reason = needsTimeRetrain ? `Interval (${config.retrainingInterval}) met` : `Data threshold (${config.retrainingDataThreshold}) reached`;
            logger.info(`[SCHEDULER] Triggering Automated Retraining. Reason: ${reason}`);

            // Execute retraining
            await mlService.retrainModels();

            // Update lastRetrainedAt
            config.lastRetrainedAt = now;
            await config.save();

            logger.info('[SCHEDULER] Automated retraining completed and timestamp updated.');
        } else {
            logger.info('[SCHEDULER] No retraining needed at this time.');
        }

    } catch (err) {
        logger.error(`[SCHEDULER] Error in checkRetrainingStatus: ${err.message}`);
    }
};

exports.init = () => {
    // Initial check on startup (with slight delay to let DB stabilize)
    setTimeout(checkRetrainingStatus, 30000);

    // Run check every 6 hours
    // (In dev, we might want this more frequent, but 6h is safe for production background)
    const SIX_HOURS = 6 * 60 * 60 * 1000;
    setInterval(checkRetrainingStatus, SIX_HOURS);

    logger.info('[SCHEDULER] Scheduler service initialized (Interval: 6h)');
};
