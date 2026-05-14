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

    if (typeof window !== "undefined") {
      localStorage.setItem("last_room", trimmed);
    }

    router.push(`/game?room=${encodeURIComponent(trimmed)}`);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleJoin();
  };

  return (
    <section className="flex flex-col items-center px-6 pb-12 relative">
      <div className="relative w-full max-w-[1140px]">
        <div className="rounded-[42px] bg-[var(--panel)] px-10 pt-12 pb-16 shadow-[0_12px_30px_rgba(0,0,0,0.18)] flex flex-col items-center gap-6 relative">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="relative w-[44px] h-[44px]">
              <img src="/icons/join.svg" alt="Join Game" className="object-contain w-full h-full" />
            </div>
            <h2 className="text-[42px] text-white">Join Game:</h2>
          </div>

          <span className="text-white text-[22px] text-center">Room ID:</span>

          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            onKeyDown={handleKeyPress}
            className="relative top-0 w-full max-w-[400px] text-white text-[20px] px-6 py-4 rounded-[28px] bg-[rgba(0,0,0,0.3)] border border-black/50 focus:border-[var(--accent)] placeholder-transparent box-border"
          />

          <motion.button
            onClick={handleJoin}
            className="absolute left-1/2 -bottom-20 transform -translate-x-1/2 bg-[var(--accent)] text-white px-14 py-4 rounded-full text-[24px] font-semibold"
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