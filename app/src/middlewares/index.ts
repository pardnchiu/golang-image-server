import express from "express";
import setCors from "./cors";
import logger from "./logger";
import minify from "./minify";
import setData from "./dataInit";

const partials = require("express-partials");
const cookieParser = require("cookie-parser");
const app = express();

app.use(partials());
app.use(express.json());
app.use(express.urlencoded({
    extended: false
}));
app.use(cookieParser("QTV5SmCrzSAscktk"));
app.use(setCors);
app.use(logger);
app.use(minify);
app.use(setData);

export default app;