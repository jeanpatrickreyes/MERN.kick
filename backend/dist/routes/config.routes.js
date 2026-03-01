"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configRouter = void 0;
const config_controller_1 = __importDefault(require("../controllers/config.controller"));
const authenticateAdmin_1 = __importDefault(require("../middleware/authenticateAdmin"));
const express_1 = require("express");
const configRouter = (0, express_1.Router)();
exports.configRouter = configRouter;
configRouter.get('/', async (req, res) => {
    await config_controller_1.default.config(req, res);
});
configRouter.post('/', authenticateAdmin_1.default, async (req, res) => {
    await config_controller_1.default.updateConfig(req, res);
});
