use std::fs::File;
use std::io::Read;
use std::io::Write;

pub fn save_project(content: String, filename: String) -> tauri::Result<()> {
    File::create(filename)
        .and_then(|mut file| file.write_all(content.as_bytes()))
        .map_err(|e| tauri::Error::Io(e))
}

pub fn read_project(filename: String) -> tauri::Result<String> {
    let mut buffer: String = String::new();
    File::open(filename)
        .and_then(|mut file| file.read_to_string(&mut buffer))
        .map(|_| buffer)
        .map_err(|e| tauri::Error::Io(e))
}
