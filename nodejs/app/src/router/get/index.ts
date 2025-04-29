import { Router, Request, Response } from "express";
import GetFromPath from "./GetFromPath";

const GET = Router();
const map: Record<string, (req: Request, res: Response) => void> = {
    "/check/state": (_: Request, res: Response) => res.status(200).send("ok"),
    "/c/img/:path(*)": GetFromPath,
    "*": (_: Request, res: Response) => res.status(404).send("404 Not Found"),
};

for (const [path, handler] of Object.entries(map)) {
    GET.get(path, handler);
};

export default GET;