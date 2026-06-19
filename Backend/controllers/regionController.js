const regionsUtil = require('../utils/regions');

exports.getRegions = (req, res) => {
    try {
        const regions = regionsUtil.getAllRegions();
        res.json({
            success: true,
            data: regions
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getRegion = (req, res) => {
    try {
        const region = regionsUtil.getRegionById(req.params.id);
        if (!region) {
            return res.status(404).json({ message: 'Region not found' });
        }
        res.json({
            success: true,
            data: region
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
