use tauri::{
    menu::{Menu, SubmenuBuilder},
    Builder, Manager, Runtime,
};

pub trait SetupMenuBar<R: Runtime> {
    fn setup_menu_bar(self) -> Self;
}

impl<R: Runtime> SetupMenuBar<R> for Builder<R> {
    fn setup_menu_bar(self) -> Self {
        self.setup(|app| {
            let main_window = app.get_window("main").unwrap();
            main_window.set_menu(Menu::with_items(
                app,
                &[&SubmenuBuilder::new(app, "Project")
                    .text("project_new", "New")
                    .text("project_open", "Open")
                    .build()?],
            )?)?;
            main_window.on_menu_event(move |_, event| match event.id.as_ref() {
                "project_new" => {
                    log::info!("Attempted to open new project");
                }
                "project_open" => {
                    log::info!("Attempted to open existing project");
                }
                _ => (),
            });
            Ok(())
        })
    }
}
