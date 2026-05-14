"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

const difficulties = ["Easy", "Medium", "Hard"];
const sizes = [20, 30, 40];
const themes = ["Memes", "Celebrities", "History", "Gaming"];

export default function CreateGame() {
  const router = useRouter();
  const [difficultyIndex, setDifficultyIndex] = useState(1);
  const [sizeIndex, setSizeIndex] = useState(1);
  const [themeIndex, setThemeIndex] = useState(1);

  const changeTheme = (direction: "prev" | "next") => {
    setThemeIndex((prev) => {
      if (direction === "prev") return prev === 0 ? themes.length - 1 : prev - 1;
      return prev === themes.length - 1 ? 0 : prev + 1;
    });
  };

  const handleCreate = () => {
    const roomId = `room_${Math.random().toString(36).substr(2, 9)}`;
    if (typeof window !== "undefined") {
      localStorage.setItem("last_room", roomId);
      localStorage.setItem("lobby_difficulty", difficulties[difficultyIndex]);
      localStorage.setItem("lobby_size", String(sizes[sizeIndex]));
      localStorage.setItem("lobby_theme", themes[themeIndex]);
    }
    router.push(`/game?room=${encodeURIComponent(roomId)}`);
  };

  return (
    <section className="flex flex-col items-center px-6 pb-12">
      <div className="relative w-full max-w-[1140px]">
        <div className="rounded-[42px] bg-[var(--panel)] px-8 pt-8 pb-12 shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="relative w-[44px] h-[44px]">
              <Image src="/icons/create.svg" alt="Create Game" fill className="object-contain" />
            </div>
            <h2 className="text-[42px] text-white">Create Game:</h2>
          </div>

          <div className="flex flex-col gap-8 items-center">
            <div className="w-full max-w-[90%] mb-6">
              <label className="text-white text-[22px] mb-2 block">Difficulty:</label>
              <div className="relative h-3 bg-[rgba(0,0,0,0.3)] rounded-full overflow-hidden">
                <motion.div
                  className="absolute top-0 left-0 h-3 bg-white rounded-full"
                  animate={{ width: `${(difficultyIndex / (difficulties.length - 1)) * 100}%` }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                />
              </div>
              <div className="flex justify-between text-white text-[18px] mt-1 px-1">
                {difficulties.map((d, i) => (
                  <motion.span
                    key={d}
                    className={`cursor-pointer ${i === difficultyIndex ? "font-semibold" : "font-normal"}`}
                    onClick={() => setDifficultyIndex(i)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {d}
                  </motion.span>
                ))}
              </div>
            </div>

            <div className="w-full max-w-[90%] mb-6">
              <label className="text-white text-[22px] mb-2 block">Size:</label>
              <div className="relative h-3 bg-[rgba(0,0,0,0.3)] rounded-full overflow-hidden">
                <motion.div
                  className="absolute top-0 left-0 h-3 bg-white rounded-full"
                  animate={{ width: `${(sizeIndex / (sizes.length - 1)) * 100}%` }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                />
              </div>
              <div className="flex justify-between text-white text-[18px] mt-1 px-1">
                {sizes.map((s, i) => (
                  <motion.span
                    key={s}
                    className={`cursor-pointer ${i === sizeIndex ? "font-semibold" : "font-normal"}`}
                    onClick={() => setSizeIndex(i)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {s}
                  </motion.span>
                ))}
              </div>
            </div>

            <div className="relative w-full max-w-[400px] -top-4">
              <label className="text-white text-[22px] mb-2 block">Theme:</label>
              <div className="flex items-center justify-between bg-[rgba(0,0,0,0.3)] rounded-[20px] px-4 py-2 text-white">
                <motion.button
                  type="button"
                  className="text-[20px] font-bold"
                  onClick={() => changeTheme("prev")}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  &lt;
                </motion.button>
                <motion.span
                  key={themes[themeIndex]}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 120, damping: 20 }}
                  className="text-[20px] font-medium"
                >
                  {themes[themeIndex]}
                </motion.span>
                <motion.button
                  type="button"
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

        <motion.button
          type="button"
          onClick={handleCreate}
          className="absolute left-1/2 -bottom-20 transform -translate-x-1/2 bg-[var(--accent)] text-white px-14 py-4 rounded-full text-[24px] font-semibold"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Create
        </motion.button>
      </div>
    </section>
  );
}