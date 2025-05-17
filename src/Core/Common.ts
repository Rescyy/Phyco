import { getCurrentWindow } from "@tauri-apps/api/window";
import { v4 } from "uuid";

const debounceMap: Record<string, ReturnType<typeof setTimeout>> = {};

type ValidationResultObject = {
  [key: string]: ValidationResult
}

export interface DataRequest {
  callerLabel: string;
}

export function isResultValid(obj: ValidationResultObject): boolean {
  return Object.values(obj).every(v => {
    const und = v === undefined;
    const res = v.result;
    return und || res;
  }
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

export function isStringAlphanumeric(value: string): boolean {
  return Boolean(/^[a-zA-Z0-9_.]+$/g.exec(value));
}

export function alphabeticalUuid() {
  const from = "1234567890-".split("");
  const to =   "ghijklmnop_".split("");
  return v4().split("").map(char => {
    const index = from.indexOf(char);
    return index !== -1 ? to[index] : char;
  }).join("");
}