const mongoose = require('mongoose');
const logger = require('./logger');

async function connectDB(uri) {
  if (!uri) throw new Error('MONGO_URI missing');
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  logger.info(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
  return mongoose.connection;
}

module.exports = { connectDB };
