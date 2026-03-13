import mongoose from "mongoose";

// Use String _id so Mongoose accepts UUID/session IDs and string IDs (e.g. eventId for matches)
const flexibleSchema = new mongoose.Schema(
  { _id: String },
  { strict: false, timestamps: false }
);

const collectionNames = [
  "matches",
  "analysis",
  "members",
  "admins",
  "sessions",
  "records",
  "records2",
  "config",
] as const;

const models: Record<string, mongoose.Model<any>> = {};

for (const name of collectionNames) {
  const safeName = name.replace(/[^a-zA-Z0-9]/g, "_");
  if (!mongoose.models[safeName]) {
    models[name] = mongoose.model(safeName, flexibleSchema, name);
  } else {
    models[name] = mongoose.models[safeName];
  }
}

export function getModel(collectionName: string): mongoose.Model<any> {
  const m = models[collectionName];
  if (!m) {
    const safeName = collectionName.replace(/[^a-zA-Z0-9]/g, "_");
    models[collectionName] = mongoose.model(safeName, flexibleSchema, collectionName);
    return models[collectionName];
  }
  return m;
}
