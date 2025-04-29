import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cluster from "cluster";
import os from "os";
import http from "http";
import middlewares from "@middlewares";
import router from "@router";

const root = process.cwd();
const app = express();
const cpus = os.cpus();

app.set("view engine", "ejs");
app.set("views", root + "/resources/views");
app.use("/", express.static(root + "/public"));
app.use("/storage/image", express.static(root + "/storage/image"));
app.use(middlewares)
app.use("/", router);

(async _ => {
    if (cluster.isPrimary && cpus.length > 1) {
        let cpuLeng = Math.max(cpus.length, 4);

        for (let i = 0; i < (cpuLeng - 1); i++) {
            cluster.fork();
        };

        cluster.on("exit", (worker: any, code: any, signal: any) => {
            console.log('Starting a new worker');
            cluster.fork();
        });

        const signals = ["SIGINT", "SIGTERM", "SIGHUP"];
        signals.forEach(signal => {
            process.on(signal, () => {
                console.log(`Received ${signal}`);
                for (const id in cluster.workers) {
                    if (cluster.workers[id] == null) {
                        continue
                    };
                    console.log(`Killing worker ${cluster.workers[id].process.pid}`);
                    cluster.workers[id].kill("SIGTERM");
                }
                process.exit(0);
            });
        });
    }
    else {
        http.createServer(app).listen(process.env.NODE_PORT, () => {
            console.log(`Express initialized, ENV: ${process.env.NODE_ENV}`);
        });
    };
})();