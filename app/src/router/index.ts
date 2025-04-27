import { Router } from "express";
import GET from "./get";
import POST from "./post";
import DELETE from "./delete";

const router = Router();

for (const handler of [GET, POST, DELETE]) {
    router.use("/", handler);
};

export default router;