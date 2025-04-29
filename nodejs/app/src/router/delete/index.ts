import { Router, Request, Response } from "express";
import DeleteFromPath from "./DeleteFromPath";

const DELETE = Router();
const map: Record<string, (req: Request, res: Response) => void> = {
    "/del/:path(*)": DeleteFromPath,
    "*": (_: Request, res: Response) => res.status(404).send("404 Not Found"),
};

for (const [path, handler] of Object.entries(map)) {
    DELETE.delete(path, handler);
};

export default DELETE;
