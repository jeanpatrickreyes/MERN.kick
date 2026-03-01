"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionService = void 0;
const uuid_1 = require("uuid");
const db_1 = require("../database/db");
const firebase_1 = require("../firebase/firebase");
const tables_ultis_1 = __importDefault(require("../ultis/tables.ultis"));
class SessionService {
    static async createSession(userId, expirationDays = 30) {
        const sessionsRef = (0, db_1.collection)(firebase_1.db, tables_ultis_1.default.sessions);
        const q = (0, db_1.query)(sessionsRef, (0, db_1.where)("userId", "==", userId));
        const existingSessions = await (0, db_1.getDocs)(q);
        const deletePromises = existingSessions.docs.map(docSnap => (0, db_1.deleteDoc)((0, db_1.doc)(firebase_1.db, tables_ultis_1.default.sessions, docSnap.id)));
        await Promise.all(deletePromises);
        const sessionId = (0, uuid_1.v4)();
        const expiresAt = db_1.Timestamp.fromDate(new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000));
        await (0, db_1.setDoc)((0, db_1.doc)(firebase_1.db, tables_ultis_1.default.sessions, sessionId), {
            userId: String(userId),
            expiresAt: expiresAt.toMillis(), // Store as milliseconds for easier comparison
        });
        return sessionId;
    }
    static async validateSession(sessionId) {
        const Ref = (0, db_1.doc)(firebase_1.db, tables_ultis_1.default.sessions, sessionId);
        const sessionDoc = await (0, db_1.getDoc)(Ref);
        if (!sessionDoc.exists())
            return null;
        const sessionData = sessionDoc.data();
        const now = Date.now();
        // Handle both Timestamp objects and millisecond numbers
        const expiresAt = sessionData.expiresAt?.toMillis ? sessionData.expiresAt.toMillis() : sessionData.expiresAt;
        if (expiresAt < now) {
            await (0, db_1.deleteDoc)((0, db_1.doc)(firebase_1.db, tables_ultis_1.default.sessions, sessionId));
            return null;
        }
        return { userId: sessionData.userId };
    }
    static async revokeSession(sessionId) {
        await (0, db_1.deleteDoc)((0, db_1.doc)(firebase_1.db, tables_ultis_1.default.sessions, sessionId));
    }
}
exports.SessionService = SessionService;
