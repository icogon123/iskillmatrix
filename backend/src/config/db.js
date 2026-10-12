import mongoose from 'mongoose';
import env from './env.js';

export async function connectDB() {
  if (!env.mongoUri) throw new Error('MONGODB_URI is not set in backend/.env');
  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(env.mongoUri, { dbName: env.mongoDbName, serverSelectionTimeoutMS: 15000, maxPoolSize: Number(process.env.MONGODB_MAX_POOL) || 10 });
  } catch (err) {
    throw new Error(
      `Could not connect to MongoDB (${err.message.split('\n')[0]}). Check MONGODB_URI, the database user's password, ` +
        'and that this server’s IP address is allowed in MongoDB Atlas → Network Access.',
    );
  }
  console.log(`[db] connected to ${mongoose.connection.host} / ${mongoose.connection.name}`);
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
