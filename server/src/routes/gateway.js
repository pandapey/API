const express = require('express');
const { handleGateway } = require('../controllers/gatewayController');
const { loadApiKey } = require('../middleware/apiKey');
const { perKeyRateLimit, perProjectRateLimit } = require('../middleware/rateLimit');
const { gatewayRequestLogger } = require('../middleware/requestLogger');

const router = express.Router();

// ANY /gateway/:projectId/* with ?version
// Order: load key -> logger (must wrap response) -> rate limits -> handler
router.use('/:projectId', loadApiKey, gatewayRequestLogger, perProjectRateLimit, perKeyRateLimit);

router.all('/:projectId', handleGateway);
router.all('/:projectId/*', handleGateway);

module.exports = router;
