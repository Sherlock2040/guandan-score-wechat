const fs = require("fs");
const path = require("path");

const VERSION = 4;
const SIZE = 21 + (VERSION - 1) * 4;
const DATA_CODEWORDS = 80;
const EC_CODEWORDS = 20;
const URL = "https://sherlock2040.github.io/guandan-score-wechat/";
const OUT = path.join(__dirname, "guandan-score-qr.svg");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function bytesFromText(text) {
  return Array.from(Buffer.from(text, "utf8"));
}

function appendBits(bits, value, length) {
  for (let i = length - 1; i >= 0; i -= 1) bits.push((value >>> i) & 1);
}

function buildDataCodewords(text) {
  const data = bytesFromText(text);
  assert(data.length <= 62, "URL is too long for QR version 4-L byte mode");
  const bits = [];
  appendBits(bits, 0b0100, 4);
  appendBits(bits, data.length, 8);
  data.forEach((byte) => appendBits(bits, byte, 8));
  const capacity = DATA_CODEWORDS * 8;
  appendBits(bits, 0, Math.min(4, capacity - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);

  const codewords = [];
  for (let i = 0; i < bits.length; i += 8) {
    let value = 0;
    for (let j = 0; j < 8; j += 1) value = (value << 1) | bits[i + j];
    codewords.push(value);
  }
  for (let pad = 0; codewords.length < DATA_CODEWORDS; pad += 1) {
    codewords.push(pad % 2 === 0 ? 0xec : 0x11);
  }
  return codewords;
}

const exp = new Array(512);
const log = new Array(256);
let value = 1;
for (let i = 0; i < 255; i += 1) {
  exp[i] = value;
  log[value] = i;
  value <<= 1;
  if (value & 0x100) value ^= 0x11d;
}
for (let i = 255; i < 512; i += 1) exp[i] = exp[i - 255];

function gfMul(a, b) {
  if (a === 0 || b === 0) return 0;
  return exp[log[a] + log[b]];
}

function polyMul(a, b) {
  const result = new Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i += 1) {
    for (let j = 0; j < b.length; j += 1) {
      result[i + j] ^= gfMul(a[i], b[j]);
    }
  }
  return result;
}

function reedSolomon(data, degree) {
  let generator = [1];
  for (let i = 0; i < degree; i += 1) generator = polyMul(generator, [1, exp[i]]);
  const result = new Array(degree).fill(0);
  data.forEach((byte) => {
    const factor = byte ^ result[0];
    result.shift();
    result.push(0);
    for (let i = 0; i < degree; i += 1) result[i] ^= gfMul(generator[i + 1], factor);
  });
  return result;
}

function makeMatrix() {
  const modules = Array.from({ length: SIZE }, () => new Array(SIZE).fill(false));
  const reserved = Array.from({ length: SIZE }, () => new Array(SIZE).fill(false));
  const set = (x, y, dark, reserve = true) => {
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
    modules[y][x] = Boolean(dark);
    if (reserve) reserved[y][x] = true;
  };

  function finder(left, top) {
    for (let y = -1; y <= 7; y += 1) {
      for (let x = -1; x <= 7; x += 1) {
        const xx = left + x;
        const yy = top + y;
        const inside = x >= 0 && x <= 6 && y >= 0 && y <= 6;
        const dark = inside && (x === 0 || x === 6 || y === 0 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4));
        set(xx, yy, dark);
      }
    }
  }

  function alignment(cx, cy) {
    for (let y = -2; y <= 2; y += 1) {
      for (let x = -2; x <= 2; x += 1) {
        const dark = Math.max(Math.abs(x), Math.abs(y)) === 2 || (x === 0 && y === 0);
        set(cx + x, cy + y, dark);
      }
    }
  }

  finder(0, 0);
  finder(SIZE - 7, 0);
  finder(0, SIZE - 7);
  alignment(26, 26);

  for (let i = 8; i < SIZE - 8; i += 1) {
    const dark = i % 2 === 0;
    set(i, 6, dark);
    set(6, i, dark);
  }

  for (let i = 0; i <= 8; i += 1) {
    if (i !== 6) {
      set(8, i, false);
      set(i, 8, false);
    }
  }
  for (let i = 0; i < 8; i += 1) set(SIZE - 1 - i, 8, false);
  for (let i = 0; i < 7; i += 1) set(8, SIZE - 1 - i, false);
  set(8, 4 * VERSION + 9, true);

  return { modules, reserved, set };
}

function maskBit(mask, x, y) {
  switch (mask) {
    case 0: return (x + y) % 2 === 0;
    case 1: return y % 2 === 0;
    case 2: return x % 3 === 0;
    case 3: return (x + y) % 3 === 0;
    case 4: return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
    case 5: return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6: return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    case 7: return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
    default: throw new Error("invalid mask");
  }
}

function drawData(matrix, codewords, mask) {
  const bits = [];
  codewords.forEach((byte) => appendBits(bits, byte, 8));
  let index = 0;
  let upward = true;
  for (let right = SIZE - 1; right >= 1; right -= 2) {
    if (right === 6) right -= 1;
    for (let vert = 0; vert < SIZE; vert += 1) {
      const y = upward ? SIZE - 1 - vert : vert;
      for (let dx = 0; dx < 2; dx += 1) {
        const x = right - dx;
        if (matrix.reserved[y][x]) continue;
        const bit = index < bits.length ? bits[index] === 1 : false;
        matrix.modules[y][x] = bit !== maskBit(mask, x, y);
        index += 1;
      }
    }
    upward = !upward;
  }
}

function bchFormat(value) {
  let data = value << 10;
  const generator = 0x537;
  for (let i = 14; i >= 10; i -= 1) {
    if ((data >>> i) & 1) data ^= generator << (i - 10);
  }
  return ((value << 10) | data) ^ 0x5412;
}

function drawFormat(matrix, mask) {
  const bits = bchFormat((0b01 << 3) | mask);
  const bit = (i) => ((bits >>> i) & 1) === 1;
  for (let i = 0; i <= 5; i += 1) matrix.set(8, i, bit(i));
  matrix.set(8, 7, bit(6));
  matrix.set(8, 8, bit(7));
  matrix.set(7, 8, bit(8));
  for (let i = 9; i < 15; i += 1) matrix.set(14 - i, 8, bit(i));
  for (let i = 0; i < 8; i += 1) matrix.set(SIZE - 1 - i, 8, bit(i));
  for (let i = 8; i < 15; i += 1) matrix.set(8, SIZE - 15 + i, bit(i));
}

function cloneMatrix(source) {
  return {
    modules: source.modules.map((row) => row.slice()),
    reserved: source.reserved.map((row) => row.slice()),
    set(x, y, dark, reserve = true) {
      this.modules[y][x] = Boolean(dark);
      if (reserve) this.reserved[y][x] = true;
    }
  };
}

function penalty(modules) {
  let score = 0;
  const linePenalty = (line) => {
    let runColor = line[0];
    let runLength = 1;
    for (let i = 1; i < line.length; i += 1) {
      if (line[i] === runColor) {
        runLength += 1;
      } else {
        if (runLength >= 5) score += 3 + (runLength - 5);
        runColor = line[i];
        runLength = 1;
      }
    }
    if (runLength >= 5) score += 3 + (runLength - 5);
  };

  for (let y = 0; y < SIZE; y += 1) linePenalty(modules[y]);
  for (let x = 0; x < SIZE; x += 1) linePenalty(modules.map((row) => row[x]));

  for (let y = 0; y < SIZE - 1; y += 1) {
    for (let x = 0; x < SIZE - 1; x += 1) {
      const color = modules[y][x];
      if (modules[y][x + 1] === color && modules[y + 1][x] === color && modules[y + 1][x + 1] === color) score += 3;
    }
  }

  const patterns = ["10111010000", "00001011101"];
  for (let y = 0; y < SIZE; y += 1) {
    const row = modules[y].map((v) => (v ? "1" : "0")).join("");
    patterns.forEach((p) => {
      for (let i = row.indexOf(p); i !== -1; i = row.indexOf(p, i + 1)) score += 40;
    });
  }
  for (let x = 0; x < SIZE; x += 1) {
    const col = modules.map((row) => (row[x] ? "1" : "0")).join("");
    patterns.forEach((p) => {
      for (let i = col.indexOf(p); i !== -1; i = col.indexOf(p, i + 1)) score += 40;
    });
  }

  const dark = modules.flat().filter(Boolean).length;
  const percent = (dark * 100) / (SIZE * SIZE);
  score += Math.floor(Math.abs(percent - 50) / 5) * 10;
  return score;
}

function renderSvg(modules, text) {
  const scale = 10;
  const quiet = 4;
  const full = SIZE + quiet * 2;
  const rects = [];
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      if (modules[y][x]) rects.push(`<rect x="${(x + quiet) * scale}" y="${(y + quiet) * scale}" width="${scale}" height="${scale}"/>`);
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${full * scale}" height="${full * scale}" viewBox="0 0 ${full * scale} ${full * scale}" role="img" aria-labelledby="title desc">
  <title id="title">Guandan score app QR code</title>
  <desc id="desc">${text}</desc>
  <rect width="100%" height="100%" fill="#fff"/>
  <g fill="#111">
    ${rects.join("\n    ")}
  </g>
</svg>
`;
}

const data = buildDataCodewords(URL);
const codewords = data.concat(reedSolomon(data, EC_CODEWORDS));
const base = makeMatrix();
let best = null;
for (let mask = 0; mask < 8; mask += 1) {
  const matrix = cloneMatrix(base);
  drawData(matrix, codewords, mask);
  drawFormat(matrix, mask);
  const score = penalty(matrix.modules);
  if (!best || score < best.score) best = { mask, score, modules: matrix.modules };
}

fs.writeFileSync(OUT, renderSvg(best.modules, URL));
console.log(JSON.stringify({ ok: true, out: OUT, url: URL, version: VERSION, mask: best.mask, score: best.score }, null, 2));
