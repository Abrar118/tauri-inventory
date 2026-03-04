# Progress Report — Military Inventory App
**Date:** 2026-03-04
**Sessions covered:** Multiple (compacted). Picking up from the BLR/BER refactor + seed script work.
**Handed off to:** Codex 5.3 CLI / Gemini CLI

---

## 1. What This App Is

A **military inventory management** desktop application.

- **Stack:** Tauri 2 (Rust shell) + React 18 + TypeScript + Vite + Firebase (Auth + Firestore Web SDK v12)
- **Styling:** Tailwind CSS v4 + shadcn/ui (Radix UI) + goey-toast + next-themes
- **Run:** `npm run tauri dev` (full desktop), `npm run dev` (Vite only, no Rust)
- **Path alias:** `@` → `./src`

---

## 2. Architecture

### Firestore Collections
| Collection  | Purpose |
|-------------|---------|
| `items`     | Issuable parts/consumables (NOT catalog assets). Issued during repair entries. |
| `loads`     | Catalog assets for repair: Vehicle / Gun / Equipment / Weapon |
| `entries`   | Workshop repair sessions (WIP + completed) |
| `employees` | All personnel |

> **Note:** The collection was renamed from `catalog` → `loads` and `vehicles` → `loads` in a prior session. The Firestore collection name is literally `"loads"`.

### Auth
- Firebase Email/Password
- `onAuthStateChanged` in `src/context/auth-context.tsx` → `AuthProvider` + `useAuth()` hook
- `useAuth()` returns `{ user, profile, accountType, loading }`
- `profile` is the employee record fetched from Firestore by matching `user.uid`
- `accountType` drives role-based UI gating

### Account Types (valid Firestore values)
```
OC | SMT_JCO | SMT_1 | SMT_2 | WORKSHOP_OFFICER | RI&I_1 | RI&I_2 | ADMIN
```
**Approver roles** (can approve/reject pending items and loads):
```
ADMIN | OC | WORKSHOP_OFFICER
```

---

## 3. Type Definitions (current, verified)

### `src/types/item.ts`
```ts
export interface Item {
  id?: string;
  item_no: string;
  name: string;
  type: string;
  quantity: number;
  vehicle_type: string | null;
  returnable: boolean;
  rack_no: string;
  description: string;
  image: string | null;
  status: "pending" | "active" | "rejected" | "is_unservicable" | "is_lost";
  unservicable_count: number;
  lost_count: number;
  blr_count: number;   // number of units Beyond Local Repair
  ber_count: number;   // number of units Beyond Economic Repair
  created_at?: Date;
}
```

### `src/types/load.ts`
```ts
export interface Load {
  id?: string;
  catalog_no: string;
  name: string;
  category: "Vehicle" | "Gun" | "Equipment" | "Weapon";
  catalog_type: string;
  unit: string;
  quantity: number;    // total in service; deducted when BLR/BER marked
  blr_count: number;
  ber_count: number;
  description: string;
  image: string | null;
  status: "pending" | "active" | "rejected";
}
```

### `src/types/entry.ts` (inferred from entry-form usage)
Key fields: `asset_no`, `asset_name`, `asset_category`, `asset_unit`, `asset_type`, `entry_time` (ISO string), `out_time` (ISO string | null), `status` ("In Progress" | "Completed"), `issued_parts` (array of `{item_no, quantity}`), `notes`, `entered_by` (employee name string).

---

## 4. Services (src/services/)

| File          | Functions |
|---------------|-----------|
| `items.ts`    | `getItems`, `addItem`, `updateItem`, `deleteItem`, `approveItem`, `rejectItem` |
| `loads.ts`    | `getLoads`, `addLoad`, `updateLoad`, `deleteLoad`, `approveLoad`, `rejectLoad` |
| `entries.ts`  | `getEntries`, `addEntry`, `updateEntry` |
| `employees.ts`| `getEmployees`, `addEmployee`, `deleteEmployee`, `updateEmployee` |

**`addItem` injects:** `blr_count: 0`, `ber_count: 0`, `unservicable_count: 0`, `lost_count: 0`, `status: "pending"`, `created_at: serverTimestamp()`
**`addLoad` injects:** `blr_count: 0`, `ber_count: 0`, `quantity: load.quantity ?? 1`, `status: "pending"`

---

## 5. Routes (src/routes/)

| Route path | Component | Key behaviour |
|---|---|---|
| `/` | `Dashboard` | WIP entries table, stat cards (loads/items/entry counts), Manage dialog (issue parts + exit asset) |
| `/inventory/entry` | `EntryForm` | Cascading autocomplete: category → unit → type → name → catalog_no. Saves `entered_by: profile.name` |
| `/inventory/out-station-repair` | `OutStationRepair` | (details not reviewed this session) |
| `/inventory/report` | `Report` | (details not reviewed this session) |
| `/inventory/item-entry` | `ItemEntry` | Add new issuable item (stored in `items` collection) |
| `/inventory/vehicle-entry` | `VehicleEntry` | Add new catalog asset (stored in `loads` collection). Has quantity input. No BLR/BER switches (removed). |
| `/inventory/vehicle-list` | `VehicleList` | Asset Catalog. Approve/reject/delete loads. Mark BLR/BER dialog. Condition column shows BLR/BER badges. |
| `/inventory/item-list` | `ItemList` | Items list. Approve/reject/delete. Mark Unserviceable/Lost dialogs. Mark BLR/BER dialog. |
| `/inventory/lost-items` | `LostItems` | Read-only view of items with lost_count > 0 |
| `/inventory/barcode-creation` | `BarcodeCreation` | (details not reviewed this session) |
| `/inventory/blr-ber` | `BlrBer` | Read-only view. Two tabs: Loads + Items. Shows only records where `blr_count > 0 OR ber_count > 0`. Displays count badges. |
| `/inventory/repair-history` | `RepairHistory` | (details not reviewed this session) |
| `/employee/list` | `EmployeeList` | Employee CRUD |

---

## 6. BLR/BER Feature (recently completed)

BLR = Beyond Local Repair. BER = Beyond Economic Repair.

### How it works
- BLR and BER are **numeric counts** (not booleans). They represent how many units of an item/load are in that condition.
- Marking BLR/BER **deducts from `quantity`** and **increments `blr_count`/`ber_count`**.
- Cannot mark more than available quantity.

### UI Pattern (same for both Items and Loads)
1. Two buttons in the page header: **"Mark BLR"** (orange) and **"Mark BER"** (red)
2. Dialog opens with a search input → scrollable list of active items/loads with qty > 0
3. Click to select one → count number input (capped at available quantity)
4. Submit → Firestore `updateDoc` → local state update

### Files changed
- `src/types/item.ts` — `blr: boolean` → `blr_count: number`, `ber: boolean` → `ber_count: number`
- `src/types/load.ts` — same + added `quantity: number`
- `src/services/items.ts` — updated `addItem` defaults
- `src/services/loads.ts` — updated `addLoad` defaults
- `src/routes/inventory/vehicle-entry.tsx` — removed BLR/BER switches, added quantity input
- `src/routes/inventory/item-list.tsx` — Mark BLR/BER buttons + dialog
- `src/routes/inventory/vehicle-list.tsx` — same for loads
- `src/routes/inventory/blr-ber.tsx` — rewritten as read-only counts view
- `src-tauri/src/models.rs` — Rust structs updated to match

---

## 7. Seed Script (`src/constants/scripts.ts`)

A one-time Firestore seeding utility.

**Cannot be run from terminal** — it uses Vite path aliases (`@/lib/firebase`) and `VITE_*` env vars, which only resolve in the browser context. To run it, temporarily add a button to the dashboard that calls `seedAll()`.

**What it seeds:**
- ~100 items across types; ~20 set to `status: "pending"`
- ~80 loads across categories (Vehicle/Gun/Equipment/Weapon); ~12 set to `status: "pending"` (the ones with BLR/BER)
- BLR/BER loads have `blr_count: 1` or `ber_count: 1` in seed data

**Warning:** The linter/formatter tends to auto-append `await seedAll()` at the bottom of the file. This would execute on every import. Always verify it's not there before importing the file.

---

## 8. Dashboard (`src/routes/dashboard.tsx`)

- Stat cards: Total Loads, Total Items, Today's Entries, Today's Exits, Monthly Entries, Monthly Exits
- WIP Table: shows all entries where `out_time === null`
- Row highlights: orange tint if `blr_count > 0`, red tint if `ber_count > 0`
- **Manage dialog**: two modes
  - **Issue Parts:** cascading autocomplete (type → name → item_no, auto-fills when 1 match). Add pending parts, then submit to deduct from item stock and add to `entry.issued_parts`.
  - **Exit Asset:** sets `out_time` + `status: "Completed"`, removes from WIP

---

## 9. Known Bugs / Issues

### 9a. Stale BLR/BER check in dashboard (HIGH PRIORITY)
`src/routes/dashboard.tsx` line ~202:
```ts
const getEntryBlrBer = (entry: Entry): { blr: boolean; ber: boolean } => {
  const a = loads.find((l) => l.catalog_no === entry.asset_no);
  return { blr: a?.blr ?? false, ber: a?.ber ?? false };   // ← BUG
};
```
`a.blr` and `a.ber` no longer exist. The Load type now uses `blr_count` and `ber_count` (numbers). This means row highlights and BLR/BER badges in the WIP table **never show**.

**Fix:**
```ts
return {
  blr: (a?.blr_count ?? 0) > 0,
  ber: (a?.ber_count ?? 0) > 0,
};
```

### 9b. No Firestore security rules configured
The app relies entirely on Firebase Auth for access control. There are no Firestore security rules — any authenticated user can read/write any collection. This is a security gap, especially since the app has role-based permissions in the UI (approver roles) that are not enforced server-side.

**Fix needed:** Add Firestore security rules that:
- Require `request.auth != null` for all reads/writes
- Gate approve/reject writes on user's custom claims or a role lookup in `employees/{uid}`
- Prevent regular users from writing to `employees` or directly setting `status: "active"` on items/loads

### 9c. No input validation on BLR/BER count
The Mark BLR/BER dialog caps the count at `quantity` in the UI but does not validate server-side. A user crafting a direct Firestore write could mark more units BLR/BER than exist.

### 9d. `profile?.name` may be empty string
In `entry-form.tsx`, `entered_by: profile?.name ?? ""` — if `profile` hasn't loaded yet or the employee record has no `name` field, the entry will be saved with an empty string for `entered_by`. No visible error is shown.

### 9e. `getEntries()` / `getLoads()` / `getItems()` have no pagination
All Firestore reads are full collection scans (`getDocs(collection(db, COLLECTION))`). This will degrade as data grows. No pagination or `limit()` is in place anywhere.

### 9f. No error boundary
The app has no React error boundary. An unhandled error in any route component will crash the entire app silently.

---

## 10. TODOs / Pending Features

### High priority
- [ ] **Fix dashboard BLR/BER check** (see Bug 9a above — one-liner fix)
- [ ] **Firestore security rules** (see Bug 9b — currently no server-side enforcement)
- [ ] **`out-station-repair` route** — route exists in router but feature state unknown; needs review
- [ ] **`report` route** — route exists but content unknown; may be a stub

### Medium priority
- [ ] **Add `div` field to entry form** — Entry type has a `div` field (seen rendered in dashboard WIP table as `entry.div`) but it is not present in the entry-form submit payload. Users cannot set division/detachment when logging an entry.
- [ ] **Employee add-employee route** — not listed in router; needs to be added or the route confirmed removed intentionally
- [ ] **Edit Load modal** — `EditVehicleModal` is imported in `vehicle-list.tsx`; confirm it correctly handles the renamed fields (`blr_count`, `ber_count`, `quantity`)
- [ ] **Edit Item modal** — `EditItemModal` is imported in `item-list.tsx`; confirm it handles `blr_count`, `ber_count`

### Low priority / Nice to have
- [ ] **Pagination** for all list pages (items, loads, entries)
- [ ] **Role-gated sidebar items** — some routes (e.g., approvals) should only be visible to approver roles
- [ ] **Seed script UI toggle** — currently requires manually adding a dashboard button; consider a dev-mode env flag
- [ ] **Barcode-creation** — verify it still works after `blr`/`ber` → `blr_count`/`ber_count` rename
- [ ] **Repair history** — verify it still works with current Load/Item types

---

## 11. File Map (key files only)

```
src/
  main.tsx                          — router + AuthProvider + ProtectedRoute
  context/auth-context.tsx          — AuthProvider, useAuth()
  lib/firebase.ts                   — Firebase app init (VITE_ env vars)
  lib/auth.ts                       — signIn, signOut, createUser
  lib/toast.ts                      — toastError helper
  types/
    index.ts                        — barrel export
    item.ts                         — Item interface
    load.ts                         — Load interface
    entry.ts                        — Entry interface
    employee.ts                     — Employee interface
    auth.ts                         — AuthUser type
  services/
    items.ts                        — Firestore CRUD for items collection
    loads.ts                        — Firestore CRUD for loads collection
    entries.ts                      — Firestore CRUD for entries collection
    employees.ts                    — Firestore CRUD for employees collection
  constants/
    scripts.ts                      — seedAll(), seedItems(), seedLoads() — browser-only
  routes/
    login.tsx
    dashboard.tsx                   — WIP table + stat cards + manage dialog
    inventory/
      entry-form.tsx                — Log asset into repair (cascading autocomplete)
      out-station-repair.tsx        — (status unknown)
      report.tsx                    — (status unknown)
      item-entry.tsx                — Add new issuable item
      vehicle-entry.tsx             — Add new catalog asset (load)
      vehicle-list.tsx              — Asset catalog CRUD + approve/reject + mark BLR/BER
      item-list.tsx                 — Items CRUD + approve/reject + mark unserviceable/lost/BLR/BER
      lost-items.tsx                — Read-only lost items view
      blr-ber.tsx                   — Read-only BLR/BER counts view (loads + items tabs)
      barcode-creation.tsx          — (status: needs verification post-rename)
      repair-history.tsx            — (status: needs verification)
    employee/
      employee-list.tsx             — Employee CRUD
  components/
    ui/                             — shadcn/ui primitives (do not modify)
    sidebar.tsx                     — Navigation
    header.tsx
    edit-vehicle-modal.tsx          — Edit load dialog (verify fields post-refactor)
    edit-item-modal.tsx             — Edit item dialog (verify fields post-refactor)
src-tauri/src/
  lib.rs                            — Tauri entry point (greet command placeholder)
  models.rs                         — Rust mirror structs (Item, Load, etc.) — types only
```

---

## 12. Environment

```
Firebase project:   tauri-inventory
Auth domain:        tauri-inventory.firebaseapp.com
Config source:      .env (VITE_FIREBASE_* vars) + firebase-web-config.ts at project root
```

`.env` must exist with:
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

---

## 13. What Was Done in the Last Session (summary)

1. **Seed script enhancements** — ~20 items + 12 loads set to `status: "pending"` in `src/constants/scripts.ts`
2. **Seed button on dashboard** — added, then removed, then re-added, then removed again (current state: no seed button on dashboard)
3. **BLR/BER filter on blr-ber.tsx** — only shows records with `blr_count > 0 || ber_count > 0`
4. **Mark BLR/BER on item-list** — two top buttons + dialog; deducts from quantity
5. **Fixed approver role gate** — added `"ADMIN"` to `APPROVER_ROLES` in both item-list and vehicle-list
6. **BLR/BER refactor** — changed from `boolean` to `number` (`blr_count`, `ber_count`) across all types, services, routes, Rust models, and seed script
7. **Added `quantity` to Load type** — needed for BLR/BER deduction math
8. **Mark BLR/BER on vehicle-list** — same dialog pattern as item-list
9. **Rewrote blr-ber.tsx** — read-only counts view with two tabs
10. **Fixed `setEditLoad(asset)` → `setEditLoad(load)` bug** in vehicle-list
