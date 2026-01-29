import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Database file location - always use the source data directory, not dist
// This ensures the database file is shared between development and production
const isProduction = process.env.NODE_ENV === 'production';
let DB_DIR: string;
let DB_FILE: string;

if (isProduction || __dirname.includes('dist')) {
    // When running from dist/, go up to backend root, then to data/
    // __dirname will be something like: /root/kick/backend/dist/database (after compilation)
    // We want: /root/kick/backend/data/database.json
    // Go up 2 levels from dist/database to get to backend/
    const backendRoot = path.resolve(__dirname, '../..');
    DB_DIR = path.join(backendRoot, 'data');
    DB_FILE = path.join(DB_DIR, 'database.json');
} else {
    // Development: use process.cwd() which is the backend directory
    DB_DIR = path.join(process.cwd(), 'data');
    DB_FILE = path.join(DB_DIR, 'database.json');
}

console.log(`[DB] Database file path: ${DB_FILE}`);
console.log(`[DB] __dirname: ${__dirname}`);
console.log(`[DB] process.cwd(): ${process.cwd()}`);

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
}

// Initialize database file if it doesn't exist
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({}, null, 2));
}

interface Database {
    [collection: string]: {
        [id: string]: any;
    };
}

class LocalDatabase {
    private db: Database = {};

    constructor() {
        this.load();
    }

    private load(): void {
        try {
            const data = fs.readFileSync(DB_FILE, 'utf-8');
            this.db = JSON.parse(data);
            console.log(`[DB] Database loaded from ${DB_FILE}`);
            console.log(`[DB] Collections found:`, Object.keys(this.db));
            Object.keys(this.db).forEach(collectionName => {
                const collection = this.db[collectionName];
                if (typeof collection === 'object' && collection !== null) {
                    console.log(`[DB] Collection "${collectionName}" has ${Object.keys(collection).length} documents`);
                }
            });
        } catch (error) {
            console.error(`[DB] Error loading database from ${DB_FILE}:`, error);
            this.db = {};
        }
    }

    private save(): void {
        fs.writeFileSync(DB_FILE, JSON.stringify(this.db, null, 2));
    }

    // Collection operations
    collection(name: string): CollectionReference {
        console.log(`[DB] collection() called for: ${name}`);
        console.log(`[DB] Current db keys:`, Object.keys(this.db));
        if (!this.db[name]) {
            console.log(`[DB] Collection ${name} doesn't exist, creating empty collection`);
            this.db[name] = {};
        } else {
            console.log(`[DB] Collection ${name} exists with ${Object.keys(this.db[name]).length} documents`);
        }
        return new CollectionReference(name, this.db[name], () => this.save());
    }
}

class CollectionReference {
    constructor(
        private name: string,
        private data: { [id: string]: any },
        private onUpdate: () => void
    ) {}

    doc(id?: string): DocumentReference {
        const docId = id || uuidv4();
        return new DocumentReference(docId, this.data, this.onUpdate);
    }

    async getDocs(): Promise<QuerySnapshot> {
        const docs: QueryDocumentSnapshot[] = [];
        console.log(`[DB] getDocs called for collection: ${this.name}`);
        console.log(`[DB] Collection data keys:`, Object.keys(this.data));
        console.log(`[DB] Collection data entries count:`, Object.entries(this.data).length);
        for (const [id, data] of Object.entries(this.data)) {
            docs.push(new QueryDocumentSnapshot(id, data));
        }
        console.log(`[DB] Returning ${docs.length} documents for collection ${this.name}`);
        return new QuerySnapshot(docs);
    }

    query(...queryConstraints: any[]): Query {
        return new Query(this.data, queryConstraints, this.onUpdate);
    }
}

class DocumentReference {
    public readonly id: string;
    constructor(
        id: string,
        private data: { [id: string]: any },
        private onUpdate: () => void
    ) {
        this.id = id;
    }

    async get(): Promise<DocumentSnapshot> {
        const data = this.data[this.id];
        return new DocumentSnapshot(this.id, data);
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
        if (this.data[this.id]) {
            this.data[this.id] = { ...this.data[this.id], ...data };
        } else {
            this.data[this.id] = data;
        }
        this.onUpdate();
    }

    async delete(): Promise<void> {
        delete this.data[this.id];
        this.onUpdate();
    }
}

class DocumentSnapshot {
    private _data: any;

    constructor(
        public id: string,
        data: any
    ) {
        this._data = data;
    }

    exists(): boolean {
        return this._data !== undefined;
    }

    data(): any {
        return this._data;
    }
}

class QueryDocumentSnapshot {
    private _data: any;

    constructor(
        public id: string,
        data: any
    ) {
        this._data = data;
    }

    data(): any {
        return this._data;
    }
}

class QuerySnapshot {
    constructor(public docs: QueryDocumentSnapshot[]) {}

    get empty(): boolean {
        return this.docs.length === 0;
    }
}

class Query {
    private results: QueryDocumentSnapshot[] = [];

    constructor(
        private data: { [id: string]: any },
        private filters: any[],
        private onUpdate: () => void
    ) {
        this.applyFilters();
    }

    private applyFilters(): void {
        let results: QueryDocumentSnapshot[] = [];
        
        // Convert all documents to QueryDocumentSnapshot
        for (const [id, data] of Object.entries(this.data)) {
            results.push(new QueryDocumentSnapshot(id, data));
        }

        // Apply filters
        for (const filter of this.filters) {
            if (filter.type === 'where') {
                const { field, operator, value } = filter;
                results = results.filter(doc => {
                    const docData = doc.data();
                    const fieldValue = docData[field];
                    
                    switch (operator) {
                        case '==':
                            // For email fields, do case-insensitive comparison
                            if (field === 'email' && typeof fieldValue === 'string' && typeof value === 'string') {
                                return fieldValue.toLowerCase().trim() === value.toLowerCase().trim();
                            }
                            return fieldValue === value;
                        case '!=':
                            return fieldValue !== value;
                        case '>':
                            return fieldValue > value;
                        case '>=':
                            return fieldValue >= value;
                        case '<':
                            return fieldValue < value;
                        case '<=':
                            return fieldValue <= value;
                        case 'array-contains':
                            return Array.isArray(fieldValue) && fieldValue.includes(value);
                        default:
                            return true;
                    }
                });
            } else if (filter.type === 'orderBy') {
                const { field, direction = 'asc' } = filter;
                results.sort((a, b) => {
                    const aVal = a.data()[field];
                    const bVal = b.data()[field];
                    
                    if (aVal === undefined) return 1;
                    if (bVal === undefined) return -1;
                    
                    if (direction === 'desc') {
                        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
                    } else {
                        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
                    }
                });
            }
        }

        this.results = results;
    }

    async getDocs(): Promise<QuerySnapshot> {
        return new QuerySnapshot(this.results);
    }
}

// Helper functions to match Firestore API
export function collection(db: LocalDatabase, collectionPath: string): CollectionReference {
    return db.collection(collectionPath);
}

export function doc(db: LocalDatabase, collectionPath: string, docPath?: string): DocumentReference {
    const coll = db.collection(collectionPath);
    return coll.doc(docPath);
}

export function getDoc(ref: DocumentReference): Promise<DocumentSnapshot> {
    return ref.get();
}

export function getDocs(ref: CollectionReference | Query): Promise<QuerySnapshot> {
    if (ref instanceof CollectionReference) {
        return ref.getDocs();
    } else {
        return ref.getDocs();
    }
}

export function setDoc(ref: DocumentReference, data: any, options?: { merge?: boolean }): Promise<void> {
    return ref.set(data, options);
}

export function updateDoc(ref: DocumentReference, data: any): Promise<void> {
    return ref.update(data);
}

export function deleteDoc(ref: DocumentReference): Promise<void> {
    return ref.delete();
}

export function addDoc(ref: CollectionReference, data: any): Promise<DocumentReference> {
    const docRef = ref.doc();
    return docRef.set(data).then(() => docRef);
}

export function query(
    ref: CollectionReference,
    ...queryConstraints: any[]
): Query {
    const coll = ref as CollectionReference;
    return coll.query(...queryConstraints);
}

export function where(field: string, operator: string, value: any): any {
    return { type: 'where', field, operator, value };
}

export function orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): any {
    return { type: 'orderBy', field, direction };
}

export async function getCountFromServer(ref: CollectionReference): Promise<{ data: () => { count: number } }> {
    const snapshot = await ref.getDocs();
    return {
        data: () => ({ count: snapshot.docs.length })
    };
}

export function writeBatch(db?: any): WriteBatch {
    return new WriteBatch();
}

class WriteBatch {
    private operations: Array<{ ref: DocumentReference; type: 'set' | 'update' | 'delete'; data?: any }> = [];

    set(ref: DocumentReference, data: any): WriteBatch {
        this.operations.push({ ref, type: 'set', data });
        return this;
    }

    update(ref: DocumentReference, data: any): WriteBatch {
        this.operations.push({ ref, type: 'update', data });
        return this;
    }

    delete(ref: DocumentReference): WriteBatch {
        this.operations.push({ ref, type: 'delete' });
        return this;
    }

    async commit(): Promise<void> {
        for (const op of this.operations) {
            if (op.type === 'set') {
                await op.ref.set(op.data);
            } else if (op.type === 'update') {
                await op.ref.update(op.data!);
            } else if (op.type === 'delete') {
                await op.ref.delete();
            }
        }
    }
}

// Timestamp class to match Firestore Timestamp
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

// Create and export database instance
const db = new LocalDatabase();
export { db };

