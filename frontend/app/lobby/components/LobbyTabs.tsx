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

export default function LobbyTabs({
  initialTab,
}: {
  initialTab: LobbyTab;
}) {
  const [activeTab, setActiveTab] =
    useState<LobbyTab>(initialTab);

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <div className="flex flex-col gap-5">
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

          {/* RANKING */}
          {activeTab === "ranking" && (
            <section className="flex justify-center px-6">
              <div className="relative w-full max-w-[1140px] rounded-[42px] bg-[var(--panel)] px-10 pt-8 pb-10 shadow-[0_12px_30px_rgba(0,0,0,0.18)] overflow-hidden">
                
                {/* HEADER */}
                <div className="flex items-center justify-center gap-4 mb-8">
                  <div className="relative w-[44px] h-[44px]">
                    <Image
                      src="/icons/ranking.svg"
                      alt="Ranked"
                      fill
                      className="object-contain"
                    />
                  </div>

                  <h2 className="text-[42px] text-white">
                    Ranked Arena:
                  </h2>
                </div>

                {/* MAIN CONTENT */}
                <div className="grid grid-cols-[320px_1fr] gap-8">
                  
                  {/* LEFT SIDE */}
                  <div className="rounded-[30px] bg-black/15 border border-white/10 p-6">
                    <p className="text-white/60 text-[16px] mb-4">
                      Your Rank
                    </p>

                    {/* Rank Card */}
                    <div className="rounded-[28px] bg-gradient-to-br from-[#5a3d15] to-[#8f6a2a] p-6 shadow-lg">
                      <p className="text-[34px] text-white font-bold">
                        Bronze II
                      </p>

                      <p className="text-[20px] text-white/90 mt-1">
                        1240 ELO
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3 mt-6">
                      <div className="rounded-[18px] bg-black/15 p-4 text-center">
                        <p className="text-white/50 text-[14px]">
                          Wins
                        </p>

                        <p className="text-white text-[22px] font-bold">
                          42
                        </p>
                      </div>

                      <div className="rounded-[18px] bg-black/15 p-4 text-center">
                        <p className="text-white/50 text-[14px]">
                          Losses
                        </p>

                        <p className="text-white text-[22px] font-bold">
                          18
                        </p>
                      </div>

                      <div className="rounded-[18px] bg-black/15 p-4 text-center">
                        <p className="text-white/50 text-[14px]">
                          WR
                        </p>

                        <p className="text-white text-[22px] font-bold">
                          70%
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT SIDE */}
                  <div className="rounded-[30px] bg-black/15 border border-white/10 p-8 flex flex-col justify-between">
                    
                    <div>
                      <h3 className="text-white text-[34px] font-semibold mb-4">
                        Competitive Ranked Matchmaking
                      </h3>

                      <p className="text-white/70 text-[18px] leading-relaxed max-w-[650px]">
                        Test your skills against players of
                        similar rank. Win games to gain ELO
                        points and climb the leaderboard.
                        Ranked mode uses skill-based
                        matchmaking for fair competition.
                      </p>

                      {/* Features */}
                      <div className="grid grid-cols-2 gap-4 mt-8">
                        <div className="rounded-[22px] bg-black/15 p-5">
                          <p className="text-white text-[18px] font-medium">
                            ⚔ 1v1 Competitive
                          </p>

                          <p className="text-white/50 text-[14px] mt-1">
                            Fair ranked matches
                          </p>
                        </div>

                        <div className="rounded-[22px] bg-black/15 p-5">
                          <p className="text-white text-[18px] font-medium">
                            📈 ELO Progression
                          </p>

                          <p className="text-white/50 text-[14px] mt-1">
                            Gain or lose rating
                          </p>
                        </div>

                        <div className="rounded-[22px] bg-black/15 p-5">
                          <p className="text-white text-[18px] font-medium">
                            🎯 Skill Matching
                          </p>

                          <p className="text-white/50 text-[14px] mt-1">
                            Similar ELO opponents
                          </p>
                        </div>

                        <div className="rounded-[22px] bg-black/15 p-5">
                          <p className="text-white text-[18px] font-medium">
                            ⏱ Queue Time
                          </p>

                          <p className="text-white/50 text-[14px] mt-1">
                            ~15 sec average
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* BUTTON */}
                    <div className="flex justify-center mt-8">
                      <RankedButton
                        className="
                          bg-[#00AFFF]
                          hover:bg-[#0bb8ff]
                          text-white
                          text-[24px]
                          font-semibold
                          px-14
                          py-4
                          rounded-full
                          shadow-[0_8px_30px_rgba(0,175,255,0.35)]
                          transition-all
                        "
                      >
                        Find Match
                      </RankedButton>
                    </div>
                  </div>
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