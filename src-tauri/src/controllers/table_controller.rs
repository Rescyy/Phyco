use crate::services::windows::{open_dialog_window, open_window, WindowInfo};
use tauri::{AppHandle, Runtime};

pub fn open_add_column_window<R: Runtime>(app: AppHandle<R>) -> tauri::Result<()> {
    const ADD_COLUMN_LABEL: &str = "addColumn";
    const ADD_COLUMN_TITLE: &str = "Add Column";
    const ADD_COLUMN_ROUTE: &str = "addColumn";
    open_dialog_window(
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

pub fn open_edit_column_window<R: Runtime>(app: AppHandle<R>) -> tauri::Result<()> {
    const EDIT_COLUMN_LABEL: &str = "editColumn";
    const EDIT_COLUMN_TITLE: &str = "Edit Column";
    const EDIT_COLUMN_ROUTE: &str = "editColumn";
    open_dialog_window(
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

pub fn open_delete_column_window<R: Runtime>(app: AppHandle<R>) -> tauri::Result<()> {
    const DELETE_COLUMN_LABEL: &str = "deleteColumn";
    const DELETE_COLUMN_TITLE: &str = "Delete Column";
    const DELETE_COLUMN_ROUTE: &str = "deleteColumn";
    open_dialog_window(
        app,
        WindowInfo {
            label: DELETE_COLUMN_LABEL.to_string(),
            title: DELETE_COLUMN_TITLE.to_string(),
            route: DELETE_COLUMN_ROUTE.to_string(),
            height: 220.,
            width: 300.,
        },
    )
}

pub fn open_add_chart_window<R: Runtime>(app: AppHandle<R>) -> tauri::Result<()> {
    const ADD_CHART_LABEL: &str = "addChart";
    const ADD_CHART_TITLE: &str = "Add Chart";
    const ADD_CHART_ROUTE: &str = "addChart";
    open_dialog_window(
        app,
        WindowInfo {
            label: ADD_CHART_LABEL.to_string(),
            title: ADD_CHART_TITLE.to_string(),
            route: ADD_CHART_ROUTE.to_string(),
            height: 400.,
            width: 400.,
        },
    )
}

pub fn open_view_chart_window<R: Runtime>(app: AppHandle<R>, key: String, name: String) -> tauri::Result<()> {
    const VIEW_CHART_LABEL: &str = "viewChart";
    const VIEW_CHART_TITLE: &str = "View Chart";
    const VIEW_CHART_ROUTE: &str = "viewChart";
    open_window(
        app,
        WindowInfo {
            label: format!["{VIEW_CHART_LABEL}{key}"],
            title: format!["{VIEW_CHART_TITLE} {name}"],
            route: format!["{VIEW_CHART_ROUTE}?key={key}&name={name}"],
            height: 300.,
            width: 400.,
        },
    )
}
