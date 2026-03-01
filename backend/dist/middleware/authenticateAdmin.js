"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../database/db");
const firebase_1 = require("../firebase/firebase");
const sessionService_1 = require("../service/sessionService");
const tables_ultis_1 = __importDefault(require("../ultis/tables.ultis"));
const authenticateAdmin = async (req, res, next) => {
    let sessionId = req.headers.authorization;
    if (!sessionId) {
        res.status(401).json({ message: "No session ID provided" });
        return;
    }
    sessionId = sessionId.replace("Bearer ", "");
    try {
        const session = await sessionService_1.SessionService.validateSession(sessionId);
        if (!session) {
            res.status(401).json({ message: "Invalid session" });
            return;
        }
        const Ref = (0, db_1.doc)(firebase_1.db, tables_ultis_1.default.admins, session.userId);
        const adminSnapshot = await (0, db_1.getDoc)(Ref);
        if (adminSnapshot.exists()) {
            let data = adminSnapshot.data();
            data.id = session.userId;
            req.body.user = data;
            next();
        }
        else {
            res.status(401).json({ message: "Unauthorized: Not an admin" });
        }
    }
    catch (error) {
        console.error("Error validating session", error);
        res.status(401).json({ message: "Error validating session" });
    }
};
exports.default = authenticateAdmin;
