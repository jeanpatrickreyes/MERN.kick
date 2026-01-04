import UsersController from "../controllers/users.controller";
import { Router } from "express";

const usersRouter = Router();

usersRouter.post('/login', async (req, res) => {
    await UsersController.login(req, res);
});
usersRouter.post('/recover-password', async (req, res) => {
    await UsersController.recoverPassword(req, res);
});
usersRouter.post('/register', async (req, res) => {
    await UsersController.register(req, res);
});
usersRouter.get('/verify/vip', async (req, res) => {
    await UsersController.verifyVIP(req, res);
});

export { usersRouter };
