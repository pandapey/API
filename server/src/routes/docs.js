const express = require('express');
const { getDocs } = require('../controllers/docsController');

const router = express.Router();

router.get('/', getDocs);

module.exports = router;
