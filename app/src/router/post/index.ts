import { Router, Request, Response } from "express";
import PostToPath from "./PostToPath";

const POST = Router();
const map: Record<string, (req: Request, res: Response) => void> = {
    "/upload/:path(*)": PostToPath,
    "*": (_: Request, res: Response) => res.status(404).send("404 Not Found"),
};

for (const [path, handler] of Object.entries(map)) {
    POST.post(path, handler);
};

export default POST;
