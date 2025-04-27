import { Request, Response } from "express";
import { mkdirSync, } from "fs";
import multer from "multer";

function UUID(length: number = 32) {
    const UUIDChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let charLength = UUIDChars.length;
    let key = "";

    for (let i = 0; i < length; i++) {
        key += UUIDChars.charAt(Math.floor(Math.random() * charLength));
    };

    return key;
};

const root = process.cwd();

export default async function PostToPath(req: Request, res: Response) {
    const upload = multer({
        storage: multer.diskStorage({
            destination: (req: Request, _: any, cb: Function) => {
                const path = req.params.path;

                if (path == null || path.length < 1) {
                    cb(new Error("Path Null"));
                    return;
                };

                const uploadPath: string = root + "/storage/image/upload/" + req.params.path;

                mkdirSync(uploadPath, {
                    recursive: true
                });

                cb(null, uploadPath);
            },
            filename: (_: Request, file: any, cb: Function) => {
                const now = Date.now();
                const name = `${UUID(16)}_${now}`;

                switch (file.mimetype) {
                    case "image/jpg": cb(null, `${name}.jpg`); break;
                    case "image/jpeg": cb(null, `${name}.jpg`); break;
                    case "image/png": cb(null, `${name}.png`); break;
                    case "image/webp": cb(null, `${name}.webp`); break;
                    case "image/svg+xml": cb(null, `${name}.svg`); break;
                    case "application/pdf": cb(null, `${name}.pdf`); break;
                    // case "video/mp4": cb(null, `${name}.mp4`); break;
                    // case "video/quicktime": cb(null, `${name}.mov`); break;
                    default: cb(new Error("Type Error"));
                };
            }
        })
    }).single("filename");

    upload(req, res, (err) => {
        if (err) {
            let message = err.message;
            switch (err.message) {
                case "Path Null": message = "請至少規劃一個資料夾位置"; break;
                case "Type Error": message = "僅支持 jpg / png / webp / svg / pdf"; break;
                default: break;
            };
            return res.status(400).send(message);
        };

        let file = req.file;

        if (!file) {
            return res.status(500).send("檔案不存在或上傳失敗");
        };

        res.status(201).json({
            success: 1,
            filename: file.filename,
            type: file.mimetype,
            size: file.size,
            src: file.path.replace(root + "/storage/image/upload", process.env.NODE_ENV === "development" ? "http://localhost:8080/c/img" : `https://${process.env.DOMAIN}/c/img`),
        });
    });
};