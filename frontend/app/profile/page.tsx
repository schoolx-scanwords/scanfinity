"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import Navbar from "@/app/lobby/components/Navbar";
import { useAuth } from "@/app/contexts/auth_context";

const decodeJwtSub = (token: string): string | null => {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const jsonPayload = decodeURIComponent(
      atob(padded)
        .split("")
        .map((c) => `%${("00" + c.charCodeAt(0).toString(16)).slice(-2)}`)
        .join("")
    );
    const payload = JSON.parse(jsonPayload);
    return typeof payload?.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
};

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading, updateUser } = useAuth();

  const [stats, setStats] = useState<{ elo: number; games_played: number } | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (user) return;

    const returnUrl =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : "/profile";
    router.replace(`/auth?return=${encodeURIComponent(returnUrl)}`);
  }, [isLoading, user, router]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const username = user?.username || "Guest";
  const email = user?.email || "";
  const initialAvatar = user?.avatar && user.avatar.trim() !== "" ? user.avatar : "/avatars/frog.svg";

  const [avatar, setAvatar] = useState<string>(initialAvatar);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    if (!user) return;
    if (!token || token === "anonymous") return;

    const controller = new AbortController();
    setStatsLoading(true);

    (async () => {
      try {
        const res = await fetch("/api/users/me/stats", {
          method: "GET",
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.detail || `HTTP ${res.status}`);
        }

        const data = (await res.json()) as { elo?: unknown; games_played?: unknown };
        const elo = typeof data.elo === "number" ? data.elo : Number(data.elo);
        const gamesPlayed =
          typeof data.games_played === "number" ? data.games_played : Number(data.games_played);

        setStats({
          elo: Number.isFinite(elo) ? elo : 0,
          games_played: Number.isFinite(gamesPlayed) ? gamesPlayed : 0,
        });
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        console.error("Failed to load profile stats", err);
      } finally {
        setStatsLoading(false);
      }
    })();

    return () => controller.abort();
  }, [user?.id, user?.username]);

  useEffect(() => {
    // If user changes (login/logout) and we didn't set a local upload, update avatar from auth.
    if (!objectUrlRef.current) {
      setAvatar(initialAvatar);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAvatar]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    // Allow selecting the same file again.
    event.target.value = "";

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    const imageUrl = URL.createObjectURL(file);
    objectUrlRef.current = imageUrl;
    setAvatar(imageUrl);

    // Persist for authenticated users.
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
      if (!token || token === "anonymous") {
        return;
      }

      let resolvedUserId: string | number | undefined = user?.id;
      if (!resolvedUserId || String(resolvedUserId).trim() === "") {
        const sub = decodeJwtSub(token);
        const parsedId = sub ? Number(sub) : NaN;
        if (Number.isFinite(parsedId)) {
          resolvedUserId = parsedId;
          updateUser({ id: parsedId });
        } else if (sub) {
          resolvedUserId = sub;
          updateUser({ id: sub });
        }
      }

      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/api/users/me/avatar", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || `HTTP ${res.status}`);
      }

      if (!resolvedUserId || String(resolvedUserId).trim() === "") {
        // Can't build a stable avatar URL without a user id.
        return;
      }

      const serverUrl = `/api/users/${encodeURIComponent(String(resolvedUserId))}/avatar?v=${Date.now()}`;
      updateUser({ avatar: serverUrl });

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }

      setAvatar(serverUrl);
    } catch (err) {
      console.error("Failed to upload avatar", err);
    }
  };

  if (!user) {
    return <main className="min-h-screen bg-[var(--background)]" />;
  }

  return (
    <main className="min-h-screen bg-[var(--background)] flex flex-col">
      <Navbar />

      <section className="flex-1 flex justify-center items-center px-4 py-10">
        <div className="flex flex-col items-center w-full max-w-xl text-center">
          <div className="relative">
            <motion.div
              whileHover={{ scale: 1.03 }}
              className="relative w-[160px] h-[160px] sm:w-[200px] sm:h-[200px] lg:w-[220px] lg:h-[220px] rounded-full overflow-hidden"
            >
              <Image src={avatar} alt="Profile Avatar" fill className="object-cover" unoptimized />
            </motion.div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />

            <motion.button
              onClick={() => fileInputRef.current?.click()}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              className="absolute bottom-2 right-2 w-[72px] h-[72px] sm:w-[88px] sm:h-[88px] rounded-full bg-white flex items-center justify-center z-50"
              aria-label="Change avatar"
              type="button"
            >
              <Plus size={44} strokeWidth={4} className="text-black/10" />
            </motion.button>
          </div>

          <h1 className="mt-7 text-4xl sm:text-6xl lg:text-[72px] leading-none text-white font-medium break-words">
            {username}
          </h1>

          <p className="mt-2 text-base sm:text-xl lg:text-[28px] text-white/70 underline break-all">
            {email || "—"}
          </p>

          <div className="mt-5 flex flex-col items-center">
            <span className="text-lg sm:text-2xl lg:text-[30px] text-white/45">
              games played: {statsLoading ? "—" : stats?.games_played ?? "—"}
            </span>
            <span className="text-lg sm:text-2xl lg:text-[30px] text-white/45">
              in the rating: {statsLoading ? "—" : stats?.elo ?? "—"}
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
