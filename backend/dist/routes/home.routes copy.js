"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.homeRouter = void 0;
const match_controller_1 = __importDefault(require("../controllers/match.controller"));
const express_1 = require("express");
const homeRouter = (0, express_1.Router)();
exports.homeRouter = homeRouter;
homeRouter.get('/matchs', async (req, res) => {
    await match_controller_1.default.get2Matchs(req, res);
});
