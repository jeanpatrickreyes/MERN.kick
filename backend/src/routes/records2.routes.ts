import path from "path";
import fs from "fs";
import multer, { FileFilterCallback } from "multer";
import { Router, Request, Response } from "express";
import RecordController from "../controllers/record.controller";
import authenticateAdmin from "../middleware/authenticateAdmin";

const uploadDir = path.resolve(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: (req: Request, file: any, cb: any) => {
        cb(null, uploadDir);
    },
    filename: (req: Request, file: any, cb: any) => {
        cb(null, `${Date.now()}${path.extname(file.originalname)}`);
    },
});

const fileFilter = (req: Request, file: any, cb: FileFilterCallback) => {
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
    } else {
        cb(new Error("Unsupported file type. Only images and MP4 videos are allowed."));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 200 * 1024 * 1024, // 200MB limit for videos
        fieldSize: 200 * 1024 * 1024, // 200MB for fields
    }
});

const records2Router = Router();

records2Router.post('/',
    authenticateAdmin,
    upload.array('media'), async (req: Request, res: Response) => {
        req.body.table = "records2";
        await RecordController.createRecord(req, res);
    });

records2Router.get('/', async (req: Request, res: Response) => {
    req.query.table = "records2";
    await RecordController.record(req, res);
});

records2Router.post(
    "/:id",
    authenticateAdmin,
    upload.array('media'), async (req: Request, res: Response) => {
        req.body.table = "records2";
        await RecordController.updateRecord(req, res);
    });

records2Router.delete(
    "/:id",
    authenticateAdmin,
    upload.array('media'), async (req: Request, res: Response) => {
        req.query.table = "records2";
        await RecordController.deleteRecord(req, res);
    });

export { records2Router };
