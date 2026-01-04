import authenticateAdmin from "../middleware/authenticateAdmin";
import AdminController from "../controllers/admin.controller";
import { Router } from "express";

const adminRouter = Router();

adminRouter.get('/members',
    authenticateAdmin,
    async (req, res) => {
        await AdminController.members(req, res);
    });
adminRouter.post('/member',
    authenticateAdmin,
    async (req, res) => {
        await AdminController.createMember(req, res);
    });
adminRouter.put('/member/:id',
    authenticateAdmin,
    async (req, res) => {
        await AdminController.updateMember(req, res);
    });
adminRouter.delete('/member/:id',
    authenticateAdmin,
    async (req, res) => {
        await AdminController.deleteMember(req, res);
    });

adminRouter.get('/admins',
    authenticateAdmin,
    async (req, res) => {
        await AdminController.admins(req, res);
    });
adminRouter.post('/admin',
    authenticateAdmin,
    async (req, res) => {
        await AdminController.createAdmin(req, res);
    });
adminRouter.put('/admin/:id',
    authenticateAdmin,
    async (req, res) => {
        await AdminController.updateAdmin(req, res);
    });
adminRouter.delete('/admin/:id',
    authenticateAdmin,
    async (req, res) => {
        await AdminController.deleteAdmin(req, res);
    });



export { adminRouter };
