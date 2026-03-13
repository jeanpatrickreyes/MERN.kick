import { v4 as uuidv4 } from "uuid";
import { connectMongo } from "./mongodb";
import { getModel } from "./models";

type QueryConstraint = { type: string; field?: string; operator?: string; value?: any; direction?: string };

export interface DocumentSnapshot {
  id: string;
  exists(): boolean;
  data(): any;
}

export interface QueryDocumentSnapshot {
  id: string;
  data(): any;
}

export interface QuerySnapshot {
  docs: QueryDocumentSnapshot[];
  get empty(): boolean;
}

export interface DocumentReference {
  id: string;
  get(): Promise<DocumentSnapshot>;
  set(data: any, options?: { merge?: boolean }): Promise<void>;
  update(data: any): Promise<void>;
  delete(): Promise<void>;
}

export interface CollectionReference {
  doc(id?: string): DocumentReference;
  getDocs(): Promise<QuerySnapshot>;
  query(...constraints: QueryConstraint[]): Query;
}

export interface Query {
  getDocs(): Promise<QuerySnapshot>;
}

export class WriteBatch {
  private ops: Array<{ ref: DocumentReference; type: "set" | "update" | "delete"; data?: any }> = [];

  set(ref: DocumentReference, data: any): WriteBatch {
    this.ops.push({ ref, type: "set", data });
    return this;
  }
  update(ref: DocumentReference, data: any): WriteBatch {
    this.ops.push({ ref, type: "update", data });
    return this;
  }
  delete(ref: DocumentReference): WriteBatch {
    this.ops.push({ ref, type: "delete" });
    return this;
  }
  async commit(): Promise<void> {
    for (const op of this.ops) {
      if (op.type === "set") await op.ref.set(op.data);
      else if (op.type === "update") await op.ref.update(op.data!);
      else await op.ref.delete();
    }
  }
}

function toMongoFilter(constraints: QueryConstraint[]): Record<string, any> {
  const filter: Record<string, any> = {};
  for (const c of constraints) {
    if (c.type !== "where" || c.field == null) continue;
    const key = c.field === "id" ? "_id" : c.field;
    switch (c.operator) {
      case "==":
        filter[key] = c.value;
        break;
      case "!=":
        filter[key] = { $ne: c.value };
        break;
      case ">":
        filter[key] = { $gt: c.value };
        break;
      case ">=":
        filter[key] = { $gte: c.value };
        break;
      case "<":
        filter[key] = { $lt: c.value };
        break;
      case "<=":
        filter[key] = { $lte: c.value };
        break;
      case "array-contains":
        filter[key] = { $in: [c.value] };
        break;
      default:
        break;
    }
  }
  return filter;
}

function toMongoSort(constraints: QueryConstraint[]): Record<string, 1 | -1> {
  for (const c of constraints) {
    if (c.type === "orderBy" && c.field) {
      const dir = c.direction === "desc" ? -1 : 1;
      return { [c.field === "id" ? "_id" : c.field]: dir };
    }
  }
  return {};
}

function sanitizeForMongo(data: any): any {
  if (data == null) return data;
  if (Array.isArray(data)) return data.map(sanitizeForMongo);
  if (typeof data === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(data)) {
      if (k === "id" && typeof v === "string") {
        out._id = v;
      } else {
        out[k] = sanitizeForMongo(v);
      }
    }
    return out;
  }
  return data;
}

function fromMongoDoc(doc: any): any {
  if (!doc) return doc;
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  if (obj._id != null) {
    obj.id = typeof obj._id === "string" ? obj._id : String(obj._id);
    delete obj._id;
  }
  return obj;
}

export class MongoDatabase {
  collection(name: string): CollectionReference {
    return {
      doc(id?: string) {
        const docId = id || uuidv4();
        return {
          id: docId,
          async get(): Promise<DocumentSnapshot> {
            await connectMongo();
            const Model = getModel(name);
            const doc = await Model.findOne({ _id: docId }).lean() as any;
            const data = doc ? fromMongoDoc({ ...doc, _id: doc._id }) : undefined;
            return {
              id: docId,
              exists: () => !!doc,
              data: () => data,
            };
          },
          async set(data: any, options?: { merge?: boolean }): Promise<void> {
            await connectMongo();
            const Model = getModel(name);
            const payload = sanitizeForMongo({ ...data, id: docId });
            payload._id = docId;
            if (options?.merge) {
              await Model.findOneAndUpdate(
                { _id: docId },
                { $set: payload },
                { upsert: true, new: true }
              );
            } else {
              await Model.updateOne(
                { _id: docId },
                { $set: payload },
                { upsert: true }
              );
            }
          },
          async update(data: any): Promise<void> {
            await connectMongo();
            const Model = getModel(name);
            const payload = sanitizeForMongo(data);
            delete payload.id;
            delete payload._id;
            await Model.updateOne({ _id: docId }, { $set: payload });
          },
          async delete(): Promise<void> {
            await connectMongo();
            const Model = getModel(name);
            await Model.deleteOne({ _id: docId });
          },
        } as DocumentReference;
      },
      async getDocs(): Promise<QuerySnapshot> {
        await connectMongo();
        const Model = getModel(name);
        const docs = await Model.find({}).lean();
        return {
          docs: docs.map((d: any) => ({
            id: d._id != null ? String(d._id) : "",
            data: () => fromMongoDoc(d),
          })),
          get empty() {
            return this.docs.length === 0;
          },
        };
      },
      query(...constraints: QueryConstraint[]): Query {
        return {
          async getDocs(): Promise<QuerySnapshot> {
            await connectMongo();
            const Model = getModel(name);
            const filter = toMongoFilter(constraints);
            const sort = toMongoSort(constraints);
            const docs = await Model.find(filter).sort(sort).lean();
            return {
              docs: docs.map((d: any) => ({
                id: d._id != null ? String(d._id) : "",
                data: () => fromMongoDoc(d),
              })),
              get empty() {
                return this.docs.length === 0;
              },
            };
          },
        };
      },
    };
  }
}

const mongoDb = new MongoDatabase();

export const db = mongoDb;
export function collection(db: MongoDatabase, path: string): CollectionReference {
  return db.collection(path);
}
export function doc(db: MongoDatabase, path: string, docPath?: string): DocumentReference {
  return db.collection(path).doc(docPath);
}
export function getDoc(ref: DocumentReference): Promise<DocumentSnapshot> {
  return ref.get();
}
export function getDocs(ref: CollectionReference | Query): Promise<QuerySnapshot> {
  if ("getDocs" in ref && typeof ref.getDocs === "function") {
    return (ref as Query).getDocs();
  }
  return (ref as CollectionReference).getDocs();
}
export function setDoc(
  ref: DocumentReference,
  data: any,
  options?: { merge?: boolean }
): Promise<void> {
  return ref.set(data, options);
}
export function updateDoc(ref: DocumentReference, data: any): Promise<void> {
  return ref.update(data);
}
export function deleteDoc(ref: DocumentReference): Promise<void> {
  return ref.delete();
}
export function addDoc(
  ref: CollectionReference,
  data: any
): Promise<DocumentReference> {
  const newRef = ref.doc();
  return newRef.set(data).then(() => newRef);
}
export function query(ref: CollectionReference, ...constraints: QueryConstraint[]): Query {
  return ref.query(...constraints);
}
export function where(field: string, operator: string, value: any): QueryConstraint {
  return { type: "where", field, operator, value };
}
export function orderBy(
  field: string,
  direction: "asc" | "desc" = "asc"
): QueryConstraint {
  return { type: "orderBy", field, direction };
}
export async function getCountFromServer(
  ref: CollectionReference
): Promise<{ data: () => { count: number } }> {
  const snap = await ref.getDocs();
  return { data: () => ({ count: snap.docs.length }) };
}
export function writeBatch(): WriteBatch {
  return new WriteBatch();
}

export class Timestamp {
  private date: Date;
  constructor(seconds: number, nanoseconds: number = 0) {
    this.date = new Date(seconds * 1000 + nanoseconds / 1000000);
  }
  static now(): Timestamp {
    return Timestamp.fromDate(new Date());
  }
  static fromDate(date: Date): Timestamp {
    return new Timestamp(date.getTime() / 1000, 0);
  }
  toDate(): Date {
    return this.date;
  }
  toMillis(): number {
    return this.date.getTime();
  }
  seconds(): number {
    return Math.floor(this.date.getTime() / 1000);
  }
  nanoseconds(): number {
    return (this.date.getTime() % 1000) * 1000000;
  }
}
