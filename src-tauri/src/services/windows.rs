use tauri::{AppHandle, Manager, Runtime, WebviewUrl, WebviewWindowBuilder, WindowEvent};

pub struct WindowInfo {
    pub label: String,
    pub title: String,
    pub route: String,
    pub width: f64,
    pub height: f64,
}

const MAIN_LABEL: &str = "main";

pub fn open_window<R: Runtime>(
    app: AppHandle<R>,
    window_info: WindowInfo,
) -> tauri::Result<()> {
    let title_clone = window_info.title.clone();

    match std::thread::spawn(move || {
        WebviewWindowBuilder::new(
            &app,
            window_info.label,
            WebviewUrl::App(window_info.route.into()),
        )
        .center()
        .focused(true)
        .resizable(true)
        .inner_size(window_info.width, window_info.height)
        .title(window_info.title.as_str())
        .build()
        .map(|_| ())
        .or_else(|e| {
            log::error!(
                "{}",
                build_open_window_error(window_info.title.as_str(), &e)
            );
            Err(e)
        })
    })
    .join()
    {
        Ok(window_result) => window_result,
        Err(thread_error) => Err(tauri::Error::Runtime(tauri_runtime::Error::CreateWebview(
            Box::from(build_open_window_error(
                title_clone.as_str(),
                &thread_error,
            )),
        ))),
    }
}

pub fn open_dialog_window<R: Runtime>(
    app: AppHandle<R>,
    window_info: WindowInfo,
) -> tauri::Result<()> {
    let title_clone = window_info.title.clone();

    match std::thread::spawn(move || {
        WebviewWindowBuilder::new(
            &app,
            window_info.label,
            WebviewUrl::App(window_info.route.into()),
        )
        .center()
        .focused(true)
        .resizable(true)
        .inner_size(window_info.width, window_info.height)
        .title(window_info.title.as_str())
        .build()
        .and_then(|window| {
            let main_window = app.get_window(MAIN_LABEL).unwrap();
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
            log::error!(
                "{}",
                build_open_dialog_window_error(window_info.title.as_str(), &e)
            );
            Err(e)
        })
    })
    .join()
    {
        Ok(window_result) => window_result,
        Err(thread_error) => Err(tauri::Error::Runtime(tauri_runtime::Error::CreateWebview(
            Box::from(build_open_dialog_window_error(
                title_clone.as_str(),
                &thread_error,
            )),
        ))),
    }
}

fn build_open_dialog_window_error(title: &str, error: &impl std::fmt::Debug) -> String {
    format!["Failed to open a {title} child window: {error:?}"]
}

fn build_open_window_error(title: &str, error: &impl std::fmt::Debug) -> String {
    format!["Failed to open a {title} window: {error:?}"]
}
