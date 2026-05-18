"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/app/contexts/auth_context";

export default function Navbar() {
  const { user } = useAuth();

  const username = user?.username || "Guest";
  const email = user?.email || "";
  const avatarSrc = user?.avatar && user.avatar.trim() !== "" ? user.avatar : "/avatars/frog.svg";
  const canOpenProfile = Boolean(user);

  return (
    <header
      className="w-full h-[88px] bg-[#0E0128] border-b border-white/5 flex items-center justify-between px-4 sm:px-6"
    >
      <Link
        href="/"
        aria-label="Go to home"
        className="shrink-0"
      >
        <motion.div
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
          className="relative w-[160px] sm:w-[230px] h-[52px]"
        >
          <Image
            src="/logo/logo.svg"
            alt="Crossword Arena"
            fill
            priority
            className="object-contain object-left"
          />
        </motion.div>
      </Link>

      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <div className="text-right leading-[1.1] min-w-0">
          <h2 className="text-white text-[15px] font-semibold">{username}</h2>
          {email ? (
            <p className="text-white/50 text-[11px] font-light truncate max-w-[160px] sm:max-w-[260px]">{email}</p>
          ) : null}
        </div>

        {canOpenProfile ? (
          <Link href="/profile" aria-label="Open profile">
            <motion.div
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="relative w-[58px] h-[58px] rounded-full overflow-hidden border-[4px] border-[#754CA8]"
            >
              <Image src={avatarSrc} alt={username} fill className="object-cover" />
            </motion.div>
          </Link>
        ) : (
          <div
            aria-label="Profile (login required)"
            aria-disabled="true"
            className="relative w-[58px] h-[58px] rounded-full overflow-hidden border-[4px] border-[#754CA8] opacity-60 cursor-not-allowed"
          >
            <Image src={avatarSrc} alt={username} fill className="object-cover" />
          </div>
        )}
      </div>
    </header>
  );
}