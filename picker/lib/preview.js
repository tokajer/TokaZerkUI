'use strict';

// Produces a preview for a variant, trying the most faithful source first:
//   1. an author-provided image (preview/screenshot/thumb.*) in the variant
//   2. a raster asset shipped in the variant (HUD atlas, a map tile, ...)
//   3. the resolved status-bar fill colour for XML-only window skins
// Returns { kind, dataUrl, ... } or null when nothing can be shown.

const fs = require('fs');
const path = require('path');
const imagedecode = require('./imagedecode');
const png = require('./png');
const skinpreview = require('./skinpreview');

const MAX_DIM = 512;
const EXPLICIT_RE = /^(preview|screenshot|thumb)\b/i;
// Placeholder / non-representative assets we never want as an auto preview.
const SKIP_RE = /^(no_map|map_gitter|areas|dirplaceholder|thumbs)/i;

function listVariantFiles(variant) {
  if (variant.looseFiles) {
    return variant.looseFiles.map((f) => path.join(variant.sourceDir, f));
  }
  const out = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === '_original') continue;
        walk(abs);
      } else if (e.isFile()) {
        out.push(abs);
      }
    }
  };
  walk(variant.sourceDir);
  return out;
}

function ext(f) {
  return path.extname(f).toLowerCase();
}

function explicitPreview(files) {
  const hit = files.find(
    (f) => EXPLICIT_RE.test(path.basename(f)) && imagedecode.NATIVE_EXTS.includes(ext(f))
  );
  if (!hit) return null;
  const mime = imagedecode.MIME[ext(hit)] || 'application/octet-stream';
  return {
    kind: 'image',
    dataUrl: `data:${mime};base64,${fs.readFileSync(hit).toString('base64')}`,
  };
}

function pickRaster(files) {
  const candidates = files
    .filter((f) => imagedecode.RASTER_EXTS.includes(ext(f)))
    .filter((f) => !SKIP_RE.test(path.basename(f)));
  if (candidates.length === 0) return null;
  // Largest file tends to be the real content atlas rather than a tiny helper.
  candidates.sort((a, b) => statSize(b) - statSize(a) || a.localeCompare(b));
  return candidates[0];
}

function statSize(f) {
  try {
    return fs.statSync(f).size;
  } catch {
    return 0;
  }
}

function rasterPreview(files) {
  const file = pickRaster(files);
  if (!file) return null;
  if (imagedecode.NATIVE_EXTS.includes(ext(file))) {
    const mime = imagedecode.MIME[ext(file)] || 'application/octet-stream';
    return {
      kind: 'image',
      dataUrl: `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`,
    };
  }
  const img = downscale(imagedecode.decodeFile(file), MAX_DIM);
  return { kind: 'image', dataUrl: png.toDataUrl(img.width, img.height, img.rgba) };
}

function downscale(img, maxDim) {
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  if (scale >= 1) return img;
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    const sy0 = Math.floor((y * img.height) / h);
    const sy1 = Math.max(sy0 + 1, Math.floor(((y + 1) * img.height) / h));
    for (let x = 0; x < w; x++) {
      const sx0 = Math.floor((x * img.width) / w);
      const sx1 = Math.max(sx0 + 1, Math.floor(((x + 1) * img.width) / w));
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          const o = (sy * img.width + sx) * 4;
          r += img.rgba[o];
          g += img.rgba[o + 1];
          b += img.rgba[o + 2];
          a += img.rgba[o + 3];
          n++;
        }
      }
      const d = (y * w + x) * 4;
      out[d] = (r / n) | 0;
      out[d + 1] = (g / n) | 0;
      out[d + 2] = (b / n) | 0;
      out[d + 3] = (a / n) | 0;
    }
  }
  return { width: w, height: h, rgba: out };
}

function swatchPreview(uiRoot, files) {
  const xmlFiles = files.filter((f) => ext(f) === '.xml');
  if (xmlFiles.length === 0) return null;
  const c = skinpreview.resolveColor(uiRoot, xmlFiles);
  if (!c) return null;
  const hex = '#' + [c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, '0')).join('');
  return { kind: 'swatch', color: hex, dataUrl: swatchDataUrl(c) };
}

// A small rounded-bar image in the resolved colour, so swatches render the same
// way images do in the gallery.
function swatchDataUrl(c) {
  const w = 240, h = 64, rgba = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    rgba[i * 4] = c.r;
    rgba[i * 4 + 1] = c.g;
    rgba[i * 4 + 2] = c.b;
    rgba[i * 4 + 3] = 255;
  }
  return png.toDataUrl(w, h, rgba);
}

function resolve(uiRoot, variant) {
  try {
    const files = listVariantFiles(variant);
    return explicitPreview(files) || rasterPreview(files) || swatchPreview(uiRoot, files) || null;
  } catch {
    return null;
  }
}

module.exports = { resolve, downscale };
