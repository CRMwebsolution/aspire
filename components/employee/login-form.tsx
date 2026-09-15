"use client";

import { useState, type FormEvent } from "react";
import { Loader2, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: String(form.get("email") ?? "").trim(),
      password: String(form.get("password") ?? ""),
    });

    if (signInError) {
      setError("The email or password was not accepted.");
      setBusy(false);
      return;
    }

    router.replace(nextPath);
    router.refresh();
  }

  return (
    <form className="employee-login-form" onSubmit={onSubmit}>
      <label>Email<input name="email" type="email" autoComplete="email" required /></label>
      <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={busy}>
        {busy ? <Loader2 className="spin" size={18} /> : <LogIn size={18} />}
        {busy ? "Signing in" : "Sign in"}
      </button>
    </form>
  );
}
