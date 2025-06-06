use log;
use tauri::{command, generate_handler, AppHandle, Builder, Runtime};

use super::{
    file_controller::{self},
    table_controller::{self},
};

pub trait SetupControllers<R: Runtime> {
    fn setup_controllers(self) -> Self;
}

impl<R: Runtime> SetupControllers<R> for Builder<R> {
    fn setup_controllers(self) -> Self {
        self.invoke_handler(generate_handler![
            add_column,
            edit_column,
            delete_column,
            save_project,
            read_project,
            add_chart,
            view_chart
        ])
    }
}

#[command]
pub fn add_column<R: Runtime>(app: AppHandle<R>) -> tauri::Result<()> {
    table_controller::open_add_column_window(app)
}

#[command]
pub fn edit_column<R: Runtime>(app: AppHandle<R>) -> tauri::Result<()> {
    table_controller::open_edit_column_window(app)
}

#[command]
pub fn delete_column<R: Runtime>(app: AppHandle<R>) -> tauri::Result<()> {
    table_controller::open_delete_column_window(app)
}

#[command]
pub fn add_chart<R: Runtime>(app: AppHandle<R>) -> tauri::Result<()> {
    table_controller::open_add_chart_window(app)
}

#[command]
pub fn view_chart<R: Runtime>(
    app: AppHandle<R>,
    key: String,
    r#type: String,
    name: String,
) -> tauri::Result<()> {
    table_controller::open_view_chart_window(app, key, r#type, name)
}

#[command]
async fn save_project(content: String, filename: String) -> tauri::Result<()> {
    file_controller::save_project(content, filename)
}

#[tauri::command]
fn read_project(filename: String) -> tauri::Result<String> {
    file_controller::read_project(filename)
    .inspect_err(|e| log::error!["{}", e])
}
