const express = require('express');
const webhookController = require('../controllers/webhookController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createWebhookSchema, updateWebhookSchema } = require('../validators/webhook');

const router = express.Router();

// Nested under /api/projects/:id/webhooks
const nested = express.Router({ mergeParams: true });
nested.use(protect);
nested.get('/', webhookController.list);
nested.post('/', validate({ body: createWebhookSchema }), webhookController.create);
nested.get('/:webhookId', webhookController.getOne);
nested.put('/:webhookId', validate({ body: updateWebhookSchema }), webhookController.update);
nested.delete('/:webhookId', webhookController.remove);

// Top-level /api/webhooks/:id/*
const top = express.Router();
top.use(protect);
top.get('/:webhookId', webhookController.getOne);
top.put('/:webhookId', validate({ body: updateWebhookSchema }), webhookController.update);
top.delete('/:webhookId', webhookController.remove);
top.get('/:id/deliveries', webhookController.deliveries);
top.post('/:id/test', webhookController.test);

module.exports = { webhookNestedRouter: nested, webhookTopRouter: top };
