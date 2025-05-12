use crate::services::windows::{open_child_window, WindowInfo};
use tauri::{AppHandle, Runtime};

pub fn add_column<R: Runtime>(app: AppHandle<R>) -> tauri::Result<()> {
    const ADD_COLUMN_LABEL: &str = "addColumn";
    const ADD_COLUMN_TITLE: &str = "Add Column";
    const ADD_COLUMN_ROUTE: &str = "addColumn";
    open_child_window(
        app,
        WindowInfo {
            label: ADD_COLUMN_LABEL.to_string(),
            title: ADD_COLUMN_TITLE.to_string(),
            route: ADD_COLUMN_ROUTE.to_string(),
            height: 400.,
            width: 400.,
        },
    )
}

pub fn edit_column<R: Runtime>(
    app: AppHandle<R>
) -> tauri::Result<()> {
    const EDIT_COLUMN_LABEL: &str = "editColumn";
    const EDIT_COLUMN_TITLE: &str = "Edit Column";
    const EDIT_COLUMN_ROUTE: &str = "editColumn";
    open_child_window(
        app,
        WindowInfo {
            label: EDIT_COLUMN_LABEL.to_string(),
            title: EDIT_COLUMN_TITLE.to_string(),
            route: EDIT_COLUMN_ROUTE.to_string(),
            height: 400.,
            width: 400.,
        },
    )
}
