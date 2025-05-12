import { getCurrentWindow } from "@tauri-apps/api/window";

const debounceMap: Record<string, ReturnType<typeof setTimeout>> = {};

type ValidationResultObject = {
  [key: string]: ValidationResult
}


export function isResultValid(obj: ValidationResultObject): boolean {
  return Object.values(obj).every(v => 
    v === undefined ||
    v.result === true
  );
}

export class ValidationResult {
  result: boolean = true;
  message: string = "";

  constructor(message?: string) {
    if (message) this.setMessage(message);
  }

  setMessage(message: string) {
    if (message) {
      this.message = message;
      this.result = false;
    }
  }
}

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