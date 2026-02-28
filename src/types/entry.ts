export interface IssuedPart {
  item_no: string;
  quantity: number;
}

export interface Entry {
  id?: string;
  asset_no: string; // references vehicle_no / item_no from catalog
  asset_name: string; // mirrors catalog name field
  asset_category: string; // "Vehicle" | "Item"
  asset_unit: string; // mirrors vehicle unit (empty for items)
  asset_type: string; // mirrors catalog vehicle_type / item type field
  entry_time: string; // ISO datetime
  out_time: string | null; // ISO datetime when resolved; null = still in progress
  status: string; // e.g. "In Progress", "Completed"
  issued_parts: IssuedPart[]; // parts consumed during work
  notes: string;
  div?: string; // division — set only for Out Station Repair entries
  entered_by?: string; // name of the user who created the entry
}
