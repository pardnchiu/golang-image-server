import { Router, Request, Response } from "express";
import PostToPath from "./PostToPath";

const POST = Router();
const map: Record<string, string | ((req: Request, res: Response) => Promise<any>)> = {
    "/upload/:path(*)": PostToPath,
    "*": async (_: Request, res: Response) => res.status(404).send("404 Not Found")
};

for (const [k, v] of Object.entries(map)) {
    POST.post(k, typeof v === "string" ? require(v) : v);
};

export default POST;
