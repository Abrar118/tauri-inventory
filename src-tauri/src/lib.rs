pub mod models;

use base64::{engine::general_purpose::STANDARD, Engine as _};
use rxing::{BarcodeFormat, MultiFormatWriter, Writer};
use std::collections::HashMap;
use std::fs;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Generate a barcode PNG (base64-encoded) from a value string and barcode type.
///
/// `barcode_type` must be one of: "code128", "code39", "ean13", "qrcode"
///
/// The returned string is a raw base64-encoded PNG suitable for use as
/// `data:image/png;base64,{result}` in an <img> tag.
#[tauri::command]
fn generate_barcode(value: String, barcode_type: String) -> Result<String, String> {
    let format = match barcode_type.as_str() {
        "code128" => BarcodeFormat::CODE_128,
        "code39" => BarcodeFormat::CODE_39,
        "ean13" => BarcodeFormat::EAN_13,
        "qrcode" => BarcodeFormat::QR_CODE,
        other => return Err(format!("Unknown barcode type: {other}")),
    };

    // QR codes need equal width/height; linear barcodes are wide
    let (width, height): (i32, i32) = match format {
        BarcodeFormat::QR_CODE => (300, 300),
        _ => (600, 160),
    };

    let hints: HashMap<rxing::EncodeHintType, rxing::EncodeHintValue> = HashMap::new();
    let bit_matrix = MultiFormatWriter::default()
        .encode_with_hints(&value, &format, width, height, &hints)
        .map_err(|e| e.to_string())?;

    let bm_w = bit_matrix.getWidth();
    let bm_h = bit_matrix.getHeight();

    // Add a quiet-zone (white border) around the barcode for scannability
    let padding = 16u32;
    let img_w = bm_w + padding * 2;
    let img_h = bm_h + padding * 2;

    // Build raw grayscale pixel data row-by-row (0 = black, 255 = white)
    let mut pixels: Vec<u8> = Vec::with_capacity((img_w * img_h) as usize);
    for y in 0..img_h {
        for x in 0..img_w {
            let in_barcode =
                x >= padding && x < bm_w + padding && y >= padding && y < bm_h + padding;
            let pixel = if in_barcode && bit_matrix.get(x - padding, y - padding) {
                0u8 // black module
            } else {
                255u8 // white background / quiet zone
            };
            pixels.push(pixel);
        }
    }

    // Encode pixels as a PNG
    let mut png_bytes: Vec<u8> = Vec::new();
    {
        let mut encoder = png::Encoder::new(&mut png_bytes, img_w, img_h);
        encoder.set_color(png::ColorType::Grayscale);
        encoder.set_depth(png::BitDepth::Eight);
        let mut writer = encoder.write_header().map_err(|e| e.to_string())?;
        writer
            .write_image_data(&pixels)
            .map_err(|e| e.to_string())?;
    }

    Ok(STANDARD.encode(&png_bytes))
}

/// Decode a base64 PNG and write it to the user's Downloads folder.
/// Returns the full path of the saved file.
#[tauri::command]
fn save_barcode_png(base64_data: String, filename: String) -> Result<String, String> {
    let bytes = STANDARD.decode(&base64_data).map_err(|e| e.to_string())?;

    let downloads = dirs::download_dir()
        .ok_or_else(|| "Could not locate Downloads directory".to_string())?;

    // Sanitise the filename: keep alphanumerics, hyphens, underscores, dots
    let safe_name: String = filename
        .chars()
        .map(|c| {
            if c.is_alphanumeric() || c == '-' || c == '_' || c == '.' {
                c
            } else {
                '_'
            }
        })
        .collect();

    let path = downloads.join(&safe_name);
    fs::write(&path, &bytes).map_err(|e| e.to_string())?;

    Ok(path.to_string_lossy().to_string())
}

/// Write a self-contained barcode HTML to a temp file and open it in the
/// default browser. The page auto-triggers window.print() on load.
///
/// window.print() is silently blocked inside Tauri's WKWebView, so printing
/// must be delegated to an external browser via the OS `open` command.
#[tauri::command]
fn print_barcodes_html(html: String) -> Result<(), String> {
    let temp_path = std::env::temp_dir().join("inventory_barcodes.html");
    fs::write(&temp_path, html.as_bytes()).map_err(|e| e.to_string())?;

    std::process::Command::new("open")
        .arg(temp_path.to_str().ok_or("Invalid temp path")?)
        .spawn()
        .map_err(|e| e.to_string())?;

    // Delete the file after the browser has had time to read it.
    let cleanup_path = temp_path.clone();
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_secs(10));
        let _ = fs::remove_file(cleanup_path);
    });

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            generate_barcode,
            save_barcode_png,
            print_barcodes_html
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
