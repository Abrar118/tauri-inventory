export interface Vehicle {
  id?: string;
  vehicle_no: string;
  name: string;
  category: string;      // broad category: Vehicle, Weapon, Equipment, etc.
  vehicle_type: string;  // specific type within the category
  unit: string;
  blr: boolean; // beyond local repair, true if vehicle is beyond local repair - orange color
  ber: boolean; // beyond economic repair, true if vehicle is beyond economic repair - red color
  description: string;
  image: string | null;
  status: "pending" | "active" | "rejected";
}
