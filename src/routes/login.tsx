"use client";

import type React from "react";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Shield } from "lucide-react";
import { goeyToast } from "goey-toast";
import { toastError } from "@/lib/toast";
import { signInWithUsername } from "@/lib/auth";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithUsername(username, password);
      goeyToast.success("Login successful", {
        description: "Welcome to 127 Field Workshop EME",
      });
      navigate("/");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      if (code === "auth/user-not-found") {
        toastError("User not found", err, "No account found with this username");
      } else if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        toastError("Wrong password", err, "The password is incorrect");
      } else {
        toastError("Login failed", err, "An error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4">
      {/* Ambient purple bloom */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_60%_100%_at_50%_-20%,color-mix(in_oklch,var(--primary)_18%,transparent),transparent_70%)]"
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary shadow-md shadow-primary/25">
            <Shield className="h-5.5 w-5.5 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">
            127 Field Workshop EME
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Sign in to access the inventory system
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border bg-card p-6 shadow-sm"
        >
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="Enter your username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <Button className="w-full" type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
