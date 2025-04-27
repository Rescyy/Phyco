import { getCurrentWindow } from "@tauri-apps/api/window";

export function closeCurrentWindow() {
    getCurrentWindow().close();
}