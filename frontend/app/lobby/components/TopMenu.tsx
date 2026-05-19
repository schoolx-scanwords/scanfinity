"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef } from "react";

export type LobbyTab = "rooms" | "join" | "create" | "ranking" | "random" | "leaders";

const menuItems: { title: string; icon: string; tab: LobbyTab }[] = [
  { title: "Rooms", icon: "/icons/rooms.svg", tab: "rooms" },
  { title: "Join", icon: "/icons/join.svg", tab: "join" },
  { title: "Ranking", icon: "/icons/ranking.svg", tab: "ranking" },
  { title: "Random", icon: "/icons/random.svg", tab: "random" },
  { title: "Leaders", icon: "/icons/leaders.svg", tab: "leaders" },
  { title: "Create", icon: "/icons/create.svg", tab: "create" },
];

type TopMenuProps = {
  activeTab: LobbyTab;
  setActiveTab: (tab: LobbyTab) => void;
};

export default function TopMenu({ activeTab, setActiveTab }: TopMenuProps) {
  const currentIndex = menuItems.findIndex((item) => item.tab === activeTab);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const goPrev = () => {
    const newIndex = currentIndex === 0 ? menuItems.length - 1 : currentIndex - 1;
    setActiveTab(menuItems[newIndex].tab);
  };

  const goNext = () => {
    const newIndex = currentIndex === menuItems.length - 1 ? 0 : currentIndex + 1;
    setActiveTab(menuItems[newIndex].tab);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > 50) goNext();
    if (distance < -50) goPrev();
    setTouchStart(null);
    setTouchEnd(null);
  };

  return (
    <>
      {/* ----- МОБИЛЬНАЯ КАРУСЕЛЬ (только на экранах < 768px) ----- */}
      <div className="block md:hidden w-full bg-[#0E0128] border-b border-white/5 py-4">
        <div
          className="relative flex items-center justify-center"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Левая стрелка */}
          <button
            onClick={goPrev}
            className="absolute left-4 z-10 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white text-2xl"
            aria-label="Previous"
          >
            ‹
          </button>

          {/* Текущий пункт с анимацией */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center"
            >
              <div className="relative w-[72px] h-[72px]">
                <Image
                  src={menuItems[currentIndex].icon}
                  alt={menuItems[currentIndex].title}
                  fill
                  className="object-contain"
                />
              </div>
              <span className="text-white text-[18px] font-semibold mt-2">
                {menuItems[currentIndex].title}
              </span>
            </motion.div>
          </AnimatePresence>

          {/* Правая стрелка */}
          <button
            onClick={goNext}
            className="absolute right-4 z-10 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white text-2xl"
            aria-label="Next"
          >
            ›
          </button>
        </div>
      </div>

      {/* ----- ДЕСКТОПНОЕ МЕНЮ (только на экранах >= 768px) ----- */}
      <section className="hidden md:flex justify-center px-6">
        <div className="w-full max-w-[980px] flex justify-between items-center">
          {menuItems.map((item, index) => {
            const isActive = activeTab === item.tab;

            return (
              <motion.button
                key={item.tab}
                onClick={() => setActiveTab(item.tab)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.4, ease: "easeOut" }}
                whileHover={{ scale: isActive ? 1.18 : 1.12, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className={`flex flex-col items-center transition-all duration-150 ${
                  isActive ? "text-white" : "text-white/75 hover:text-white"
                }`}
              >
                <motion.div
                  animate={{ y: isActive ? -6 : 0, scale: isActive ? 1.15 : 1 }}
                  transition={{ type: "tween", duration: 0.2, ease: "easeOut" }}
                  className="relative w-[52px] h-[52px]"
                >
                  <Image src={item.icon} alt={item.title} fill className="object-contain" />
                </motion.div>
                <span className="text-[16px] mt-2 whitespace-nowrap">{item.title}</span>
              </motion.button>
            );
          })}
        </div>
      </section>
    </>
  );
}