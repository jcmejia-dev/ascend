"use client";
import { useEffect, useState } from "react";
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}
export function usePWA() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null),
    [install, setInstall] = useState<InstallEvent | null>(null),
    [offline, setOffline] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const online = () => setOffline(!navigator.onLine),
      prompt = (e: Event) => {
        e.preventDefault();
        setInstall(e as InstallEvent);
      };
    online();
    window.addEventListener("online", online);
    window.addEventListener("offline", online);
    window.addEventListener("beforeinstallprompt", prompt);
    let reg: ServiceWorkerRegistration | undefined;
    const check = () => {
      reg?.update().catch(() => {});
    };
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((r) => {
          reg = r;
          if (r.waiting && navigator.serviceWorker.controller)
            setWaiting(r.waiting);
          r.addEventListener("updatefound", () => {
            const w = r.installing;
            w?.addEventListener("statechange", () => {
              if (w.state === "installed" && navigator.serviceWorker.controller)
                setWaiting(w);
            });
          });
        })
        .catch(() =>
          setError(
            "Offline shell could not be installed. Reconnect and reload to retry.",
          ),
        );
      window.addEventListener("focus", check);
    }
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", online);
      window.removeEventListener("beforeinstallprompt", prompt);
      window.removeEventListener("focus", check);
    };
  }, []);
  const update = () => {
    if (!waiting) return;
    let refreshed = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshed) {
        refreshed = true;
        window.location.reload();
      }
    });
    waiting.postMessage({ type: "SKIP_WAITING" });
  };
  const installApp = async () => {
    if (!install) return;
    await install.prompt();
    await install.userChoice;
    setInstall(null);
  };
  return { waiting, offline, error, canInstall: !!install, installApp, update };
}
