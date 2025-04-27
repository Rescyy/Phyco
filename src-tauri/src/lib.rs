use controllers::setup::SetupControllers;
use menubar::setup::SetupMenuBar;

mod controllers;
mod menubar;
mod services;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .setup_menu_bar()
        .setup_controllers()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}