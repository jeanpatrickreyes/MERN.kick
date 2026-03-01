"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRouter = void 0;
const authenticateAdmin_1 = __importDefault(require("../middleware/authenticateAdmin"));
const admin_controller_1 = __importDefault(require("../controllers/admin.controller"));
const express_1 = require("express");
const adminRouter = (0, express_1.Router)();
exports.adminRouter = adminRouter;
adminRouter.get('/members', authenticateAdmin_1.default, async (req, res) => {
    await admin_controller_1.default.members(req, res);
});
adminRouter.post('/member', authenticateAdmin_1.default, async (req, res) => {
    await admin_controller_1.default.createMember(req, res);
});
adminRouter.put('/member/:id', authenticateAdmin_1.default, async (req, res) => {
    await admin_controller_1.default.updateMember(req, res);
});
adminRouter.delete('/member/:id', authenticateAdmin_1.default, async (req, res) => {
    await admin_controller_1.default.deleteMember(req, res);
});
adminRouter.get('/admins', authenticateAdmin_1.default, async (req, res) => {
    await admin_controller_1.default.admins(req, res);
});
adminRouter.post('/admin', authenticateAdmin_1.default, async (req, res) => {
    await admin_controller_1.default.createAdmin(req, res);
});
adminRouter.put('/admin/:id', authenticateAdmin_1.default, async (req, res) => {
    await admin_controller_1.default.updateAdmin(req, res);
});
adminRouter.delete('/admin/:id', authenticateAdmin_1.default, async (req, res) => {
    await admin_controller_1.default.deleteAdmin(req, res);
});
