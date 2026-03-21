# Changelog

All notable changes to **AL ActionImage Viewer** are documented in this file.

---

## [1.0.2] – 2026-03-21

### Changed

- Mouse-wheel scrolling in the image grid is now smooth: wheel input is intercepted and animated with an eased `requestAnimationFrame` loop instead of snapping in discrete browser-native steps

---

## [1.0.1] – 2026-03-21

### Changed

- Extension host build switched from plain `tsc` to **esbuild**: all source files are now bundled into a single `out/extension.js`, reducing cold-start load time
- `tsc` is now used for type-checking only (`noEmit: true`); it no longer emits JavaScript
- Sourcemaps (`out/extension.js.map`) are always generated and ship inside the VSIX for full debuggability without obfuscation
- `vscode:prepublish` now runs `type-check` before bundling to catch type errors at publish time
- Integration tests compiled via esbuild (`--tests` flag) instead of `tsc`; fixes test runner on paths containing spaces on Windows
- `tasks.json` updated to use the `$esbuild-watch` problem matcher (requires `connor4312.esbuild-problem-matchers` extension, added to workspace recommendations)
- CI action `vscode-test` updated to use `npm run compile-tests` instead of a direct `tsc` invocation

---

## [1.0.0] – 2026-03-20

### Added

**Sidebar panel**
- Persistent activity bar sidebar that is always visible without opening a separate editor tab
- The sidebar shares the same webview bundle as the full panel; the category rail and zoom coordination are disabled in sidebar mode to fit the narrower space

**Category rail**
- Collapsible left rail listing all image categories plus the synthetic "All Images" view
- Rail auto-collapses to a narrow icon strip when the panel width drops below 490 px and auto-expands above 530 px (with hysteresis to prevent flicker)
- When auto-collapsing, zoom is automatically reduced to 55 % if it is currently at the default; zoom is restored on auto-expand
- Rail can also be toggled manually; manual state overrides auto-behaviour until the next manual toggle
- Collapsed/expanded state is persisted across reloads via the VS Code state API

**Zoom improvements**
- Anchor-locking during zoom: the top-visible row stays in view when zooming, preventing jarring scroll jumps
- Zoom level persisted across reloads via the VS Code state API

**Keyboard shortcuts**
- `F5` — reload images from the AL extension
- `1`–`9` — switch to category by position (`1` = All Images, `2` = first category, …)
- Arrow keys — navigate the image grid
- `Home` / `End` — jump to the first / last image
- `Menu` / `Shift+F10` — open the context menu for the focused tile
- `Ctrl+F` / `Cmd+F` — focus and select the search box
- `+` / `=` / `-` / `0` — zoom in, zoom out, reset zoom to 100 %

**Drag & drop**
- Image tiles can be dragged to a file manager or the desktop using the browser `DownloadURL` transfer format

**Accessibility**
- `role="grid"` with `aria-rowcount` / `aria-colcount` on the image grid
- `role="radiogroup"` / `role="radio"` for the category rail
- `role="menu"` / `role="menuitem"` for context menus with full arrow-key, Tab, and Escape navigation
- `aria-live="polite"` live region for screen-reader announcements when an image is selected
- `aria-label`, `aria-pressed`, `aria-expanded`, `aria-checked` on all interactive elements
- Focus-visible outlines following the active VS Code colour theme

**Other**
- Structured logging via a static `Logger` class wrapping `vscode.LogOutputChannel`
- Design token system: all shared layout values centralised in `constants.ts` and injected as CSS custom properties at runtime
- Content Security Policy with per-session nonces — no `unsafe-inline` scripts

### Changed

- Message protocol between extension and webview is now typed as discriminated unions (`WebviewMessage`, `ExtensionMessage`) with `isWebviewMessage()` / `isExtensionMessage()` type guards
- Binary wire protocol between C# bridge and TypeScript reader hardened to be byte-for-byte symmetrical

---

## [0.3.0]

### Added

- Unit tests and integration tests

### Fixed

- Various minor issues

---

## [0.2.0]

### Changed

- Webview UI rewritten with **Vue 3 + Vite**; overall UX significantly improved

### Added

- Sort images by name (ascending / descending toggle)
- Export all images in a category to a folder in one operation

---

## [0.1.7]

### Changed

- Updated dependencies
- Updated extension icon

---

## [0.1.3] – [0.1.6]

### Changed

- Improved build and publish process

---

## [0.1.1]

### Added

- First release
