import { getCurrentWindow } from "@tauri-apps/api/window";

const debounceMap: Record<string, ReturnType<typeof setTimeout>> = {};

export function debounce(id: string, callback: () => void, delay: number): void {
    if (debounceMap[id]) {
      clearTimeout(debounceMap[id]);
    }
  
    debounceMap[id] = setTimeout(() => {
      callback();
      delete debounceMap[id];
    }, delay);
  }

export function closeCurrentWindow() {
    getCurrentWindow().close();
}