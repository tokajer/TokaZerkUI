'use strict';

// Verifies the image decoders, the PNG encoder and the preview resolver against
// the real UI assets in the parent "custom" folder. Ground-truth pixel values
// were taken with ImageMagick. Run with: node test/preview.test.js

const path = require('path');
const fs = require('fs');
const assert = require('assert');
const imagedecode = require('../lib/imagedecode');
const png = require('../lib/png');
const skinpreview = require('../lib/skinpreview');
const preview = require('../lib/preview');
const assets = require('../lib/assets');

const UI = path.resolve(__dirname, '..', '..');

// The suite needs the real UI assets; skip cleanly if run outside the repo.
if (!assets.isUiRoot(UI) || !fs.existsSync(path.join(UI, 'styles.xml'))) {
  console.log('preview.test: UI assets not present, skipping.');
  process.exit(0);
}

function px(img, x, y) {
  const o = (y * img.width + x) * 4;
  return [img.rgba[o], img.rgba[o + 1], img.rgba[o + 2], img.rgba[o + 3]];
}
const near = (a, b, tol = 2) => Math.abs(a - b) <= tol;
function assertPixel(actual, expect, msg) {
  const ok = actual.every((v, i) => near(v, expect[i]));
  assert.ok(ok, `${msg}: got [${actual}] expected ~[${expect}]`);
}

// --- PNG encoder: valid signature + IHDR dimensions ---
{
  const buf = png.encode(3, 2, Buffer.alloc(3 * 2 * 4, 200));
  assert.deepStrictEqual([...buf.slice(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], 'PNG signature');
  assert.strictEqual(buf.toString('ascii', 12, 16), 'IHDR', 'IHDR chunk present');
  assert.strictEqual(buf.readUInt32BE(16), 3, 'IHDR width');
  assert.strictEqual(buf.readUInt32BE(20), 2, 'IHDR height');
}

// --- TGA RLE 32-bit (blue bar atlas) ---
{
  const img = imagedecode.decodeFile(path.join(UI, 'Assets/Textures/FloatingBars.tga'));
  assert.strictEqual(img.width, 512, 'FloatingBars width');
  assert.strictEqual(img.height, 512, 'FloatingBars height');
  assertPixel(px(img, 3, 3), [31, 65, 105, 255], 'FloatingBars @3,3');
}

// --- TGA uncompressed 32-bit (purple bar atlas) ---
{
  const img = imagedecode.decodeFile(path.join(UI, 'Assets/ghost/ghost_statusbars.tga'));
  assert.strictEqual(img.width, 256, 'ghost_statusbars width');
  assertPixel(px(img, 1, 79), [141, 26, 141, 255], 'ghost_statusbars @1,79');
}

// --- TGA with transparency (HUD atlas) ---
{
  const img = imagedecode.decodeFile(path.join(UI, 'Options/HUD/HUDImages_01.tga'));
  assert.strictEqual(img.width, 1024, 'HUD width');
  assert.strictEqual(img.height, 256, 'HUD height');
  assertPixel(px(img, 10, 10), [0, 0, 0, 0], 'HUD @10,10 transparent');
}

// --- DDS DXT1 (compressed map tile) ---
{
  const img = imagedecode.decodeFile(path.join(UI, 'Options/Maps_large/z011.dds'));
  assert.strictEqual(img.width, 256, 'z011 width');
  assertPixel(px(img, 128, 128), [57, 61, 44, 255], 'z011 @128,128');
}

// --- DDS uncompressed ARGB8888 (map tile) ---
{
  const img = imagedecode.decodeFile(path.join(UI, 'Options/Maps_large/z250_00.dds'));
  assert.strictEqual(img.width, 512, 'z250_00 width');
  assertPixel(px(img, 256, 256), [77, 79, 79, 255], 'z250_00 @256,256');
}

// --- skin colour resolution (the flagship blue vs purple case) ---
{
  const blue = skinpreview.resolveColor(UI, [
    path.join(UI, 'Options/TargetWindow/blue(TokaZerk)/custom2_window.xml'),
  ]);
  assert.ok(blue && near(blue.r, 31) && near(blue.g, 65) && near(blue.b, 105), `blue colour: ${JSON.stringify(blue)}`);

  const purple = skinpreview.resolveColor(UI, [
    path.join(UI, 'Options/TargetWindow/purple/custom2_window.xml'),
  ]);
  assert.ok(purple && near(purple.r, 141) && near(purple.g, 26) && near(purple.b, 141), `purple colour: ${JSON.stringify(purple)}`);
}

// --- end-to-end preview.resolve per real variant ---
{
  const cats = assets.scan(UI);
  const find = (catLabel, varLabel) => {
    const c = cats.find((x) => x.label === catLabel);
    return c && c.variants.find((v) => v.label === varLabel);
  };

  const hud = preview.resolve(UI, find('HUD', 'HUD'));
  assert.ok(hud && hud.kind === 'image' && hud.dataUrl.startsWith('data:image/png'), 'HUD -> image');

  const blue = preview.resolve(UI, find('Target Window', 'Blue (TokaZerk)'));
  assert.ok(blue && blue.kind === 'swatch' && blue.color === '#1f4169', `blue swatch: ${JSON.stringify(blue && blue.color)}`);

  const purple = preview.resolve(UI, find('Target Window', 'Purple'));
  assert.ok(purple && purple.kind === 'swatch' && purple.color === '#8d1a8d', `purple swatch: ${JSON.stringify(purple && purple.color)}`);

  const large = preview.resolve(UI, find('Map Size', 'Large'));
  assert.ok(large && large.kind === 'image', 'Large maps -> image');
}

console.log('All preview.js tests passed.');
