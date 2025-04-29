import { Request, Response } from "express";
import { existsSync, mkdirSync, statSync, renameSync } from "fs";
import { join, extname, basename } from "path";

const root = process.cwd();

export default function DeleteFromPath(req: Request, res: Response) {
    const path = String(req.params.path || "").replace(/\/$/, "");

    if (path == null || path.length < 1) {
        return res.status(400).send("未指定檔案/檔案夾");
    };

    const filePath: string = root + "/storage/image/upload/" + path;
    const trashPath: string = root + "/storage/image/upload/.trash";
    const dateFolder: string = new Date().toISOString().split("T")[0];
    const trashDatePath: string = trashPath + "/" + dateFolder;

    try {
        if (existsSync(filePath)) {
            if (!existsSync(trashDatePath)) {
                mkdirSync(trashDatePath, {
                    recursive: true
                });
            };

            const stats = statSync(filePath);

            const lastSegment = path.split("/").pop() || path;
            let targetPath = trashDatePath + "/" + lastSegment;

            if (existsSync(targetPath)) {
                const ext = extname(lastSegment);
                const base = basename(lastSegment, ext);
                targetPath = join(trashDatePath, `${base}_${Date.now()}${ext}`);
            };

            renameSync(filePath, targetPath);

            if (stats.isDirectory()) {

                return res.status(200).json({
                    success: 1,
                    message: "檔案夾已移動至垃圾桶: " + targetPath,
                });
            };

            res.status(200).json({
                success: 1,
                message: "檔案已移動至垃圾桶: " + targetPath,
            });
        }
        else {
            res.status(404).send("檔案/檔案夾不存在");
        };
    }
    catch (err: any) {
        res.status(500).send(err.message);
    };
}