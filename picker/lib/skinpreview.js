'use strict';

// Best-effort visual hint for XML-only window skins (e.g. the blue vs. purple
// target window). A status-bar variant references a StatusBarTemplate whose
// foreground resolves, through the UI's style sheets, to a pixel in a texture
// atlas. Reading that pixel yields the bar's fill colour, which is exactly what
// distinguishes the variants. Everything here is guarded: any missing link
// makes the caller fall back to a plain placeholder.

const fs = require('fs');
const path = require('path');
const imagedecode = require('./imagedecode');

const STYLE_FILES = ['styles.xml', 'TokaZerkStyles.xml'];
const TEXTURE_FILES = ['assets.xml', 'TokaZerkStyles.xml'];

const cache = new Map(); // uiRoot -> resolved lookup maps
const decodeCache = new Map(); // absolute file -> decoded image

function readIfPresent(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}

function extractBlocks(xml, tag) {
  const blocks = [];
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g');
  let m;
  while ((m = re.exec(xml))) blocks.push(m[1]);
  return blocks;
}

function tagValue(block, tag) {
  const m = new RegExp(`<${tag}>\\s*([\\s\\S]*?)\\s*</${tag}>`).exec(block);
  return m ? m[1].trim() : null;
}

function coord(block, tag) {
  const m = new RegExp(`<${tag}>\\s*<X>\\s*(-?\\d+)\\s*</X>\\s*<Y>\\s*(-?\\d+)\\s*</Y>`).exec(block);
  return m ? { x: parseInt(m[1], 10), y: parseInt(m[2], 10) } : null;
}

function buildLookups(uiRoot) {
  if (cache.has(uiRoot)) return cache.get(uiRoot);

  const statusBars = new Map(); // name -> foreground template name
  const hResize = new Map(); // name -> { texture, repeat }
  const textures = new Map(); // lowercased name -> file (relative to uiRoot)

  for (const f of STYLE_FILES) {
    const xml = readIfPresent(path.join(uiRoot, f));
    if (!xml) continue;
    for (const b of extractBlocks(xml, 'StatusBarTemplate')) {
      const name = tagValue(b, 'Name');
      const fg = tagValue(b, 'ForegroundHResizeTemplate');
      if (name && fg) statusBars.set(name, fg);
    }
    for (const b of extractBlocks(xml, 'HorizontalResizeImageTemplate')) {
      const name = tagValue(b, 'Name');
      const texture = tagValue(b, 'TextureName');
      const repeat = coord(b, 'Repeat') || coord(b, 'Left');
      if (name && texture && repeat) hResize.set(name, { texture, repeat });
    }
  }

  for (const f of TEXTURE_FILES) {
    const xml = readIfPresent(path.join(uiRoot, f));
    if (!xml) continue;
    for (const b of extractBlocks(xml, 'Texture')) {
      const name = tagValue(b, 'Name');
      const file = tagValue(b, 'File');
      if (name && file) textures.set(name.toLowerCase(), file);
    }
  }

  const maps = { statusBars, hResize, textures };
  cache.set(uiRoot, maps);
  return maps;
}

function resolveTextureFile(uiRoot, textureName, textures) {
  const rel = textures.get(textureName.toLowerCase());
  if (!rel) return null;
  const stripped = rel.replace(/^custom[\\/]/i, '');
  const file = path.resolve(uiRoot, stripped);
  return fs.existsSync(file) ? file : null;
}

function decodeCached(file) {
  if (decodeCache.has(file)) return decodeCache.get(file);
  const img = imagedecode.decodeFile(file);
  decodeCache.set(file, img);
  return img;
}

function samplePixel(img, x, y) {
  const cx = Math.max(0, Math.min(img.width - 1, x));
  const cy = Math.max(0, Math.min(img.height - 1, y));
  const o = (cy * img.width + cx) * 4;
  return { r: img.rgba[o], g: img.rgba[o + 1], b: img.rgba[o + 2], a: img.rgba[o + 3] };
}

function resolveTemplateColor(uiRoot, templateName, maps) {
  const fg = maps.statusBars.get(templateName);
  if (!fg) return null;
  const hr = maps.hResize.get(fg);
  if (!hr) return null;
  const file = resolveTextureFile(uiRoot, hr.texture, maps.textures);
  if (!file || !imagedecode.DECODABLE_EXTS.includes(path.extname(file).toLowerCase())) return null;
  const img = decodeCached(file);
  return samplePixel(img, hr.repeat.x, hr.repeat.y);
}

// Given the XML files that make up a variant, return the first status-bar fill
// colour we can resolve, or null.
function resolveColor(uiRoot, xmlFiles) {
  try {
    const maps = buildLookups(uiRoot);
    for (const xmlFile of xmlFiles) {
      const xml = readIfPresent(xmlFile);
      if (!xml) continue;
      const names = [];
      const re = /<TemplateName>\s*([^<]+?)\s*<\/TemplateName>/g;
      let m;
      while ((m = re.exec(xml))) names.push(m[1].trim());
      for (const name of names) {
        const color = resolveTemplateColor(uiRoot, name, maps);
        if (color && color.a > 0) return color;
      }
    }
  } catch {
    /* best-effort */
  }
  return null;
}

function clearCache() {
  cache.clear();
  decodeCache.clear();
}

module.exports = { resolveColor, clearCache };
