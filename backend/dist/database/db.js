"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.Timestamp = void 0;
exports.collection = collection;
exports.doc = doc;
exports.getDoc = getDoc;
exports.getDocs = getDocs;
exports.setDoc = setDoc;
exports.updateDoc = updateDoc;
exports.deleteDoc = deleteDoc;
exports.addDoc = addDoc;
exports.query = query;
exports.where = where;
exports.orderBy = orderBy;
exports.getCountFromServer = getCountFromServer;
exports.writeBatch = writeBatch;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
// Database file location - always use the source data directory, not dist
// This ensures the database file is shared between development and production
const isProduction = process.env.NODE_ENV === 'production';
let DB_DIR;
let DB_FILE;
if (isProduction || __dirname.includes('dist')) {
    // When running from dist/, go up to backend root, then to data/
    // __dirname will be something like: /root/kick/backend/dist/database (after compilation)
    // We want: /root/kick/backend/data/database.json
    // Go up 2 levels from dist/database to get to backend/
    const backendRoot = path_1.default.resolve(__dirname, '../..');
    DB_DIR = path_1.default.join(backendRoot, 'data');
    DB_FILE = path_1.default.join(DB_DIR, 'database.json');
}
else {
    // Development: use process.cwd() which is the backend directory
    DB_DIR = path_1.default.join(process.cwd(), 'data');
    DB_FILE = path_1.default.join(DB_DIR, 'database.json');
}
console.log(`[DB] Database file path: ${DB_FILE}`);
console.log(`[DB] __dirname: ${__dirname}`);
console.log(`[DB] process.cwd(): ${process.cwd()}`);
// Ensure data directory exists
if (!fs_1.default.existsSync(DB_DIR)) {
    fs_1.default.mkdirSync(DB_DIR, { recursive: true });
}
// Initialize database file if it doesn't exist
if (!fs_1.default.existsSync(DB_FILE)) {
    fs_1.default.writeFileSync(DB_FILE, JSON.stringify({}, null, 2));
}
class LocalDatabase {
    constructor() {
        this.db = {};
        this.load();
    }
    load() {
        try {
            const data = fs_1.default.readFileSync(DB_FILE, 'utf-8');
            this.db = JSON.parse(data);
            console.log(`[DB] Database loaded from ${DB_FILE}`);
            console.log(`[DB] Collections found:`, Object.keys(this.db));
            Object.keys(this.db).forEach(collectionName => {
                const collection = this.db[collectionName];
                if (typeof collection === 'object' && collection !== null) {
                    console.log(`[DB] Collection "${collectionName}" has ${Object.keys(collection).length} documents`);
                }
            });
        }
        catch (error) {
            console.error(`[DB] Error loading database from ${DB_FILE}:`, error);
            this.db = {};
        }
    }
    save() {
        fs_1.default.writeFileSync(DB_FILE, JSON.stringify(this.db, null, 2));
    }
    // Collection operations
    collection(name) {
        console.log(`[DB] collection() called for: ${name}`);
        console.log(`[DB] Current db keys:`, Object.keys(this.db));
        if (!this.db[name]) {
            console.log(`[DB] Collection ${name} doesn't exist, creating empty collection`);
            this.db[name] = {};
        }
        else {
            console.log(`[DB] Collection ${name} exists with ${Object.keys(this.db[name]).length} documents`);
        }
        return new CollectionReference(name, this.db[name], () => this.save());
    }
}
class CollectionReference {
    constructor(name, data, onUpdate) {
        this.name = name;
        this.data = data;
        this.onUpdate = onUpdate;
    }
    doc(id) {
        const docId = id || (0, uuid_1.v4)();
        return new DocumentReference(docId, this.data, this.onUpdate);
    }
    async getDocs() {
        const docs = [];
        console.log(`[DB] getDocs called for collection: ${this.name}`);
        console.log(`[DB] Collection data keys:`, Object.keys(this.data));
        console.log(`[DB] Collection data entries count:`, Object.entries(this.data).length);
        for (const [id, data] of Object.entries(this.data)) {
            docs.push(new QueryDocumentSnapshot(id, data));
        }
        console.log(`[DB] Returning ${docs.length} documents for collection ${this.name}`);
        return new QuerySnapshot(docs);
    }
    query(...queryConstraints) {
        return new Query(this.data, queryConstraints, this.onUpdate);
    }
}
class DocumentReference {
    constructor(id, data, onUpdate) {
        this.data = data;
        this.onUpdate = onUpdate;
        this.id = id;
    }
    async get() {
        const data = this.data[this.id];
        return new DocumentSnapshot(this.id, data);
    }
    async set(data, options) {
        if (options?.merge && this.data[this.id]) {
            this.data[this.id] = { ...this.data[this.id], ...data };
        }
        else {
            this.data[this.id] = data;
        }
        this.onUpdate();
    }
    async update(data) {
        if (this.data[this.id]) {
            this.data[this.id] = { ...this.data[this.id], ...data };
        }
        else {
            this.data[this.id] = data;
        }
        this.onUpdate();
    }
    async delete() {
        delete this.data[this.id];
        this.onUpdate();
    }
}
class DocumentSnapshot {
    constructor(id, data) {
        this.id = id;
        this._data = data;
    }
    exists() {
        return this._data !== undefined;
    }
    data() {
        return this._data;
    }
}
class QueryDocumentSnapshot {
    constructor(id, data) {
        this.id = id;
        this._data = data;
    }
    data() {
        return this._data;
    }
}
class QuerySnapshot {
    constructor(docs) {
        this.docs = docs;
    }
    get empty() {
        return this.docs.length === 0;
    }
}
class Query {
    constructor(data, filters, onUpdate) {
        this.data = data;
        this.filters = filters;
        this.onUpdate = onUpdate;
        this.results = [];
        this.applyFilters();
    }
    applyFilters() {
        let results = [];
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
            }
            else if (filter.type === 'orderBy') {
                const { field, direction = 'asc' } = filter;
                results.sort((a, b) => {
                    const aVal = a.data()[field];
                    const bVal = b.data()[field];
                    if (aVal === undefined)
                        return 1;
                    if (bVal === undefined)
                        return -1;
                    if (direction === 'desc') {
                        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
                    }
                    else {
                        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
                    }
                });
            }
        }
        this.results = results;
    }
    async getDocs() {
        return new QuerySnapshot(this.results);
    }
}
// Helper functions to match Firestore API
function collection(db, collectionPath) {
    return db.collection(collectionPath);
}
function doc(db, collectionPath, docPath) {
    const coll = db.collection(collectionPath);
    return coll.doc(docPath);
}
function getDoc(ref) {
    return ref.get();
}
function getDocs(ref) {
    if (ref instanceof CollectionReference) {
        return ref.getDocs();
    }
    else {
        return ref.getDocs();
    }
}
function setDoc(ref, data, options) {
    return ref.set(data, options);
}
function updateDoc(ref, data) {
    return ref.update(data);
}
function deleteDoc(ref) {
    return ref.delete();
}
function addDoc(ref, data) {
    const docRef = ref.doc();
    return docRef.set(data).then(() => docRef);
}
function query(ref, ...queryConstraints) {
    const coll = ref;
    return coll.query(...queryConstraints);
}
function where(field, operator, value) {
    return { type: 'where', field, operator, value };
}
function orderBy(field, direction = 'asc') {
    return { type: 'orderBy', field, direction };
}
async function getCountFromServer(ref) {
    const snapshot = await ref.getDocs();
    return {
        data: () => ({ count: snapshot.docs.length })
    };
}
function writeBatch(db) {
    return new WriteBatch();
}
class WriteBatch {
    constructor() {
        this.operations = [];
    }
    set(ref, data) {
        this.operations.push({ ref, type: 'set', data });
        return this;
    }
    update(ref, data) {
        this.operations.push({ ref, type: 'update', data });
        return this;
    }
    delete(ref) {
        this.operations.push({ ref, type: 'delete' });
        return this;
    }
    async commit() {
        for (const op of this.operations) {
            if (op.type === 'set') {
                await op.ref.set(op.data);
            }
            else if (op.type === 'update') {
                await op.ref.update(op.data);
            }
            else if (op.type === 'delete') {
                await op.ref.delete();
            }
        }
    }
}
// Timestamp class to match Firestore Timestamp
class Timestamp {
    constructor(seconds, nanoseconds = 0) {
        this.date = new Date(seconds * 1000 + nanoseconds / 1000000);
    }
    static now() {
        return Timestamp.fromDate(new Date());
    }
    static fromDate(date) {
        return new Timestamp(date.getTime() / 1000, 0);
    }
    toDate() {
        return this.date;
    }
    toMillis() {
        return this.date.getTime();
    }
    seconds() {
        return Math.floor(this.date.getTime() / 1000);
    }
    nanoseconds() {
        return (this.date.getTime() % 1000) * 1000000;
    }
}
exports.Timestamp = Timestamp;
// Create and export database instance
const db = new LocalDatabase();
exports.db = db;
