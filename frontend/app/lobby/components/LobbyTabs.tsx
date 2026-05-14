"use client";

import { useState } from "react";
import Navbar from "./Navbar";
import TopMenu, { type LobbyTab } from "./TopMenu";
import PartyFinder from "./PartyFinder";
import CreateGame from "./CreateGame";
import JoinGame from "./JoinGame";

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
            <div className="text-white text-[24px] flex justify-center items-center h-[400px]">
              Ranking (в разработке)
            </div>
          )}
          {activeTab === "random" && (
            <div className="text-white text-[24px] flex justify-center items-center h-[400px]">
              Random (в разработке)
            </div>
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