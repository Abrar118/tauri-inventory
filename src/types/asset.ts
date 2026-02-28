export interface Asset {
  id?: string;
  catalog_no: string;    // unique identifier (formerly vehicle_no)
  name: string;
  category: string;      // "Vehicle" | "Gun" | "Equipment" | "Weapon"
  catalog_type: string;  // specific type within category (formerly vehicle_type)
  unit: string;
  blr: boolean;
  ber: boolean;
  description: string;
  image: string | null;
  status: "pending" | "active" | "rejected";
}
