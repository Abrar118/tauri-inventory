export interface Repair {
  id?: string;
  repair_time: string;
  vehicle_no: string;
  issued_parts: string[];
  out_time: string | null;
}
