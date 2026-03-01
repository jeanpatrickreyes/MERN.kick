"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const firebase_1 = require("../firebase/firebase");
const db_1 = require("../database/db");
const tables_ultis_1 = __importDefault(require("../ultis/tables.ultis"));
class ConfigController {
    static async config(req, res) {
        try {
            const configRef = (0, db_1.doc)(firebase_1.db, tables_ultis_1.default.config, tables_ultis_1.default.config);
            const configSnap = await (0, db_1.getDoc)(configRef);
            if (!configSnap.exists()) {
                // Return default config if not found
                const defaultConfig = {
                    instagram: '',
                    threads: '',
                    telegram: '',
                    whatsapp: 'https://wa.me/85266750460',
                    message: ''
                };
                // Create the default config in database
                await (0, db_1.setDoc)(configRef, defaultConfig);
                return res.status(200).json(defaultConfig);
            }
            return res.status(200).json(configSnap.data());
        }
        catch (err) {
            console.error(err);
            res.status(500).json({ error: "Error fetching config." });
        }
    }
    static async updateConfig(req, res) {
        const { instagram, threads, telegram, whatsapp, message } = req.body;
        try {
            const configRef = (0, db_1.doc)(firebase_1.db, tables_ultis_1.default.config, tables_ultis_1.default.config);
            await (0, db_1.setDoc)(configRef, {
                instagram,
                threads,
                telegram,
                whatsapp,
                message
            }, { merge: true });
            return res.status(200).json({ success: true, message: "Config updated." });
        }
        catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Error updating config." });
        }
    }
}
exports.default = ConfigController;
