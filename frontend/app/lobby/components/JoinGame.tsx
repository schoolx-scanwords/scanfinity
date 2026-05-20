"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

export default function JoinGame() {
  const router = useRouter();
  const [roomId, setRoomId] = useState("");

  const handleJoin = () => {
    const trimmed = roomId.trim();
    if (!trimmed) return;
    if (typeof window !== "undefined") localStorage.setItem("last_room", trimmed);
    router.push(`/game?room=${encodeURIComponent(trimmed)}`);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleJoin();
  };

  return (
    <section className="flex flex-col items-center px-4 md:px-6 pb-16 md:pb-12">
      <div className="relative w-full max-w-[1140px]">
        {/* PANEL (только содержимое, без кнопки) */}
        <div className="rounded-[32px] md:rounded-[42px] bg-[var(--panel)] px-6 md:px-10 pt-8 md:pt-12 pb-12 md:pb-16 shadow-[0_12px_30px_rgba(0,0,0,0.18)] flex flex-col items-center gap-4 md:gap-6">
          <div className="flex items-center justify-center gap-3 md:gap-4 mb-4 md:mb-6">
            <div className="relative w-[36px] md:w-[44px] h-[36px] md:h-[44px]">
              <img src="/icons/join.svg" alt="Join Game" className="object-contain w-full h-full" />
            </div>
            <h2 className="text-[32px] md:text-[42px] text-white">Join Game:</h2>
          </div>

          <span className="text-white text-[18px] md:text-[22px] text-center">Room ID:</span>

          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            onKeyDown={handleKeyPress}
            className="w-full max-w-[90%] md:max-w-[400px] text-white text-[18px] md:text-[20px] px-5 md:px-6 py-3 md:py-4 rounded-[28px] bg-[rgba(0,0,0,0.3)] border border-black/50 focus:border-[var(--accent)] placeholder-transparent box-border"
          />
        </div>

        {/* JOIN BUTTON – снаружи панели, как Create */}
        <div className="flex justify-center mt-16 md:mt-20">
          <motion.button
            onClick={handleJoin}
            className="
              bg-transparent 
              border-2 border-white 
              text-white 
              px-10 md:px-14 
              py-3 md:py-4 
              rounded-full 
              text-[20px] md:text-[24px] 
              font-semibold 
              hover:bg-white/10 
              transition-all 
              whitespace-nowrap
            "
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Join
          </motion.button>
        </div>
      </div>
    </section>
  );
}