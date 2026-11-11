const express = require('express');
const { overview, byEndpoints, byStatus, timeseries, latency } = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.get('/overview', overview);
router.get('/endpoints', byEndpoints);
router.get('/status', byStatus);
router.get('/timeseries', timeseries);
router.get('/latency', latency);

module.exports = router;
