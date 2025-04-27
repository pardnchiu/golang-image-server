addEventListener("fetch", event => {
    event.respondWith(handler(event))
})

async function handler(event) {
    const url = new URL(event.request.url)
    const ext = [".jpg", ".jpeg", ".png", ".webp", ".svg"]
    const request = ext.some(e => url.pathname.toLowerCase().endsWith(e))

    if (request) {
        const src = new URL(url.pathname, "[URL]")

        for (const [key, value] of url.searchParams.entries()) {
            src.searchParams.set(key, value);
        };

        const full = src.toString();
        const headers = new Headers(event.request.headers);
        headers.set("X-Custom-Cache-Key", url.search || "no-query");

        const customCacheKey = new Request(full, {
            method: event.request.method,
            headers: headers
        });

        const cache = caches.default;
        let response = await cache.match(customCacheKey);

        if (!response) {
            response = await fetch(full, {
                method: event.request.method,
                headers: event.request.headers
            });

            const newResponse = new Response(response.body, response);
            newResponse.headers.set("Cache-Control", "public, max-age=604800");
            newResponse.headers.set("CF-Cache-Status", "MISS");

            event.waitUntil(cache.put(customCacheKey, newResponse.clone()));

            newResponse.headers.set("X-Query-String", url.search || "none");

            return newResponse;
        };

        const cachedResponse = new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
        });

        cachedResponse.headers.set("CF-Cache-Status", "HIT")
        cachedResponse.headers.set("X-Query-String", url.search || "none");

        return cachedResponse;
    };

    return new Response("400", {
        status: 400,
        headers: { 'Content-Type': 'text/plain' }
    });
};