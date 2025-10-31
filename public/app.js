// ---- Types (JSDoc for intellisense) ----
/**
 * @typedef {{ name?: string|null, category?: string|null, tags: string[], imageDataUrl?: string|null }} ImageInformationDTO
 * @typedef {{ [category: string]: ImageInformationDTO[] }} ImageMap
 */

// ---- DOM ----
const vscode = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : undefined;

const radioRoot = document.getElementById('radioRoot');
const catTitle = document.getElementById('catTitle');
const countEl = document.getElementById('count');
const scroller = document.getElementById('scroller');
const spacer = document.getElementById('spacer');
const layer = document.getElementById('layer');
const zoomOutBtn = document.getElementById('zoomOut');
const zoomInBtn = document.getElementById('zoomIn');
const zoomSlider = document.getElementById('zoomSlider');
const zoomPct = document.getElementById('zoomPct');
const ctxMenu = document.getElementById('contextMenu');
const searchInput = document.getElementById('searchInput');
const searchClear = document.getElementById('searchClear');
const loadingPane = document.getElementById('loadingPane');
const errorPane = document.getElementById('errorPane');
const errorText = document.getElementById('errorText');
const retryBtn = document.getElementById('retryBtn');
const reloadBtn = document.getElementById('reloadBtn');

// ---- Layout constants (keep in sync with CSS vars) ----
const GAP = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--gap')) || 16;
const OVERSCAN_ROWS = 4;
const BASE_TILE_W = 110;
const BASE_TILE_H = 120;
const BASE_IMG = 48;
const ANCHOR_HOLD_MS = 1000;
const SHOW_ANCHOR_DEBUG = false;

// ---- State ----
/** @type {ImageMap} */ let DATA = {};
/** @type {string[]} */ let categories = [];
/** @type {string} */ let active = 'All Images';
/** @type {ImageInformation[]} */ let currentItems = [];
let ctxPayload = null;
let debugAnchorIndex = null;
let anchorLock = { index: null, timer: null };
let searchQuery = "";
let contentVersion = 0;
let zoom = 1.0;
const ZOOM_MIN = 0.40;
const ZOOM_MAX = 2.0;
const ZOOM_STEP = 0.05;

let columns = 1;
let totalRows = 0;
let lastStart = -1, lastEnd = -1;

// ---- Utils ----
function debounce(fn, ms = 100) {
    let t; return (...a) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...a), ms);
    };
}

function computeColumns() {
    const width = scroller.clientWidth || 800;
    const pad = 24;
    const tileW = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--tile-w'), 10) || Math.round(BASE_TILE_W * zoom);
    const gap = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--gap'), 10) || 16;
    const colSpace = tileW + gap;
    return Math.max(1, Math.floor((width - pad) / colSpace));
}

function setCategory(cat) {
    active = cat;
    catTitle.textContent = cat;
    recomputeItemsAndRender({ preserveScroll: false });
}

function recomputeItemsAndRender({ preserveScroll = false } = {}) {
    // Base items from category
    const base = (active === 'All Images')
        ? categories.flatMap(c => DATA[c] || [])
        : (DATA[active] || []);

    const pred = makeSearchPredicate(searchQuery);
    currentItems = base.filter(it => pred(it.name ?? ''));
    contentVersion++;

    countEl.textContent = `${currentItems.length} items`;

    const prevTopIndex = preserveScroll ? getCurrentTopIndex() : 0;

    columns = computeColumns();
    totalRows = Math.ceil(currentItems.length / columns);
    const rowH = TILE_H();
    spacer.style.height = (totalRows * rowH) + 'px';
    lastStart = lastEnd = -1;
    render();

    if (preserveScroll) {
        const newRow = Math.floor(Math.min(prevTopIndex, Math.max(0, currentItems.length - 1)) / columns);
        scroller.scrollTop = newRow * rowH;
    } else {
        scroller.scrollTop = 0;
    }
}

function buildRadios() {
    radioRoot.innerHTML = '';
    const make = (id, label, checked = false) => {
        const wrap = document.createElement('label');
        wrap.className = 'radio';
        wrap.setAttribute('role', 'radio');
        wrap.setAttribute('aria-checked', checked ? 'true' : 'false');

        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'category';
        input.id = id;
        input.checked = checked;

        input.addEventListener('change', () => {
            [...radioRoot.querySelectorAll('.radio')].forEach(r => r.setAttribute('aria-checked', 'false'));
            wrap.setAttribute('aria-checked', 'true');
            setCategory(label);
        });

        const span = document.createElement('span');
        span.textContent = label;

        wrap.appendChild(input);
        wrap.appendChild(span);
        radioRoot.appendChild(wrap);
    };

    make('all', 'All Images', true);
    categories.forEach((c, i) => make('c' + i, c, false));
}

function tileHTML(item, index) {
    const safeName = item.name ?? '(unnamed)';
    const src = item.imageDataUrl || '';
    // Add loading="lazy" for large sets
    return `
    <div class="tile" data-index="${index}" title="${safeName}">
      <img src="${src}" alt="" loading="lazy" />
      <div class="label">${safeName}</div>
    </div>`;
}

function ensureRowEl(rowIndex, rowH) {
    let el = layer.querySelector(`[data-row="${rowIndex}"]`);
    if (!el) {
        el = document.createElement('div');
        el.className = 'row';
        el.setAttribute('data-row', String(rowIndex));
        el.style.top = (rowIndex * rowH) + 'px';
        el.style.height = rowH + 'px';
        el.style.columnGap = getComputedStyle(document.documentElement).getPropertyValue('--gap');
        el.style.paddingTop = '2px';
        el.style.paddingBottom = '2px';
        layer.appendChild(el);
    } else {
        // keep position in sync when zoom changes
        el.style.top = (rowIndex * rowH) + 'px';
        el.style.height = rowH + 'px';
    }
    return el;
}

function render() {
    const emptyEl = layer.querySelector('.empty');
    if (currentItems.length === 0) {
        spacer.style.height = '0px';
        if (!emptyEl) {
            layer.innerHTML = '<div class="empty">No images.</div>';
        }
        return;
    } else {
        // We have items now → ensure the empty banner is gone
        if (emptyEl) {
            emptyEl.remove();
        }
    }

    const rowH = TILE_H();
    const scrollTop = scroller.scrollTop;
    const viewH = scroller.clientHeight;
    const firstRow = Math.max(0, Math.floor(scrollTop / rowH) - OVERSCAN_ROWS);
    const visibleRows = Math.ceil(viewH / rowH) + 2 * OVERSCAN_ROWS;
    const lastRow = Math.min(totalRows - 1, firstRow + visibleRows);

    if (firstRow === lastStart && lastRow === lastEnd) {
        return;
    }
    lastStart = firstRow;
    lastEnd = lastRow;

    // Prune rows outside range
    [...layer.children].forEach(child => {
        const r = Number(child.getAttribute('data-row'));
        if (isNaN(r) || r < firstRow || r > lastRow) {
            child.remove();
        }
    });

    // Render needed rows
    for (let r = firstRow; r <= lastRow; r++) {
        const start = r * columns;
        const end = Math.min(start + columns, currentItems.length);
        const rowItems = currentItems.slice(start, end);

        const rowEl = ensureRowEl(r, rowH);
        const sig = `${contentVersion}|c${columns}|s${start}`;
        const prevSig = rowEl.getAttribute('data-sig');
        if (prevSig !== sig) {
            rowEl.setAttribute('data-cols', String(columns));
            rowEl.innerHTML = rowItems.map((item, i) => tileHTML(item, start + i)).join('');
        }
    }

    updateVisibleImagesSmoothing();
    markAnchorTile();
}

function clamp(v, lo, hi) {
    return Math.min(hi, Math.max(lo, v));
}

function applyZoom(newZoom) {
    // Clamp and short-circuit
    const ZOOM_MIN = 0.75, ZOOM_MAX = 2.0;
    newZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +newZoom));
    if (newZoom === zoom) {
        return;
    }

    // Anchor-lock: keep using the same anchor across a burst of zoom steps
    beginOrBumpAnchorLock();
    const anchorIndex = getLockedOrCurrentAnchor();

    // Keep for debug marking
    debugAnchorIndex = anchorIndex;

    // Apply zoom → update CSS variables
    zoom = newZoom;
    document.documentElement.style.setProperty('--tile-w', Math.round(BASE_TILE_W * zoom) + 'px');
    document.documentElement.style.setProperty('--tile-h', Math.round(BASE_TILE_H * zoom) + 'px');
    document.documentElement.style.setProperty('--img', Math.round(BASE_IMG * zoom) + 'px');

    // UI controls
    if (zoomSlider) {
        zoomSlider.value = String(Math.round(zoom * 100));
    }
    if (zoomPct) {
        zoomPct.textContent = Math.round(zoom * 100) + '%';
    }

    // Recompute virtualization with new sizes
    columns = computeColumns();
    totalRows = Math.ceil(currentItems.length / columns);
    const newRowH = TILE_H();
    spacer.style.height = (totalRows * newRowH) + 'px';
    lastStart = lastEnd = -1;
    render();

    // --- Scroll so the anchor item becomes the top item of its new row ---
    const newRow = Math.floor(anchorIndex / columns);
    scroller.scrollTop = newRow * newRowH;

    // Persist zoom
    try {
        vscode?.setState?.({ zoom });
    } catch { }
}

function TILE_H() {
    const h = getComputedStyle(document.documentElement).getPropertyValue('--tile-h');
    const n = parseInt(h, 10);
    return Number.isFinite(n) ? n : Math.round(BASE_TILE_H * zoom);
}

function getCurrentTopIndex() {
    const rowH = TILE_H();
    const row = Math.max(0, Math.floor(scroller.scrollTop / rowH));
    const idx = Math.min(row * columns, Math.max(0, currentItems.length - 1));
    return idx;
}

function beginOrBumpAnchorLock() {
    // Initialize anchor on first zoom step in a burst
    if (anchorLock.index === null || anchorLock.index === undefined) {
        anchorLock.index = getCurrentTopIndex();
    }
    // Refresh the timer; only when this runs out is the anchor allowed to change
    if (anchorLock.timer) { clearTimeout(anchorLock.timer); }
    anchorLock.timer = setTimeout(() => {
        anchorLock.index = null;
        anchorLock.timer = null;
        // optional: clear debug once unlocked
        if (SHOW_ANCHOR_DEBUG) { debugAnchorIndex = null; markAnchorTile(); }
    }, ANCHOR_HOLD_MS);

    // For debug highlighting
    if (SHOW_ANCHOR_DEBUG) { debugAnchorIndex = anchorLock.index; markAnchorTile(); }
}

function getLockedOrCurrentAnchor() {
    return anchorLock.index !== null && anchorLock.index !== undefined ? anchorLock.index : getCurrentTopIndex();
}

function markAnchorTile() {
    // Clear any previous mark
    layer.querySelectorAll('.tile.anchor').forEach(el => el.classList.remove('anchor'));
    if (!SHOW_ANCHOR_DEBUG || debugAnchorIndex === null || debugAnchorIndex === undefined) {
        return;
    }

    const el = layer.querySelector(`.tile[data-index="${debugAnchorIndex}"]`);
    if (el) {
        el.classList.add('anchor');
    }
}

function openCtxMenu(x, y) {
    if (!ctxMenu) {
        return;
    }
    ctxMenu.style.display = 'block';
    ctxMenu.setAttribute('aria-hidden', 'false');

    // Position within viewport
    const rect = ctxMenu.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    const left = Math.min(x, vw - rect.width - 4);
    const top = Math.min(y, vh - rect.height - 4);
    ctxMenu.style.left = left + 'px';
    ctxMenu.style.top = top + 'px';

    // Focus first item for keyboard users
    const first = ctxMenu.querySelector('.ctxitem');
    first?.focus();
}

function hideCtxMenu() {
    if (!ctxMenu) {
        return;
    }
    ctxMenu.style.display = 'none';
    ctxMenu.setAttribute('aria-hidden', 'true');
    ctxPayload = null;
}

// Parse a data URL into { mime, base64, byteLength }
function parseDataUrl(dataUrl) {
    const m = /^data:([^;]+);base64,(.*)$/.exec(dataUrl || '');
    if (!m) {
        return null;
    }
    const [, mime, b64] = m;
    return { mime, base64: b64, byteLength: Math.floor((b64.length * 3) / 4) };
}

async function blobFromDataUrl(dataUrl) {
    try {
        const res = await fetch(dataUrl);
        return await res.blob();
    } catch {
        const parsed = parseDataUrl(dataUrl);
        if (!parsed) {
            throw new Error('Not a base64 data URL');
        }
        const bin = atob(parsed.base64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) { bytes[i] = bin.charCodeAt(i); }
        return new Blob([bytes], { type: parsed.mime });
    }
}

// Non-blocking toast via extension
function notify(kind, message) {
    try {
        vscode?.postMessage?.({ type: 'notify', kind, message });
    }
    catch { }
}

function isUpscaled(img) {
    // Guard: need intrinsic size
    const nw = img.naturalWidth, nh = img.naturalHeight;
    if (!nw || !nh) {
        return false;
    }
    const rw = img.clientWidth, rh = img.clientHeight;
    // Consider upscaled if either axis is > natural by ~1% (to avoid float noise)
    return rw > nw * 1.01 || rh > nh * 1.01;
}

function updateImgSmoothing(img) {
    // If image hasn't loaded yet, wait for it
    if (!img.complete || !img.naturalWidth) {
        img.addEventListener('load', () => updateImgSmoothing(img), { once: true });
        return;
    }
    if (isUpscaled(img)) {
        img.classList.add('upscaled');
    }
    else {
        img.classList.remove('upscaled');
    }
}

// Run on a collection of images (visible tiles)
function updateVisibleImagesSmoothing(root = layer) {
    const imgs = root.querySelectorAll('.tile img');
    imgs.forEach(updateImgSmoothing);
}

function normalize(s) {
    return (s ?? "").toString().trim().toLowerCase();
}

function makeSearchPredicate(query) {
    const q = query.trim();

    // Exact in quotes: "exact text"
    const exactMatch = /^"(.*)"$/.exec(q);
    if (exactMatch) {
        const needle = normalize(exactMatch[1]);
        return (name) => normalize(name) === needle;
    }

    // Wildcards
    const hasLeading = q.startsWith('*');
    const hasTrailing = q.endsWith('*');
    const core = normalize(q.replace(/^\*/, '').replace(/\*$/, ''));

    if (!q || core.length === 0) {
        // No query → match all
        return () => true;
    }

    if (hasLeading && hasTrailing) {
        return (name) => normalize(name).includes(core);     // *anywhere*
    }
    if (hasTrailing && !hasLeading) {
        return (name) => normalize(name).startsWith(core);   // beginswith*
    }
    if (hasLeading && !hasTrailing) {
        return (name) => normalize(name).endsWith(core);     // *endswith
    }
    // default: anywhere
    return (name) => normalize(name).includes(core);
}

function showLoading(message = 'Loading…') {
    if (errorPane) {
        errorPane.hidden = true;
    }
    if (loadingPane) {
        const txt = loadingPane.querySelector('.status-text');
        if (txt) {
            txt.textContent = message;
        }
        loadingPane.hidden = false;
    }
}
function hideLoading() {
    if (loadingPane) {
        loadingPane.hidden = true;
    }
}

function showError(message) {
    if (loadingPane) {
        loadingPane.hidden = true;
    }
    if (errorText) {
        errorText.textContent = message || 'An unknown error occurred.';
    }
    if (errorPane) {
        errorPane.hidden = false;
    }
}
function hideError() {
    if (errorPane) {
        errorPane.hidden = true;
    }
}

function setupGeneral() {
    const onScroll = () => render();
    const onResize = debounce(() => {
        columns = computeColumns();
        totalRows = Math.ceil(currentItems.length / columns);
        spacer.style.height = (totalRows * TILE_H) + 'px';
        lastStart = lastEnd = -1;
        render();
    }, 60);

    retryBtn?.addEventListener('click', () => {
        hideError();
        showLoading('Retrying…');
        vscode?.postMessage?.({ type: 'retry' });
    });

    scroller.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    const requestRetry = debounce(() => {
        hideError();
        showLoading('Reloading…');
        vscode?.postMessage?.({ type: 'retry' });
    }, 150);
    reloadBtn?.addEventListener('click', () => requestRetry());
    window.addEventListener('keydown', (e) => {
        if (e.key === 'F5') {
            e.preventDefault();
            requestRetry();
        }
    });

    // ---- Data wiring ----
    window.addEventListener('message', (evt) => {
        const { type, payload } = evt.data ?? {};
        if (type === 'loading') {
            showLoading(payload?.message || 'Loading…');
            return;
        }
        if (type === 'error') {
            showError(payload?.message || 'Failed to load.');
            return;
        }
        if (type === 'setData') {
            hideLoading();
            hideError();

            DATA = payload || {};
            categories = Object.keys(DATA);
            buildRadios();
            setCategory('All Images');
            return;
        }
    });
}

function setupZoom() {
    // Buttons
    zoomOutBtn?.addEventListener('click', () => applyZoom(zoom - ZOOM_STEP));
    zoomInBtn?.addEventListener('click', () => applyZoom(zoom + ZOOM_STEP));

    // Slider (value is in percent)
    zoomSlider?.addEventListener('input', (e) => {
        const pct = Number(e.target.value) || 100;
        applyZoom(pct / 100, { keepCenter: false });
    });

    // Ctrl + mouse wheel
    scroller.addEventListener('wheel', (e) => {
        if (e.ctrlKey) {
            e.preventDefault();
            const delta = Math.sign(e.deltaY);
            applyZoom(zoom + (delta > 0 ? -ZOOM_STEP : ZOOM_STEP));
        }
    }, { passive: false });

    // Keyboard shortcuts in the webview
    window.addEventListener('keydown', (e) => {
        const ctrlOrCmd = e.ctrlKey || e.metaKey;
        if (!ctrlOrCmd) {
            return;
        }
        if (e.key === '=' || e.key === '+') {
            e.preventDefault();
            applyZoom(zoom + ZOOM_STEP);
        }
        if (e.key === '-') {
            e.preventDefault();
            applyZoom(zoom - ZOOM_STEP);
        }
        if (e.key === '0') {
            e.preventDefault();
            applyZoom(1.0);
        }
    });

    // Restore previously saved zoom on load
    (function restoreZoom() {
        try {
            const state = vscode?.getState?.();
            if (state?.zoom) {
                applyZoom(state.zoom, { keepCenter: false });
            } else {
                applyZoom(1.0, { keepCenter: false });
            }
        } catch {
            applyZoom(1.0, { keepCenter: false });
        }
    })();
}

function setupContextMenu() {
    document.addEventListener('contextmenu', (e) => {
        // If we clicked a tile (or its img/label), show custom menu
        const tileEl = e.target.closest?.('.tile');
        if (tileEl) {
            e.preventDefault();
            const img = tileEl.querySelector('img');
            const label = tileEl.querySelector('.label');
            ctxPayload = {
                tileEl,
                name: label?.textContent?.trim() || '',
                src: img?.getAttribute('src') || ''
            };
            openCtxMenu(e.clientX, e.clientY);
            return;
        }

        // Otherwise, prevent the default VS Code menu and hide ours
        e.preventDefault();
        hideCtxMenu();
    }, { capture: true });

    ctxMenu?.addEventListener('click', async (e) => {
        const btn = e.target.closest('.ctxitem');
        if (!btn) {
            return;
        }
        const action = btn.getAttribute('data-action');
        const { name, src } = ctxPayload;
        try {
            if (action === 'copy-name') {
                await navigator.clipboard.writeText(name || '');
                notify('info', `Copied name: ${name || '(unnamed)'}`);
            }

            if (action === 'copy-image') {
                const blob = await blobFromDataUrl(src);
                // Try writing the image to the system clipboard
                try {
                    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
                    notify('info', 'Image copied to clipboard.');
                } catch (err) {
                    // Fallback: copy data URL text so user can paste it, and inform them
                    await navigator.clipboard.writeText(src);
                    notify('warning', 'Could not copy as image; copied data URL instead.');
                }
            }

            if (action === 'export-image') {
                const parsed = parseDataUrl(src);
                if (!parsed) { throw new Error('Invalid image data.'); }
                // Suggest a filename (no slashes)
                const safeName = (name || 'image').replace(/[\\/:*?"<>|]/g, '_');
                vscode?.postMessage?.({
                    type: 'export-image',
                    payload: { name: safeName, mime: parsed.mime, base64: parsed.base64 }
                });
            }
        } catch (err) {
            notify('error', String(err?.message || err));
        } finally {
            hideCtxMenu();
        }
    });

    document.addEventListener('mousedown', (e) => {
        if (!ctxMenu || ctxMenu.style.display !== 'block') {
            return;
        }
        if (!ctxMenu.contains(e.target)) {
            hideCtxMenu();
        }
    });
    scroller.addEventListener('scroll', hideCtxMenu, { passive: true });
    window.addEventListener('blur', hideCtxMenu);
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideCtxMenu();
        }
    });

}

function setupSearch() {
    const doSearch = debounce(() => {
        searchQuery = searchInput.value || "";
        // When typing, try to preserve which row is at the top
        recomputeItemsAndRender({ preserveScroll: true });
    }, 120);

    searchInput?.addEventListener('input', doSearch);

    searchClear?.addEventListener('click', () => {
        if (!searchInput) {
            return;
        }
        searchInput.value = "";
        searchQuery = "";
        recomputeItemsAndRender({ preserveScroll: false });
        searchInput.focus();
    });

    // Ctrl/Cmd+F focuses the search box
    window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
            e.preventDefault();
            searchInput?.focus();
            searchInput?.select();
        }
    });

}

setupGeneral();
setupZoom();
setupContextMenu();
setupSearch();

// tell the extension we're ready
showLoading('Loading images…');
vscode?.postMessage?.({ type: 'ready' });

// Fallback demo when opened in a plain browser (optional)
if (!vscode) {
    const demo = {
        ActionImages: Array.from({ length: 100 }, (_, i) => ({ name: `Action ${i + 1}`, category: 'ActionImages', tags: [], imageDataUrl: '' })),
        OtherImages: Array.from({ length: 120 }, (_, i) => ({ name: `Other ${i + 1}`, category: 'OtherImages', tags: [], imageDataUrl: '' })),
    };
    window.postMessage({ type: 'setData', payload: demo }, '*');
}
