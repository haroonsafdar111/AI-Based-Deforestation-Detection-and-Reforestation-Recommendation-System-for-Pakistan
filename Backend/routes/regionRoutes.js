const express = require('express');
const router = express.Router();
const regionController = require('../controllers/regionController');

router.get('/', regionController.getRegions);
router.get('/:id', regionController.getRegion);

module.exports = router;
