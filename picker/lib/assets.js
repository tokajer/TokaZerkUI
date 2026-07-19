'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const OPTIONS_DIR = 'Options';
const MANIFEST_FILE = 'picker.json';
const ORIGINAL_VARIANT_DIR = '_original';
const ORIGINAL_VARIANT_LABEL = 'Original';

// Legacy root-level swap folders (older UI layout, before everything moved into
// Options/). Still handled so old installs keep working; skipped when absent.
const LEGACY_ROOT_CATEGORIES = [
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
    variants: [
      { label: 'New Frontiers', dir: 'NF' },
      { label: 'Old Frontiers', dir: 'OF' },
    ],
  },
];

// "floatTargetWindow" -> "Float Target Window", "blue(TokaZerk)" ->
// "Blue (TokaZerk)"; all-caps names and text in parentheses stay as-is.
function prettifyName(name) {
  const paren = name.indexOf('(');
  if (paren > 0) {
    return `${prettifyName(name.slice(0, paren).trim())} ${name.slice(paren)}`;
  }
  if (name === name.toUpperCase()) return name;
  const spaced = name.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function isUiRoot(dir) {
  try {
    return fs.statSync(path.join(dir, OPTIONS_DIR)).isDirectory();
  } catch {
    return false;
  }
}

function listFilesRecursive(dir, base = dir) {
  const out = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === ORIGINAL_VARIANT_DIR) continue;
      out.push(...listFilesRecursive(abs, base));
    } else if (entry.isFile()) {
      out.push(path.relative(base, abs));
    }
  }
  return out;
}

function hashFile(file) {
  return crypto.createHash('sha1').update(fs.readFileSync(file)).digest('hex');
}

function filesIdentical(a, b) {
  let sa, sb;
  try {
    sa = fs.statSync(a);
    sb = fs.statSync(b);
  } catch {
    return false;
  }
  if (sa.size !== sb.size) return false;
  return hashFile(a) === hashFile(b);
}

function variantFiles(variant) {
  return variant.looseFiles || listFilesRecursive(variant.sourceDir);
}

// A variant is active when every file it provides exists at the target with
// identical content.
function variantIsActive(variant, targetDir) {
  const files = variantFiles(variant);
  if (files.length === 0) return false;
  return files.every((rel) =>
    filesIdentical(path.join(variant.sourceDir, rel), path.join(targetDir, rel))
  );
}

function commonParent(dirs) {
  if (dirs.length === 0) return null;
  const parents = dirs.map((d) => path.dirname(d));
  return parents.every((p) => p === parents[0]) ? parents[0] : null;
}

// --- category specs (source of truth, before active-state is computed) ---

// Build a category spec from a manifest / legacy entry with explicit variants.
function specFromExplicit(baseDir, entry) {
  const variants = entry.variants
    .map((v) => ({
      id: path.basename(v.dir),
      label: v.label || prettifyName(path.basename(v.dir)),
      sourceDir: path.resolve(baseDir, v.dir),
    }))
    .filter((v) => fs.existsSync(v.sourceDir));
  if (variants.length === 0) return null;

  const target = entry.target || '.';
  let backupHome = null;
  if (target === '.') {
    backupHome = entry.backupDir
      ? path.resolve(baseDir, entry.backupDir)
      : commonParent(variants.map((v) => v.sourceDir));
  }
  return { label: entry.label, target, backupHome, variants };
}

// Build a category spec by scanning a single Options subfolder: its subfolders
// are variants, or its loose files form one implicit variant.
function specFromSubdir(optionsDir, name) {
  const categoryDir = path.join(optionsDir, name);
  let entries;
  try {
    entries = fs.readdirSync(categoryDir, { withFileTypes: true });
  } catch {
    return null;
  }

  const variants = [];
  for (const d of entries) {
    if (!d.isDirectory() || d.name === ORIGINAL_VARIANT_DIR) continue;
    variants.push({
      id: d.name,
      label: prettifyName(d.name),
      sourceDir: path.join(categoryDir, d.name),
    });
  }

  const looseFiles = entries.filter((e) => e.isFile() && e.name !== MANIFEST_FILE);
  if (looseFiles.length > 0) {
    variants.push({
      id: '.',
      label: prettifyName(name),
      sourceDir: categoryDir,
      looseFiles: looseFiles.map((e) => e.name),
    });
  }

  if (variants.length === 0) return null;
  return { label: prettifyName(name), target: '.', backupHome: categoryDir, variants };
}

function loadManifest(uiRoot) {
  const file = path.join(uiRoot, OPTIONS_DIR, MANIFEST_FILE);
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(data.categories) ? data.categories : [];
  } catch {
    return [];
  }
}

// Top-level Options subfolder a manifest variant dir belongs to, so it can be
// excluded from auto-discovery.
function topLevelDir(dir) {
  const norm = dir.replace(/\\/g, '/');
  return norm.split('/')[0];
}

function collectSpecs(uiRoot) {
  const optionsDir = path.join(uiRoot, OPTIONS_DIR);
  const specs = [];
  const claimed = new Set();

  for (const entry of loadManifest(uiRoot)) {
    if (!entry || !Array.isArray(entry.variants)) continue;
    for (const v of entry.variants) if (v.dir) claimed.add(topLevelDir(v.dir));
    const spec = specFromExplicit(optionsDir, entry);
    if (spec) specs.push(spec);
  }

  let optionEntries = [];
  try {
    optionEntries = fs.readdirSync(optionsDir, { withFileTypes: true });
  } catch {
    /* no Options dir */
  }
  for (const entry of optionEntries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('_') || claimed.has(entry.name)) continue;
    const spec = specFromSubdir(optionsDir, entry.name);
    if (spec) specs.push(spec);
  }

  // Legacy root folders (only if still present and not already covered).
  const haveLabels = new Set(specs.map((s) => s.label));
  for (const entry of LEGACY_ROOT_CATEGORIES) {
    if (haveLabels.has(entry.label)) continue;
    const spec = specFromExplicit(uiRoot, entry);
    if (spec) specs.push(spec);
  }

  return specs;
}

// --- public API ---

function categoryId(label) {
  return `cat/${label}`;
}

function materialize(uiRoot, spec, withActive) {
  const targetDir = path.resolve(uiRoot, spec.target);
  const variants = spec.variants.map((v) => ({
    id: v.id,
    label: v.label,
    active: withActive ? variantIsActive(v, targetDir) : false,
    sourceDir: v.sourceDir,
    looseFiles: v.looseFiles,
  }));

  // Offer the backed-up originals for revert (root-targeting categories only).
  if (spec.target === '.' && spec.backupHome) {
    const originalDir = path.join(spec.backupHome, ORIGINAL_VARIANT_DIR);
    if (fs.existsSync(originalDir) && listFilesRecursive(originalDir).length > 0) {
      const original = { id: ORIGINAL_VARIANT_DIR, label: ORIGINAL_VARIANT_LABEL, sourceDir: originalDir };
      variants.unshift({
        id: original.id,
        label: original.label,
        active: withActive ? variantIsActive(original, targetDir) : false,
        sourceDir: original.sourceDir,
      });
    }
  }

  return { id: categoryId(spec.label), label: spec.label, target: spec.target, variants };
}

function scan(uiRoot) {
  if (!isUiRoot(uiRoot)) {
    throw new Error(`Not a TokaZerk UI folder (no "${OPTIONS_DIR}" directory): ${uiRoot}`);
  }
  return collectSpecs(uiRoot).map((spec) => materialize(uiRoot, spec, true));
}

// Lightweight lookup that skips the (potentially expensive) active-state hashing.
function find(uiRoot, catId, variantId) {
  const spec = collectSpecs(uiRoot).find((s) => categoryId(s.label) === catId);
  if (!spec) return null;
  const cat = materialize(uiRoot, spec, false);
  const variant = cat.variants.find((v) => v.id === variantId);
  return variant ? { category: cat, spec, variant } : null;
}

function copyInto(sourceDir, files, targetDir) {
  for (const rel of files) {
    const dest = path.join(targetDir, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(sourceDir, rel), dest);
  }
}

// Before a root-targeting category overwrites files for the first time,
// snapshot the current root versions so "Original" stays selectable.
function backupOriginals(spec, uiRoot) {
  if (spec.target !== '.' || !spec.backupHome) return;
  const originalDir = path.join(spec.backupHome, ORIGINAL_VARIANT_DIR);
  if (fs.existsSync(originalDir)) return;

  const allFiles = new Set();
  for (const v of spec.variants) for (const f of variantFiles(v)) allFiles.add(f);
  const existing = [...allFiles].filter((rel) => fs.existsSync(path.join(uiRoot, rel)));
  if (existing.length > 0) copyInto(uiRoot, existing, originalDir);
}

function apply(uiRoot, catId, variantId) {
  const hit = find(uiRoot, catId, variantId);
  if (!hit) throw new Error(`Unknown variant "${variantId}" in category "${catId}"`);

  const { spec, variant } = hit;
  const targetDir = path.resolve(uiRoot, spec.target);
  const files = variant.looseFiles || listFilesRecursive(variant.sourceDir);

  if (variant.id !== ORIGINAL_VARIANT_DIR) backupOriginals(spec, uiRoot);
  copyInto(variant.sourceDir, files, targetDir);
  return files.length;
}

module.exports = { scan, find, apply, isUiRoot, categoryId };
