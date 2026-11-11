const express = require('express');
const keyController = require('../controllers/keyController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createKeySchema } = require('../validators/key');

const router = express.Router();

router.use(protect);

router.get('/', keyController.listMine);
router.post('/:id/revoke', keyController.revoke);
router.post('/:id/rotate', keyController.rotate);
router.delete('/:id', keyController.remove);

module.exports = router;
