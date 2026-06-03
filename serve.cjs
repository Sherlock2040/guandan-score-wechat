const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { URL } = require("url");

const root = __dirname;
const port = Number(process.env.PORT || 8766);
const host = process.env.HOST || "0.0.0.0";
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".csv": "text/csv; charset=utf-8"
};

function localAddresses() {
  const addresses = ["127.0.0.1"];
  Object.values(os.networkInterfaces()).flat().forEach((item) => {
    if (item && item.family === "IPv4" && !item.internal) addresses.push(item.address);
  });
  return Array.from(new Set(addresses));
}

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store"
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const requested = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const filepath = path.resolve(root, "." + requested);
  if (!filepath.startsWith(root)) {
    send(res, 403, "Forbidden");
    return;
  }
  fs.readFile(filepath, (error, content) => {
    if (error) {
      send(res, 404, "Not found");
      return;
    }
    send(res, 200, content, types[path.extname(filepath)] || "application/octet-stream");
  });
});

server.listen(port, host, () => {
  console.log("掼蛋计分已启动：");
  localAddresses().forEach((address) => {
    console.log(`  http://${address}:${port}/`);
  });
  console.log("手机微信打开时，请使用同一 Wi-Fi 下的局域网 IP 地址。");
});
