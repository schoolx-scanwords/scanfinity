"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const router = useRouter();

  return (
    <header
      className="
        w-full
        h-[88px]
        bg-[#0E0128]
        border-b
        border-white/5
        flex
        items-center
        justify-between
        px-6
      "
    >
      {/* LOGO */}
      <motion.button
        onClick={() => router.push("/")}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2 }}
        className="relative w-[230px] h-[52px] shrink-0"
      >
        <Image
          src="/logo/logo.svg"
          alt="Crossword Arena"
          fill
          priority
          className="object-contain object-left"
        />
      </motion.button>

      {/* USER */}
      <div className="flex items-center gap-4">
        <div className="text-right leading-[1.1]">
          <h2 className="text-white text-[15px] font-semibold">
            JohnDoe337
          </h2>

          <p className="text-white/50 text-[11px] font-light">
            johndoe@example.com
          </p>
        </div>

        {/* CLICKABLE AVATAR */}
        <motion.button
          onClick={() => router.push("/profile")}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          className="
            relative
            w-[58px]
            h-[58px]
            rounded-full
            overflow-hidden
            border-[4px]
            border-[#754CA8]
          "
        >
          <Image
            src="/avatars/frog.svg"
            alt="JohnDoe337"
            fill
            className="object-cover"
          />
        </motion.button>
      </div>
    </header>
  );
}