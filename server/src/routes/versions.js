const express = require('express');
const versionController = require('../controllers/versionController');
const { protect } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

router.use(protect);

router.get('/', versionController.list);
router.post('/', versionController.create);
router.get('/:versionId', versionController.getOne);
router.put('/:versionId', versionController.update);
router.delete('/:versionId', versionController.remove);
router.post('/:versionId/deprecate', versionController.deprecate);

module.exports = router;
