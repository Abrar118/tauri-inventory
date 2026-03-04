export interface Load {
  id?: string;
  catalog_no: string;
  name: string;
  category: "Vehicle" | "Gun" | "Equipment" | "Weapon";
  catalog_type: string;
  unit: string;
  quantity: number;
  blr_count: number;
  ber_count: number;
  description: string;
  image: string | null;
  status: "pending" | "active" | "rejected";
}
