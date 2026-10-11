"use client";
import { useEffect, useState, type FormEvent } from "react";
import Ascend from "./ascend";
import { accountRequest, selectAccount, type Account } from "@/lib/account";
export default function AuthGate() {
  const [user, setUser] = useState<Account | null>(null),
    [mode, setMode] = useState<
      "loading" | "login" | "register" | "local" | "account"
    >("loading"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [available, setAvailable] = useState(true);
  useEffect(() => {
    let cancelled = false;
    if (sessionStorage.getItem("ascend-local-mode") === "1") {
      selectAccount(null);
      setMode("local");
    } else
      accountRequest("/api/auth/session")
        .then((data) => {
          if (cancelled) return;
          selectAccount(data.user);
          setUser(data.user);
          setMode(data.user ? "account" : "login");
        })
        .catch(() => {
          if (cancelled) return;
          setAvailable(false);
          setMode("login");
        });
    const ended = () => {
      selectAccount(null);
      setUser(null);
      setMode("login");
      setError("Your session ended or changed. Sign in to continue.");
    };
    window.addEventListener("ascend-session-ended", ended);
    const channel = new BroadcastChannel("ascend-auth");
    channel.onmessage = () => {
      sessionStorage.removeItem("ascend-local-mode");
      window.location.reload();
    };
    return () => {
      cancelled = true;
      window.removeEventListener("ascend-session-ended", ended);
      channel.close();
    };
  }, []);
  const notify = () => {
    const channel = new BroadcastChannel("ascend-auth");
    channel.postMessage("changed");
    channel.close();
  };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    if (
      mode === "register" &&
      data.get("password") !== data.get("confirmation")
    ) {
      setError("Passwords do not match.");
      setBusy(false);
      return;
    }
    try {
      const result = await accountRequest("/api/auth/" + mode, "POST", {
        email: data.get("email"),
        password: data.get("password"),
        ...(mode === "register" ? { name: data.get("name") } : {}),
      });
      sessionStorage.removeItem("ascend-local-mode");
      selectAccount(result.user);
      setUser(result.user);
      setMode("account");
      notify();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }
  async function leave() {
    setBusy(true);
    setError("");
    try {
      if (user) await accountRequest("/api/auth/logout", "POST", {});
      sessionStorage.removeItem("ascend-local-mode");
      selectAccount(null);
      setUser(null);
      setMode("login");
      notify();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to sign out.");
    } finally {
      setBusy(false);
    }
  }
  if (mode === "loading")
    return (
      <main className="auth-screen">
        <p role="status">Opening your learning space…</p>
      </main>
    );
  if (mode === "account" || mode === "local")
    return (
      <>
        <div className="account-bar">
          <span>
            {user
              ? `Signed in as ${user.email}`
              : "Local workspace · this browser only"}
          </span>
          <button disabled={busy} onClick={leave}>
            {user ? "Sign out" : "Sign in / Register"}
          </button>
          {error && <span role="alert">{error}</span>}
        </div>
        <Ascend key={user?.id || "local"} />
      </>
    );
  return (
    <main className="auth-screen">
      <section className="auth-card">
        <a className="auth-brand" href="#">
          ASCEND<span>Learn. Build. Prove.</span>
        </a>
        <h1>
          {mode === "register" ? "Start your next chapter." : "Welcome back."}
        </h1>
        <p>
          {mode === "register"
            ? "Create your own learning space and keep your progress across devices."
            : "Sign in to your learning, achievements and certificates."}
        </p>
        <div className="auth-tabs" role="group" aria-label="Account options">
          <button
            type="button"
            aria-pressed={mode === "login"}
            onClick={() => {
              setMode("login");
              setError("");
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            aria-pressed={mode === "register"}
            onClick={() => {
              setMode("register");
              setError("");
            }}
          >
            Register
          </button>
        </div>
        <form onSubmit={submit}>
          {mode === "register" && (
            <label>
              Your name
              <input name="name" autoComplete="name" required maxLength={100} />
            </label>
          )}
          <label>
            Email address
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
              required
              minLength={12}
              maxLength={128}
            />
          </label>
          {mode === "register" && (
            <>
              <small>
                Use at least 12 characters. Email verification and password
                recovery are not available yet.
              </small>
              <label>
                Confirm password
                <input
                  name="confirmation"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  maxLength={128}
                />
              </label>
            </>
          )}
          {error && <p role="alert">{error}</p>}
          {!available && (
            <p role="status">
              Account server unavailable. Start the app with npm start, or use
              your local workspace.
            </p>
          )}
          <button className="primary" disabled={busy || !available}>
            {busy
              ? "Please wait…"
              : mode === "register"
                ? "Create account"
                : "Sign in"}
          </button>
        </form>
        <div className="auth-local">
          <button
            onClick={() => {
              sessionStorage.setItem("ascend-local-mode", "1");
              selectAccount(null);
              setMode("local");
              setError("");
            }}
          >
            Continue on this device
          </button>
          <small>
            Your existing local records remain here. To move them into an
            account, export a backup in Settings, then import it after signing
            in.
          </small>
        </div>
      </section>
    </main>
  );
}
