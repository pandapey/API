const express = require('express');
const endpointController = require('../controllers/endpointController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createEndpointSchema, updateEndpointSchema } = require('../validators/endpoint');

const router = express.Router({ mergeParams: true });

router.use(protect);

router.get('/', endpointController.list);
router.post('/', validate({ body: createEndpointSchema }), endpointController.create);
router.get('/:endpointId', endpointController.getOne);
router.put('/:endpointId', validate({ body: updateEndpointSchema }), endpointController.update);
router.delete('/:endpointId', endpointController.remove);

module.exports = router;
