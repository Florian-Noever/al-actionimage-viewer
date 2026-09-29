# AL ActionImage Viewer - Copilot Instructions

## Project Overview

**AL ActionImage Viewer** is a VS Code extension (publisher: `Florian-Noever`) that reads Business Central action images directly from the official [AL Language extension](https://marketplace.visualstudio.com/items?itemName=ms-dynamics-smb.al) and displays them in an interactive webview. Users can browse by category, search, zoom, copy images to the clipboard, and export individual images or entire categories.

The extension exposes **two UI surfaces** sharing the same webview bundle:
- A **full-panel tab** opened via the `al-actionimage-viewer.open` command (with category rail).
- A **sidebar webview** registered in the AL ActionImage Viewer activity-bar container, always visible.

The project has **three distinct layers**, each with its own language and toolchain:

```
al-actionimage-viewer/
├── src/                          # VS Code extension (TypeScript)
├── webview/                      # Webview UI (Vue 3 + Vite + TypeScript)
└── AL-ActionImage-Viewer.ImageInformationProvider/   # Image data bridge (C# / .NET 10)
```

---

## Layer 1 - C# Bridge (`AL-ActionImage-Viewer.ImageInformationProvider/`)

### Purpose
A self-contained .NET 10 console application that locates, loads, and reflects on the AL Language extension's `Microsoft.Dynamics.Nav.CodeAnalysis.dll` to extract all action image resources.  
It writes the result as a **custom binary payload to stdout**, then exits.

### Key Files
| File | Role |
|------|------|
| `Program.cs` | Entry point - parses `--dll-path` option via `System.CommandLine`, calls `BridgeWriteProvider.Write(dllPath)` |
| `Abstractions/IImageProvider.cs` | `IImageProvider` interface — abstraction over image loading; enables test doubles |
| `Utils/NAVImageInformationProvider.cs` | Finds the AL extension DLL, loads it via `Assembly.LoadFrom`, discovers image resource methods via reflection |
| `Utils/NAVImageProvider.cs` | `NAVImageProvider` — non-static `IImageProvider` adapter that delegates to `NAVImageInformationProvider` |
| `Utils/BridgeWriteProvider.cs` | Serialises discovered images into the binary wire protocol and writes them to stdout via `IImageProvider` |
| `Utils/NavTypeHelper.cs` | Constants for the AL DLL type/method names |
| `Data/ImageInformationDTO.cs` | `ImageInformationDTO` record: `Name`, `Category`, `Tags[]`, `ImageDataUrl` |

### AL Extension DLL Location
The DLL is discovered at runtime via the VS Code Extension API (`vscode.extensions.getExtension`) by the TypeScript extension, which then passes the path to the C# binary as a `--dll-path` argument. `getNavCodeAnalysisDllPath()` probes `<AL>/bin/` (AL 18+) and then `<AL>/bin/<platform>/` (older versions). If neither contains the DLL, no `--dll-path` is passed and the C# binary searches the AL extension folder recursively:
```
~/.vscode/extensions/ms-dynamics-smb.al-<version>/**/Microsoft.Dynamics.Nav.CodeAnalysis.dll
```
The extension requirement `extensionKind: ["ui"]` guarantees it always runs on the local machine.

### Reflection Strategy
The provider discovers *all* `static` methods on `Microsoft.Dynamics.Nav.CodeAnalysis.ImageResources` that return `IDictionary<string, string>` and take no parameters. Each such method maps to one image category (e.g. `ActionImage`, `FieldCueGroupImage`). The category name is derived from the method name by stripping `Get`/`Resource` affixes.

### Binary Wire Protocol (stdout)
The C# writer and TypeScript `BinaryReader` must mirror each other **exactly**:

```
[int32]  groupCount              // total number of categories
  [string] categoryName          // repeated groupCount times
  [int32]  itemCount             // -1 = unknown/streaming, int.MaxValue = sentinel EOF for streaming
    [string] name                // repeated itemCount times (or until sentinel)
    [string] category
    [int32]  tagCount
      [string] tag               // repeated tagCount times
    [string] imageDataUrl        // base64 data-URL, e.g. "data:image/png;base64,..."

// String encoding:
//   [int32]  byteLength         // -1 = null
//   [bytes]  UTF-8 bytes        // byteLength bytes
```

All integers are **little-endian int32**.

### Build & Publish
The binaries are not committed (`bin/` is gitignored). Publish profiles live under `Properties/PublishProfiles/`, and the csproj's `CopyToExtensionBin` target copies each published executable to `bin/<platform>/`. To publish them locally (PowerShell 7, `pwsh`, on any OS):
```bash
npm run publish:bridge                           # publish.ps1: dotnet publish -c Release -p:PublishProfile=win32|linux|darwin
npm run publish:bridge -- -PublishProfile linux  # a single profile
```
`npm run package` runs it first through its `prepackage` hook. CI publishes the same profiles itself (see [CI & Releases](#ci--releases)).

---

## Layer 2 - VS Code Extension (`src/`)

### Purpose
The TypeScript extension activates on the `al-actionimage-viewer.open` command and on sidebar view registration. For the full-panel tab it creates a `WebviewPanel`; for the sidebar it provides a `WebviewViewProvider`. Both webviews share identical HTML generated by `getWebviewHtml`, with a `sidebarMode` flag injected as a `data-` attribute. The extension spawns the C# bridge binary (passing the AL DLL path as `--dll-path`), reads its binary stdout, and relays image data to the webview via `postMessage`.

### Key Files
| File | Role |
|------|------|
| `extension.ts` | Activation, panel + sidebar registration, exports `MANIFEST` and `COMMAND_OPEN` |
| `utils/webviewUtils.ts` | `getWebviewHtml` (CSP/nonce/sidebarMode HTML injection), `handleWebviewMessage` (message dispatch), and `setupWebviewMessageListener` (shared listener wiring used by both panel and sidebar) |
| `utils/imageInformationProvider.ts` | Resolves binary path per platform, sets executable bit on Unix, discovers DLL via VS Code API, calls `readFromBridgeStdout` |
| `utils/binaryReader.ts` | `BinaryReader` class + `parseBridgePayload` — mirrors the C# binary protocol exactly |
| `utils/imageBrowserSidebarProvider.ts` | `ImageBrowserSidebarProvider` — `WebviewViewProvider` implementation for the activity-bar sidebar |
| `utils/logger.ts` | `Logger` static class wrapping `vscode.LogOutputChannel`; use `Logger.info/warn/error` in extension code |
| `handlers/loadImages.ts` | Spawns binary, sends `loading` → `setData` / `error` to webview |
| `handlers/exportImage.ts` | Handles `export-image` message - shows save dialog, writes file |
| `handlers/exportCategory.ts` | Handles `export-category` message - shows folder picker, writes all images with progress notification |
| `handlers/notify.ts` | Handles `notify` message - shows VS Code info/warning/error messages |
| `types/imageInformationDTO.ts` | TypeScript mirror of the C# DTO; exports `ImageInformationDTO` |
| `types/webviewMessages.ts` | `WebviewMessage` discriminated union (webview → extension) with `ExportImagePayload`, `ExportCategoryPayload` interfaces and `isWebviewMessage()` type guard |
| `utils/errors.ts` | `wrapError(operation, e)` — shared error-wrapping utility used by export handlers |
| `esbuild.mjs` | Build script (workspace root) — bundles extension and tests via esbuild; see §Bundler above |

### Webview Setup
- The extension reads `public/index.html` and injects `%STYLE_URI%`, `%APP_URI%`, `%CSP_SOURCE%`, `%NONCE%`, and `%SIDEBAR_MODE%` placeholders at runtime via `getWebviewHtml` in `webviewUtils.ts`.
- `%SIDEBAR_MODE%` is written to the `data-sidebar-mode` attribute on `<html>`, read by the webview via `isSidebarMode()`.
- CSP is enforced to only allow scripts with the injected nonce.
- `retainContextWhenHidden: true` keeps the full-panel webview alive when switching tabs.
- The sidebar webview does not use `retainContextWhenHidden` (managed by VS Code).

### Message Protocol (Extension ↔ Webview)

Message types are defined as **discriminated unions** with type guards:
- Webview → extension: `WebviewMessage` in `src/types/webviewMessages.ts` — use `isWebviewMessage()` to narrow
- Extension → webview: `ExtensionMessage` in `webview/src/types/extensionMessages.ts` — use `isExtensionMessage()` to narrow

**Extension → Webview:**
| `type` | Payload | Meaning |
|--------|---------|---------|
| `loading` | `{ message: string }` | Binary is running |
| `setData` | `Record<string, ImageInformationDTO[]>` | All image groups |
| `error` | `{ message: string }` | Load failed |

All extension → webview messages are wrapped as `{ type, payload }`.

**Webview → Extension:**
| `type` | Payload | Meaning |
|--------|---------|---------|
| `ready` | - | Webview mounted, load images |
| `retry` | - | User clicked retry, reload images |
| `notify` | `{ kind, message }` | Show VS Code notification |
| `export-image` | `{ name, mime, base64 }` | Save single image to disk |
| `export-category` | `{ category, images[] }` | Save all images in category to folder |

### Build
```bash
npm run compile          # check-types + lint + esbuild extension + vite webview
npm run watch            # parallel: esbuild --watch + tsc --noEmit --watch
npm run compile-tests    # esbuild all test entry points into out/test/
npm run build:webview    # vite build webview to public/
npm run check-types      # tsc --noEmit only (no emit)
npm run publish:bridge   # publish the C# bridge for win32/linux/darwin into bin/ (publish.ps1, needs pwsh)
npm run package          # prepackage publishes the bridge, then vsce package (.vsix), which runs vscode:prepublish
npm run test             # pretest (check-types + compile-tests), then node ./out/test/runTests.js; needs the bridge in bin/
```

### Bundler (`esbuild.mjs`)
The extension host is bundled with **esbuild** (not tsc). `tsc` is retained only for type-checking (`noEmit: true`). Key properties:
- Single output file: `out/extension.js` (CJS, Node platform)
- External: `vscode` only — all other imports are bundled
- Sourcemaps: always on (`sourcemap: true`), external `.js.map` file, ships in VSIX
- No minification of identifiers (`minify: false`)
- `--watch` flag: esbuild context watch mode with `esbuildProblemMatcherPlugin` (requires `connor4312.esbuild-problem-matchers` extension for the `$esbuild-watch` problem matcher in `tasks.json`)
- `--tests` flag: additionally bundles the three test entry points into `out/test/`

---

## Layer 3 - Webview UI (`webview/`)

### Purpose
A Vue 3 Single-File-Component application, built by Vite as a single **IIFE bundle** (`public/app.js` + `public/styles.css`) so it can run inside the VS Code webview sandbox with a strict CSP.

### Key Files & Components
| Path | Role |
|------|------|
| `src/App.vue` | Root component - wires composables together, handles keyboard shortcuts, message dispatch, dev fallback |
| `src/constants.ts` | **Single source of truth** for all shared numbers (layout, rail, tile sizes, zoom, grid) |
| `src/components/CategoryRail.vue` | Left sidebar listing all categories + "All Images"; auto-collapses at narrow widths; hidden in sidebar mode |
| `src/components/SearchHeader.vue` | Search input, zoom controls, sort toggle, reload button |
| `src/components/ImageGrid.vue` | Virtualised grid of image tiles (`@tanstack/vue-virtual`) |
| `src/components/ImageTile.vue` | Individual tile - image, name, click to select |
| `src/components/ContextMenu.vue` | Right-click menu for a single image (copy name / copy image / export) |
| `src/components/CategoryContextMenu.vue` | Right-click menu for a category (copy name / export all) |
| `src/components/StatusPane.vue` | Loading spinner and error state overlay |
| `src/composables/useDesignTokens.ts` | Injects layout CSS custom properties onto `<html>` from `constants.ts` at startup |
| `src/composables/useRailCollapse.ts` | Rail collapsed/expanded state: auto-collapse on resize + manual toggle + zoom adjustment + vscode state persistence |
| `src/composables/useImageData.ts` | Image data, loading/error state, `onDataMessage` handler |
| `src/composables/useContextMenu.ts` | Shared context-menu positioning, boundary-clamping, keyboard nav, and focus-trap logic |
| `src/composables/useZoom.ts` | Zoom level state + tile/image size derivation + CSS var injection + keyboard shortcuts + state persistence |
| `src/composables/useSearch.ts` | Filtered + sorted item list computed from active category and search query; deduplicates in "All Images" |
| `src/composables/useDebug.ts` | Debug border toggle (Ctrl+Shift+D) |
| `src/vscode.ts` | Typed wrapper around `acquireVsCodeApi()` — `postMessage`, `getState`, `setState`, `isVscode`, `isSidebarMode()` |
| `src/utils.ts` | `inlineSvg` (SVG fill → currentColor), `makeSearchPredicate` (wildcard and exact-match), `parseDataUrl`, `blobFromDataUrl`, `normalize`, `notify` helpers |
| `src/types/imageInformationDTO.ts` | Frontend mirror of the DTO + `ImageMap` type alias |
| `src/types/extensionMessages.ts` | `ExtensionMessage` discriminated union (extension → webview) with `isExtensionMessage()` type guard |

### Vite Build Configuration (`vite.config.ts`)
- Root: `webview/`
- Output: `public/` (alongside extension's `index.html`)
- Single IIFE entry (`webview/src/main.ts`) - no code splitting
- CSS merged into `styles.css`, assets inlined up to 8 KB

### Key Dependencies
| Package | Use |
|---------|-----|
| `vue` | Reactivity, SFC |
| `@tanstack/vue-virtual` | Virtual scrolling for large image grids |
| `floating-vue` | Tooltip primitives |
| `@vueuse/core` | Utility composables (`useResizeObserver` etc.) |

### Design Token System

All shared numbers have **one source of truth**: `constants.ts`. Two mechanisms inject them into the browser at runtime:

- **`useDesignTokens()`** (called once at the top of `App.vue` `<script setup>`) sets `--gap`, `--pad`, `--font`, `--rail-w`, `--rail-collapsed-w` on `document.documentElement`.
- **`useZoom.applyZoom()`** sets `--tile-w`, `--tile-h`, `--img` on `document.documentElement` whenever zoom changes.

All CSS in component `<style scoped>` blocks consumes these vars. Additionally, `global.css` defines **pure-CSS design tokens** (no TypeScript equivalent) in `:root`:

| Token | Value | Used for |
|---|---|---|
| `--btn-size` | 28px | All icon buttons |
| `--icon-size` | 16px | All SVG icons |
| `--radius-sm` | 4px | Buttons, menu items |
| `--radius-md` | 6px | Search box, menus, radio items |
| `--radius-card` | 10px | Image tiles |
| `--z-header` | 5 | Sticky header |
| `--z-overlay` | 10 | Status pane |
| `--z-menu` | 9999 | Context menus |
| `--z-debug` | 99999 | Debug badge |
| `--duration-fast` | 0.2s | Rail content fade |
| `--duration-base` | 0.25s | Rail slide transition |
| `--duration-slow` | 0.4s | Toggle button rotation |

**Rule**: never hardcode a value in component CSS that already has a token.

### Composable Responsibilities

| Composable | Owns |
|---|---|
| `useDesignTokens` | One-shot CSS var injection from `constants.ts` |
| `useRailCollapse(rootRef, zoomRef?, applyZoom?)` | `railCollapsed`, `toggleRailCollapse`, `restoreRailState`; auto-collapses below `RAIL_AUTO_COLLAPSE_WIDTH` (490 px) and auto-expands above `RAIL_AUTO_EXPAND_WIDTH` (530 px) if not manually toggled; when auto-collapsing also reduces zoom to 55% if currently at default, and restores zoom on auto-expand |
| `useImageData` | `data`, `categories`, `activeCategory`, `loading/loadingMessage`, `hasError/errorMessage`, `showLoading`, `showError`, `setCategory`, `onDataMessage(msg: ExtensionMessage)` |
| `useContextMenu(visible, x, y, emitClose)` | `menuRef`, `menuStyle`, `onMenuKeydown`; used by both `ContextMenu.vue` and `CategoryContextMenu.vue` |
| `useZoom` | `zoom`, `tileW`, `tileH`, `imgSize`, `applyZoom`, `zoomIn`, `zoomOut`, `resetZoom`; sets `--tile-*` CSS vars, handles `+`/`-`/`0` keyboard shortcuts, persists zoom level via `vscode.setState` |
| `useSearch(data, categories, activeCategory)` | `searchQuery`, `currentItems`, `sortAscending`, `toggleSort`; deduplicates items by name when "All Images" is active |
| `useDebug` | `debugActive`, `toggle` |

### SVG Import Pattern
- `?raw` suffix → used with `v-html="inlineSvg(...)"` (icons rendered inline so `fill` can be set to `currentColor`). `inlineSvg` is the shared helper in `src/utils.ts` — import it from there, never define it locally in a component.
- No suffix → used as `<img :src="...">` (hexagon, placeholder image)

### Rail Auto-Collapse
The category rail auto-collapses to 52 px when the total webview width drops below 490 px (constant `RAIL_AUTO_COLLAPSE_WIDTH`), and auto-expands when it rises back above 530 px (`RAIL_AUTO_EXPAND_WIDTH`). If the user manually toggles the rail, auto-expand is disabled until the next manual toggle. The collapsed state is also persisted via `vscode.setState`.

When auto-collapsing, if the current zoom is at the default (100%), zoom is also reduced to 55% to better fit content at narrow widths. Zoom is restored to default when auto-expanding. This behaviour is driven by the optional `zoomRef` and `applyZoom` arguments on `useRailCollapse`; these are omitted in sidebar mode so zoom is unaffected.

In sidebar mode the `CategoryRail` component is hidden entirely via `v-if="!sidebarMode"`; the grid spans the full width (`grid-template-columns: 1fr`).

### Data Flow (happy path)
```
App.vue mounts
  → useDesignTokens() sets CSS vars
  → postMessage({ type: 'ready' })
    → extension spawns C# binary
      → binary writes binary payload to stdout
        → BinaryReader parses payload
          → extension postMessage({ type: 'setData', payload: imageGroups })
            → useImageData.onDataMessage() stores data
              → CategoryRail populates, ImageGrid renders
```

---

## CI & Releases

The pipelines are the shared workflows of `Florian-Noever/Florian-Noever` (documented in its `.github/CI.md`); this repository only holds the two callers:

| Workflow | Trigger | What it does |
|----------|---------|--------------|
| `.github/workflows/ci.yml` | push, pull request | Job `bridge` (`dotnet-ci.yml`): `dotnet test` on the bridge solution, then publishes the bridge with all three profiles into the artifact `bridge`. Job `extension` (`vscode-extension-ci.yml`): downloads that artifact into `bin/`, runs the integration tests under xvfb and packs a preview VSIX that must contain all three bridge binaries. Job `automerge` (`dependabot-automerge.yml`): squash-merges a Dependabot pull request once both passed |
| `.github/workflows/publish.yml` | release published | The same two jobs from the release tag, with the release version stamped into the bridge; then attaches the VSIX to the GitHub release with a build attestation and publishes it to the VS Marketplace through Microsoft Entra ID (the account's shared app registration; environment `vs-marketplace`). Open VSX stays off because `ms-dynamics-smb.al` is not on Open VSX |

Dependabot (`.github/dependabot.yml`) opens weekly pull requests for npm, NuGet and GitHub Actions, grouping minor and patch updates; the `automerge` job merges them once CI is green. `@types/vscode` is ignored because it must not be newer than `engines.vscode`, so bump both together by hand.

To release:
1. `npm version x.y.z --no-git-tag-version` — bumps `package.json` and `package-lock.json` together; the pipeline fails if they differ or don't match the tag
2. Add the CHANGELOG entry and push
3. Publish a GitHub release `vx.y.z` from a commit whose CI is green; a pre-release only gets the VSIX on GitHub

---

## Cross-Cutting Conventions

- **DTO symmetry**: `ImageInformationDTO` is defined in three places (C# `Data/`, TS `src/types/`, webview `types/`) and must stay in sync — `name`, `category`, `tags`, `imageDataUrl`.
- **Binary protocol symmetry**: `BridgeWriteProvider.cs` (writer) and `binaryReader.ts` (reader) must remain byte-for-byte compatible. When changing the protocol, update both files together.
- **Constants single source of truth**: any numeric value used by both TypeScript logic and CSS lives in `webview/src/constants.ts`. CSS-only visual tokens live in `global.css`. Never define the same value in two places.
- **Platform binaries**: The C# binary is published for `win32`, `linux`, `darwin` and stored under `bin/`. Never include runtime DLLs for the AL extension itself - the user must have the AL Language extension installed.
- **CSP**: The webview HTML uses a nonce. All inline scripts must receive the nonce; no `unsafe-inline`.
- **No VS Code API in webview**: The webview communicates only through `vscode.ts` (`postMessage` / `getState` / `setState`). Never import `vscode` in webview code.
- **ExtensionKind `ui`**: The extension must only run on the local (UI) machine, not a remote server, because it reads the local filesystem for the AL DLL.
- **Logging**: Use the static `Logger` class from `src/utils/logger.ts` (`Logger.info/warn/error/debug/trace`) in all extension code. It wraps a `vscode.LogOutputChannel` initialised in `extension.ts`.

---

## Code Style

### TypeScript / JavaScript (`src/` and `webview/src/`)

- **Indentation**: 4 spaces
- **Quotes**: single quotes for strings
- **Semicolons**: always
- **Type annotations**: minimal — rely on inference for local variables; explicitly annotate exported function signatures and their parameters
- **Naming**:
  - `camelCase` — variables, functions, composable return values
  - `PascalCase` — classes, interfaces, types, Vue SFCs
  - `UPPER_SNAKE_CASE` — module-level constants
  - `kebab-case` — CSS class names and file names
  - Interface `I`-prefix is **C# only** — TS interfaces (e.g. `ImageInformationDTO`) are not prefixed
- **Null / optionals**: prefer `??` over `||` for defaults; prefer `?.` over explicit null checks
- **`any` vs `unknown`**: never use `any`; use `unknown` at system boundaries (incoming webview messages, external JSON) and narrow with type guards before use
- **Error handling**: `try/catch` → `Logger.error(...)` → re-throw or surface via `vscode.window.showErrorMessage`

### Braces and control flow (TypeScript/Vue)

- Always use braces for `if` / `else` / `for` / `while` — never omit
- Body always on its own line — single-line `if (x) { return; }` is forbidden:
  ```ts
  // ✗
  if (x) { return; }

  // ✓
  if (x) {
      return; // 4-space indent
  }
  ```
- Empty function / constructor bodies: `{ }` with a single space — `deactivate() { }`
- `switch` statement: `case` labels indented 4 spaces inside the `switch` block:
  ```ts
  switch (type) {
      case 'ready':
          doSomething();
          break;
      default:
          break;
  }
  ```

### Multiline statements (TypeScript/Vue)

- **`import` declarations**: always single-line — never split across lines
- **Function / method definitions**: keep the signature on one line
- **Function / method calls**: single-line by default; split to multiline only when multiple arguments make the line hard to read (e.g. a call with an options object). When splitting, put each argument on its own line:
  ```ts
  // ✓ — short call, stays single-line
  panel.webview.postMessage({ type: 'ready' });

  // ✓ — complex call, split for readability
  const panel = vscode.window.createWebviewPanel(
      'al-actionimage-viewer.panel',
      MANIFEST.displayName,
      vscode.ViewColumn.One,
      {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'public')],
      }
  );
  ```
- **Object / array literals in arguments**: inline when short; block-indented when the literal has multiple keys or entries

### Vue SFCs (`webview/`)

- Always use `<script setup>` (Composition API)
- No business logic inline in components — extract to composables in `composables/`
- One `defineEmits` block per component
- Props typed with `defineProps<T>()`, not runtime objects

### C# (`AL-ActionImage-Viewer.ImageInformationProvider/`)

- File-scoped namespaces
- `var` for local variable declarations
- Expression-bodied members where they improve readability
- XML doc comments on public API only; interfaces prefixed with `I` (e.g. `IImageProvider`)
- Braces on `if` / `else` / `for` may be omitted for a single-line body (e.g. guard clauses)

### General

- Comments only where logic is non-obvious — prefer self-documenting code
