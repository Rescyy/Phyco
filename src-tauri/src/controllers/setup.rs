use log::info;
use tauri::{command, generate_handler, AppHandle, Builder, Runtime};

use super::{
    file_controller::{self, OpenProjectModel},
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
            save_project,
            read_project
        ])
    }
}

#[command]
pub fn add_column<R: Runtime>(app: AppHandle<R>) -> tauri::Result<()> {
    table_controller::add_column(app)
}

#[command]
pub fn edit_column<R: Runtime>(app: AppHandle<R>) -> tauri::Result<()> {
    table_controller::edit_column(app)
}

#[command]
async fn save_project(content: String, filename: String) -> tauri::Result<()> {
    file_controller::save_project(content, filename)
}

#[tauri::command]
fn read_project(filename: String) -> tauri::Result<OpenProjectModel> {
    let result = file_controller::read_project(filename)?;
    info!["{:?}", result];
    Ok(result)
}
