import ConfigController from "../controllers/config.controller";
import authenticateAdmin from "../middleware/authenticateAdmin";
import { Router } from "express";

const configRouter = Router();

configRouter.get('/',
    async (req, res) => {
        await ConfigController.config(req, res);
    });

configRouter.post('/',
    authenticateAdmin,
    async (req, res) => {
        await ConfigController.updateConfig(req, res);
    });


export { configRouter };
