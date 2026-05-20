"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

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
    setTouchEnd(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) {
      setTouchStart(null);
      setTouchEnd(null);
      return;
    }
    
    const distance = touchStart - touchEnd;
    const minSwipeDistance = 30;
    
    if (Math.abs(distance) > minSwipeDistance) {
      if (distance > 0) {
        // Swiped left - go next
        goNext();
      } else {
        // Swiped right - go prev
        goPrev();
      }
    }
    
    setTouchStart(null);
    setTouchEnd(null);
  };

  // Determine animation direction based on tab index change
  const getAnimationDirection = () => {
    // This will be calculated during the animation
    return "right";
  };

  const variants = {
    enter: (direction: string) => ({
      x: direction === "right" ? 100 : -100,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: string) => ({
      x: direction === "right" ? -100 : 100,
      opacity: 0
    })
  };

  // Store the direction for the current swipe
  const [animationDirection, setAnimationDirection] = useState<"left" | "right">("right");

  // Update direction when tab changes
  const handleTabChange = (newTab: LobbyTab) => {
    const newIndex = menuItems.findIndex((item) => item.tab === newTab);
    const direction = newIndex > currentIndex ? "right" : "left";
    setAnimationDirection(direction);
    setActiveTab(newTab);
  };

  const handlePrev = () => {
    const newIndex = currentIndex === 0 ? menuItems.length - 1 : currentIndex - 1;
    setAnimationDirection("left");
    setActiveTab(menuItems[newIndex].tab);
  };

  const handleNext = () => {
    const newIndex = currentIndex === menuItems.length - 1 ? 0 : currentIndex + 1;
    setAnimationDirection("right");
    setActiveTab(menuItems[newIndex].tab);
  };

  const handleTouchEndFixed = () => {
    if (!touchStart || !touchEnd) {
      setTouchStart(null);
      setTouchEnd(null);
      return;
    }
    
    const distance = touchStart - touchEnd;
    const minSwipeDistance = 30;
    
    if (Math.abs(distance) > minSwipeDistance) {
      if (distance > 0) {
        // Swiped left - go next
        handleNext();
      } else {
        // Swiped right - go prev
        handlePrev();
      }
    }
    
    setTouchStart(null);
    setTouchEnd(null);
  };

  return (
    <>
      {/* ----- МОБИЛЬНАЯ КАРУСЕЛЬ (только на экранах < 768px) ----- */}
      <div className="block md:hidden w-full bg-transparent py-4">
        <div
          className="relative flex items-center justify-center min-h-[120px]"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEndFixed}
        >
          <button
            onClick={handlePrev}
            className="absolute left-4 z-20 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-2xl transition-all active:scale-95"
            aria-label="Previous"
          >
            ‹
          </button>

          <div className="relative w-[200px] flex justify-center">
            <AnimatePresence mode="wait" custom={animationDirection}>
              <motion.div
                key={activeTab}
                custom={animationDirection}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  type: "tween",
                  duration: 0.25,
                  ease: [0.25, 0.1, 0.25, 1]
                }}
                className="flex flex-col items-center"
              >
                <div className="relative w-[72px] h-[72px]">
                  <Image
                    src={menuItems[currentIndex].icon}
                    alt={menuItems[currentIndex].title}
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
                <span className="text-white text-[18px] font-semibold mt-2">
                  {menuItems[currentIndex].title}
                </span>
              </motion.div>
            </AnimatePresence>
          </div>

          <button
            onClick={handleNext}
            className="absolute right-4 z-20 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-2xl transition-all active:scale-95"
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
                onClick={() => handleTabChange(item.tab)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03, duration: 0.2, ease: "easeOut" }}
                whileHover={{ scale: isActive ? 1.05 : 1.08, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className={`flex flex-col items-center transition-all duration-75 ${
                  isActive ? "text-white" : "text-white/75 hover:text-white"
                }`}
              >
                <motion.div
                  animate={{ y: isActive ? -4 : 0, scale: isActive ? 1.1 : 1 }}
                  transition={{ type: "tween", duration: 0.12, ease: "easeOut" }}
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