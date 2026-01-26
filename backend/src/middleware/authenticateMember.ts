import { Request, Response, NextFunction } from "express";
import { collection, doc, getDoc, getDocs, query, where } from "../database/db";
import { db } from "../firebase/firebase";
import { SessionService } from "../service/sessionService";
import Tables from "../ultis/tables.ultis";


const authenticateMember = async (req: Request, res: Response, next: NextFunction) => {
    let sessionId = req.headers.authorization;
    if (!sessionId) {
        res.status(401).json({ message: "No session ID provided" });
        return;
    }
    sessionId = sessionId.replace("Bearer ", "");

    try {
        const session = await SessionService.validateSession(sessionId);

        if (!session) {
            res.status(401).json({ message: "Invalid session" });
            return;
        }

        const Ref = doc(db, Tables.members, session.userId);
        const Snapshot = await getDoc(Ref);
        if (Snapshot.exists()) {
            next();
            return;
        }
        const RefA = doc(db, Tables.admins, session.userId);
        const adminSnapshot = await getDoc(RefA);

        if (adminSnapshot.exists()) {
            let data = adminSnapshot.data();
            data.session.userId;
            req.body.user = data;
            next();
        } else {
            res.status(401).json({ message: "Unauthorized: Not an admin" });
        }
    } catch (error) {
        console.error("Error validating session", error);
        res.status(401).json({ message: "Error validating session" });
    }
};

export default authenticateMember;
