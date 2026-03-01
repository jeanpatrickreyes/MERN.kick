"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const firebase_1 = require("../firebase/firebase");
const db_1 = require("../database/db");
const tables_ultis_1 = __importDefault(require("../ultis/tables.ultis"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const uuid_1 = require("uuid");
class AdminController {
    static async members(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const pageSize = parseInt(req.query.limit) || 10;
            const membersRef = (0, db_1.collection)(firebase_1.db, tables_ultis_1.default.members);
            const totalSnapshot = await (0, db_1.getCountFromServer)(membersRef);
            const total = totalSnapshot.data().count;
            const membersQuery = (0, db_1.query)(membersRef, (0, db_1.orderBy)("created_at", "desc"));
            const snapshot = await (0, db_1.getDocs)(membersQuery);
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
        }
        catch (err) {
            console.error(err);
            res.status(500).json({ error: "Error" });
        }
    }
    static async createMember(req, res) {
        try {
            const { email, password, price, date, user, ageRange } = req.body;
            if (!email || !password || !price || !date) {
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
                admin_id: user.id,
                email,
                ageRange,
                password: hashedPassword,
                price,
                date,
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
    static async updateMember(req, res) {
        try {
            const { id } = req.params;
            const { email, price, date, ageRange } = req.body;
            const memberRef = (0, db_1.doc)(firebase_1.db, tables_ultis_1.default.members, id);
            const memberSnapshot = await (0, db_1.getDoc)(memberRef);
            if (!memberSnapshot.exists()) {
                return res.status(404).json({ error: "Member not found" });
            }
            const memberData = memberSnapshot.data();
            const membersRef = (0, db_1.collection)(firebase_1.db, tables_ultis_1.default.members);
            const q = (0, db_1.query)(membersRef, (0, db_1.where)("email", "==", email));
            const querySnapshot = await (0, db_1.getDocs)(q);
            if (!querySnapshot.empty && querySnapshot.docs[0].id !== id) {
                return res.status(409).json({ error: "email already exists" });
            }
            const adminsRef = (0, db_1.collection)(firebase_1.db, tables_ultis_1.default.admins);
            const qAd = (0, db_1.query)(adminsRef, (0, db_1.where)("email", "==", email));
            const querySnapshotAd = await (0, db_1.getDocs)(qAd);
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
            await (0, db_1.updateDoc)(memberRef, updatedMember);
            res.status(200).json({
                message: "Member updated successfully",
                id,
                data: updatedMember,
            });
        }
        catch (err) {
            console.error(err);
            res.status(500).json({ error: "Error updating member" });
        }
    }
    static async deleteMember(req, res) {
        try {
            const { id } = req.params;
            const memberRef = (0, db_1.doc)(firebase_1.db, tables_ultis_1.default.members, id);
            const memberSnapshot = await (0, db_1.getDoc)(memberRef);
            if (!memberSnapshot.exists()) {
                return res.status(404).json({ error: "Member not found" });
            }
            await (0, db_1.deleteDoc)(memberRef);
            res.status(200).json({
                message: "Member deleted successfully",
                id,
            });
        }
        catch (err) {
            console.error(err);
            res.status(500).json({ error: "Error deleting member" });
        }
    }
    static async admins(req, res) {
        try {
            const { user } = req.body;
            const page = parseInt(req.query.page) || 1;
            const pageSize = parseInt(req.query.limit) || 10;
            const membersRef = (0, db_1.collection)(firebase_1.db, tables_ultis_1.default.admins);
            const totalSnapshot = await (0, db_1.getCountFromServer)(membersRef);
            const total = totalSnapshot.data().count;
            const membersQuery = (0, db_1.query)(membersRef, (0, db_1.orderBy)("created_at", "desc"));
            const snapshot = await (0, db_1.getDocs)(membersQuery);
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
        }
        catch (err) {
            console.error(err);
            res.status(500).json({ error: "Error" });
        }
    }
    static async createAdmin(req, res) {
        try {
            const { email, password, role, user } = req.body;
            if (!email || !password || !role) {
                return res.status(400).json({ error: "All fields are required" });
            }
            if (!["admin", "subadmin"].includes(role)) {
                return res.status(400).json({ error: "Invalid role" });
            }
            const adminsRef = (0, db_1.collection)(firebase_1.db, tables_ultis_1.default.admins);
            const q = (0, db_1.query)(adminsRef, (0, db_1.where)("email", "==", email));
            const querySnapshot = await (0, db_1.getDocs)(q);
            if (!querySnapshot.empty) {
                return res.status(409).json({ error: "email already exists" });
            }
            const membersRef = (0, db_1.collection)(firebase_1.db, tables_ultis_1.default.members);
            const qm = (0, db_1.query)(membersRef, (0, db_1.where)("email", "==", email));
            const querySnapshotM = await (0, db_1.getDocs)(qm);
            if (!querySnapshotM.empty) {
                return res.status(409).json({ error: "email already exists" });
            }
            const saltRounds = 10;
            const hashedPassword = await bcrypt_1.default.hash(password, saltRounds);
            // Generate unique ID for admin
            const uid = (0, uuid_1.v4)();
            const newAdmin = {
                admin_id: user.id,
                email,
                password: hashedPassword,
                role,
                created_at: new Date().toISOString(),
            };
            await (0, db_1.setDoc)((0, db_1.doc)(firebase_1.db, tables_ultis_1.default.admins, uid), newAdmin);
            res.status(200).json({
                message: "Admin created successfully",
                id: uid,
                data: newAdmin,
            });
        }
        catch (err) {
            console.error(err);
            res.status(500).json({ error: "Error creating admin" });
        }
    }
    static async updateAdmin(req, res) {
        try {
            const { id } = req.params;
            const { email } = req.body;
            if (!email) {
                return res.status(400).json({ error: "email and role are required" });
            }
            const adminRef = (0, db_1.doc)(firebase_1.db, tables_ultis_1.default.admins, id);
            const adminSnapshot = await (0, db_1.getDoc)(adminRef);
            if (!adminSnapshot.exists()) {
                return res.status(404).json({ error: "Admin not found" });
            }
            const adminData = adminSnapshot.data();
            const adminsRef = (0, db_1.collection)(firebase_1.db, tables_ultis_1.default.admins);
            const q = (0, db_1.query)(adminsRef, (0, db_1.where)("email", "==", email));
            const querySnapshot = await (0, db_1.getDocs)(q);
            if (!querySnapshot.empty && querySnapshot.docs[0].id !== id) {
                return res.status(409).json({ error: "email already exists" });
            }
            const membersRef = (0, db_1.collection)(firebase_1.db, tables_ultis_1.default.members);
            const qm = (0, db_1.query)(membersRef, (0, db_1.where)("email", "==", email));
            const querySnapshotM = await (0, db_1.getDocs)(qm);
            if (!querySnapshotM.empty) {
                return res.status(409).json({ error: "email already exists" });
            }
            const updatedAdmin = {
                email: email || adminData.email,
                created_at: adminData.created_at,
            };
            await (0, db_1.updateDoc)(adminRef, updatedAdmin);
            res.status(200).json({
                message: "Admin updated successfully",
                id,
                data: updatedAdmin,
            });
        }
        catch (err) {
            console.error(err);
            res.status(500).json({ error: "Error updating admin" });
        }
    }
    static async deleteAdmin(req, res) {
        try {
            const { id } = req.params;
            const adminRef = (0, db_1.doc)(firebase_1.db, tables_ultis_1.default.admins, id);
            const adminSnapshot = await (0, db_1.getDoc)(adminRef);
            if (!adminSnapshot.exists()) {
                return res.status(404).json({ error: "Admin not found" });
            }
            await (0, db_1.deleteDoc)(adminRef);
            res.status(200).json({
                message: "Admin deleted successfully",
                id,
            });
        }
        catch (err) {
            console.error(err);
            res.status(500).json({ error: "Error deleting admin" });
        }
    }
    static async updateConfig(req, res) {
        const { instagram, threads, telegram } = req.body;
        try {
            const configRef = (0, db_1.doc)(firebase_1.db, tables_ultis_1.default.config, "config");
            await (0, db_1.setDoc)(configRef, {
                instagram,
                threads,
                telegram,
            }, { merge: true });
            return res.status(200).json({ success: true, message: "Config updated." });
        }
        catch (err) {
            console.error(err);
            res.status(500).json({ error: "Error " });
        }
        return res.status(500).json({ error: "Erro " });
    }
}
exports.default = AdminController;
