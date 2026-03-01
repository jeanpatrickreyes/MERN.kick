"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const firebase_1 = require("../firebase/firebase");
const db_1 = require("../database/db");
const tables_ultis_1 = __importDefault(require("../ultis/tables.ultis"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
class RecordController {
    static async record(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const pageSize = parseInt(req.query.limit) || 10;
            const recordsRef = (0, db_1.collection)(firebase_1.db, tables_ultis_1.default.records);
            const totalSnapshot = await (0, db_1.getCountFromServer)(recordsRef);
            const total = totalSnapshot.data().count;
            const recordsQuery = (0, db_1.query)(recordsRef, (0, db_1.orderBy)("created_at", "desc"));
            const snapshot = await (0, db_1.getDocs)(recordsQuery);
            const docs = snapshot.docs;
            const start = (page - 1) * pageSize;
            const paginatedDocs = docs.slice(start, start + pageSize).map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    title: data.title,
                    media: data.media,
                    date: data.date,
                    description: data.description,
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
    static async createRecord(req, res) {
        try {
            const { description, title, date, user } = req.body;
            const media = req.files ? req.files : null;
            let mediaPaths = [];
            if (media && Array.isArray(media)) {
                mediaPaths = media.map(file => `/uploads/${file.filename}`);
            }
            else if (media) {
                mediaPaths.push(`/uploads/${media.filename}`);
            }
            const newRecord = {
                description: description,
                title: title,
                date: date ? new Date(date).toISOString() : new Date().toISOString(),
                media: mediaPaths,
                created_at: new Date().toISOString(),
            };
            const recordRef = await (0, db_1.addDoc)((0, db_1.collection)(firebase_1.db, tables_ultis_1.default.records), newRecord);
            res.json({
                message: "Record added successfully",
                id: recordRef.id,
                data: newRecord,
            });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ error: "Error" });
        }
    }
    ;
    static async updateRecord(req, res) {
        try {
            const recordId = req.params.id;
            const updates = req.body;
            const media = req.files ? req.files : null;
            const recordRef = (0, db_1.doc)(firebase_1.db, tables_ultis_1.default.records, recordId);
            const recordSnap = await (0, db_1.getDoc)(recordRef);
            if (!recordSnap.exists()) {
                return res.status(404).json({ message: "Record not found" });
            }
            let mediaPaths = [];
            if (updates.mediaPaths) {
                try {
                    mediaPaths = JSON.parse(updates.mediaPaths);
                }
                catch (err) {
                    mediaPaths = [];
                }
            }
            let newPaths = [];
            if (media && Array.isArray(media)) {
                newPaths = media.map(file => `/uploads/${file.filename}`);
            }
            else if (media) {
                newPaths.push(`/uploads/${media.filename}`);
            }
            mediaPaths = [...mediaPaths, ...newPaths];
            if (mediaPaths.length > 5) {
                mediaPaths = mediaPaths.slice(-5);
            }
            const updatedData = {
                ...updates,
                media: mediaPaths,
                updated_at: new Date().toISOString(),
            };
            delete updatedData.mediaPaths;
            await (0, db_1.updateDoc)(recordRef, updatedData);
            res.json({
                message: "Record updated successfully",
                data: { id: recordId, ...updatedData },
            });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({
                message: "Error updating record",
                error: error.message,
            });
        }
    }
    static async deleteRecord(req, res) {
        try {
            const recordId = req.params.id;
            const recordRef = (0, db_1.doc)(firebase_1.db, tables_ultis_1.default.records, recordId);
            const recordSnap = await (0, db_1.getDoc)(recordRef);
            if (!recordSnap.exists()) {
                return res.status(404).json({ message: "Record not found" });
            }
            const record = recordSnap.data();
            if (record.media && Array.isArray(record.media)) {
                record.media.forEach((filePath) => {
                    const fullPath = path_1.default.join(__dirname, "..", filePath);
                    if (fs_1.default.existsSync(fullPath)) {
                        fs_1.default.unlinkSync(fullPath);
                    }
                });
            }
            await (0, db_1.deleteDoc)(recordRef);
            res.status(200).json({ message: "Record deleted successfully" });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({
                message: "Error deleting record",
                error: error.message,
            });
        }
    }
}
exports.default = RecordController;
