import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";

const PORT = Number(process.env.PORT || 3000);
const ROOT = process.cwd();

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8"
};

createServer((req, res) => {
  const urlPath = req.url === "/" ? "/index.html" : req.url || "/index.html";
  const safePath = normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(ROOT, safePath);

  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  const extension = extname(filePath);
  res.writeHead(200, {
    "Content-Type": MIME_TYPES[extension] || "application/octet-stream"
  });

  createReadStream(filePath).pipe(res);
}).listen(PORT, () => {
  console.log(`Snake game available at http://localhost:${PORT}`);
});
