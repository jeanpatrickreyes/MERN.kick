/**
 * Database layer: uses MongoDB when MONGODB_URI is set, otherwise JSON file (db-json).
 */
const useMongo = !!process.env.MONGODB_URI;

if (useMongo) {
  console.log("[DB] Using MongoDB");
} else {
  console.log("[DB] Using JSON file (data/database.json) - set MONGODB_URI in .env to use MongoDB");
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const backend = useMongo ? require("./db-mongo") : require("./db-json");

export const db = backend.db;
export const collection = backend.collection;
export const doc = backend.doc;
export const getDoc = backend.getDoc;
export const getDocs = backend.getDocs;
export const setDoc = backend.setDoc;
export const updateDoc = backend.updateDoc;
export const deleteDoc = backend.deleteDoc;
export const addDoc = backend.addDoc;
export const query = backend.query;
export const where = backend.where;
export const orderBy = backend.orderBy;
export const getCountFromServer = backend.getCountFromServer;
export const writeBatch = backend.writeBatch;
export const Timestamp = backend.Timestamp;
