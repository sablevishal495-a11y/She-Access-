import { useEffect, useRef } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

/**
 * Android hardware back button support.
 * Screens register a handler that returns `true` when it consumed the press
 * (e.g. closed a sheet). If nobody handles it, the app exits.
 */
const handlers: Array<() => boolean> = [];

export function useBackHandler(handler: () => boolean, active = true): void {
  const ref = useRef(handler);
  ref.current = handler;

  useEffect(() => {
    if (!active) return;
    const fn = () => ref.current();
    handlers.push(fn);
    return () => {
      const i = handlers.lastIndexOf(fn);
      if (i >= 0) handlers.splice(i, 1);
    };
  }, [active]);
}

/** Registers the single native listener. Returns a cleanup function. */
export function initBackButton(): () => void {
  if (!Capacitor.isNativePlatform()) return () => {};

  let cancelled = false;
  let remove: (() => void) | undefined;

  CapacitorApp.addListener("backButton", () => {
    for (let i = handlers.length - 1; i >= 0; i--) {
      if (handlers[i]()) return;
    }
    void CapacitorApp.exitApp();
  })
    .then((handle) => {
      if (cancelled) void handle.remove();
      else remove = () => void handle.remove();
    })
    .catch(() => {
      /* plugin unavailable */
    });

  return () => {
    cancelled = true;
    remove?.();
  };
}
