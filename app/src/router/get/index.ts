import { Router, Request, Response } from "express";
import GetFromPath from "./GetFromPath";

const GET = Router();
const map: Record<string, string | ((req: Request, res: Response) => Promise<any>)> = {
    "/c/img/:path(*)": GetFromPath,
    "/check/state": async (_: Request, res: Response) => res.status(200).send("ok"),
    "*": async (_: Request, res: Response) => res.status(404).send("404 Not Found")
};

for (const [k, v] of Object.entries(map)) {
    GET.get(k, typeof v === "string" ? require(v) : v);
};

export default GET;