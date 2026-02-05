import { v4 as uuidv4 } from "uuid";
import { doc, setDoc, getDoc, deleteDoc, Timestamp, query, collection, getDocs, where } from "../database/db";
import { db } from "../firebase/firebase";
import Tables from "../ultis/tables.ultis";

export class SessionService {
    static async createSession(userId: string, expirationDays: number = 30): Promise<string> {
        const sessionsRef = collection(db, Tables.sessions);
        const q = query(sessionsRef, where("userId", "==", userId));
        const existingSessions = await getDocs(q);
        const deletePromises = existingSessions.docs.map(docSnap =>
            deleteDoc(doc(db, Tables.sessions, docSnap.id))
        );
        await Promise.all(deletePromises);
        const sessionId = uuidv4();
        const expiresAt = Timestamp.fromDate(new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000));
        await setDoc(doc(db, Tables.sessions, sessionId), {
            userId: String(userId),
            expiresAt: expiresAt.toMillis(), // Store as milliseconds for easier comparison
        });

        return sessionId;
    }

    static async validateSession(sessionId: string): Promise<{ userId: string } | null> {

        const Ref = doc(db, Tables.sessions, sessionId);
        const sessionDoc = await getDoc(Ref);
        if (!sessionDoc.exists()) return null;

        const sessionData = sessionDoc.data();
        const now = Date.now();

        // Handle both Timestamp objects and millisecond numbers
        const expiresAt = sessionData.expiresAt?.toMillis ? sessionData.expiresAt.toMillis() : sessionData.expiresAt;

        if (expiresAt < now) {
            await deleteDoc(doc(db, Tables.sessions, sessionId));
            return null;
        }

        return { userId: sessionData.userId };
    }

    static async revokeSession(sessionId: string): Promise<void> {
        await deleteDoc(doc(db, Tables.sessions, sessionId));
    }
}
