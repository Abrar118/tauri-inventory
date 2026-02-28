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
  status: "pending" | "active" | "rejected";
  blr: boolean;
  ber: boolean;
  created_at?: Date;
}
