const express = require('express');
const { list, exportLogs } = require('../controllers/logController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.get('/export', exportLogs);
router.get('/', list);

module.exports = router;
