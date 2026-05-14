"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export type LobbyTab = "rooms" | "join" | "create" | "ranking" | "random" | "leaders";

type TopMenuProps = {
  activeTab: LobbyTab;
  setActiveTab: (tab: LobbyTab) => void;
};

const menuItems: { title: string; icon: string; tab: LobbyTab }[] = [
  { title: "Rooms", icon: "/icons/rooms.svg", tab: "rooms" },
  { title: "Join", icon: "/icons/join.svg", tab: "join" },
  { title: "Ranking", icon: "/icons/ranking.svg", tab: "ranking" },
  { title: "Random", icon: "/icons/random.svg", tab: "random" },
  { title: "Leaders", icon: "/icons/leaders.svg", tab: "leaders" },
  { title: "Create", icon: "/icons/create.svg", tab: "create" },
];

export default function TopMenu({ activeTab, setActiveTab }: TopMenuProps) {
  return (
    <section className="flex justify-center px-6">
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
  );
}