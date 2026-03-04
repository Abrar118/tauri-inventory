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
  blr_count: number;
  ber_count: number;
  created_at?: Date;
}
