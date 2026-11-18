const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function createSimplePNG(width, height) {
  // Signature PNG
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // Chunk IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8-bit depth
  ihdrData.writeUInt8(6, 9); // RGBA (Truecolor with alpha)
  ihdrData.writeUInt8(0, 10); // Compression method
  ihdrData.writeUInt8(0, 11); // Filter method
  ihdrData.writeUInt8(0, 12); // Interlace method
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // Raw image data with filter byte 0 at start of each scanline
  const scanlineLength = width * 4 + 1;
  const rawData = Buffer.alloc(height * scanlineLength);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // Filter type 0 (None)

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;

      // Distance from center
      const dx = (x - width / 2) / (width / 2);
      const dy = (y - height / 2) / (height / 2);
      const r = Math.sqrt(dx * dx + dy * dy);

      // Fond dégradé sombre émeraude / ardoise
      let red = 10;
      let green = Math.floor(40 + (1 - dy) * 35);
      let blue = Math.floor(30 + (1 - dy) * 20);
      let alpha = 255;

      // Dessin géométrique du "P" de ProtoManager au centre
      const nx = x / width;
      const ny = y / height;

      // Barre verticale du P
      const inStem = (nx >= 0.32 && nx <= 0.44 && ny >= 0.25 && ny <= 0.75);
      // Boucle du P
      const inLoop = (nx >= 0.44 && nx <= 0.68 && ny >= 0.25 && ny <= 0.52);
      const inLoopHole = (nx >= 0.44 && nx <= 0.58 && ny >= 0.33 && ny <= 0.44);

      if (inStem || (inLoop && !inLoopHole)) {
        red = 16;
        green = 185;
        blue = 129; // Emerald green #10b981
      }

      // Point central turquoise
      const cdx = nx - 0.51;
      const cdy = ny - 0.385;
      if (cdx*cdx + cdy*cdy < 0.0008) {
        red = 167;
        green = 243;
        blue = 208;
      }

      // Pastille atelier bleue en bas à droite
      const bdx = nx - 0.68;
      const bdy = ny - 0.68;
      if (bdx*bdx + bdy*bdy < 0.004) {
        red = 59;
        green = 130;
        blue = 246; // Blue #3b82f6
      }

      rawData[pixelOffset] = red;
      rawData[pixelOffset + 1] = green;
      rawData[pixelOffset + 2] = blue;
      rawData[pixelOffset + 3] = alpha;
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const toCrc = Buffer.concat([typeBuf, data]);
  const crc = crc32(toCrc);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

// Table CRC32 standard
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Générer 192x192 et 512x512
const p192 = createSimplePNG(192, 192);
fs.writeFileSync(path.join(__dirname, 'apple-touch-icon.png'), p192);
fs.writeFileSync(path.join(__dirname, 'icon-192.png'), p192);

const p512 = createSimplePNG(512, 512);
fs.writeFileSync(path.join(__dirname, 'icon-512.png'), p512);

console.log('Icônes PNG générées : apple-touch-icon.png, icon-192.png, icon-512.png');
