import { Request, Response, NextFunction } from "express";
import { doc, getDoc } from "../database/db";
import { db } from "../firebase/firebase";
import { SessionService } from "../service/sessionService";
import Tables from "../ultis/tables.ultis";

const authenticateAdmin = async (req: Request, res: Response, next: NextFunction) => {
    let sessionId: any = req.headers.authorization;

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

        const Ref = doc(db, Tables.admins, session.userId);
        const adminSnapshot = await getDoc(Ref);

        if (adminSnapshot.exists()) {
            let data = adminSnapshot.data();
            data.id = session.userId;
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

export default authenticateAdmin;
