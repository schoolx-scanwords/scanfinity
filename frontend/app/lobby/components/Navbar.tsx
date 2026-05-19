"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/contexts/auth_context"; 

export default function Navbar() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  // Show a minimal navbar while loading or if no user is logged in
  if (isLoading || !user) {
    return (
      <header
        className="
          fixed
          top-0
          left-0
          right-0
          z-50
          w-full
          h-[72px] md:h-[88px]
          bg-[#0E0128]/80
          backdrop-blur-md
          border-b
          border-white/5
          flex
          items-center
          justify-between
          px-4 md:px-6
        "
      >
        <motion.button
          onClick={() => router.push("/")}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.2 }}
          className="relative w-[160px] md:w-[230px] h-[40px] md:h-[52px] shrink-0"
        >
          <Image
            src="/logo/logo.svg"
            alt="Crossword Arena"
            fill
            priority
            className="object-contain object-left"
          />
        </motion.button>
        <div className="w-[44px] md:w-[58px]" /> {/* Placeholder for spacing */}
      </header>
    );
  }

  // Check if user is a guest
  const isGuest = user.isAnonymous === true;

  return (
    <header
      className="
        fixed
        top-0
        left-0
        right-0
        z-50
        w-full
        h-[72px] md:h-[88px]
        bg-[#0E0128]/80
        backdrop-blur-md
        border-b
        border-white/5
        flex
        items-center
        justify-between
        px-4 md:px-6
      "
    >
      {/* LOGO */}
      <motion.button
        onClick={() => router.push("/")}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2 }}
        className="relative w-[120px] sm:w-[160px] md:w-[230px] h-[32px] sm:h-[40px] md:h-[52px] shrink-0"
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
      <div className="flex items-center gap-2 md:gap-4">
        {/* Always visible on mobile, hidden on very small screens if needed */}
        <div className="text-right leading-[1.1]">
          <h2 className="text-white text-[11px] xs:text-[13px] md:text-[15px] font-semibold truncate max-w-[120px] xs:max-w-[150px] sm:max-w-none">
            {user.username}
            {isGuest && (
              <span className="ml-1 text-[8px] xs:text-[10px] md:text-[11px] text-white/40 font-normal">
                (Guest)
              </span>
            )}
          </h2>
          <p className="text-white/50 text-[9px] xs:text-[10px] md:text-[11px] font-light truncate max-w-[120px] xs:max-w-[150px] sm:max-w-none">
            {isGuest ? "Guest" : user.email}
          </p>
        </div>

        {/* CLICKABLE AVATAR - Only navigates to profile if logged in, not for guests */}
        <motion.button
          onClick={() => {
            if (!isGuest) {
              router.push("/profile");
            }
            // Do nothing for guests
          }}
          whileHover={{ scale: isGuest ? 1 : 1.04 }}
          whileTap={{ scale: isGuest ? 0.98 : 0.96 }}
          className={`
            relative
            w-[36px] xs:w-[40px] sm:w-[44px] md:w-[58px]
            h-[36px] xs:h-[40px] sm:h-[44px] md:h-[58px]
            rounded-full
            overflow-hidden
            border-2 xs:border-[3px] md:border-[4px]
            border-[#754CA8]
            ${isGuest ? 'cursor-default' : 'cursor-pointer'}
            shrink-0
          `}
        >
          <Image
            src={user.avatar || "/avatars/frog.svg"}
            alt={user.username}
            fill
            className="object-cover"
          />
        </motion.button>
      </div>
    </header>
  );
}