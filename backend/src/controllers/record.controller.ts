import { Request, Response } from "express";
import { db } from "../firebase/firebase";
import { addDoc, collection, deleteDoc, doc, getCountFromServer, getDoc, getDocs, orderBy, query, updateDoc, } from "../database/db";
import Tables from "../ultis/tables.ultis";
import path from "path";
import fs from "fs";

class RecordController {

    static async record(req: Request, res: Response) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const pageSize = parseInt(req.query.limit as string) || 10;

            const recordsRef = collection(db, Tables.records);
            const totalSnapshot = await getCountFromServer(recordsRef);
            const total = totalSnapshot.data().count;
            const recordsQuery = query(recordsRef, orderBy("created_at", "desc"));
            const snapshot = await getDocs(recordsQuery);
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
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Error" });
        }
    }

    static async createRecord(req: Request, res: Response) {
        try {
            const { description, title, date, user } = req.body;
            const media = req.files ? req.files : null;

            let mediaPaths: string[] = [];
            if (media && Array.isArray(media)) {
                mediaPaths = media.map(file => `/uploads/${file.filename}`);
            } else if (media) {
                mediaPaths.push(`/uploads/${(media as any).filename}`);
            }

            const newRecord = {
                description: description,
                title: title,
                date: date ? new Date(date).toISOString() : new Date().toISOString(),
                media: mediaPaths,
                created_at: new Date().toISOString(),
            };

            const recordRef = await addDoc(collection(db, Tables.records), newRecord);

            res.json({
                message: "Record added successfully",
                id: recordRef.id,
                data: newRecord,
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Error" });
        }
    };


    static async updateRecord(req: Request, res: Response) {
        try {
            const recordId = req.params.id;
            const updates = req.body;
            const media = req.files ? req.files : null;

            const recordRef = doc(db, Tables.records, recordId);
            const recordSnap = await getDoc(recordRef);

            if (!recordSnap.exists()) {
                return res.status(404).json({ message: "Record not found" });
            }

            let mediaPaths: string[] = [];
            if (updates.mediaPaths) {
                try {
                    mediaPaths = JSON.parse(updates.mediaPaths);
                } catch (err) {
                    mediaPaths = [];
                }
            }
            let newPaths: string[] = [];
            if (media && Array.isArray(media)) {
                newPaths = media.map(file => `/uploads/${file.filename}`);
            } else if (media) {
                newPaths.push(`/uploads/${(media as any).filename}`);
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
            await updateDoc(recordRef, updatedData);
            res.json({
                message: "Record updated successfully",
                data: { id: recordId, ...updatedData },
            });
        } catch (error: any) {
            console.error(error);
            res.status(500).json({
                message: "Error updating record",
                error: error.message,
            });
        }
    }


    static async deleteRecord(req: Request, res: Response) {
        try {
            const recordId = req.params.id;
            const recordRef = doc(db, Tables.records, recordId);
            const recordSnap = await getDoc(recordRef);

            if (!recordSnap.exists()) {
                return res.status(404).json({ message: "Record not found" });
            }

            const record = recordSnap.data();

            if (record.media && Array.isArray(record.media)) {
                record.media.forEach((filePath: string) => {
                    const fullPath = path.join(__dirname, "..", filePath);
                    if (fs.existsSync(fullPath)) {
                        fs.unlinkSync(fullPath);
                    }
                });
            }

            await deleteDoc(recordRef);

            res.status(200).json({ message: "Record deleted successfully" });
        } catch (error: any) {
            console.error(error);
            res.status(500).json({
                message: "Error deleting record",
                error: error.message,
            });
        }
    }


}

export default RecordController;