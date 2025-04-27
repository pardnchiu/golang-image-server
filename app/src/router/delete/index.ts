import { Router, Request, Response } from "express";
import DeleteFromPath from "./DeleteFromPath";

const DELETE = Router();
const map: Record<string, string | ((req: Request, res: Response) => Promise<any>)> = {
    "/del/:path(*)": DeleteFromPath,
    "*": async (_: Request, res: Response) => {
        res.status(404).send("404 Not Found");
    }
};

for (const [k, v] of Object.entries(map)) {
    DELETE.delete(k, typeof v === "string" ? require(v) : v);
};

export default DELETE;
