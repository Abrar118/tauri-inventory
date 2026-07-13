# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run tauri dev     # Run full desktop app (frontend + Rust backend)
npm run tauri build   # Build distributable desktop binaries
npm run dev           # Vite frontend only (fast UI iteration, no Tauri shell)
npm run build         # TypeScript check + production web build — the baseline quality gate
```

There are no tests or lint scripts configured. Use `npm run build` to verify changes compile, and `npm run tauri dev` for manual verification of critical flows (login, entry form, item/load lists, barcode features).

## Architecture

A **military workshop inventory management** desktop app ("127 Field Workshop") built with **Tauri 2 + React 18 + TypeScript + Vite**, backed by **Firebase (Auth + Firestore, Web SDK v12)**.

### Data flow

Route components (`src/routes/`) call service functions (`src/services/`) which perform Firestore CRUD against `db` from `src/lib/firebase.ts`. Firebase config comes from `VITE_FIREBASE_*` env vars in `.env` (`firebase-web-config.ts` at the repo root is the source of truth for the keys). Domain types live in `src/types/` with a barrel export (`@/types`).

Path alias: `@` → `./src` (vite.config.ts).

### Domain model — items vs. loads vs. entries

This distinction is the core of the app and easy to get wrong:

- **`items` collection** (`Item`, services/items.ts) — issuable parts/consumables (e.g. oil filters). Issued to repair jobs; never entered via the entry form.
- **`loads` collection** (`Load`, services/loads.ts) — catalog assets under repair: `category` is Vehicle | Gun | Equipment | Weapon, keyed by `catalog_no`. Entered via the entry form. Note: `vehicle-entry.tsx` and `vehicle-list.tsx` routes actually operate on loads ("Asset Catalog").
- **`entries` collection** (`Entry`, services/entries.ts) — workshop repair sessions. References an asset (`asset_no`), tracks `entry_time`/`out_time`, and consumes `issued_parts` (item_no + quantity). `div` is set only for Out Station Repair entries.
- Other collections: `employees`, `repairs`, `demands`.

**BLR/BER is count-based, not boolean**: both `Item` and `Load` use `blr_count` and `ber_count` (numbers). The deprecated boolean `blr`/`ber` fields must not be reintroduced. For `Load`, `quantity` is required and caps BLR/BER deductions.

### Auth and roles

- `AuthProvider` (`src/context/auth-context.tsx`) listens to `onAuthStateChanged`, matches the Firebase user to an `employees` doc by email, and exposes `{ user, profile, accountType, loading }` via `useAuth()`. It also runs a 2-minute `last_seen` heartbeat.
- `ProtectedRoute` in `src/main.tsx` redirects unauthenticated users to `/login`.
- Login supports username: `signInWithUsername` (src/lib/auth.ts) resolves username → email via Firestore, then signs in.
- `createUser` uses a temporary secondary Firebase app so creating an account doesn't sign out the current user.
- Account types (`ACCOUNT_TYPES` in src/lib/auth.ts): ADMIN, OC, SMT_JCO, SMT_1, SMT_2, WORKSHOP_OFFICER, RI&I_1, RI&I_2.
- **Approver roles are ADMIN, OC, WORKSHOP_OFFICER** — gated in the UI (sidebar, item/load lists) and enforced server-side in `firestore.rules` via the `account_type` custom claim on the auth token.

### Approval flow

New items and loads are created with `status: "pending"`. Approvers set `status: "active"` (or `"rejected"`) via `approveItem`/`approveLoad`. Firestore rules restrict status changes to approvers, so client-side role checks must stay consistent with `firestore.rules`.

### Tauri backend (`src-tauri/src/lib.rs`)

Real Rust commands exist, invoked from the frontend via `invoke` from `@tauri-apps/api`:

- `generate_barcode(value, barcode_type)` — returns base64 PNG (code128/code39/ean13/qrcode)
- `save_barcode_png` / `generate_report_pdf` — write to the user's Downloads folder
- `print_barcodes_html` — writes HTML to a temp file and opens the default browser, because `window.print()` is silently blocked in Tauri's WKWebView

`src-tauri/src/models.rs` mirrors the TypeScript domain types (types only, no Firebase logic in Rust).

### UI layer

- shadcn/ui primitives in `src/components/ui/` — treat as shared base components, do not modify directly
- Toasts: `goey-toast` via the `src/lib/toast.ts` wrapper (`toastError` adds verbose error detail in dev via `VITE_ENVIRONMENT`)
- Theming: `next-themes` light/dark/system; sidebar collapse state in `src/store/sidebar-store.ts` (zustand)

## Conventions

- TypeScript/TSX: 2-space indent, double quotes, semicolons. Components `PascalCase`, services/helpers lowercase or kebab-case. Route files grouped under `src/routes/<domain>/`.
- Prefer shared domain types from `src/types` over inline shapes.
- Rust: rustfmt-compliant, `snake_case` command names.
- Commits: short imperative messages, often `feat:`/`fix:` prefixed.
- `AGENTS.md` at the repo root carries the same guidelines plus PR/testing checklists — keep the two files consistent when conventions change.

## Operational notes

- `src/constants/scripts.ts` is a browser-context Firestore seed utility (`seedAll()`). It depends on Vite alias/env resolution — never run it from terminal Node. If you temporarily wire a dashboard button to it, remove the button after seeding.

## Design Sense

The visual language is modeled on the **Linear macOS app**: light mode = white + purple, dark mode = near-black + purple. Theme tokens live in `src/App.css` (oklch, both `:root` and `.dark`).

- Flat, bordered surfaces: `bg-card` + 1px `border`, small radii (`rounded-md`/`rounded-lg`/`rounded-xl`), subtle `shadow-xs`/`shadow-sm`. No gradient/glass card treatments.
- Purple (`primary`) is reserved for primary actions, active nav/selection states, links, and focus rings. Everything else stays neutral. Status colors are the only exception: emerald (active/completed), amber (pending/in-progress), red (rejected/lost/BER), sky (info/BLR) as low-opacity dot pills.
- Compact, crisp type on the system font stack: page titles `text-lg font-semibold tracking-tight`, body `text-sm`, meta `text-xs text-muted-foreground`, numbers `tabular-nums`, IDs `font-mono text-xs`.
- Quiet motion: color/opacity transitions only — no translate/scale hovers.
- Use semantic tokens (`bg-background`, `text-muted-foreground`, `border-border`, `chart-1..5`) — never hardcoded hex, never chart tokens as accent hacks.
- Every page follows the shared anatomy: in-page header block (title + one-line muted context + right-aligned actions), `space-y-5` sections, skeleton loading states, dashed-border empty states.
- Ensure parity across desktop and mobile.
