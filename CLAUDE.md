# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run full Tauri desktop app (frontend + Rust backend together)
npm run tauri dev

# Build the final desktop application
npm run tauri build

# Run Vite frontend only (no Tauri shell — useful for quick UI work)
npm run dev
```

There are no tests configured yet.

## Architecture

This is a **military inventory management** desktop application built with **Tauri 2 + React 18 + TypeScript + Vite**.

### Stack
- **Frontend**: React 18, TypeScript, React Router v7 (`createBrowserRouter`)
- **Styling**: Tailwind CSS v4, shadcn/ui (Radix UI primitives), `cn()` utility (`src/lib/utils.ts`)
- **Notifications**: `goey-tost` toasts
- **Theming**: `next-themes` (light/dark/system via `ThemeProvider`)
- **Desktop shell**: Tauri 2 (Rust backend at `src-tauri/src/lib.rs`)

### Frontend structure
```
src/
  main.tsx          — router setup and app entry point
  layouts/          — RootLayout: sidebar + header + <Outlet>
  routes/           — page components, grouped by feature
    login.tsx
    dashboard.tsx
    inventory/      — item-entry, vehicle-entry, item-list, item-issue, repair-history, barcode-creation
    employee/       — employee-list, add-employee
  components/
    ui/             — shadcn/ui primitive components (do not modify these directly)
    sidebar.tsx     — navigation with two sections: Inventory Management, Employee Management
    header.tsx
    edit-employee-modal.tsx
  data/
    dummy-data.ts   — all mock data (items, employees, vehicles, repairs)
  lib/utils.ts      — cn() helper (clsx + tailwind-merge)
```

### Path alias
`@` resolves to `./src` (configured in `vite.config.ts`).

### Tauri backend
`src-tauri/src/lib.rs` currently exposes only a placeholder `greet` command. All real logic is frontend-only at this stage.

### Data model (from dummy-data)
The app manages:
- **Items**: `name`, `type` (Weapon/Vehicle/Uniform/Equipment/Supply), `quantity`, `vehicle_type`, `returnable`, `rack_no`, `image`
- **Employees**: `name`, `rank`, `phone`, `ba_bjo`, `account_type` (OC / JCO_NCO / WORKSHOP_OFFICER / WORKER / RI&I)
- **Vehicles**: `vehicle_no`, `vehicle_type` (Tank/APC/Truck/Jeep), `unit`, `blr`, `ber`
- **Repairs**: `repair_time`, `vehicle_no`, `issued_parts[]`, `out_time`

### Current state
All pages are UI-only with data sourced from `src/data/dummy-data.ts`. Form submissions use `setTimeout` to simulate API calls — no real backend integration exists yet. When adding backend calls, use the Tauri `invoke` API from `@tauri-apps/api`.
