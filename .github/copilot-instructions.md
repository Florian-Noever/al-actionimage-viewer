# AL ActionImage Viewer - Copilot Instructions

## Project Overview

**AL ActionImage Viewer** is a VS Code extension (publisher: `Florian-Noever`) that reads Business Central action images directly from the official [AL Language extension](https://marketplace.visualstudio.com/items?itemName=ms-dynamics-smb.al) and displays them in an interactive webview. Users can browse by category, search, zoom, copy images to the clipboard, and export individual images or entire categories.

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
| `Program.cs` | Entry point - calls `BridgeWriteProvider.Write()` |
| `Utils/NAVImageInformationProvider.cs` | Finds the AL extension DLL, loads it via `Assembly.LoadFrom`, discovers image resource methods via reflection |
| `Utils/BridgeWriteProvider.cs` | Serialises discovered images into the binary wire protocol and writes them to stdout |
| `Utils/NavTypeHelper.cs` | Constants for the AL DLL type/method names |
| `Data/ImageInformationDTO.cs` | `ImageInformationDTO` record: `Name`, `Category`, `Tags[]`, `ImageDataUrl` |

### AL Extension DLL Location
The DLL is discovered at runtime:
```
~/.vscode/extensions/ms-dynamics-smb.al<version>/bin/win32/Microsoft.Dynamics.Nav.CodeAnalysis.dll
```
Only `win32` is probed because the DLL is Windows-only; the extension requirement `extensionKind: ["ui"]` guarantees it always runs on the local machine.

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
Pre-built binaries are committed to `bin/{win32,linux,darwin}/`. Publish profiles live under `Properties/PublishProfiles/`. To republish:
```bash
dotnet publish -c Release /p:PublishProfile=win32
dotnet publish -c Release /p:PublishProfile=linux
dotnet publish -c Release /p:PublishProfile=darwin
```

---

## Layer 2 - VS Code Extension (`src/`)

### Purpose
The TypeScript extension activates on the `al-actionimage-viewer.open` command, creates a `WebviewPanel`, spawns the C# bridge binary, reads its binary stdout, and relays image data to the webview via `postMessage`.

### Key Files
| File | Role |
|------|------|
| `extension.ts` | Activation, webview panel creation, message dispatch, CSP/nonce HTML injection |
| `utils/imageInformationProvider.ts` | Resolves binary path per platform, sets executable bit on Unix, calls `readFromBridgeStdout` |
| `utils/binaryReader.ts` | `BinaryReader` class + `parseBridgePayload` - mirrors the C# binary protocol exactly |
| `handlers/loadImages.ts` | Spawns binary, sends `loading` → `setData` / `error` to webview |
| `handlers/exportImage.ts` | Handles `export-image` message - shows save dialog, writes file |
| `handlers/exportCategory.ts` | Handles `export-category` message - shows folder picker, writes all images with progress notification |
| `handlers/notify.ts` | Handles `notify` message - shows VS Code info/warning/error messages |
| `types/imageInformationDTO.ts` | TypeScript mirror of the C# DTO |

### Webview Setup
- The extension reads `public/index.html` and injects `%STYLE_URI%`, `%APP_URI%`, `%CSP_SOURCE%`, `%NONCE%` placeholders at runtime.
- CSP is enforced to only allow scripts with the injected nonce.
- `retainContextWhenHidden: true` keeps the webview alive when switching tabs.

### Message Protocol (Extension ↔ Webview)

**Extension → Webview:**
| `type` | Payload | Meaning |
|--------|---------|---------|
| `loading` | `{ message: string }` | Binary is running |
| `setData` | `Record<string, ImageInformationDTO[]>` | All image groups |
| `error` | `{ message: string }` | Load failed |

**Webview → Extension:**
| `type` | Payload | Meaning |
|--------|---------|---------|
| `ready` | - | Webview mounted, load images |
| `retry` | - | User clicked retry, reload images |
| `notify` | `{ level, message }` | Show VS Code notification |
| `export-image` | `{ name, mime, base64 }` | Save single image to disk |
| `export-category` | `{ category, images[] }` | Save all images in category to folder |

### Build
```bash
npm run compile          # tsc compile extension to out/
npm run watch            # tsc watch mode (default build task)
npm run build:webview    # vite build webview to public/
npm run package          # vsce package (.vsix)
```

---

## Layer 3 - Webview UI (`webview/`)

### Purpose
A Vue 3 Single-File-Component application, built by Vite as a single **IIFE bundle** (`public/app.js` + `public/styles.css`) so it can run inside the VS Code webview sandbox with a strict CSP.

### Key Files & Components
| Path | Role |
|------|------|
| `src/App.vue` | Root component - orchestrates state, routing between components, message handling |
| `src/components/CategoryRail.vue` | Left sidebar listing all categories + "All Images" |
| `src/components/SearchHeader.vue` | Search input, zoom controls, sort toggle, reload button |
| `src/components/ImageGrid.vue` | Virtualised grid of image tiles (`@tanstack/vue-virtual`) |
| `src/components/ImageTile.vue` | Individual tile - image, name, click to select |
| `src/components/ContextMenu.vue` | Right-click menu for a single image (copy / export) |
| `src/components/CategoryContextMenu.vue` | Right-click menu for a category (export all) |
| `src/components/StatusPane.vue` | Loading spinner and error state overlay |
| `src/composables/useZoom.ts` | Zoom level state + tile/image size derivation |
| `src/composables/useSearch.ts` | Filtered + sorted item list computed from active category and search query |
| `src/composables/useDebug.ts` | Debug border toggle (Ctrl+Shift+D) |
| `src/vscode.ts` | Typed wrapper around `acquireVsCodeApi()` - safe to call in plain browser too |
| `src/utils.ts` | `makeSearchPredicate`, `parseDataUrl`, `blobFromDataUrl`, `notify` helpers |
| `src/types/imageInformationDTO.ts` | Frontend mirror of the DTO + `ImageMap` type alias |

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
| `@vueuse/core` | Utility composables |

### Data Flow (happy path)
```
App.vue mounts
  → postMessage({ type: 'ready' })
    → extension spawns C# binary
      → binary writes binary payload to stdout
        → BinaryReader parses payload
          → extension postMessage({ type: 'setData', payload: imageGroups })
            → App.vue stores data, CategoryRail populates
```

---

## Cross-Cutting Conventions

- **DTO symmetry**: `ImageInformationDTO` is defined in three places (C# `Data/`, TS `src/types/`, webview `types/`) and must stay in sync - `name`, `category`, `tags`, `imageDataUrl`.
- **Binary protocol symmetry**: `BridgeWriteProvider.cs` (writer) and `binaryReader.ts` (reader) must remain byte-for-byte compatible. When changing the protocol, update both files together.
- **Platform binaries**: The C# binary is published for `win32`, `linux`, `darwin` and stored under `bin/`. Never include runtime DLLs for the AL extension itself - the user must have the AL Language extension installed.
- **CSP**: The webview HTML uses a nonce. All inline scripts must receive the nonce; no `unsafe-inline`.
- **No VS Code API in webview**: The webview communicates only through `vscode.ts` (`postMessage` / `getState` / `setState`). Never import `vscode` in webview code.
- **ExtensionKind `ui`**: The extension must only run on the local (UI) machine, not a remote server, because it reads the local filesystem for the AL DLL.
- **Logging**: The extension uses `vscode.window.createOutputChannel(..., { log: true })` exposed as `log` from `extension.ts`. Use `log.info/warn/error` in extension code.
