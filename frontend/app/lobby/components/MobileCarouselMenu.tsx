"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

export type LobbyTab = "rooms" | "join" | "create" | "ranking" | "random" | "leaders";

const menuItems: { title: string; icon: string; tab: LobbyTab }[] = [
  { title: "Rooms", icon: "/icons/rooms.svg", tab: "rooms" },
  { title: "Join", icon: "/icons/join.svg", tab: "join" },
  { title: "Ranking", icon: "/icons/ranking.svg", tab: "ranking" },
  { title: "Random", icon: "/icons/random.svg", tab: "random" },
  { title: "Leaders", icon: "/icons/leaders.svg", tab: "leaders" },
  { title: "Create", icon: "/icons/create.svg", tab: "create" },
];

interface MobileCarouselMenuProps {
  activeTab: LobbyTab;
  setActiveTab: (tab: LobbyTab) => void;
}

export default function MobileCarouselMenu({ activeTab, setActiveTab }: MobileCarouselMenuProps) {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentIndex = menuItems.findIndex((item) => item.tab === activeTab);

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
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    if (isLeftSwipe) goNext();
    if (isRightSwipe) goPrev();
    setTouchStart(null);
    setTouchEnd(null);
  };

  return (
    <div className="block md:hidden w-full bg-[#0E0128] border-b border-white/5 py-4">
      <div
        ref={containerRef}
        className="relative flex items-center justify-center"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Кнопка влево */}
        <button
          onClick={goPrev}
          className="absolute left-4 z-10 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white text-2xl"
        >
          ‹
        </button>

        {/* Текущая иконка с анимацией */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
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

        {/* Кнопка вправо */}
        <button
          onClick={goNext}
          className="absolute right-4 z-10 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white text-2xl"
        >
          ›
        </button>
      </div>
    </div>
  );
}