'use strict';

const categoriesEl = document.getElementById('categories');
const emptyEl = document.getElementById('empty');
const uiRootEl = document.getElementById('ui-root');
const toastEl = document.getElementById('toast');
const lightboxEl = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');

let toastTimer = null;

function toast(message, isError) {
  toastEl.textContent = message;
  toastEl.classList.toggle('error', !!isError);
  toastEl.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.add('hidden'), 3500);
}

function openLightbox(dataUrl) {
  lightboxImg.src = dataUrl;
  lightboxEl.classList.remove('hidden');
}
lightboxEl.addEventListener('click', () => lightboxEl.classList.add('hidden'));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') lightboxEl.classList.add('hidden');
});

// Fills a card's thumbnail once the main process has resolved a preview.
async function loadPreview(catId, variantId, thumbEl, zoomBtn) {
  const preview = await window.picker.preview(catId, variantId);
  thumbEl.innerHTML = '';
  if (!preview) {
    const ph = document.createElement('span');
    ph.className = 'placeholder';
    ph.textContent = 'No preview';
    thumbEl.appendChild(ph);
    return;
  }
  thumbEl.classList.toggle('swatch', preview.kind === 'swatch');
  const img = document.createElement('img');
  img.src = preview.dataUrl;
  img.alt = variantId;
  thumbEl.appendChild(img);
  zoomBtn.hidden = false;
  zoomBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openLightbox(preview.dataUrl);
  });
}

function buildVariantCard(cat, v) {
  const card = document.createElement('button');
  card.className = 'variant' + (v.active ? ' active' : '');
  card.disabled = !!v.active;
  card.title = v.active ? 'Currently active' : `Apply "${v.label}"`;

  const thumb = document.createElement('div');
  thumb.className = 'thumb';
  thumb.innerHTML = '<span class="placeholder">…</span>';

  const zoom = document.createElement('button');
  zoom.className = 'zoom';
  zoom.textContent = '⌕';
  zoom.title = 'Enlarge preview';
  zoom.hidden = true;

  const caption = document.createElement('div');
  caption.className = 'caption';
  const name = document.createElement('span');
  name.className = 'name';
  name.textContent = v.label;
  const check = document.createElement('span');
  check.className = 'check';
  check.textContent = '✓';
  caption.append(name, check);

  card.append(thumb, zoom, caption);

  card.addEventListener('click', async () => {
    if (v.active) return;
    card.disabled = true;
    render(await window.picker.apply(cat.id, v.id));
  });

  loadPreview(cat.id, v.id, thumb, zoom);
  return card;
}

function render(state) {
  uiRootEl.textContent = state.uiRoot || '';
  emptyEl.classList.toggle('hidden', !!state.uiRoot);
  categoriesEl.innerHTML = '';

  if (state.error) toast(state.error, true);
  if (state.applied) {
    const label = state.applied.variantId === '_original' ? 'Original' : state.applied.variantId;
    toast(`Applied "${label}" (${state.applied.count} file${state.applied.count === 1 ? '' : 's'})`);
  }
  if (!state.uiRoot) return;

  if (state.categories.length === 0) {
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = 'No swappable assets found in this folder.';
    categoriesEl.appendChild(p);
    return;
  }

  for (const cat of state.categories) {
    const card = document.createElement('section');
    card.className = 'category';

    const h = document.createElement('h2');
    h.textContent = cat.label;
    card.appendChild(h);

    const list = document.createElement('div');
    list.className = 'variants';
    for (const v of cat.variants) list.appendChild(buildVariantCard(cat, v));
    card.appendChild(list);
    categoriesEl.appendChild(card);
  }
}

async function pickFolder() {
  render(await window.picker.pickFolder());
}

document.getElementById('pick-folder').addEventListener('click', pickFolder);
document.getElementById('pick-folder-empty').addEventListener('click', pickFolder);

window.picker.getState().then(render);
