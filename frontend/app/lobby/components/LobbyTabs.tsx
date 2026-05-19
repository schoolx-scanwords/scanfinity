"use client";

import { useState } from "react";
import Image from "next/image";
import Navbar from "./Navbar";
import TopMenu, { type LobbyTab } from "./TopMenu";
import PartyFinder from "./PartyFinder";
import CreateGame from "./CreateGame";
import JoinGame from "./JoinGame";
import RandomGame from "./RandomGame";
import RankedButton from "./RankedButton";
import { LAYOUT_STYLES } from '@/app/styles/theme';

export default function LobbyTabs({
  initialTab,
}: {
  initialTab: LobbyTab;
}) {
  const [activeTab, setActiveTab] =
    useState<LobbyTab>(initialTab);

  return (
    <main className={`min-h-screen ${LAYOUT_STYLES.container}`}>
      {/* Add padding-top to account for fixed navbar */}
      <div className="pt-[72px] md:pt-[88px] flex flex-col gap-5">
        <Navbar />
        <TopMenu
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        <div className="flex flex-col gap-10">
          {activeTab === "rooms" && <PartyFinder />}
          {activeTab === "join" && <JoinGame />}
          {activeTab === "create" && <CreateGame />}
          {activeTab === "random" && <RandomGame />}

          {/* RANKING — упрощённая версия: только ранг, статистика и кнопка */}
          {activeTab === "ranking" && (
            <section className="flex justify-center px-4 md:px-6">
              <div className="relative w-full max-w-[1140px] rounded-[32px] md:rounded-[42px] bg-[var(--panel)] px-5 md:px-10 pt-6 md:pt-8 pb-8 md:pb-10 shadow-[0_12px_30px_rgba(0,0,0,0.18)] overflow-hidden">
                
                {/* HEADER */}
                <div className="flex items-center justify-center gap-3 md:gap-4 mb-6 md:mb-8">
                  <div className="relative w-[36px] md:w-[44px] h-[36px] md:h-[44px]">
                    <Image src="/icons/ranking.svg" alt="Ranked" fill className="object-contain" />
                  </div>
                  <h2 className="text-[32px] md:text-[42px] text-white">Ranked Arena:</h2>
                </div>

                {/* ТОЛЬКО ЛЕВАЯ ПАНЕЛЬ + КНОПКА ПО ЦЕНТРУ */}
                <div className="flex flex-col items-center gap-6 md:gap-8">
                  {/* LEFT SIDE (статистика) */}
                  <div className="w-full max-w-[400px] rounded-[30px] bg-black/15 border border-white/10 p-5 md:p-6">
                    <p className="text-white/60 text-[14px] md:text-[16px] mb-3 md:mb-4">Your Rank</p>
                    <div className="rounded-[28px] bg-gradient-to-br from-[#5a3d15] to-[#8f6a2a] p-5 md:p-6 shadow-lg">
                      <p className="text-[28px] md:text-[34px] text-white font-bold">Bronze II</p>
                      <p className="text-[18px] md:text-[20px] text-white/90 mt-1">1240 ELO</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 md:gap-3 mt-5 md:mt-6">
                      <div className="rounded-[18px] bg-black/15 p-3 md:p-4 text-center">
                        <p className="text-white/50 text-[12px] md:text-[14px]">Wins</p>
                        <p className="text-white text-[18px] md:text-[22px] font-bold">42</p>
                      </div>
                      <div className="rounded-[18px] bg-black/15 p-3 md:p-4 text-center">
                        <p className="text-white/50 text-[12px] md:text-[14px]">Losses</p>
                        <p className="text-white text-[18px] md:text-[22px] font-bold">18</p>
                      </div>
                      <div className="rounded-[18px] bg-black/15 p-3 md:p-4 text-center">
                        <p className="text-white/50 text-[12px] md:text-[14px]">WR</p>
                        <p className="text-white text-[18px] md:text-[22px] font-bold">70%</p>
                      </div>
                    </div>
                  </div>

                  {/* КНОПКА ПОИСКА МАТЧА */}
                  <RankedButton className="bg-[#00AFFF] hover:bg-[#0bb8ff] text-white text-[20px] md:text-[24px] font-semibold px-10 md:px-14 py-3 md:py-4 rounded-full shadow-[0_8px_30px_rgba(0,175,255,0.35)] transition-all whitespace-nowrap">
                    Find Match
                  </RankedButton>
                </div>
              </div>
            </section>
          )}

          {activeTab === "leaders" && (
            <div className="text-white text-[24px] flex justify-center items-center h-[400px]">
              Leaders (в разработке)
            </div>
          )}
        </div>
      </div>
    </main>
  );
}