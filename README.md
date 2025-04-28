# Image Caching Server

> Upload and delete functions are designed for internal network use, so they will have minimal restrictions.

## Features

> This system provides storage and caching for uploaded images to improve web resource response speed.

- **Browser Caching**
    Stores previously requested resources to reduce repeated backend requests, serving directly from browser <br>
    Expected expiration time (1 week)
- **Cloudflare CDN**
    Enables users from different countries to access content from the nearest node, reducing cross-regional transmission delays (high latency in transoceanic transmission) <br>
    Expected expiration time (1 week)
- **Backend Caching**
    Avoids regenerating identical resources, saving server computation, expected expiration time (1 month) <br>
    Nginx caching, reduces Nodejs backend processing, expected expiration time (1 month)

### Default Webp

Default output format is Webp, maintaining good image quality while significantly reducing output traffic. Using the `t / type` parameter can specify output format (avif/webp/jpg/png), or the `o / origin` parameter controls whether to output the original file.

### Caching Design

Multi-level cache structure: Provides four layers of caching - browser, CDN, Nginx, and cached images
- Parameterized caching: Different versions of the same image are generated and cached based on various size and quality parameters
- Cache directory structure: Based on the original file path, corresponding directory structures are created under `/storage/image/cache/`

### Error Handling

- For non-existent images: Returns a custom 404 image (controlled by the `d / dark` parameter for dark/light mode)
- For image processing failures: Returns an explanatory message

### Trash

Date-organized trash bin mechanism

- Deleted files are moved to the `/storage/image/upload/.trash/YYYY-MM-DD/`# Uploads image to the `/storage/image/upload/[PATH]` folder
- Trash organized by date for easier recovery of files deleted on a specific date
- System returns the file's location in the trash bin for easy restoration if needed

***

### POST：`/upload/{:path}` 

> The `:path` part can include `/` and will upload directly to the specified location.

```Shell
# Uploads image to the `/storage/image/upload/[PATH]` folder
curl -X POST \
-H "Content-Type: multipart/form-data" \
-F "filepath=@/Users/pardn/Desktop/Wallpaper-Desktop/rain_clouds_sky-wallpaper-5120x3200.jpg" \
[URL]/upload/[PATH]
```
- Successful upload: 201 -> `JSON`
    ```Json
    {
        "success": 1,
        "filename": "ERftP1gTS7WCTeJ8_1744080848530.jpg",
        "type": "image/jpeg",
        "size": 2501808,
        "src": "[URL]/upload/[PATH]/c/img/test2/test1/ERftP1gTS7WCTeJ8_1744080848530.jpg"
    }
    ```
- Path Null: 400 -> `String`
    ```
    請至少規劃一個資料夾位置
    ```
- Type Error: 400 -> `String`
    ```
    僅支持 jpg / png / webp / svg / pdf
    ```
- Upload Error: 500 -> `String`
    ```
    檔案不存在或上傳失敗
    ```

### DELETE：`/del/{:path}` 

> The `:path` part can include `/` and will delete the image at the specified location.

```Shell
# Delete `AQepGMnNiOxrnsKu_1744035656038.jpg` in the `/storage/image/upload/[PATH]` folder
curl -X DELETE \
-H "Content-Type: application/json" \
[URL]/del/[PATH]/AQepGMnNiOxrnsKu_1744035656038.jpg

# Delete folder /storage/image/upload/[PATH]
curl -X DELETE \
-H "Content-Type: application/json" \
[URL]/del/[PATH]
```
- Successful deletion: 200 -> `JSON`
    ```Json
    // 檔案
    {
        "success": 1,
        "message": "檔案已移動至垃圾桶: /storage/image/upload/.trash/2025-04-08/[PATH]/AQepGMnNiOxrnsKu_1744035656038.jpg"
    }

    // 檔案夾
    {
        "success": 1,
        "message": "檔案夾已移動至垃圾桶: /storage/image/upload/.trash/2025-04-08/[PATH]"
    }
    ```
- 400 -> `String`
    ```
    未指定檔案/檔案夾
    ```
- 404 -> `String`
    ```
    檔案/檔案夾不存在
    ```
- 500 -> `String`
    ```
    [Error Message]
    ```

### GET：`/c/img/{:filepath}`

#### Available Parameters
- `o / origin`: Return original file (highest priority)
- `s / size`: Specify image short edge length (higher priority than width/height)
- `w / width`: Specify image width
- `h / height`: Specify image height
- `q / quality`: Specify image quality (1-100), default 75
- `t / type`: Specify type (avif|webp|jpg|png), default webp
- `d / dark`: Specify 404 image color scheme (1|0), default 0

### CDN

> Change URL to point to Cloudflare worker to achieve global caching.

### Flow

<details>
<summary>Load</summary>

```mermaid
flowchart TD
    A["Client"] -- GET --> S{"Browser cache exists?<br>(7 days)"}
    S -- Yes --> A
    S -- No --> B{"Request source"}
    B -- "Image Server" --> C["Nginx proxy"]
    B -- Cloudflare Worker --> D["CDN node"]
    C -- Check Nginx cache --> E{"Nginx cache exists?<br>(30 days)"}
    E -- Yes --> F["Return Nginx cache"]
    E -- No --> G["Forward to image processing service"]
    D -- Check Cloudflare cache --> H{"Cloudflare cache exists?<br>(7 days)"}
    H -- Yes --> I["Return Cloudflare cache"]
    H -- No --> C
    G --> K{"Check if local cache file<br>exists<br>(30 days)"}
    K -- Yes --> L["Return local cache file"]
    K -- No --> M{"Check parameters"}
    M -- "origin=1" --> N["Return original image"]
    M -- Generate cache file<br>Default max long edge 1024 px --> P["Process image and convert to WebP"]
    P --> Q["Save as local cache file"]
    Q --> R["Return local cache file"]
    F --> T["Set HTTP cache headers"]
    I --> T
    L --> T
    N --> T
    R --> T
    T --> A
```

</details>

<details>
<summary>Upload</summary>

```mermaid
flowchart TD
    A[Client] -->|POST| B[Upload service]
    B -->|Receive request| C{Check client IP}
    C -->|IP not allowed| D[Return permission error]
    C -->|IP passed| E{Check path parameter}
    E -->|Invalid path| F[Return error]
    E -->|Valid path| G[Create folder]
    G --> H[Generate random filename]
    H --> I{Check file type}
    I -->|Unsupported type| J[Return error]
    I -->|Supported type| K[Save file]
    K --> L[Return success response]
    L --> M[Include cache link and CDN link]
    M --> A
    D --> A
    F --> A
    J --> A
```

</details>
