"use client";

import { useState } from "react";
import Navbar from "./Navbar";
import TopMenu, { type LobbyTab } from "./TopMenu";
import PartyFinder from "./PartyFinder";
import CreateGame from "./CreateGame";
import JoinGame from "./JoinGame";
import RandomGame from "./RandomGame";
import RankedButton from "./RankedButton";

export default function LobbyTabs({ initialTab }: { initialTab: LobbyTab }) {
  const [activeTab, setActiveTab] = useState<LobbyTab>(initialTab);

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <div className="flex flex-col gap-5">
        <Navbar />
        <TopMenu activeTab={activeTab} setActiveTab={setActiveTab} />

        <div className="flex flex-col gap-10">
          {activeTab === "rooms" && <PartyFinder />}
          {activeTab === "join" && <JoinGame />}
          {activeTab === "create" && <CreateGame />}
          {activeTab === "ranking" && (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-8">
              <div className="text-center">
                <h2 className="text-white text-[32px] font-bold mb-4">
                  Competitive Ranked Mode
                </h2>
                <p className="text-white/70 text-[18px] mb-8 max-w-[600px]">
                  Test your skills against players of similar rank.
                  Win to gain ELO points and climb the leaderboards!
                </p>
                
                {/* Ranked Button */}
                <RankedButton />
                
                <div className="mt-8 text-white/40 text-sm">
                  <p>🏆 Ranked matches are 1v1 only</p>
                  <p>📊 Your ELO rating will change based on results</p>
                  <p>🎯 Find opponents with similar skill level</p>
                  <p>⭐ Guests cannot play ranked matches</p>
                </div>
              </div>
            </div>
          )}
          {activeTab === "random" && <RandomGame />}
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