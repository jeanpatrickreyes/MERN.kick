"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const firebase_1 = require("../firebase/firebase");
const db_1 = require("../database/db");
const bcrypt_1 = __importDefault(require("bcrypt"));
const sessionService_1 = require("../service/sessionService");
const tables_ultis_1 = __importDefault(require("../ultis/tables.ultis"));
const uuid_1 = require("uuid");
class UsersController {
    static async login(req, res) {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: "email and password are required." });
        }
        try {
            let userId;
            // Normalize email to lowercase for comparison
            const normalizedEmail = email.toLowerCase().trim();
            console.log("[Login] Searching for email:", normalizedEmail);
            const membersRefAdmin = (0, db_1.collection)(firebase_1.db, tables_ultis_1.default.admins);
            const qAdmin = (0, db_1.query)(membersRefAdmin, (0, db_1.where)("email", "==", normalizedEmail));
            const querySnapshotAdmin = await (0, db_1.getDocs)(qAdmin);
            console.log("[Login] Admin query results:", querySnapshotAdmin.empty ? "empty" : `${querySnapshotAdmin.docs.length} found`);
            const membersRef = (0, db_1.collection)(firebase_1.db, tables_ultis_1.default.members);
            const q = (0, db_1.query)(membersRef, (0, db_1.where)("email", "==", normalizedEmail));
            const querySnapshot = await (0, db_1.getDocs)(q);
            console.log("[Login] Member query results:", querySnapshot.empty ? "empty" : `${querySnapshot.docs.length} found`);
            if (querySnapshot.empty && querySnapshotAdmin.empty) {
                // Try case-insensitive search as fallback
                console.log("[Login] No exact match found, trying case-insensitive search...");
                const allAdminsRef = (0, db_1.collection)(firebase_1.db, tables_ultis_1.default.admins);
                const allAdminsSnapshot = await (0, db_1.getDocs)(allAdminsRef);
                const allMembersRef = (0, db_1.collection)(firebase_1.db, tables_ultis_1.default.members);
                const allMembersSnapshot = await (0, db_1.getDocs)(allMembersRef);
                console.log("[Login] Total admins in DB:", allAdminsSnapshot.docs.length);
                console.log("[Login] Total members in DB:", allMembersSnapshot.docs.length);
                // Log all emails for debugging
                allAdminsSnapshot.docs.forEach((doc, idx) => {
                    const email = doc.data().email;
                    console.log(`[Login] Admin ${idx} email: "${email}" (normalized: "${email?.toLowerCase().trim()}")`);
                });
                const adminMatch = allAdminsSnapshot.docs.find(doc => {
                    const docEmail = doc.data().email;
                    if (!docEmail)
                        return false;
                    const match = docEmail.toLowerCase().trim() === normalizedEmail;
                    if (match)
                        console.log(`[Login] Found admin match: "${docEmail}"`);
                    return match;
                });
                const memberMatch = allMembersSnapshot.docs.find(doc => {
                    const docEmail = doc.data().email;
                    if (!docEmail)
                        return false;
                    const match = docEmail.toLowerCase().trim() === normalizedEmail;
                    if (match)
                        console.log(`[Login] Found member match: "${docEmail}"`);
                    return match;
                });
                if (!adminMatch && !memberMatch) {
                    console.log("[Login] User not found even with case-insensitive search");
                    return res.status(404).json({ error: "User not found." });
                }
                // Use the found match
                if (adminMatch) {
                    const doc = adminMatch;
                    const userData = doc.data();
                    userId = doc.id;
                    // Continue with password verification below
                    const passwordMatch = await bcrypt_1.default.compare(password, userData.password);
                    if (!passwordMatch) {
                        return res.status(401).json({ error: "Invalid password." });
                    }
                    // Admin tokens expire in 7 days
                    const ADMIN_EXPIRATION_DAYS = 7;
                    const sessionId = await sessionService_1.SessionService.createSession(userId, ADMIN_EXPIRATION_DAYS);
                    res.cookie('sessionId', sessionId, {
                        httpOnly: true,
                        secure: process.env.NODE_ENV === 'production',
                        sameSite: 'lax',
                        maxAge: ADMIN_EXPIRATION_DAYS * 24 * 60 * 60 * 1000 // 7 days for admin
                    });
                    return res.json({
                        user: {
                            id: userId,
                            email: userData.email,
                            role: userData.role || 'admin'
                        },
                        sessionId
                    });
                }
                else {
                    const doc = memberMatch;
                    const userData = doc.data();
                    userId = doc.id;
                    const passwordMatch = await bcrypt_1.default.compare(password, userData.password);
                    if (!passwordMatch) {
                        return res.status(401).json({ error: "Invalid password." });
                    }
                    const sessionId = await sessionService_1.SessionService.createSession(userId);
                    res.cookie('sessionId', sessionId, {
                        httpOnly: true,
                        secure: process.env.NODE_ENV === 'production',
                        sameSite: 'lax',
                        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
                    });
                    return res.json({
                        user: {
                            id: userId,
                            email: userData.email,
                            role: 'member'
                        },
                        sessionId
                    });
                }
            }
            let userData = null;
            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                userData = doc.data();
                userData.role = "member";
                userId = doc.id;
            }
            else if (!querySnapshotAdmin.empty) {
                const doc = querySnapshotAdmin.docs[0];
                userData = doc.data();
                userId = doc.id;
            }
            // Verify password using bcrypt
            if (!userData || !userData.password || !userId) {
                return res.status(401).json({ error: "Invalid credentials." });
            }
            const passwordMatch = await bcrypt_1.default.compare(password, userData.password);
            if (!passwordMatch) {
                return res.status(401).json({ error: "Invalid password." });
            }
            const sessionId = await sessionService_1.SessionService.createSession(userId);
            res.cookie("sessionId", sessionId, {
                sameSite: "strict",
                maxAge: 30 * 24 * 60 * 60 * 1000,
            });
            return res.json(userData);
        }
        catch (err) {
            console.error("Login error:", err);
            return res.status(500).json({ error: "Internal server error." });
        }
    }
    static async recoverPassword(req, res) {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: "Email is required." });
        }
        try {
            // Check if user exists
            const membersRef = (0, db_1.collection)(firebase_1.db, tables_ultis_1.default.members);
            const q = (0, db_1.query)(membersRef, (0, db_1.where)("email", "==", email));
            const querySnapshot = await (0, db_1.getDocs)(q);
            const adminsRef = (0, db_1.collection)(firebase_1.db, tables_ultis_1.default.admins);
            const qAdmin = (0, db_1.query)(adminsRef, (0, db_1.where)("email", "==", email));
            const querySnapshotAdmin = await (0, db_1.getDocs)(qAdmin);
            if (querySnapshot.empty && querySnapshotAdmin.empty) {
                return res.status(404).json({ error: "User not found." });
            }
            // Note: Password reset email functionality needs to be implemented
            // with a local email service (not Google/Firebase)
            // For now, return a message indicating the feature needs implementation
            return res.status(501).json({
                error: "Password reset email functionality needs to be implemented with a local email service."
            });
        }
        catch (error) {
            console.error("Password reset error:", error);
            return res.status(500).json({ error: "Internal server error." });
        }
    }
    static async register(req, res) {
        try {
            const { email, password, price, date, user, ageRange } = req.body;
            if (!email || !password) {
                return res.status(400).json({ error: "All fields are required" });
            }
            const membersRef = (0, db_1.collection)(firebase_1.db, tables_ultis_1.default.members);
            const q = (0, db_1.query)(membersRef, (0, db_1.where)("email", "==", email));
            const querySnapshot = await (0, db_1.getDocs)(q);
            if (!querySnapshot.empty) {
                return res.status(409).json({ error: "email already exists" });
            }
            const adminsRef = (0, db_1.collection)(firebase_1.db, tables_ultis_1.default.admins);
            const qAd = (0, db_1.query)(adminsRef, (0, db_1.where)("email", "==", email));
            const querySnapshotAd = await (0, db_1.getDocs)(qAd);
            if (!querySnapshotAd.empty) {
                return res.status(409).json({ error: "email already exists" });
            }
            const saltRounds = 10;
            const hashedPassword = await bcrypt_1.default.hash(password, saltRounds);
            // Generate unique ID for user
            const uid = (0, uuid_1.v4)();
            const newMember = {
                admin_id: null,
                email,
                ageRange,
                password: hashedPassword,
                price: null,
                date: null,
                created_at: new Date().toISOString()
            };
            await (0, db_1.setDoc)((0, db_1.doc)(firebase_1.db, tables_ultis_1.default.members, uid), newMember);
            res.status(200).json({
                message: "Member created successfully",
                id: uid,
                data: newMember,
            });
        }
        catch (err) {
            console.error(err);
            res.status(500).json({ error: "Error creating member" });
        }
    }
    static async verifyVIP(req, res) {
        let sessionId = req.headers.authorization;
        if (!sessionId) {
            return res.status(401).json({ message: "No session ID provided" });
        }
        sessionId = sessionId.replace("Bearer ", "");
        const RefR = (0, db_1.doc)(firebase_1.db, tables_ultis_1.default.sessions, sessionId);
        const sessionDoc = await (0, db_1.getDoc)(RefR);
        if (!sessionDoc.exists())
            return res.status(404).json({ message: "No session ID provided" });
        const session = sessionDoc.data();
        if (!session) {
            return res.status(404).json({ message: "Invalid session" });
        }
        const RefA = (0, db_1.doc)(firebase_1.db, tables_ultis_1.default.admins, session.userId);
        const adminSnapshot = await (0, db_1.getDoc)(RefA);
        if (adminSnapshot.exists()) {
            return res.status(200).json({ message: "Valid VIP access" });
        }
        const Ref = (0, db_1.doc)(firebase_1.db, tables_ultis_1.default.members, session.userId);
        const Snapshot = await (0, db_1.getDoc)(Ref);
        if (Snapshot.exists()) {
            const data = Snapshot.data();
            const vipDateStr = data.date;
            if (!vipDateStr) {
                res.status(400).json({ message: "No VIP date found" });
                return;
            }
            const vipDate = new Date(vipDateStr);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (vipDate > today) {
                res.status(200).json({ message: "Valid VIP access" });
            }
            else {
                res.status(403).json({ message: "VIP expired" });
            }
        }
        else {
            return res.status(404).json({ message: "Invalid session" });
        }
    }
}
exports.default = UsersController;
