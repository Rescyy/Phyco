import { getCurrentWindow } from "@tauri-apps/api/window";
import { v4 } from "uuid";
import { Event } from '@tauri-apps/api/event';

const debounceMap: Record<string, ReturnType<typeof setTimeout>> = {};

export type State<T> = [T, React.Dispatch<React.SetStateAction<T>>]

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


export function normalizeWhitespace(input: string): string{
  return input.trim().replace(/\s+/g, ' ');
}

export function isStringAlphanumeric(value: string): boolean {
  return Boolean(/^[a-zA-Z0-9_.\s]+$/g.exec(value));
}

export function alphabeticalUuid() {
  const from = "1234567890-".split("");
  const to = "ghijklmnop_".split("");
  return v4().split("").map(char => {
    const index = from.indexOf(char);
    return index !== -1 ? to[index] : char;
  }).join("");
}

export function handleEvent<T>(callback: (value: T) => void): (event: Event<T>) => void {
  return (event: Event<T>) => callback(event.payload);
}

export async function handleEventAsync<T>(callback: (value: T) => Promise<void>): Promise<(event: Event<T>) => Promise<void>> {
  return async (event: Event<T>) => await callback(event.payload);
}