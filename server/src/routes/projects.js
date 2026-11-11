const express = require('express');
const projectController = require('../controllers/projectController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createProjectSchema, updateProjectSchema } = require('../validators/project');

const router = express.Router();

router.use(protect);

router.get('/', projectController.list);
router.post('/', validate({ body: createProjectSchema }), projectController.create);
router.get('/:id', projectController.getOne);
router.put('/:id', validate({ body: updateProjectSchema }), projectController.update);
router.delete('/:id', projectController.remove);
router.post('/:id/publish', projectController.publish);
router.post('/:id/unpublish', projectController.unpublish);

module.exports = router;
