use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub enum ApprovalStatus {
    #[serde(rename = "pending")]
    Pending,
    #[serde(rename = "active")]
    Active,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Item {
    pub id: Option<String>,
    pub item_no: String,
    pub name: String,
    pub item_type: String,
    pub quantity: u32,
    pub vehicle_type: Option<String>,
    pub returnable: bool,
    pub rack_no: String,
    pub description: String,
    pub image: Option<String>,
    pub status: ApprovalStatus,
    pub blr_count: u32,
    pub ber_count: u32,
    pub unservicable_count: u32,
    pub lost_count: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub enum AccountType {
    #[serde(rename = "ADMIN")]
    Admin,
    #[serde(rename = "OC")]
    OC,
    #[serde(rename = "SMT_JCO")]
    SmtJco,
    #[serde(rename = "SMT_1")]
    Smt1,
    #[serde(rename = "SMT_2")]
    Smt2,
    #[serde(rename = "WORKSHOP_OFFICER")]
    WorkshopOfficer,
    #[serde(rename = "RI&I_1")]
    RiI1,
    #[serde(rename = "RI&I_2")]
    RiI2,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Employee {
    pub id: Option<String>,
    pub username: String,
    pub name: String,
    pub rank: String,
    pub phone: String,
    pub ba_bjo: String,
    pub account_type: AccountType,
    pub email: String,
    pub date_created: String,
    pub last_login: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Repair {
    pub id: Option<String>,
    pub repair_time: String,
    pub vehicle_no: String,
    pub issued_parts: Vec<String>,
    pub out_time: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct IssuedPart {
    pub item_no: String,
    pub quantity: u32,
}

/// Load — vehicle, gun, equipment, or weapon available for repair entries.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Load {
    pub id: Option<String>,
    pub catalog_no: String,
    pub name: String,
    pub category: String,       // "Vehicle" | "Gun" | "Equipment" | "Weapon"
    pub catalog_type: String,   // specific type within category
    pub unit: String,
    pub quantity: u32,
    pub blr_count: u32,
    pub ber_count: u32,
    pub description: String,
    pub image: Option<String>,
    pub status: ApprovalStatus,
}

/// Work-order entry: records an asset in the system for repair / maintenance.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Entry {
    pub id: Option<String>,
    pub asset_no: String,
    pub asset_name: String,
    pub asset_category: String,
    pub asset_unit: String,
    pub asset_type: String,
    pub entry_time: String,
    pub out_time: Option<String>,
    pub status: String,
    pub issued_parts: Vec<IssuedPart>,
    pub notes: String,
    pub div: Option<String>,          // set for Out Station Repair entries
    pub entered_by: Option<String>,   // name of the user who created the entry
}
