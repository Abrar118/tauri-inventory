import type { Item } from "./item";

export interface Demand extends Omit<Item, "id"> {
  id?: string;
  demand_request: string;
  demanded_at?: string;
  fulfilled?: boolean;
  fulfilled_at?: string | null;
}
