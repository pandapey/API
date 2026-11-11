const { spec } = require('../config/swagger');

const getDocs = (req, res) => {
  res.json({
    success: true,
    data: {
      title: 'DevAPI Hub',
      swagger: '/api-docs',
      spec: '/api-docs.json',
      gateway: 'ANY /gateway/:projectId/*?version=v1 with x-api-key header',
      auth: 'Bearer JWT for /api/*, x-api-key for /gateway/*',
    },
  });
};

module.exports = { getDocs };
