import { v4 as uuidv4 } from "uuid";
import { doc, setDoc, getDoc, deleteDoc, Timestamp, query, collection, getDocs, where } from "../database/db";
import { db } from "../firebase/firebase";
import Tables from "../ultis/tables.ultis";

export class SessionService {
    static async createSession(userId: string, expirationDays: number = 30): Promise<string> {
        // Clean up only expired sessions for this user (keep active ones so other devices stay logged in)
        const sessionsRef = collection(db, Tables.sessions);
        const q = query(sessionsRef, where("userId", "==", userId));
        const existingSessions = await getDocs(q);
        const now = Date.now();
        const deletePromises = existingSessions.docs
            .filter(docSnap => {
                const data = docSnap.data();
                const expiresAt = data.expiresAt?.toMillis ? data.expiresAt.toMillis() : data.expiresAt;
                return expiresAt && expiresAt < now;
            })
            .map(docSnap => deleteDoc(doc(db, Tables.sessions, docSnap.id)));
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
        const userId = sessionData.userId;

        // Check if user is an admin - admins never expire
        const adminRef = doc(db, Tables.admins, userId);
        const adminDoc = await getDoc(adminRef);
        const isAdmin = adminDoc.exists();

        if (isAdmin) {
            // Admin sessions never expire — auto-extend expiration to keep them alive
            const now = Date.now();
            const expiresAt = sessionData.expiresAt?.toMillis ? sessionData.expiresAt.toMillis() : sessionData.expiresAt;
            const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
            if (!expiresAt || (expiresAt - now) < thirtyDaysMs) {
                const newExpires = Timestamp.fromDate(new Date(now + 365 * 24 * 60 * 60 * 1000));
                await setDoc(Ref, { ...sessionData, expiresAt: newExpires.toMillis() });
            }
            return { userId };
        }

        // For members, check if they have active VIP — extend session if VIP is valid
        const memberRef = doc(db, Tables.members, userId);
        const memberDoc = await getDoc(memberRef);
        if (memberDoc.exists()) {
            const memberData = memberDoc.data();
            const vipDateStr = memberData.date;
            if (vipDateStr) {
                const vipDate = new Date(vipDateStr);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (vipDate > today) {
                    // VIP is active — auto-extend session expiration
                    const now = Date.now();
                    const expiresAt = sessionData.expiresAt?.toMillis ? sessionData.expiresAt.toMillis() : sessionData.expiresAt;
                    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
                    if (!expiresAt || (expiresAt - now) < sevenDaysMs) {
                        const newExpires = Timestamp.fromDate(new Date(now + 30 * 24 * 60 * 60 * 1000));
                        await setDoc(Ref, { ...sessionData, expiresAt: newExpires.toMillis() });
                    }
                    return { userId };
                }
            }
        }

        // Regular member — check expiration normally
        const now = Date.now();
        const expiresAt = sessionData.expiresAt?.toMillis ? sessionData.expiresAt.toMillis() : sessionData.expiresAt;
        if (expiresAt < now) {
            await deleteDoc(doc(db, Tables.sessions, sessionId));
            return null;
        }

        return { userId };
    }

    static async revokeSession(sessionId: string): Promise<void> {
        await deleteDoc(doc(db, Tables.sessions, sessionId));
    }
}
