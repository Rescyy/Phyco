use tauri::{AppHandle, Manager, Runtime, WebviewUrl, WebviewWindowBuilder, WindowEvent};

pub struct WindowInfo {
    pub label: &'static str,
    pub title: &'static str,
    pub route: &'static str,
    pub width: f64,
    pub height: f64,
}

const MAIN_LABEL: &str = "main";

pub fn open_add_column_window<R: Runtime>(app: AppHandle<R>) -> tauri::Result<()> {
    const ADD_COLUMN_LABEL: &str = "addColumn";
    const ADD_COLUMN_TITLE: &str = "Add Column";
    const ADD_COLUMN_ROUTE: &str = "addColumn";
    open_child_window(
        app,
        WindowInfo {
            label: ADD_COLUMN_LABEL,
            title: ADD_COLUMN_TITLE,
            route: ADD_COLUMN_ROUTE,
            height: 220.,
            width: 220.,
        },
    )
}

fn open_child_window<R: Runtime>(app: AppHandle<R>, window_info: WindowInfo) -> tauri::Result<()> {
    let title = window_info.title;

    match std::thread::spawn(move || {
        let main_window = app.get_window(MAIN_LABEL).unwrap();
        WebviewWindowBuilder::new(
            &app,
            window_info.label,
            WebviewUrl::App(window_info.route.into()),
        )
        .center()
        .focused(true)
        .resizable(true)
        .inner_size(window_info.width, window_info.height)
        .title(window_info.title)
        .build()
        .and_then(|window| {
            main_window.set_enabled(false).and_then(|_| {
                window.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { .. } = event {
                        let _ = main_window.set_enabled(true);
                    }
                });
                Ok(())
            })
        })
        .or_else(|e| -> tauri::Result<()> {
            log::error!("{}", build_open_child_window_error(title, &e));
            Err(e)
        })
    })
    .join()
    {
        Ok(window_result) => window_result,
        Err(thread_error) => Err(tauri::Error::Runtime(tauri_runtime::Error::CreateWebview(
            Box::from(build_open_child_window_error(title, &thread_error)),
        ))),
    }
}

fn build_open_child_window_error(title: &str, error: &impl std::fmt::Debug) -> String {
    format!["Failed to open a {title} window: {error:?}"]
}
