const express = require('express');
const { handleGateway } = require('../controllers/gatewayController');
const { loadApiKey } = require('../middleware/apiKey');
const {
  perKeyRateLimit, perProjectRateLimit, loadGatewayProject, maintenanceGate,
} = require('../middleware/rateLimit');
const { gatewayRequestLogger } = require('../middleware/requestLogger');

const router = express.Router();

// ANY /gateway/:projectId/* with ?version
// Order: maintenance -> load key -> logger (must wrap response) -> rate limits -> handler
router.use('/:projectId', maintenanceGate, loadApiKey, gatewayRequestLogger, loadGatewayProject, perProjectRateLimit, perKeyRateLimit);

router.all('/:projectId', handleGateway);
router.all('/:projectId/*', handleGateway);

module.exports = router;
