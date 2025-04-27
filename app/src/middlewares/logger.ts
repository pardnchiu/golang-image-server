import { Request, Response } from "express";

const morgan = require("morgan");
const moment = require("moment-timezone");
const path = require("path");
const rfs = require("rotating-file-stream");
const stream = rfs.createStream("req.log", {
    interval: "3d",
    path: path.join(process.cwd(), "storage", "logs")
});

morgan.token("date-self", () => {
    return moment().tz("Asia/Taipei").format("YYYY-MM-DDTHH:mm:ss");
});

morgan.token("country-self", (req: Request, _: Response) => {
    return get_country(req);
});

morgan.token("ip-self", (req: Request, _: Response) => {
    let ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "-.-.-.-";

    if (Array.isArray(ip)) {
        ip = ip[0];
    };

    if (ip.length < 15) {
        ip = ip + Array(15 - ip.length).fill(' ').join("");
    };

    return ip;
});

morgan.token("method-self", (req: Request, _: Response) => {
    let method = req.method;

    if (method.length < 6) {
        method = method + Array(6 - method.length).fill(' ').join("");
    };

    return method;
});

/**
    :url - 请求的 URL。
    :method - 请求方法（如 GET、POST）。
    :status - 响应的 HTTP 状态码。
    :response-time - 请求响应时间（毫秒）。
    :remote-addr - 发起请求的远程地址。
    :remote-user - 从 basic 认证中解析出的远程用户名。
    :http-version - 请求所使用的 HTTP 版本。
    :user-agent - 用户代理。
    :referrer 或 :referer - HTTP 请求来源页面。
    :req[header] - 替换为指定的 HTTP 请求头部，例如 :req[User-Agent]。
    :res[header] - 替换为指定的 HTTP 响应头部，例如 :res[Content-Length]。
    :date - 当前日期和时间，默认为 web 格式（你可以使用自定义格式如 :date[iso], :date[clf], :date[web]）。
    :referrer-policy - 请求中的 Referrer-Policy 值。
    :protocol - 请求使用的协议（如 HTTP, HTTPS）。
    :hostname - 接收请求的服务器主机名。
    :port - 服务器端口。
    :tls-version - TLS版本，如果请求通过 HTTPS 进行。
    :tls-cipher - TLS 加密套件。
    :tls-client-cert - 客户端证书的字符串表示（如果已启用）。
    :tls-client-cert-chain[n] - 客户端证书链的第 n 个证书（如果已启用）。
    :pid - 处理请求的进程的进程 ID。
    :content-length - 响应的内容长度。
 */
export default morgan(`:date-self: :status | :country-self | :ip-self | :method-self | :url (:response-time ms) | :referrer`, {
    stream: stream,
    skip: (req: Request, res: Response) => {
        let ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "-.-.-.-";

        if (Array.isArray(ip)) {
            ip = ip[0];
        };

        return (
            (req.originalUrl.startsWith("/image") && res.statusCode !== 404) ||
            (req.originalUrl.startsWith("/js") && res.statusCode !== 404) ||
            (req.originalUrl.startsWith("/css") && res.statusCode !== 404)
        );
    }
});

function get_country(req: Request) {
    const geoip = require("geoip-lite");
    let ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "-.-.-.-";

    if (Array.isArray(ip)) {
        ip = ip[0];
    };

    let geo: any;

    try {
        geo = geoip.lookup(ip);
    }
    catch (err: any) {
        console.error("Geo Error: " + err.message)
    };

    return geo ? geo.country : "--";
};