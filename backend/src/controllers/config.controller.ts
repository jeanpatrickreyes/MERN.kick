import { Request, Response } from "express";
import { db } from "../firebase/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import Tables from "../ultis/tables.ultis";

class ConfigController {

    static async config(req: Request, res: Response) {
        try {
            const configRef = doc(db, Tables.config, Tables.config);
            const configSnap = await getDoc(configRef);

            if (!configSnap.exists()) {
                return res.status(404).json({ error: "Config not found." });
            }

            return res.status(200).json(configSnap.data());
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Error fetching config." });
        }
    }

    static async updateConfig(req: Request, res: Response) {
        const { instagram, threads, telegram, whatsapp, message } = req.body;
        try {
            const configRef = doc(db, Tables.config, Tables.config);
            await setDoc(
                configRef,
                {
                    instagram,
                    threads,
                    telegram,
                    whatsapp,
                    message
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




export default ConfigController;