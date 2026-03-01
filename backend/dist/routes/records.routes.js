"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordsRouter = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const multer_1 = __importDefault(require("multer"));
const express_1 = require("express");
const record_controller_1 = __importDefault(require("../controllers/record.controller"));
const authenticateAdmin_1 = __importDefault(require("../middleware/authenticateAdmin"));
const uploadDir = path_1.default.resolve(__dirname, "..", "uploads");
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir);
}
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}${path_1.default.extname(file.originalname)}`);
    },
});
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/gif",
        "video/mp4"
    ];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error("Unsupported file type. Only images and MP4 videos are allowed."));
    }
};
const upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024
    }
});
const recordsRouter = (0, express_1.Router)();
exports.recordsRouter = recordsRouter;
recordsRouter.post('/', authenticateAdmin_1.default, upload.array('media'), async (req, res) => {
    await record_controller_1.default.createRecord(req, res);
});
recordsRouter.get('/', async (req, res) => {
    await record_controller_1.default.record(req, res);
});
recordsRouter.post("/:id", authenticateAdmin_1.default, upload.array('media'), async (req, res) => {
    await record_controller_1.default.updateRecord(req, res);
});
recordsRouter.delete("/:id", authenticateAdmin_1.default, upload.array('media'), async (req, res) => {
    await record_controller_1.default.deleteRecord(req, res);
});
