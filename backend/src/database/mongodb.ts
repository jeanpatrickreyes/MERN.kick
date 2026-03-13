import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/kick";

let isConnected = false;

export async function connectMongo(): Promise<typeof mongoose> {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose;
  }
  const conn = await mongoose.connect(MONGODB_URI);
  isConnected = true;
  console.log("[MongoDB] Connected to", mongoose.connection.host);
  return conn;
}

export function isMongoEnabled(): boolean {
  return !!process.env.MONGODB_URI;
}

/** Check if MongoDB is connected (readyState 1 = connected). */
export function checkMongoConnection(): boolean {
  return mongoose.connection.readyState === 1;
}
