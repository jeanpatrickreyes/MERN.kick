import MatchController from "../controllers/match.controller";
import { Router } from "express";

const matchRouter = Router();

matchRouter.get('/match-data', async (req, res) => {
    await MatchController.getMatchs(req, res);
});

matchRouter.get('/match-data/:id', async (req, res) => {
    await MatchController.getMatchDetails(req, res);
});

matchRouter.get('/match-analyze/:id', async (req, res) => {
    await MatchController.analyzeMatch(req, res);
});

matchRouter.get('/match-data/generate/:id',
    async (req, res) => {
        await MatchController.excelGenerate(req, res);
    });


matchRouter.get('/match-data/all/generate',
    async (req, res) => {
        await MatchController.excelGenerateAll(req, res);
    });



export { matchRouter };
