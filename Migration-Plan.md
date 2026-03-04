# Migration Plan: Vue 3 + Vite + TypeScript

---

## 1. Understand the two isolated build targets

Your project already has two separate concerns that compile independently and must stay that way:

| Target         | Source                          | Output               | Compiler         |
| -------------- | ------------------------------- | -------------------- | ---------------- |
| Extension host | src                             | out                  | `tsc` (existing) |
| Webview UI     | public (currently hand-written) | public (Vite output) | Vite (new)       |

The extension host tsconfig.json and build pipeline **are not touched**. A completely separate Vite build is introduced for the webview.

---

## 2. New folder structure

```txt
webview/                        ← new source root for the Vue app
  index.html                    ← Vite entry HTML (replaces public/index.html)
  vite.config.ts
  tsconfig.json                 ← separate tsconfig for Vue (not the extension host one)
  src/
    main.ts                     ← createApp entry
    App.vue                     ← root component (layout shell)
    vscode.ts                   ← acquireVsCodeApi wrapper + typed postMessage
    types/
      imageInformationDTO.ts    ← copy/move from src/types/
    composables/
      useMessages.ts            ← window.addEventListener('message') + vscode.postMessage
      useZoom.ts                ← zoom state, applyZoom, keyboard/wheel handlers
      useSearch.ts              ← search query, predicate, debounce
    components/
      CategoryRail.vue          ← left rail with category radio buttons
      ImageGrid.vue             ← @tanstack/vue-virtual virtualizer (main piece)
      ImageTile.vue             ← single tile (img + label)
      SearchHeader.vue          ← toolbar: title, count, search, zoom, reload
      ContextMenu.vue           ← right-click menu
      StatusPane.vue            ← loading spinner + error state
```

public becomes **Vite's output directory** — the existing hand-written files are deleted after Vite takes over.

---

## 3. Install dependencies

```bash
# Vite + Vue build toolchain (devDependencies — bundled into public/, not shipped as node_modules)
npm install --save-dev vite @vitejs/plugin-vue @vue/tsconfig

# Vue runtime + virtual scroll (bundled by Vite, so devDependencies is fine)
npm install --save-dev vue @tanstack/vue-virtual

# Vue ESLint (optional but recommended)
npm install --save-dev eslint-plugin-vue
```

---

## 4. `webview/vite.config.ts`

Key decisions here:

- **Output dir**: `../public/` — keeps extension.ts reading from the same place
- **No content hashing** on filenames — so `%APP_URI%` and `%STYLE_URI%` placeholders stay predictable and extension.ts needs no changes
- **Single CSS file** extracted alongside JS
- **No index.html in output** (Vite's built HTML is not used — index.html continues to be your hand-maintained template)

```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  root: './webview',
  plugins: [vue()],
  build: {
    outDir: '../public',
    emptyOutDir: false,           // don't delete index.html you manage manually
    rollupOptions: {
      input: 'webview/src/main.ts',
      output: {
        entryFileNames: 'app.js',   // keeps %APP_URI% working in extension.ts
        assetFileNames: (info) =>
          info.name?.endsWith('.css') ? 'styles.css' : info.name ?? 'asset',
      },
    },
    cssCodeSplit: false,
    sourcemap: false,
    minify: true,
  },
})
```

extension.ts and its `%APP_URI%` / `%STYLE_URI%` / `%NONCE%` placeholder system are **unchanged** because Vite emits predictable filenames.

---

## 5. tsconfig.json

Separate from the extension host tsconfig.json (which must continue to compile only src):

```jsonc
{
  "extends": "@vue/tsconfig/tsconfig.dom.json",
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noEmit": true           // Vite handles emit, not tsc
  },
  "include": ["webview/src/**/*"]
}
```

---

## 6. index.html

This is **only used by Vite dev server** (for local testing outside VS Code). The actual webview still uses index.html managed by extension.ts.

```html
<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8" /><title>Dev</title></head>
  <body>
    <div id="app"></div>
    <script type="module" src="/webview/src/main.ts"></script>
  </body>
</html>
```

---

## 7. package.json script changes

```jsonc
"scripts": {
  "vscode:prepublish": "npm run compile && npm run build:webview",  // ← add webview build
  "compile": "tsc -p ./",
  "watch": "tsc -watch -p ./",
  "build:webview": "vite build",
  "watch:webview": "vite build --watch",               // ← run alongside tsc watch
  "dev:webview": "vite",                               // ← dev server for browser testing
  "pretest": "npm run compile && npm run lint",
  "lint": "eslint src",
  "package": "npx -y @vscode/vsce package"
}
```

During development you run two terminals: `npm run watch` (extension host) + `npm run watch:webview` (Vue/Vite).

---

## 8. index.html — minimal changes

The existing index.html placeholders (`%APP_URI%`, `%STYLE_URI%`, `%NONCE%`, `%CSP_SOURCE%`) stay exactly the same. The only required change is replacing the static DOM structure with just the Vue mount point:

```html
<!-- before: lots of static HTML -->
<!-- after: -->
<body>
  <div id="app"></div>
  <script nonce="%NONCE%" src="%APP_URI%"></script>
</body>
```

All the HTML structure moves into `.vue` files. The `<link rel="stylesheet">` tag stays because Vite emits styles.css.

---

## 9. extension.ts — no changes required

`getWebviewHtml` continues replacing the same placeholders. Nothing changes here.

---

## 10. Logic migration map (app.js → Vue)

| Current in app.js                                                     | Migrates to                                       |
| --------------------------------------------------------------------- | ------------------------------------------------- |
| `setupGeneral()` — message listener, retry/reload buttons             | `composables/useMessages.ts`                      |
| `setupZoom()` — zoom state, keyboard, wheel, slider                   | `composables/useZoom.ts`                          |
| `setupSearch()` — debounced input, predicate                          | `composables/useSearch.ts`                        |
| `setupContextMenu()` — open/close, actions                            | `components/ContextMenu.vue`                      |
| `buildRadios()`                                                       | `components/CategoryRail.vue`                     |
| `render()`, `ensureRowEl()`, spacer/layer/rows                        | `components/ImageGrid.vue` using `useVirtualizer` |
| `tileHTML()`                                                          | `components/ImageTile.vue`                        |
| `showLoading()`, `showError()`                                        | `components/StatusPane.vue`                       |
| `applyZoom()` — CSS variable writes                                   | `composables/useZoom.ts` + CSS custom properties  |
| `makeSearchPredicate()`                                               | `composables/useSearch.ts`                        |
| `parseDataUrl()`, `blobFromDataUrl()`, `notify()`                     | `composables/useMessages.ts` or a `utils.ts`      |
| `DATA`, `categories`, `active`, `currentItems`, `zoom`, `searchQuery` | `App.vue` reactive state via `ref`/`computed`     |

---

## 11. `@tanstack/vue-virtual` integration in `ImageGrid.vue`

The hand-rolled virtual scroll maps directly:

| Current                             | TanStack replacement                                            |
| ----------------------------------- | --------------------------------------------------------------- |
| `columns`, `totalRows`              | computed from `useVirtualizer({ count: totalRows })`            |
| `spacer.style.height`               | `virtualizer.getTotalSize()`                                    |
| `layer.querySelector('[data-row]')` | `virtualizer.getVirtualItems()` — returns array of virtual rows |
| `OVERSCAN_ROWS = 4`                 | `overscan: 4` option                                            |
| Anchor-lock on zoom                 | `scrollToIndex()` with `align: 'start'`                         |

---

## 12. .vscodeignore — exclude webview source from packaged `.vsix`

```txt
webview/
```

The compiled output in public is already included. The Vue source in `webview/` should not be shipped.

---

## 13. ESLint update

Add Vue support to eslint.config.mjs:

```js
import pluginVue from 'eslint-plugin-vue'
// add to files: ["**/*.ts", "**/*.vue"]
// add pluginVue.configs['flat/recommended'] spread
```

---

## 14. Recommended migration order

1. Install dependencies
2. Create `webview/vite.config.ts` and tsconfig.json
3. Create `webview/src/main.ts`, `App.vue`, `vscode.ts`
4. Migrate composables (`useMessages`, `useZoom`, `useSearch`) — pure logic, no DOM
5. Build `StatusPane.vue`, `CategoryRail.vue`, `ImageTile.vue` — simple presentational
6. Build `ContextMenu.vue`
7. Build `ImageGrid.vue` with `@tanstack/vue-virtual` — the most complex piece
8. Build `SearchHeader.vue`
9. Update index.html to replace static DOM with `<div id="app">`
10. Wire `build:webview` into `vscode:prepublish`, test packaging
11. Delete the old app.js and styles.css (replaced by Vite output)
