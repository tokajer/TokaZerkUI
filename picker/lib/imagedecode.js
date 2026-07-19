'use strict';

// Pure-JS decoders for the image formats the DAoC UI ships (TGA, DXT-compressed
// DDS). Everything decodes to top-to-bottom RGBA so it can go straight into the
// PNG encoder. Browsers render PNG/JPG/GIF/WEBP/BMP natively, so those are not
// handled here.

const fs = require('fs');
const path = require('path');

const RASTER_EXTS = ['.tga', '.dds', '.bmp', '.png', '.jpg', '.jpeg', '.gif', '.webp'];
const NATIVE_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'];
const DECODABLE_EXTS = ['.tga', '.dds'];

const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
};

// --- TGA (uncompressed & RLE truecolor, 24/32-bit) ---
function decodeTGA(buf) {
  const idLength = buf[0];
  const colorMapType = buf[1];
  const imageType = buf[2];
  const width = buf.readUInt16LE(12);
  const height = buf.readUInt16LE(14);
  const bpp = buf[16];
  const descriptor = buf[17];

  if (colorMapType !== 0) throw new Error('TGA: color-mapped images not supported');
  if (imageType !== 2 && imageType !== 10) {
    throw new Error(`TGA: unsupported image type ${imageType}`);
  }
  if (bpp !== 24 && bpp !== 32) throw new Error(`TGA: unsupported depth ${bpp}`);

  const bytesPerPixel = bpp / 8;
  let offset = 18 + idLength;
  const pixelCount = width * height;
  const linear = Buffer.alloc(pixelCount * 4);

  const readPixel = (src, dst) => {
    // TGA truecolor is stored BGRA.
    linear[dst] = buf[src + 2];
    linear[dst + 1] = buf[src + 1];
    linear[dst + 2] = buf[src];
    linear[dst + 3] = bytesPerPixel === 4 ? buf[src + 3] : 255;
  };

  if (imageType === 2) {
    for (let i = 0; i < pixelCount; i++) {
      readPixel(offset + i * bytesPerPixel, i * 4);
    }
  } else {
    let i = 0;
    while (i < pixelCount) {
      const packet = buf[offset++];
      const count = (packet & 0x7f) + 1;
      if (packet & 0x80) {
        // run-length packet: one pixel repeated
        const dst0 = i * 4;
        readPixel(offset, dst0);
        offset += bytesPerPixel;
        for (let k = 1; k < count; k++) linear.copy(linear, (i + k) * 4, dst0, dst0 + 4);
      } else {
        for (let k = 0; k < count; k++) {
          readPixel(offset, (i + k) * 4);
          offset += bytesPerPixel;
        }
      }
      i += count;
    }
  }

  return orient(linear, width, height, descriptor);
}

// Reorder linear (file-order) pixels into top-to-bottom, left-to-right.
function orient(linear, width, height, descriptor) {
  const topToBottom = (descriptor & 0x20) !== 0;
  const rightToLeft = (descriptor & 0x10) !== 0;
  if (topToBottom && !rightToLeft) return { width, height, rgba: linear };

  const out = Buffer.alloc(width * height * 4);
  for (let r = 0; r < height; r++) {
    const destRow = topToBottom ? r : height - 1 - r;
    for (let c = 0; c < width; c++) {
      const srcCol = rightToLeft ? width - 1 - c : c;
      linear.copy(out, (destRow * width + srcCol) * 4, (r * width + c) * 4, (r * width + c) * 4 + 4);
    }
  }
  return { width, height, rgba: out };
}

// --- DDS (DXT1/DXT3/DXT5) ---
function color565(c, out, o) {
  const r = (c >> 11) & 0x1f;
  const g = (c >> 5) & 0x3f;
  const b = c & 0x1f;
  out[o] = (r * 527 + 23) >> 6; // *255/31
  out[o + 1] = (g * 259 + 33) >> 6; // *255/63
  out[o + 2] = (b * 527 + 23) >> 6;
}

const DDPF_ALPHAPIXELS = 0x1;
const DDPF_FOURCC = 0x4;
const DDPF_RGB = 0x40;

function decodeDDS(buf) {
  if (buf.readUInt32LE(0) !== 0x20534444) throw new Error('DDS: bad magic');
  const height = buf.readUInt32LE(12);
  const width = buf.readUInt32LE(16);
  const pfFlags = buf.readUInt32LE(80);

  if (pfFlags & DDPF_RGB && !(pfFlags & DDPF_FOURCC)) {
    return decodeDDSUncompressed(buf, width, height, pfFlags);
  }

  const fourCC = buf.toString('ascii', 84, 88);
  const format = { DXT1: 1, DXT3: 3, DXT5: 5 }[fourCC];
  if (!format) throw new Error(`DDS: unsupported format ${fourCC.replace(/\W/g, '')}`);

  const rgba = Buffer.alloc(width * height * 4);
  const blocksX = Math.max(1, Math.ceil(width / 4));
  const blocksY = Math.max(1, Math.ceil(height / 4));
  const blockBytes = format === 1 ? 8 : 16;
  let p = 128;

  const palette = Buffer.alloc(16); // 4 colors * RGBA
  for (let by = 0; by < blocksY; by++) {
    for (let bx = 0; bx < blocksX; bx++) {
      const alpha = decodeBlockAlpha(buf, p, format);
      const colorOffset = format === 1 ? p : p + 8;
      buildColorPalette(buf, colorOffset, format, palette);
      const bits = buf.readUInt32LE(colorOffset + 4);
      for (let py = 0; py < 4; py++) {
        for (let px = 0; px < 4; px++) {
          const x = bx * 4 + px;
          const y = by * 4 + py;
          if (x >= width || y >= height) continue;
          const idx = (py * 4 + px);
          const code = (bits >> (idx * 2)) & 0x3;
          const dst = (y * width + x) * 4;
          rgba[dst] = palette[code * 4];
          rgba[dst + 1] = palette[code * 4 + 1];
          rgba[dst + 2] = palette[code * 4 + 2];
          rgba[dst + 3] = alpha ? alpha(idx) : palette[code * 4 + 3];
        }
      }
      p += blockBytes;
    }
  }
  return { width, height, rgba };
}

function maskInfo(mask) {
  if (mask === 0) return { shift: 0, max: 0 };
  let shift = 0;
  while (((mask >>> shift) & 1) === 0) shift++;
  let bits = 0;
  let m = mask >>> shift;
  while (m & 1) {
    bits++;
    m >>>= 1;
  }
  return { shift, max: (1 << bits) - 1 };
}

function scaleChannel(px, info) {
  if (info.max === 0) return 0;
  return Math.round((((px & (info.max << info.shift)) >>> info.shift) * 255) / info.max);
}

function decodeDDSUncompressed(buf, width, height, pfFlags) {
  const bitCount = buf.readUInt32LE(88);
  const rMask = buf.readUInt32LE(92);
  const gMask = buf.readUInt32LE(96);
  const bMask = buf.readUInt32LE(100);
  const aMask = pfFlags & DDPF_ALPHAPIXELS ? buf.readUInt32LE(104) : 0;
  const bytesPerPixel = bitCount / 8;
  if (![2, 3, 4].includes(bytesPerPixel)) {
    throw new Error(`DDS: unsupported bit count ${bitCount}`);
  }
  const rI = maskInfo(rMask);
  const gI = maskInfo(gMask);
  const bI = maskInfo(bMask);
  const aI = maskInfo(aMask);

  const rgba = Buffer.alloc(width * height * 4);
  let p = 128;
  for (let i = 0; i < width * height; i++) {
    const px = buf.readUIntLE(p, bytesPerPixel);
    p += bytesPerPixel;
    const d = i * 4;
    rgba[d] = scaleChannel(px, rI);
    rgba[d + 1] = scaleChannel(px, gI);
    rgba[d + 2] = scaleChannel(px, bI);
    rgba[d + 3] = aMask ? scaleChannel(px, aI) : 255;
  }
  return { width, height, rgba };
}

function buildColorPalette(buf, o, format, palette) {
  const c0 = buf.readUInt16LE(o);
  const c1 = buf.readUInt16LE(o + 2);
  color565(c0, palette, 0);
  color565(c1, palette, 4);
  palette[3] = palette[7] = 255;
  // DXT1 with c0<=c1 encodes a 1-bit alpha (code 3 transparent).
  const punchThrough = format === 1 && c0 <= c1;
  for (let i = 0; i < 3; i++) {
    if (punchThrough) {
      palette[8 + i] = (palette[i] + palette[4 + i] + 1) >> 1;
      palette[12 + i] = 0;
    } else {
      palette[8 + i] = (2 * palette[i] + palette[4 + i] + 1) / 3 | 0;
      palette[12 + i] = (palette[i] + 2 * palette[4 + i] + 1) / 3 | 0;
    }
  }
  palette[11] = 255;
  palette[15] = punchThrough ? 0 : 255;
}

// Returns an index->alpha function for the block, or null for DXT1.
function decodeBlockAlpha(buf, p, format) {
  if (format === 3) {
    return (idx) => {
      const byte = buf[p + (idx >> 1)];
      const nib = idx & 1 ? byte >> 4 : byte & 0x0f;
      return nib * 17; // 4-bit -> 8-bit
    };
  }
  if (format === 5) {
    const a0 = buf[p];
    const a1 = buf[p + 1];
    const alphas = new Uint8Array(8);
    alphas[0] = a0;
    alphas[1] = a1;
    if (a0 > a1) {
      for (let i = 1; i < 7; i++) alphas[i + 1] = ((7 - i) * a0 + i * a1 + 3) / 7 | 0;
    } else {
      for (let i = 1; i < 5; i++) alphas[i + 1] = ((5 - i) * a0 + i * a1 + 2) / 5 | 0;
      alphas[6] = 0;
      alphas[7] = 255;
    }
    // 16 pixels * 3 bits packed into 6 bytes after the two endpoints.
    let bitsLo = buf.readUIntLE(p + 2, 3);
    let bitsHi = buf.readUIntLE(p + 5, 3);
    return (idx) => {
      const shift = (idx % 8) * 3;
      const src = idx < 8 ? bitsLo : bitsHi;
      return alphas[(src >> shift) & 0x7];
    };
  }
  return null;
}

function decodeFile(filePath) {
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.tga') return decodeTGA(buf);
  if (ext === '.dds') return decodeDDS(buf);
  throw new Error(`No decoder for ${ext}`);
}

module.exports = {
  decodeTGA,
  decodeDDS,
  decodeFile,
  RASTER_EXTS,
  NATIVE_EXTS,
  DECODABLE_EXTS,
  MIME,
};
