import { Request, Response } from "express";
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import sharp from "sharp";

const root = process.cwd();

function streamFile(res: Response, filePath: string, contentType: string) {
  res.setHeader("Content-Type", contentType);
  res.setHeader("Transfer-Encoding", "chunked");
  res.setHeader("Connection", "keep-alive");
  const stream = createReadStream(filePath, { highWaterMark: 8192 });
  stream.on("error", () => {
    res.status(404).end();
  });
  stream.pipe(res);
}

export default async function GetFromPath(req: Request, res: Response) {
  let { s, size, w, width, h, height, q, quality, o, origin, d, dark, t, type } = req.query;

  const imgSize = (s || size) as string | undefined;
  const imgWidth = (w || width) as string | undefined;
  const imgHeight = (h || height) as string | undefined;
  const imgQuality = (q || quality) as string | undefined;
  const imgOrigin = (o || origin) as string | undefined;
  const imgDark = (d || dark) as string | undefined;
  let imgType = (t || type) as string | undefined;

  const filepath = root + req.url.replace(/\/c\/img\//, "\/storage\/image\/upload\/").split("?")[0];

  if ((/\.pdf$/.test(filepath))) {
    // res.setHeader("Content-Type", "application/pdf");
    // res.sendFile(filepath);
    return streamFile(res, filepath, "application/pdf");
  }
  else if (/\.svg$/.test(filepath)) {
    // res.setHeader("Content-Type", "image/svg+xml");
    // res.sendFile(filepath);
    return streamFile(res, filepath, "image/svg+xml");
  };

  if (imgType == null || !({
    jpeg: 1,
    jpg: 1,
    png: 1,
    avif: 1,
    webp: 1
  } as Record<string, number>)[String(imgType)]) {
    imgType = "webp";
  }
  else if (imgType == "jpeg") {
    imgType = "jpg";
  };

  const cachefolder = root + "/storage/image/cache/" + req.params.path.replace(/\/\w+\.\w+$/, "");
  const cachepath = (_ => {
    const path = filepath
      .replace(/\/storage\/image\/upload\//, "\/storage\/image\/cache\/")
      .replace(/\.\w+$/, "");
    switch (true) {
      case (imgSize != null):
        return `${path}_${imgSize}_${imgQuality || ""}.${imgType}`;
      case (imgWidth != null && imgHeight != null):
        return `${path}_${imgWidth}_${imgHeight}_${imgQuality || ""}.${imgType}`;
      case (imgWidth != null):
        return `${path}_${imgWidth}_auto_${imgQuality || ""}.${imgType}`;
      case (imgHeight != null):
        return `${path}_auto_${imgHeight}_${imgQuality || ""}.${imgType}`;
      default:
        return `${path}_auto_auto_${imgQuality || ""}.${imgType}`;
    };
  })();

  if (+String(imgOrigin) == 1) {
    let contentType = "application/octet-stream";
    switch (true) {
      case (/\.jpe?g$/.test(filepath)):
        contentType = "image/jpeg";
        break;
      case (/\.png$/.test(filepath)):
        contentType = "image/png";
        break;
      case (/\.webp$/.test(filepath)):
        contentType = "image/webp";
        break;
    }
    return streamFile(res, filepath, contentType);
  };

  let cacheFile: Buffer | undefined = undefined;

  try {
    cacheFile = readFileSync(cachepath);
  }
  catch {
    // * 緩存不存在不做動作，只是接收 readFileSync 的錯誤，讓流程繼續
  };

  if (cacheFile != null) {
    let contentType = "image/webp";
    switch (true) {
      case (/\.jpe?g$/.test(filepath)):
        contentType = "image/jpeg";
        break;
      case (/\.png$/.test(filepath)):
        contentType = "image/png";
        break;
      case (/\.webp$/.test(filepath)):
        contentType = "image/webp";
        break;
    }
    res.setHeader("Content-Type", contentType);
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Connection", "keep-alive");
    res.status(200);
    res.write(cacheFile);
    res.end();
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

      if (imgSize != null && originWidth > originHeight) {
        newHeight = Math.min(+imgSize, originHeight);
        newWidth = Math.floor((newHeight / originHeight) * originWidth);
      }
      else if (imgSize != null && originWidth <= originHeight) {
        newWidth = Math.min(+imgSize, originWidth);
        newHeight = Math.floor((newWidth / originWidth) * originHeight);
      }
      else if (imgWidth != null && imgHeight != null) {
        newWidth = Math.min(+imgWidth, originWidth);
        newHeight = Math.min(+imgHeight, originHeight);
      }
      else if (imgWidth != null) {
        newWidth = Math.min(+imgWidth, originWidth);
        newHeight = Math.floor((newWidth / originWidth) * originHeight);
      }
      else if (imgHeight != null) {
        newHeight = Math.min(+imgHeight, originHeight);
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
    switch (imgType) {
      case "jpg":
        buffer = await image.jpeg({
          quality: Math.min(Math.max(parseInt(imgQuality ?? "75"), 0), 100),
        }).toBuffer();
        res.setHeader("Content-Type", "image/jpeg");
        break;
      case "png":
        buffer = await image.png().toBuffer();
        res.setHeader("Content-Type", "image/png");
        break;
      case "avif":
        buffer = await image.avif({
          quality: Math.min(Math.max(parseInt(imgQuality ?? "50"), 0), 100),
        }).toBuffer();
        res.setHeader("Content-Type", "image/avif");
        break;
      default:
        buffer = await image.webp({
          quality: Math.min(Math.max(parseInt(imgQuality ?? "75"), 0), 100),
        }).toBuffer();
        res.setHeader("Content-Type", "image/webp");
        break;
    };

    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Connection", "keep-alive");
    res.status(200);
    res.write(buffer);
    res.end();

    writeFileSync(cachepath, buffer);
  }
  catch (err: Error | unknown) {
    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Expires", "-1");
    res.setHeader("Pragma", "no-cache");
    res.sendFile(`${root}/storage/static/404-${imgDark === "1" ? "dark" : "light"}.svg`);
  }
}