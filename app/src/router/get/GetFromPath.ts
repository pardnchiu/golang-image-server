import { Request, Response } from "express";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import sharp from "sharp";

const root = process.cwd();

export default async function GetFromPath(req: Request, res: Response) {
    const filepath = root + req.url.replace(/\/c\/img\//, "\/storage\/image\/upload\/").split("?")[0];
    let size = req.query.s || req.query.size as string | undefined;
    let width = req.query.w || req.query.width as string | undefined;
    let height = req.query.h || req.query.height as string | undefined;
    let quality = req.query.q || req.query.quality as string | undefined;
    let origin = req.query.o || req.query.origin as string | undefined;
    let dark = req.query.d || req.query.dark as string | undefined;
    let type = req.query.t || req.query.type as string | undefined;

    if ((/\.pdf$/.test(filepath))) {
        res.setHeader("Content-Type", "application/pdf");
        res.sendFile(filepath);
        return;
    }
    else if (/\.svg$/.test(filepath)) {
        res.setHeader("Content-Type", "image/svg+xml");
        res.sendFile(filepath);
        return;
    };

    if (type == null || !({
        jpeg: 1,
        jpg: 1,
        png: 1,
        avif: 1,
        webp: 1
    } as Record<string, number>)[String(type)]) {
        type = "webp";
    }
    else if (type == "jpeg") {
        type = "jpg";
    };

    const cachefolder = root + "/storage/image/cache/" + req.params.path.replace(/\/\w+\.\w+$/, "");
    const cachepath = (_ => {
        const path = filepath
            .replace(/\/storage\/image\/upload\//, "\/storage\/image\/cache\/")
            .replace(/\.\w+$/, "");
        switch (true) {
            case (size != null):
                return `${path}_${size}.${type}`;
            case (width != null && height != null):
                return `${path}_${width}_${height}.${type}`;
            case (width != null):
                return `${path}_${width}_auto.${type}`;
            case (height != null):
                return `${path}_auto_${height}.${type}`;
            default:
                return `${path}.${type}`;
        };
    })();

    if (parseInt(String(origin)) == 1) {
        switch (true) {
            case (/\.jpe?g$/.test(filepath)): res.setHeader("Content-Type", "image/jpeg"); break;
            case (/\.png$/.test(filepath)): res.setHeader("Content-Type", "image/png"); break;
            case (/\.webp$/.test(filepath)): res.setHeader("Content-Type", "image/webp"); break;
            default: res.setHeader("Content-Type", "application/octet-stream");
        };
        res.status(200).sendFile(filepath);
        return;
    };

    let cacheFile: Buffer | undefined = undefined;

    try {
        cacheFile = readFileSync(cachepath);
    }
    catch {
        // * 緩存不存在不做動作，只是接收 readFileSync 的錯誤，讓流程繼續
    };

    if (cacheFile != null) {
        switch (type) {
            case "jpg":
                res.setHeader("Content-Type", "image/jpeg");
                break;
            case "png":
                res.setHeader("Content-Type", "image/png");
                break;
            case "avif":
                res.setHeader("Content-Type", "image/avif");
                break;
            default:
                res.setHeader("Content-Type", "image/webp");
                break;
        };
        res.send(cacheFile);
        return;
    };

    try {
        const originFile = readFileSync(filepath);

        let image = sharp(originFile);

        const metadata = await image.metadata();
        const originWidth = metadata.width;
        const originHeight = metadata.height;

        if (originWidth != null && originHeight != null) {
            let newWidth = originWidth;
            let newHeight = originHeight;

            if (size != null && originWidth > originHeight) {
                newHeight = Math.min(+String(size), originHeight);
                newWidth = Math.floor((newHeight / originHeight) * originWidth);
            }
            else if (size != null && originWidth <= originHeight) {
                newWidth = Math.min(+String(size), originWidth);
                newHeight = Math.floor((newWidth / originWidth) * originHeight);
            }
            else if (width != null && height != null) {
                newWidth = Math.min(+String(width), originWidth);
                newHeight = Math.min(+String(height), originHeight);
            }
            else if (width != null) {
                newWidth = Math.min(+String(width), originWidth);
                newHeight = Math.floor((newWidth / originWidth) * originHeight);
            }
            else if (height != null) {
                newHeight = Math.min(+String(height), originHeight);
                newWidth = Math.floor((newHeight / originHeight) * originWidth);
            }
            else if (Math.min(originWidth, originHeight) > 1024) {
                if (originWidth > originHeight) {
                    newWidth = 1024
                    newHeight = Math.floor((newWidth / originWidth) * originHeight);
                }
                else {
                    newHeight = 1024
                    newWidth = Math.floor((newHeight / originHeight) * originWidth);
                };
            };

            image.resize(newWidth, newHeight);
        };

        if (!existsSync(cachefolder)) {
            mkdirSync(cachefolder, {
                recursive: true
            });
        };

        let buffer: Buffer;
        switch (type) {
            case "jpg":
                buffer = await image.jpeg({
                    quality: Math.min(Math.max(+(quality ?? "75"), 0), 100),
                }).toBuffer();
                res.setHeader("Content-Type", "image/jpeg");
                break;
            case "png":
                buffer = await image.png().toBuffer();
                res.setHeader("Content-Type", "image/png");
                break;
            case "avif":
                buffer = await image.avif({
                    quality: Math.min(Math.max(+(quality ?? "50"), 0), 100),
                }).toBuffer();
                res.setHeader("Content-Type", "image/avif");
                break;
            default:
                buffer = await image.webp({
                    quality: Math.min(Math.max(+(quality ?? "75"), 0), 100),
                }).toBuffer();
                res.setHeader("Content-Type", "image/webp");
                break;
        };

        res.status(200).send(buffer);

        writeFileSync(cachepath, buffer);
    }
    catch (err: any) {
        console.error(err);
        res.setHeader("Content-Type", "image/svg+xml");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Expires", "-1");
        res.setHeader("Pragma", "no-cache");
        res.sendFile(`${root}/storage/static/404-${dark === "1" ? "dark" : "light"}.svg`);
    }
}