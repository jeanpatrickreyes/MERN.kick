import { Request, Response } from "express";
import { db } from "../firebase/firebase";
import { addDoc, collection, deleteDoc, doc, getCountFromServer, getDoc, getDocs, orderBy, query, setDoc, updateDoc, where } from "../database/db";
import Tables from "../ultis/tables.ultis";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";

class AdminController {

    static async members(req: Request, res: Response) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const pageSize = parseInt(req.query.limit as string) || 10;

            const membersRef = collection(db, Tables.members);
            const totalSnapshot = await getCountFromServer(membersRef);
            const total = totalSnapshot.data().count;
            const membersQuery = query(membersRef, orderBy("created_at", "desc"));
            const snapshot = await getDocs(membersQuery);
            const docs = snapshot.docs;
            const start = (page - 1) * pageSize;
            const paginatedDocs = docs.slice(start, start + pageSize).map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    email: data.email,
                    price: data.price,
                    ageRange: data.ageRange,
                    date: data.date,
                    created_at: data.created_at,
                };
            });
            res.json({
                page,
                pageSize,
                total,
                data: paginatedDocs,
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Error" });
        }
    }


    static async createMember(req: Request, res: Response) {
        try {
            const { email, password, price, date, user, ageRange } = req.body;
            if (!email || !password || !price || !date) {
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
                admin_id: user.id,
                email,
                ageRange,
                password: hashedPassword,
                price,
                date,
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

    static async updateMember(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { email, price, date, ageRange } = req.body;

            const memberRef = doc(db, Tables.members, id);
            const memberSnapshot = await getDoc(memberRef);
            if (!memberSnapshot.exists()) {
                return res.status(404).json({ error: "Member not found" });
            }
            const memberData = memberSnapshot.data();
            const membersRef = collection(db, Tables.members);
            const q = query(membersRef, where("email", "==", email));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty && querySnapshot.docs[0].id !== id) {
                return res.status(409).json({ error: "email already exists" });
            }
            const adminsRef = collection(db, Tables.admins);
            const qAd = query(adminsRef, where("email", "==", email));
            const querySnapshotAd = await getDocs(qAd);
            if (!querySnapshotAd.empty) {
                return res.status(409).json({ error: "email already exists" });
            }

            const updatedMember = {
                ageRange: ageRange || memberData.ageRange,
                email: email || memberData.email,
                price: price || memberData.price,
                date: date || memberData.date,
                created_at: memberData.created_at,
            };

            await updateDoc(memberRef, updatedMember);
            res.status(200).json({
                message: "Member updated successfully",
                id,
                data: updatedMember,
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Error updating member" });
        }
    }

    static async deleteMember(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const memberRef = doc(db, Tables.members, id);
            const memberSnapshot = await getDoc(memberRef);
            if (!memberSnapshot.exists()) {
                return res.status(404).json({ error: "Member not found" });
            }

            await deleteDoc(memberRef);
            res.status(200).json({
                message: "Member deleted successfully",
                id,
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Error deleting member" });
        }
    }

    static async admins(req: Request, res: Response) {
        try {
            const { user } = req.body;
            const page = parseInt(req.query.page as string) || 1;
            const pageSize = parseInt(req.query.limit as string) || 10;
            const membersRef = collection(db, Tables.admins);
            const totalSnapshot = await getCountFromServer(membersRef);
            const total = totalSnapshot.data().count;
            const membersQuery = query(membersRef, orderBy("created_at", "desc"));
            const snapshot = await getDocs(membersQuery);
            const docs = snapshot.docs;
            const start = (page - 1) * pageSize;
            const paginatedDocs = docs.slice(start, start + pageSize).map(doc => {
                const data = doc.data();
                return {
                    id: doc.id == user.id ? "1" : doc.id,
                    email: data.email,
                    role: data.role,
                    created_at: data.created_at,
                };
            });
            res.json({
                page,
                pageSize,
                total,
                data: paginatedDocs,
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Error" });
        }
    }
    static async createAdmin(req: Request, res: Response) {
        try {
            const { email, password, role, user } = req.body;

            if (!email || !password || !role) {
                return res.status(400).json({ error: "All fields are required" });
            }
            if (!["admin", "subadmin"].includes(role)) {
                return res.status(400).json({ error: "Invalid role" });
            }

            const adminsRef = collection(db, Tables.admins);
            const q = query(adminsRef, where("email", "==", email));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                return res.status(409).json({ error: "email already exists" });
            }
            const membersRef = collection(db, Tables.members);
            const qm = query(membersRef, where("email", "==", email));
            const querySnapshotM = await getDocs(qm);
            if (!querySnapshotM.empty) {
                return res.status(409).json({ error: "email already exists" });
            }

            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            // Generate unique ID for admin
            const uid = uuidv4();

            const newAdmin = {
                admin_id: user.id,
                email,
                password: hashedPassword,
                role,
                created_at: new Date().toISOString(),
            };

            await setDoc(doc(db, Tables.admins, uid), newAdmin);
            res.status(200).json({
                message: "Admin created successfully",
                id: uid,
                data: newAdmin,
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Error creating admin" });
        }
    }

    static async updateAdmin(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { email } = req.body;
            if (!email) {
                return res.status(400).json({ error: "email and role are required" });
            }
            const adminRef = doc(db, Tables.admins, id);
            const adminSnapshot = await getDoc(adminRef);
            if (!adminSnapshot.exists()) {
                return res.status(404).json({ error: "Admin not found" });
            }
            const adminData = adminSnapshot.data();

            const adminsRef = collection(db, Tables.admins);
            const q = query(adminsRef, where("email", "==", email));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty && querySnapshot.docs[0].id !== id) {
                return res.status(409).json({ error: "email already exists" });
            }
            const membersRef = collection(db, Tables.members);
            const qm = query(membersRef, where("email", "==", email));
            const querySnapshotM = await getDocs(qm);
            if (!querySnapshotM.empty) {
                return res.status(409).json({ error: "email already exists" });
            }

            const updatedAdmin = {
                email: email || adminData.email,
                created_at: adminData.created_at,
            };
            await updateDoc(adminRef, updatedAdmin);
            res.status(200).json({
                message: "Admin updated successfully",
                id,
                data: updatedAdmin,
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Error updating admin" });
        }
    }

    static async deleteAdmin(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const adminRef = doc(db, Tables.admins, id);
            const adminSnapshot = await getDoc(adminRef);
            if (!adminSnapshot.exists()) {
                return res.status(404).json({ error: "Admin not found" });
            }

            await deleteDoc(adminRef);
            res.status(200).json({
                message: "Admin deleted successfully",
                id,
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Error deleting admin" });
        }
    }

    static async updateConfig(req: Request, res: Response) {
        const { instagram, threads, telegram } = req.body;
        try {
            const configRef = doc(db, Tables.config, "config");
            await setDoc(
                configRef,
                {
                    instagram,
                    threads,
                    telegram,
                },
                { merge: true }
            );

            return res.status(200).json({ success: true, message: "Config updated." });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Error " });
        } return res.status(500).json({ error: "Erro " });
    }
}




export default AdminController;