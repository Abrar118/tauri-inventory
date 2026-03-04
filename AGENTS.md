# Repository Guidelines

## Project Structure & Module Organization
This project is a Tauri desktop app with a React + TypeScript frontend.
- `src/main.tsx`: app entry, router, providers.
- `src/layouts/`: shared layout wrappers.
- `src/routes/`: page-level features (`inventory/`, `employee/`, `dashboard`, `login`).
- `src/components/`: reusable UI and feature components.
- `src/components/ui/`: shadcn/Radix primitives; treat as shared base components.
- `src/services/`: data access and mutation logic.
- `src/types/`: domain types (`item`, `entry`, `employee`, `repair`, etc.).
- `src-tauri/`: Rust backend commands, Tauri config, and build settings.
- `public/` and `src-tauri/icons/`: static assets and app icons.

Use the `@/*` alias for imports from `src` (example: `@/services/items`).

Current Firestore collection names are:
- `items`: issuable parts/consumables
- `loads`: catalog assets (Vehicle/Gun/Equipment/Weapon)
- `entries`: workshop repair sessions
- `employees`: personnel records

## Build, Test, and Development Commands
- `npm run dev`: run Vite frontend only (fast UI iteration).
- `npm run build`: TypeScript check + production web build.
- `npm run preview`: preview built frontend locally.
- `npm run tauri dev`: run desktop app (frontend + Rust shell).
- `npm run tauri build`: build distributable desktop binaries.

No dedicated `npm test` or lint script is configured currently; use `npm run build` as the baseline quality gate.

## Coding Style & Naming Conventions
- TypeScript/TSX uses 2-space indentation, double quotes, and semicolons.
- Keep components in `PascalCase` (e.g., `ItemEntry.tsx`), helpers/services in lowercase or kebab-case (e.g., `items.ts`).
- Prefer strict typing and shared domain types from `src/types`.
- Keep route files feature-grouped under `src/routes/<domain>/`.
- Rust code in `src-tauri/src` should stay `rustfmt`-compliant and use clear `snake_case` command names.
- BLR/BER is count-based, not boolean: use `blr_count` and `ber_count` (numbers) for both `Item` and `Load`.
- For `Load`, the quantity field is required and used for BLR/BER deductions.

## UI Design Direction
- Visual tone: vibrant, modern command-center UI for contemporary military units.
- Avoid default shadcn-looking output; keep the design language custom and product-specific.
- Color direction: electric/cobalt blues as primary, signal-lime accents, neutral steel/slate supports, clear danger reds.
- Surfaces: use layered gradients, soft-glass cards, and high-clarity contrast (not flat white-only panels).
- Shape system: medium/large rounded corners, clean spacing rhythm, and confident component silhouettes.
- Motion: subtle lift/focus transitions on interactive elements; avoid noisy animations.
- Keep all UI updates responsive for desktop and mobile breakpoints.

## Testing Guidelines
Automated tests are not set up yet. Before opening a PR:
- Run `npm run build`.
- Run `npm run tauri dev` and verify critical flows manually (login, inventory entry/list, barcode features).
- For backend command changes, verify command invocation from the UI and check Rust compile success.

Also verify these regression-sensitive flows after inventory changes:
- Dashboard WIP BLR/BER indicators use `blr_count` / `ber_count` and not deprecated `blr` / `ber`.
- Item/Load BLR/BER mark dialogs correctly cap by available quantity and update counts.
- Approver role gating still includes: `ADMIN`, `OC`, `WORKSHOP_OFFICER`.

## Operational Notes
- `src/constants/scripts.ts` is a browser-context seed utility. Do not run it directly from terminal Node scripts because it depends on Vite alias/env resolution.
- If you temporarily add a dashboard button for `seedAll()`, remove it after seeding.

## Commit & Pull Request Guidelines
Recent history favors short imperative messages, often with prefixes (`feat:`, `fix:`). Follow:
- `feat: add vehicle repair export`
- `fix: prevent lost/unserviceable double selection`

PRs should include:
- Clear summary and scope.
- Linked issue/task (if available).
- Manual test notes with commands run.
- Screenshots/video for UI changes (especially route-level updates).
