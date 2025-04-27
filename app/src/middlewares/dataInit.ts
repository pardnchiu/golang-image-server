import { Request, Response } from "express";

export default async (req: Request, res: Response, cb: Function) => {
    if (req.headers["user-agent"] == null) {
        res.socket?.destroy();
        return;
    };

    cb();
};