import { Router } from "express";
import GET from "./get";
import POST from "./post";
import DELETE from "./delete";

const router = Router();

for (const e of [GET, POST, DELETE]) {
    router.use("/", e);
};

export default router;