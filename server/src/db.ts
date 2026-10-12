import mongoose from 'mongoose';
import { env } from './config/env';
import { mongoHost, sanitizeMongoUri } from './utils/mongo-uri';

export async function connectDb(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;
  mongoose.set('strictQuery', true);
  const uri = sanitizeMongoUri(env.MONGODB_URI);
  try {
    await mongoose.connect(uri);
  } catch (err) {
    const rawMsg = err instanceof Error ? err.message : String(err);
    // Never leak the password into logs: redact any embedded credentials.
    const safeMsg = rawMsg.replace(/:\/\/([^:@/]+):[^@/]*@/g, '://$1:****@');
    throw new Error(
      `[db] MongoDB connection failed (host: ${mongoHost(uri)}). ` +
        `Re-copy MONGODB_URI from Atlas: Database → Connect → Drivers → Copy, ` +
        `replacing only <password>. Do not type it by hand. Cause: ${safeMsg}`,
    );
  }
  // eslint-disable-next-line no-console
  console.info(`[db] connected to ${mongoose.connection.name}`);
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}
