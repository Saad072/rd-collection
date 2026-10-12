import mongoose from 'mongoose';
import { env } from './config/env';

export async function connectDb(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGODB_URI);
  // eslint-disable-next-line no-console
  console.info(`[db] connected to ${mongoose.connection.name}`);
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}
