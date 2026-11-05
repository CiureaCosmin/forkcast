import type { ConfirmOptions } from './confirm.types';

/** React Native Web's `Alert` does nothing, so the browser's dialog is used instead. */
export function confirm({ title, message }: ConfirmOptions): Promise<boolean> {
  return Promise.resolve(window.confirm(`${title}\n\n${message}`));
}
