const fs = require("fs");
const path = require("path");

const appDir = __dirname;
const html = fs.readFileSync(path.join(appDir, "index.html"), "utf8");
const readme = fs.readFileSync(path.join(appDir, "README.md"), "utf8");
const server = fs.readFileSync(path.join(appDir, "serve.cjs"), "utf8");
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert(start >= 0, `missing function ${name}`);
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`unclosed function ${name}`);
}

assert(scripts.length === 1, "expected one inline script");
new Function(scripts[0]);
new Function("require", "__dirname", "process", "console", server);
eval(extractFunction(scripts[0], "normalizeScoreText"));

assert(normalizeScoreText(" －10 ") === "-10", "score normalizer should support full-width minus");
assert(normalizeScoreText(" −8 ") === "-8", "score normalizer should support unicode minus");
assert(normalizeScoreText(" +5 ") === "+5", "score normalizer should preserve plus sign");

[
  "viewport-fit=cover",
  "env(safe-area-inset-bottom)",
  "font-size: 16px",
  "MicroMessenger",
  "localStorage",
  "STORAGE_KEY",
  "buildCsv",
  "copyExportText",
  "document.execCommand(\"copy\")",
  "inputmode=\"text\"",
  "toggleScoreSign",
  "normalizeScoreText",
  "可输入 -10",
  "切换正负",
  "合计必须为 0",
  "得分必须是数字，例如 10 或 -10",
  "候补不足，无法轮换",
  "轮换",
  "撤销",
  "排名",
  "微信可用"
].forEach((text) => assert(html.includes(text), `missing html feature: ${text}`));

[
  "http://",
  "https://",
  "<script src=",
  "<link rel=\"stylesheet\""
].forEach((text) => assert(!html.includes(text), `should not depend on external or remote asset: ${text}`));

[
  "微信内置浏览器",
  "https://sherlock2040.github.io/guandan-score-wechat/",
  "微信键盘不显示负号",
  "node guandan-score-wechat/serve.cjs",
  "http://127.0.0.1:8766/",
  "python3 -m http.server 8766 --bind 0.0.0.0",
  "同一个 Wi-Fi",
  "文件传输助手",
  "导出 → 复制",
  "node guandan-score-wechat/verify.cjs"
].forEach((text) => assert(readme.includes(text), `missing README text: ${text}`));

[
  "http.createServer",
  "0.0.0.0",
  "8766",
  "localAddresses",
  "手机微信打开时"
].forEach((text) => assert(server.includes(text), `missing server text: ${text}`));

assert(!html.includes('type="number" inputmode="decimal"'), "score inputs should not use mobile decimal keyboard without minus");

console.log(JSON.stringify({
  ok: true,
  scripts: scripts.length,
  server: true,
  wechatReady: true,
  localOnly: true
}, null, 2));
