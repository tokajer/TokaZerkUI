'use strict';

// Exercises scan/find/apply against a throwaway fixture that mirrors the real
// TokaZerk UI layout (everything under Options/, with a picker.json manifest
// declaring a target-directory category). Run with: node test/assets.test.js

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { scan, find, apply, isUiRoot, categoryId } = require('../lib/assets');

function write(root, rel, content) {
  const abs = path.join(root, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
}
const read = (root, rel) => fs.readFileSync(path.join(root, rel), 'utf8');

function makeFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'picker-test-'));

  // Manifest: a target-directory category (Maps) and a root category with an
  // explicit backupDir (Frontier).
  write(
    root,
    'Options/picker.json',
    JSON.stringify({
      categories: [
        {
          label: 'Map Size',
          target: 'Maps',
          variants: [
            { label: 'Large', dir: 'Maps_large' },
            { label: 'Small', dir: 'Maps_small' },
          ],
        },
        {
          label: 'Frontier War Maps',
          target: '.',
          backupDir: 'warmap',
          variants: [
            { label: 'New Frontiers', dir: 'warmap/NF' },
            { label: 'Old Frontiers', dir: 'warmap/OF' },
          ],
        },
      ],
    })
  );

  // Map Size (target: Maps/) — includes a nested subfolder.
  write(root, 'Maps/areas.dat', 'large-areas');
  write(root, 'Maps/Warmap/albmap.tga', 'large-alb');
  write(root, 'Options/Maps_large/areas.dat', 'large-areas');
  write(root, 'Options/Maps_large/Warmap/albmap.tga', 'large-alb');
  write(root, 'Options/Maps_small/areas.dat', 'small-areas');
  write(root, 'Options/Maps_small/Warmap/albmap.tga', 'small-alb');

  // Frontier (target: root) — root currently matches neither variant.
  write(root, 'realmwar_alb.xml', 'stock-alb');
  write(root, 'Options/warmap/NF/realmwar_alb.xml', 'nf-alb');
  write(root, 'Options/warmap/OF/realmwar_alb.xml', 'of-alb');

  // Auto-discovered: variant subfolders (target root).
  write(root, 'custom2_window.xml', 'stock-target');
  write(root, 'Options/TargetWindow/blue(TokaZerk)/custom2_window.xml', 'blue');
  write(root, 'Options/TargetWindow/purple/custom2_window.xml', 'purple');

  // Auto-discovered: loose files (target root).
  write(root, 'new_summary_window.xml', 'stock-summary');
  write(root, 'Options/HUD/new_summary_window.xml', 'hud-summary');
  write(root, 'Options/HUD/HUDImages_01.tga', 'tga');

  return root;
}

const root = makeFixture();
const byId = (cats, label) => cats.find((c) => c.id === categoryId(label));
const variant = (cat, id) => cat.variants.find((v) => v.id === id);

// --- detection ---
assert.ok(isUiRoot(root), 'fixture is a UI root');
assert.ok(!isUiRoot(os.tmpdir()), 'tmpdir is not a UI root');

let cats = scan(root);

// manifest category with target dir
const maps = byId(cats, 'Map Size');
assert.ok(maps, 'Map Size category present');
assert.strictEqual(maps.target, 'Maps', 'Map Size targets Maps/');
assert.deepStrictEqual(maps.variants.map((v) => v.id).sort(), ['Maps_large', 'Maps_small']);
assert.strictEqual(variant(maps, 'Maps_large').active, true, 'large maps active initially');
assert.strictEqual(variant(maps, 'Maps_small').active, false, 'small maps inactive');
assert.ok(!variant(maps, '_original'), 'no Original for target-dir categories');

// manifest category targeting root, with grouped variant dirs
const frontier = byId(cats, 'Frontier War Maps');
assert.ok(frontier, 'Frontier category present');
assert.deepStrictEqual(frontier.variants.map((v) => v.id).sort(), ['NF', 'OF']);
assert.ok(frontier.variants.every((v) => !v.active), 'no frontier active (root is stock)');

// auto-discovered categories
const tw = byId(cats, 'Target Window');
assert.ok(tw, 'Target Window auto-discovered');
assert.deepStrictEqual(tw.variants.map((v) => v.id).sort(), ['blue(TokaZerk)', 'purple']);

const hud = byId(cats, 'HUD');
assert.ok(hud, 'HUD auto-discovered');
assert.strictEqual(hud.variants.length, 1, 'HUD has one implicit variant');
assert.strictEqual(hud.variants[0].id, '.', 'HUD implicit variant id');

// manifest file must not leak in as a category or a loose variant file
assert.ok(!byId(cats, 'Picker'), 'picker.json is not a category');

// claimed dirs (Maps_large/Maps_small/warmap) are not auto-discovered again
assert.ok(!byId(cats, 'Maps_large'), 'Maps_large not a standalone category');
assert.ok(!byId(cats, 'Warmap'), 'warmap not a standalone category');

// --- apply: target-directory category copies into Maps/, no backup ---
apply(root, categoryId('Map Size'), 'Maps_small');
assert.strictEqual(read(root, 'Maps/areas.dat'), 'small-areas', 'small applied to Maps/');
assert.strictEqual(read(root, 'Maps/Warmap/albmap.tga'), 'small-alb', 'nested file applied');
assert.ok(!fs.existsSync(path.join(root, 'Options/Maps_large/_original')), 'no backup for target-dir category');
cats = scan(root);
assert.strictEqual(variant(byId(cats, 'Map Size'), 'Maps_small').active, true, 'small active after apply');
assert.strictEqual(variant(byId(cats, 'Map Size'), 'Maps_large').active, false, 'large inactive after apply');

// --- apply: root category backs up originals into backupDir, offers Original ---
apply(root, categoryId('Frontier War Maps'), 'OF');
assert.strictEqual(read(root, 'realmwar_alb.xml'), 'of-alb', 'OF applied to root');
assert.strictEqual(read(root, 'Options/warmap/_original/realmwar_alb.xml'), 'stock-alb', 'stock backed up to backupDir');
cats = scan(root);
const frontier2 = byId(cats, 'Frontier War Maps');
assert.ok(variant(frontier2, '_original'), 'Original offered after first apply');
assert.strictEqual(variant(frontier2, 'OF').active, true, 'OF active');

// second apply must not overwrite the backup
apply(root, categoryId('Frontier War Maps'), 'NF');
assert.strictEqual(read(root, 'Options/warmap/_original/realmwar_alb.xml'), 'stock-alb', 'backup untouched');
apply(root, categoryId('Frontier War Maps'), '_original');
assert.strictEqual(read(root, 'realmwar_alb.xml'), 'stock-alb', 'reverted to Original');

// --- auto-discovered subfolder category: backup lives in the category folder ---
apply(root, categoryId('Target Window'), 'purple');
assert.strictEqual(read(root, 'custom2_window.xml'), 'purple', 'purple applied');
assert.strictEqual(read(root, 'Options/TargetWindow/_original/custom2_window.xml'), 'stock-target', 'target window backup');

// --- auto-discovered loose category ---
apply(root, categoryId('HUD'), '.');
assert.strictEqual(read(root, 'new_summary_window.xml'), 'hud-summary', 'HUD summary applied');
assert.strictEqual(read(root, 'HUDImages_01.tga'), 'tga', 'HUD image applied');
assert.strictEqual(read(root, 'Options/HUD/_original/new_summary_window.xml'), 'stock-summary', 'HUD backup');

// --- find() returns source info without needing active state ---
const hit = find(root, categoryId('Map Size'), 'Maps_large');
assert.ok(hit && hit.variant.sourceDir.endsWith('Maps_large'), 'find resolves sourceDir');

// --- errors ---
assert.throws(() => apply(root, categoryId('Map Size'), 'nope'), /Unknown variant/);
assert.throws(() => apply(root, 'cat/Nope', 'x'), /Unknown variant/);
assert.throws(() => scan(path.join(root, 'Maps')), /Not a TokaZerk UI folder/);

fs.rmSync(root, { recursive: true, force: true });
console.log('All assets.js tests passed.');
