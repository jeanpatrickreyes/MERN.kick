"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersRouter = void 0;
const users_controller_1 = __importDefault(require("../controllers/users.controller"));
const express_1 = require("express");
const usersRouter = (0, express_1.Router)();
exports.usersRouter = usersRouter;
usersRouter.post('/login', async (req, res) => {
    await users_controller_1.default.login(req, res);
});
usersRouter.post('/recover-password', async (req, res) => {
    await users_controller_1.default.recoverPassword(req, res);
});
usersRouter.post('/register', async (req, res) => {
    await users_controller_1.default.register(req, res);
});
usersRouter.get('/verify/vip', async (req, res) => {
    await users_controller_1.default.verifyVIP(req, res);
});
