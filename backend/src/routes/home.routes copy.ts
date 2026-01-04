import MatchController from "../controllers/match.controller";
import { Router } from "express";

const homeRouter = Router();

homeRouter.get('/matchs', async (req, res) => {
    await MatchController.get2Matchs(req, res);
});

export { homeRouter };
