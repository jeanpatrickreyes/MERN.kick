import { Request, Response } from "express";
import { auth, db } from "../firebase/firebase";
import { collection, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore";
import bcrypt from "bcrypt";
import { SessionService } from "../service/sessionService";
import Tables from "../ultis/tables.ultis";
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";

class UsersController {

    static async login(req: Request, res: Response) {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "email and password are required." });
        }
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            let userId: string;
            const membersRefAdmin = collection(db, Tables.admins);
            const qAdmin = query(membersRefAdmin, where("email", "==", email));
            const querySnapshotAdmin = await getDocs(qAdmin);

            const membersRef = collection(db, Tables.members);
            const q = query(membersRef, where("email", "==", email));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty && querySnapshotAdmin.empty) {
                return res.status(404).json({ error: "User not found." });
            }
            let userData: any = null;
            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                userData = doc.data();
                userData.role = "member";
                userId = doc.id;
            } else {
                const doc = querySnapshotAdmin.docs[0];
                userData = doc.data();
                userId = doc.id;
            }
            /*
                        const passwordMatch = await bcrypt.compare(password, userData.password);
                        if (!passwordMatch) {
                            return res.status(401).json({ error: "Invalid password." });
                        }*/

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
            await sendPasswordResetEmail(auth, email);
            return res.json({ message: "Password reset email sent." });
        } catch (error: any) {
            console.error("Password reset error:", error);
            if (error.code === 'auth/user-not-found') {
                return res.status(404).json({ error: "User not found." });
            } else if (error.code === 'auth/invalid-email') {
                return res.status(400).json({ error: "Invalid email format." });
            }
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

            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const uid = userCredential.user.uid;

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