"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import RoomCard from "./RoomCard";
import { getOrCreateDeviceId } from "../../lib/device";

interface Room {
  id: string;
  players: number;
  maxPlayers: number;
  category: string;
  owner: string;
  avatar?: string;
  isPremium?: boolean;
}

export default function PartyFinder() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [myLobbyIds, setMyLobbyIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    try {
      const raw = localStorage.getItem("my_lobby_ids");
      const parsed = raw ? (JSON.parse(raw) as string[]) : [];
      const ids = Array.isArray(parsed) ? parsed : [];
      setMyLobbyIds(new Set(ids.map(String)));
    } catch {
      setMyLobbyIds(new Set());
    }

    (async () => {
      try {
        const res = await fetch("/api/lobbies", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) {
          setRooms(data);
        }
      } catch (err) {
        console.error("Failed to load lobbies", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleDelete = async (id: string) => {
    const deviceId = getOrCreateDeviceId();
    try {
      const res = await fetch(`/api/lobbies/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || `HTTP ${res.status}`);
      }

      setRooms((prev) => prev.filter((r) => r.id !== id));
      setMyLobbyIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        localStorage.setItem("my_lobby_ids", JSON.stringify(Array.from(next)));
        return next;
      });
    } catch (err) {
      console.error("Failed to delete lobby", err);
    }
  };

  return (
    <section className="flex justify-center px-6">
      <div className="relative w-full max-w-[1140px] h-[520px] rounded-[42px] bg-[var(--panel)] px-10 pt-8 pb-8 shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
        <div className="flex items-center justify-center gap-4 mb-5">
          <div className="relative w-[44px] h-[44px]">
            <Image src="/icons/rooms.svg" alt="Party Finder" fill className="object-contain" />
          </div>
          <h2 className="text-[42px] text-white">Party Finder:</h2>
        </div>

        <div className="h-[430px] overflow-y-auto overflow-x-hidden custom-scrollbar flex flex-col gap-5 pl-3 pr-2">
          {rooms.map((room) => (
            <RoomCard
              key={room.id}
              {...room}
              avatar={room.avatar || "/avatars/frog.svg"}
              canDelete={myLobbyIds.has(room.id)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </div>
    </section>
  );
}