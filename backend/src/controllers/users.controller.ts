import { Request, Response } from "express";
import { db } from "../firebase/firebase";
import { collection, doc, getDoc, getDocs, query, setDoc, where } from "../database/db";
import bcrypt from "bcrypt";
import { SessionService } from "../service/sessionService";
import Tables from "../ultis/tables.ultis";
import { AuthService } from "../service/authService";
import { v4 as uuidv4 } from "uuid";

class UsersController {

    static async login(req: Request, res: Response) {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "email and password are required." });
        }
        try {
            let userId: string | undefined;
            // Normalize email to lowercase for comparison
            const normalizedEmail = email.toLowerCase().trim();
            
            console.log("[Login] Searching for email:", normalizedEmail);
            
            const membersRefAdmin = collection(db, Tables.admins);
            const qAdmin = query(membersRefAdmin, where("email", "==", normalizedEmail));
            const querySnapshotAdmin = await getDocs(qAdmin);
            console.log("[Login] Admin query results:", querySnapshotAdmin.empty ? "empty" : `${querySnapshotAdmin.docs.length} found`);

            const membersRef = collection(db, Tables.members);
            const q = query(membersRef, where("email", "==", normalizedEmail));
            const querySnapshot = await getDocs(q);
            console.log("[Login] Member query results:", querySnapshot.empty ? "empty" : `${querySnapshot.docs.length} found`);

            if (querySnapshot.empty && querySnapshotAdmin.empty) {
                // Try case-insensitive search as fallback
                console.log("[Login] No exact match found, trying case-insensitive search...");
                const allAdminsRef = collection(db, Tables.admins);
                const allAdminsSnapshot = await getDocs(allAdminsRef);
                const allMembersRef = collection(db, Tables.members);
                const allMembersSnapshot = await getDocs(allMembersRef);
                
                console.log("[Login] Total admins in DB:", allAdminsSnapshot.docs.length);
                console.log("[Login] Total members in DB:", allMembersSnapshot.docs.length);
                
                // Log all emails for debugging
                allAdminsSnapshot.docs.forEach((doc, idx) => {
                    const email = doc.data().email;
                    console.log(`[Login] Admin ${idx} email: "${email}" (normalized: "${email?.toLowerCase().trim()}")`);
                });
                
                const adminMatch = allAdminsSnapshot.docs.find(doc => {
                    const docEmail = doc.data().email;
                    if (!docEmail) return false;
                    const match = docEmail.toLowerCase().trim() === normalizedEmail;
                    if (match) console.log(`[Login] Found admin match: "${docEmail}"`);
                    return match;
                });
                const memberMatch = allMembersSnapshot.docs.find(doc => {
                    const docEmail = doc.data().email;
                    if (!docEmail) return false;
                    const match = docEmail.toLowerCase().trim() === normalizedEmail;
                    if (match) console.log(`[Login] Found member match: "${docEmail}"`);
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
                    const passwordMatch = await bcrypt.compare(password, userData.password);
                    if (!passwordMatch) {
                        return res.status(401).json({ error: "Invalid password." });
                    }
                    const sessionId = await SessionService.createSession(userId);
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
                            role: userData.role || 'admin'
                        },
                        sessionId
                    });
                } else {
                    const doc = memberMatch!;
                    const userData = doc.data();
                    userId = doc.id;
                    const passwordMatch = await bcrypt.compare(password, userData.password);
                    if (!passwordMatch) {
                        return res.status(401).json({ error: "Invalid password." });
                    }
                    const sessionId = await SessionService.createSession(userId);
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
            let userData: any = null;
            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                userData = doc.data();
                userData.role = "member";
                userId = doc.id;
            } else if (!querySnapshotAdmin.empty) {
                const doc = querySnapshotAdmin.docs[0];
                userData = doc.data();
                userId = doc.id;
            }

            // Verify password using bcrypt
            if (!userData || !userData.password || !userId) {
                return res.status(401).json({ error: "Invalid credentials." });
            }
            
            const passwordMatch = await bcrypt.compare(password, userData.password);
            if (!passwordMatch) {
                return res.status(401).json({ error: "Invalid password." });
            }

            const sessionId = await SessionService.createSession(userId);
            res.cookie("sessionId", sessionId, {
                sameSite: "strict",
                maxAge: 30 * 24 * 60 * 60 * 1000,
            });

            return res.json(userData);
        } catch (err) {
            console.error("Login error:", err);
            return res.status(500).json({ error: "Internal server error." });
        }
    }
    static async recoverPassword(req: Request, res: Response) {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: "Email is required." });
        }

        try {
            // Check if user exists
            const membersRef = collection(db, Tables.members);
            const q = query(membersRef, where("email", "==", email));
            const querySnapshot = await getDocs(q);
            
            const adminsRef = collection(db, Tables.admins);
            const qAdmin = query(adminsRef, where("email", "==", email));
            const querySnapshotAdmin = await getDocs(qAdmin);

            if (querySnapshot.empty && querySnapshotAdmin.empty) {
                return res.status(404).json({ error: "User not found." });
            }

            // Note: Password reset email functionality needs to be implemented
            // with a local email service (not Google/Firebase)
            // For now, return a message indicating the feature needs implementation
            return res.status(501).json({ 
                error: "Password reset email functionality needs to be implemented with a local email service." 
            });
        } catch (error: any) {
            console.error("Password reset error:", error);
            return res.status(500).json({ error: "Internal server error." });
        }
    }

    static async register(req: Request, res: Response) {
        try {
            const { email, password, price, date, user, ageRange } = req.body;
            if (!email || !password) {
                return res.status(400).json({ error: "All fields are required" });
            }

            const membersRef = collection(db, Tables.members);

            const q = query(membersRef, where("email", "==", email));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                return res.status(409).json({ error: "email already exists" });
            }
            const adminsRef = collection(db, Tables.admins);
            const qAd = query(adminsRef, where("email", "==", email));
            const querySnapshotAd = await getDocs(qAd);
            if (!querySnapshotAd.empty) {
                return res.status(409).json({ error: "email already exists" });
            }

            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            // Generate unique ID for user
            const uid = uuidv4();

            const newMember = {
                admin_id: null,
                email,
                ageRange,
                password: hashedPassword,
                price: null,
                date: null,
                created_at: new Date().toISOString()
            };

            await setDoc(doc(db, Tables.members, uid), newMember);
            res.status(200).json({
                message: "Member created successfully",
                id: uid,
                data: newMember,
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Error creating member" });
        }
    }

    static async verifyVIP(req: Request, res: Response) {
        let sessionId = req.headers.authorization;
        if (!sessionId) {
            return res.status(401).json({ message: "No session ID provided" });
        }
        sessionId = sessionId.replace("Bearer ", "");

        const RefR = doc(db, Tables.sessions, sessionId);
        const sessionDoc = await getDoc(RefR);
        if (!sessionDoc.exists()) return res.status(404).json({ message: "No session ID provided" });
        const session = sessionDoc.data();

        if (!session) {
            return res.status(404).json({ message: "Invalid session" });
        }

        const RefA = doc(db, Tables.admins, session.userId);
        const adminSnapshot = await getDoc(RefA);
        if (adminSnapshot.exists()) {
            return res.status(200).json({ message: "Valid VIP access" });
        }


        const Ref = doc(db, Tables.members, session.userId);
        const Snapshot = await getDoc(Ref);
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
            } else {
                res.status(403).json({ message: "VIP expired" });
            }
        } else {
            return res.status(404).json({ message: "Invalid session" });
        }
    }

}

export default UsersController;