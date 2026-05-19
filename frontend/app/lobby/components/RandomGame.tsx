"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/auth_context";
import { useLanguage } from "../../contexts/LanguageContext";
import { getOrCreateDeviceId } from "../../lib/device";
import { getGuestDisplayName } from "../../lib/guest";

const difficulties = ["Easy", "Medium", "Hard"];
const sizes = [20, 30, 40];
const themes = ["Memes", "Celebrities", "History", "Gaming"];

interface Room {
  id: string;
  players: number;
  maxPlayers: number;
  category: string;
  owner: string;
  difficulty?: string;
  size?: number;
}

export default function RandomGame() {
  const router = useRouter();
  const { user } = useAuth();
  const { language } = useLanguage();

  const getRandomItem = <T,>(arr: T[]): T => {
    return arr[Math.floor(Math.random() * arr.length)];
  };

  const fetchAvailableRooms = async (): Promise<Room[]> => {
    try {
      const res = await fetch("/api/lobbies", { cache: "no-store" });
      if (!res.ok) return [];
      const data = await res.json();
      if (Array.isArray(data)) {
        // Filter rooms that are not full
        return data.filter((room: Room) => room.players < room.maxPlayers);
      }
      return [];
    } catch (err) {
      console.error("Failed to load lobbies", err);
      return [];
    }
  };

  const createRandomRoom = async () => {
    try {
      const owner = user?.username || getGuestDisplayName() || "Guest";
      const deviceId = getOrCreateDeviceId();
      
      // Generate random parameters
      const randomDifficulty = getRandomItem(difficulties);
      const randomSize = getRandomItem(sizes);
      const randomTheme = getRandomItem(themes);
      const randomPlayers = Math.floor(Math.random() * 10) + 2; // 2 to 11 players
      
      const res = await fetch("/api/lobbies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maxPlayers: randomPlayers,
          category: randomTheme,
          difficulty: randomDifficulty,
          size: String(randomSize),
          lang: language,
          owner,
          deviceId,
          isPrivate: false,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || `HTTP ${res.status}`);
      }

      const lobby = await res.json();
      const baseId = String(lobby.id);
      const roomId = `${baseId}{${randomPlayers}}`;

      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem("my_lobby_ids");
          const parsed = raw ? (JSON.parse(raw) as string[]) : [];
          const next = Array.isArray(parsed) ? parsed : [];
          if (!next.includes(baseId)) next.push(baseId);
          localStorage.setItem("my_lobby_ids", JSON.stringify(next));
        } catch {
          // ignore
        }

        localStorage.setItem("last_room", baseId);
        localStorage.setItem("room_max_players", String(randomPlayers));
        localStorage.setItem("lobby_difficulty", randomDifficulty);
        localStorage.setItem("lobby_size", String(randomSize));
        localStorage.setItem("lobby_theme", randomTheme);
      }

      router.push(`/game?room=${encodeURIComponent(roomId)}`);
    } catch (err) {
      console.error("Failed to create random lobby", err);
    }
  };

  const joinRandomRoom = async () => {
    try {
      // Fetch available rooms
      const rooms = await fetchAvailableRooms();
      
      if (rooms.length > 0) {
        // Join a random existing room
        const randomRoom = getRandomItem(rooms);
        const roomId = `${randomRoom.id}{${randomRoom.maxPlayers}}`;
        
        // Store room info in localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem("last_room", randomRoom.id);
          localStorage.setItem("room_max_players", String(randomRoom.maxPlayers));
          if (randomRoom.difficulty) localStorage.setItem("lobby_difficulty", randomRoom.difficulty);
          if (randomRoom.size) localStorage.setItem("lobby_size", String(randomRoom.size));
          if (randomRoom.category) localStorage.setItem("lobby_theme", randomRoom.category);
        }
        
        router.push(`/game?room=${encodeURIComponent(roomId)}`);
      } else {
        // No available rooms, create a new one with random parameters
        await createRandomRoom();
      }
    } catch (err) {
      console.error("Error in random join:", err);
      // Fallback to creating a random room
      await createRandomRoom();
    }
  };

  useEffect(() => {
    joinRandomRoom();
  }, []);

  // Return loading indicator while redirecting
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00AFFF] mx-auto mb-4"></div>
        <p className="text-white/80">Finding a random game for you...</p>
      </div>
    </div>
  );
}