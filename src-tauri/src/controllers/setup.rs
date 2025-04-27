use tauri::{Builder, Runtime};

use super::table_controller::TableControllerSetup;

pub trait SetupControllers<R: Runtime> {
    fn setup_controllers(self) -> Self;
}

impl<R: Runtime> SetupControllers<R> for Builder<R> {
    fn setup_controllers(self) -> Self {
        self.setup_table_controller()
    }
}