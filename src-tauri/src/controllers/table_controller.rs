use crate::services::windows::open_add_column_window;
use tauri::{command, generate_handler, AppHandle, Builder, Runtime};

pub trait TableControllerSetup<R: Runtime> {
    fn setup_table_controller(self) -> Self;
}

impl<R: Runtime> TableControllerSetup<R> for Builder<R> {
    fn setup_table_controller(self) -> Self {
        self.invoke_handler(generate_handler![add_column])
    }
}

#[command]
pub fn add_column<R: Runtime>(app: AppHandle<R>) -> tauri::Result<()> {
    open_add_column_window(app)
}
