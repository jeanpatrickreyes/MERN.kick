import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const isProduction = process.env.NODE_ENV === "production";
let DB_DIR: string;
let DB_FILE: string;

if (isProduction || __dirname.includes("dist")) {
  const backendRoot = path.resolve(__dirname, "../..");
  DB_DIR = path.join(backendRoot, "data");
  DB_FILE = path.join(DB_DIR, "database.json");
} else {
  DB_DIR = path.join(process.cwd(), "data");
  DB_FILE = path.join(DB_DIR, "database.json");
}

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({}, null, 2));

interface Database {
  [collection: string]: { [id: string]: any };
}

export class LocalDatabase {
  private db: Database = {};
  constructor() {
    this.load();
  }
  private load(): void {
    try {
      this.db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    } catch {
      this.db = {};
    }
  }
  private save(): void {
    fs.writeFileSync(DB_FILE, JSON.stringify(this.db, null, 2));
  }
  collection(name: string): any {
    if (!this.db[name]) this.db[name] = {};
    return new CollectionReference(name, this.db[name], () => this.save());
  }
}

class CollectionReference {
  constructor(
    private name: string,
    private data: { [id: string]: any },
    private onUpdate: () => void
  ) {}
  doc(id?: string): any {
    const docId = id || uuidv4();
    return new DocumentReference(docId, this.data, this.onUpdate);
  }
  async getDocs(): Promise<any> {
    const docs = [];
    for (const [id, data] of Object.entries(this.data)) {
      docs.push({ id, data: () => data });
    }
    return { docs, get empty() { return this.docs.length === 0; } };
  }
  query(...filters: any[]): any {
    return new Query(this.data, filters, this.onUpdate);
  }
}

class DocumentReference {
  constructor(
    public id: string,
    private data: { [id: string]: any },
    private onUpdate: () => void
  ) {}
  async get(): Promise<any> {
    return { id: this.id, exists: () => this.data[this.id] !== undefined, data: () => this.data[this.id] };
  }
  async set(data: any, options?: { merge?: boolean }): Promise<void> {
    if (options?.merge && this.data[this.id]) {
      this.data[this.id] = { ...this.data[this.id], ...data };
    } else {
      this.data[this.id] = data;
    }
    this.onUpdate();
  }
  async update(data: any): Promise<void> {
    if (this.data[this.id]) this.data[this.id] = { ...this.data[this.id], ...data };
    else this.data[this.id] = data;
    this.onUpdate();
  }
  async delete(): Promise<void> {
    delete this.data[this.id];
    this.onUpdate();
  }
}

class Query {
  private results: any[] = [];
  constructor(
    private data: { [id: string]: any },
    private filters: any[],
    private onUpdate: () => void
  ) {
    let results = Object.entries(this.data).map(([id, data]) => ({ id, data: () => data }));
    for (const f of this.filters) {
      if (f.type === "where") {
        const { field, operator, value } = f;
        results = results.filter((d) => {
          const v = d.data()[field];
          if (operator === "==") return field === "email" && typeof v === "string" && typeof value === "string" ? v.toLowerCase().trim() === value.toLowerCase().trim() : v === value;
          if (operator === "!=") return v !== value;
          if (operator === ">") return v > value;
          if (operator === ">=") return v >= value;
          if (operator === "<") return v < value;
          if (operator === "<=") return v <= value;
          if (operator === "array-contains") return Array.isArray(v) && v.includes(value);
          return true;
        });
      } else if (f.type === "orderBy") {
        const { field, direction = "asc" } = f;
        results.sort((a, b) => {
          const aV = a.data()[field];
          const bV = b.data()[field];
          if (aV === undefined) return 1;
          if (bV === undefined) return -1;
          if (direction === "desc") return aV > bV ? -1 : aV < bV ? 1 : 0;
          return aV < bV ? -1 : aV > bV ? 1 : 0;
        });
      }
    }
    this.results = results;
  }
  async getDocs(): Promise<any> {
    return { docs: this.results, get empty() { return this.docs.length === 0; } };
  }
}

export class WriteBatch {
  private operations: Array<{ ref: any; type: "set" | "update" | "delete"; data?: any }> = [];
  set(ref: any, data: any): WriteBatch {
    this.operations.push({ ref, type: "set", data });
    return this;
  }
  update(ref: any, data: any): WriteBatch {
    this.operations.push({ ref, type: "update", data });
    return this;
  }
  delete(ref: any): WriteBatch {
    this.operations.push({ ref, type: "delete" });
    return this;
  }
  async commit(): Promise<void> {
    for (const op of this.operations) {
      if (op.type === "set") await op.ref.set(op.data);
      else if (op.type === "update") await op.ref.update(op.data!);
      else await op.ref.delete();
    }
  }
}

export class Timestamp {
  private date: Date;
  constructor(seconds: number, nanoseconds: number = 0) {
    this.date = new Date(seconds * 1000 + nanoseconds / 1000000);
  }
  static now() { return Timestamp.fromDate(new Date()); }
  static fromDate(date: Date) { return new Timestamp(date.getTime() / 1000, 0); }
  toDate() { return this.date; }
  toMillis() { return this.date.getTime(); }
  seconds() { return Math.floor(this.date.getTime() / 1000); }
  nanoseconds() { return (this.date.getTime() % 1000) * 1000000; }
}

const db = new LocalDatabase();
export { db };
export function collection(db: LocalDatabase, path: string) { return db.collection(path); }
export function doc(db: LocalDatabase, path: string, docPath?: string) { return db.collection(path).doc(docPath); }
export function getDoc(ref: any) { return ref.get(); }
export function getDocs(ref: any) { return ref.getDocs(); }
export function setDoc(ref: any, data: any, options?: { merge?: boolean }) { return ref.set(data, options); }
export function updateDoc(ref: any, data: any) { return ref.update(data); }
export function deleteDoc(ref: any) { return ref.delete(); }
export function addDoc(ref: any, data: any) { const r = ref.doc(); return r.set(data).then(() => r); }
export function query(ref: any, ...c: any[]) { return ref.query(...c); }
export function where(field: string, operator: string, value: any) { return { type: "where", field, operator, value }; }
export function orderBy(field: string, direction: "asc" | "desc" = "asc") { return { type: "orderBy", field, direction }; }
export async function getCountFromServer(ref: any) { const s = await ref.getDocs(); return { data: () => ({ count: s.docs.length }) }; }
export function writeBatch(_db?: any) { return new WriteBatch(); }
