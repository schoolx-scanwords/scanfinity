"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/auth_context";
import { useLanguage } from "../../contexts/LanguageContext";
import { getOrCreateDeviceId } from "../../lib/device";

const difficulties = ["Easy", "Medium", "Hard"];
const sizes = [20, 30, 40];
const themes = ["Memes", "Celebrities", "History", "Gaming"];

export default function CreateGame() {
  const router = useRouter();
  const { user } = useAuth();
  const { language } = useLanguage();
  const [difficultyIndex, setDifficultyIndex] = useState(1);
  const [sizeIndex, setSizeIndex] = useState(1);
  const [players, setPlayers] = useState(4);
  const [themeIndex, setThemeIndex] = useState(1);

  const changeTheme = (direction: "prev" | "next") => {
    setThemeIndex((prev) => {
      if (direction === "prev") {
        return prev === 0 ? themes.length - 1 : prev - 1;
      }

      return prev === themes.length - 1 ? 0 : prev + 1;
    });
  };

  const handleCreate = async () => {
    const owner = user?.username || "Guest";
    const deviceId = getOrCreateDeviceId();

    try {
      const res = await fetch("/api/lobbies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maxPlayers: players,
          category: themes[themeIndex],
          difficulty: difficulties[difficultyIndex],
          size: String(sizes[sizeIndex]),
          lang: language,
          owner,
          deviceId,
          isPrivate: false,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || `HTTP ${res.status}`);
      }

      const lobby = await res.json();
      const baseId = String(lobby.id);
      const roomId = `${baseId}{${players}}`;

      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem("my_lobby_ids");
          const parsed = raw ? (JSON.parse(raw) as string[]) : [];
          const next = Array.isArray(parsed) ? parsed : [];
          if (!next.includes(baseId)) next.push(baseId);
          localStorage.setItem("my_lobby_ids", JSON.stringify(next));
        } catch {
          // ignore
        }

        localStorage.setItem("last_room", baseId);
        localStorage.setItem("room_max_players", String(players));
        localStorage.setItem("lobby_difficulty", difficulties[difficultyIndex]);
        localStorage.setItem("lobby_size", String(sizes[sizeIndex]));
        localStorage.setItem("lobby_theme", themes[themeIndex]);
      }

      router.push(`/game?room=${encodeURIComponent(roomId)}`);
    } catch (err) {
      console.error("Failed to create lobby", err);
    }
  };

  return (
    <section className="flex flex-col items-center px-6 pb-12">
      <div className="relative w-full max-w-[1140px]">
        {/* SETTINGS PANEL */}
        <div className="rounded-[42px] bg-[var(--panel)] px-8 pt-8 pb-16 shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
          {/* HEADER */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="relative w-[44px] h-[44px]">
              <Image
                src="/icons/create.svg"
                alt="Create Game"
                fill
                className="object-contain"
              />
            </div>

            <h2 className="text-[42px] text-white">
              Create Game:
            </h2>
          </div>

          {/* SETTINGS */}
          <div className="flex flex-col gap-8 items-center">
            {/* Difficulty */}
            <div className="w-full max-w-[90%]">
              <label className="text-white text-[22px] mb-2 block">
                Difficulty:
              </label>

              <div className="relative h-3 bg-[rgba(0,0,0,0.3)] rounded-full overflow-hidden">
                <motion.div
                  className="absolute top-0 left-0 h-3 bg-white rounded-full"
                  animate={{
                    width: `${(difficultyIndex / (difficulties.length - 1)) * 100}%`,
                  }}
                  transition={{
                    duration: 0.3,
                    ease: "easeInOut",
                  }}
                />
              </div>

              <div className="flex justify-between text-white text-[18px] mt-1 px-1">
                {difficulties.map((difficulty, index) => (
                  <motion.span
                    key={index}
                    className={`cursor-pointer ${index === difficultyIndex ? "font-semibold" : "font-normal"}`}
                    onClick={() => setDifficultyIndex(index)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {difficulty}
                  </motion.span>
                ))}
              </div>
            </div>

            {/* Size */}
            <div className="w-full max-w-[90%]">
              <label className="text-white text-[22px] mb-2 block">
                Size:
              </label>

              <div className="relative h-3 bg-[rgba(0,0,0,0.3)] rounded-full overflow-hidden">
                <motion.div
                  className="absolute top-0 left-0 h-3 bg-white rounded-full"
                  animate={{
                    width: `${(sizeIndex / (sizes.length - 1)) * 100}%`,
                  }}
                  transition={{
                    duration: 0.3,
                    ease: "easeInOut",
                  }}
                />
              </div>

              <div className="flex justify-between text-white text-[18px] mt-1 px-1">
                {sizes.map((size, index) => (
                  <motion.span
                    key={index}
                    className={`cursor-pointer ${index === sizeIndex ? "font-semibold" : "font-normal"}`}
                    onClick={() => setSizeIndex(index)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {size}
                  </motion.span>
                ))}
              </div>
            </div>

            {/* Players - Slider */}
            <div className="w-full max-w-[90%]">
              <div className="flex justify-between items-baseline mb-2">
                <label className="text-white text-[22px]">
                  Players:
                </label>
                <span className="text-white text-[28px] font-bold">
                  {players}
                </span>
              </div>

              {/* Slider track background */}
              <div className="relative pt-2">
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={players}
                  onChange={(e) => setPlayers(parseInt(e.target.value))}
                  className="w-full h-2 bg-[rgba(0,0,0,0.3)] rounded-lg appearance-none cursor-pointer accent-[#00AFFF]"
                />
                
                {/* Tick marks */}
                <div className="flex justify-between text-white text-[14px] mt-2 px-1 opacity-70">
                  <span>1</span>
                  <span>5</span>
                  <span>10</span>
                  <span>15</span>
                  <span>20</span>
                </div>
              </div>
            </div>

            {/* Theme */}
            <div className="relative w-full max-w-[400px]">
              <label className="text-white text-[22px] mb-2 block">
                Theme:
              </label>

              <div className="flex items-center justify-between bg-[rgba(0,0,0,0.3)] rounded-[20px] px-4 py-2 text-white">
                <motion.button
                  className="text-[20px] font-bold"
                  onClick={() => changeTheme("prev")}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  &lt;
                </motion.button>

                <motion.span
                  key={themes[themeIndex]}
                  initial={{
                    opacity: 0,
                    y: -5,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 120,
                    damping: 20,
                  }}
                  className="text-[20px] font-medium"
                >
                  {themes[themeIndex]}
                </motion.span>

                <motion.button
                  className="text-[20px] font-bold"
                  onClick={() => changeTheme("next")}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  &gt;
                </motion.button>
              </div>
            </div>
          </div>
        </div>

        {/* CREATE BUTTON */}
        <motion.button
          className="
            absolute
            left-1/2
            -bottom-20
            -translate-x-1/2
            bg-[#00AFFF]
            text-white
            px-14
            py-4
            rounded-full
            text-[24px]
            font-semibold
            hover:bg-[#0099dd]
            transition-colors
          "
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleCreate}
        >
          Create
        </motion.button>
      </div>
    </section>
  );
}