"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";

import Navbar from "@/app/lobby/components/Navbar";
import { useAuth } from "@/app/contexts/auth_context";

export default function ProfilePage() {
  const { user } = useAuth();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const username = user?.username || "Guest";
  const email = user?.email || "";
  const initialAvatar = user?.avatar && user.avatar.trim() !== "" ? user.avatar : "/avatars/frog.svg";

  const [avatar, setAvatar] = useState<string>(initialAvatar);

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

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    const imageUrl = URL.createObjectURL(file);
    objectUrlRef.current = imageUrl;
    setAvatar(imageUrl);
  };

  return (
    <main className="min-h-screen bg-[var(--background)] flex flex-col">
      <Navbar />

      <section className="flex-1 flex justify-center items-center">
        <div className="flex flex-col items-center -mt-16">
          <div className="relative">
            <motion.div
              whileHover={{ scale: 1.03 }}
              className="relative w-[220px] h-[220px] rounded-full overflow-hidden"
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
              className="absolute bottom-[-6px] right-[-18px] w-[96px] h-[96px] rounded-full bg-white flex items-center justify-center z-50"
              aria-label="Change avatar"
              type="button"
            >
              <Plus size={52} strokeWidth={4} className="text-black/10" />
            </motion.button>
          </div>

          <h1 className="mt-7 text-[72px] leading-none text-white font-medium">{username}</h1>

          <p className="mt-2 text-[28px] text-white/70 underline">{email || "—"}</p>

          <div className="mt-5 flex flex-col items-center">
            <span className="text-[30px] text-white/45">games played: 228</span>
            <span className="text-[30px] text-white/45">in the rating: 10456</span>
          </div>
        </div>
      </section>
    </main>
  );
}
