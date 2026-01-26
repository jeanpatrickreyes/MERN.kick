import { Request, Response } from "express";
import { db } from "../firebase/firebase";
import { doc, getDoc, setDoc } from "../database/db";
import Tables from "../ultis/tables.ultis";

class ConfigController {

    static async config(req: Request, res: Response) {
        try {
            const configRef = doc(db, Tables.config, Tables.config);
            const configSnap = await getDoc(configRef);

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
                await setDoc(configRef, defaultConfig);
                return res.status(200).json(defaultConfig);
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
            return res.status(500).json({ error: "Error updating config." });
        }
    }
}




export default ConfigController;