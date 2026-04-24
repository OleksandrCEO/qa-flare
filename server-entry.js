import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const clientDir = join(__dirname, "dist", "client");

const MIME_TYPES = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://localhost`);
  const filePath = join(clientDir, url.pathname);

  if (!filePath.startsWith(clientDir)) return false;

  try {
    const s = await stat(filePath);
    if (!s.isFile()) return false;

    const data = await readFile(filePath);
    const ext = extname(filePath);
    const mime = MIME_TYPES[ext] || "application/octet-stream";
    const isHashed = url.pathname.startsWith("/assets/");

    res.writeHead(200, {
      "Content-Type": mime,
      "Content-Length": data.byteLength,
      ...(isHashed ? { "Cache-Control": "public, max-age=31536000, immutable" } : {}),
    });
    res.end(data);
    return true;
  } catch {
    return false;
  }
}

const { default: server } = await import("./dist/server/server.js");

const port = parseInt(process.env.PORT || "8080", 10);

createServer(async (req, res) => {
  if (await serveStatic(req, res)) return;

  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value) headers.set(key, Array.isArray(value) ? value.join(", ") : value);
    }

    const webRequest = new Request(url.toString(), {
      method: req.method,
      headers,
      body: req.method !== "GET" && req.method !== "HEAD" ? req : undefined,
      duplex: "half",
    });

    const response = await server.fetch(webRequest);

    const resHeaders = {};
    response.headers.forEach((value, key) => {
      resHeaders[key] = value;
    });
    res.writeHead(response.status, resHeaders);

    if (response.body) {
      for await (const chunk of response.body) {
        res.write(chunk);
      }
    }
    res.end();
  } catch (err) {
    console.error("SSR error:", err);
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Internal Server Error");
  }
}).listen(port, "0.0.0.0", () => {
  console.log(`Server listening on http://0.0.0.0:${port}`);
});
