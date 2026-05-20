"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/auth_context";
import { useLanguage } from "../../contexts/LanguageContext";
import { getOrCreateDeviceId } from "../../lib/device";
import { motion } from "framer-motion";

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
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const getRandomItem = <T,>(arr: T[]): T => {
    return arr[Math.floor(Math.random() * arr.length)];
  };

  const fetchAvailableRooms = async (): Promise<Room[]> => {
    try {
      const res = await fetch("/api/lobbies", { cache: "no-store" });
      if (!res.ok) return [];
      const data = await res.json();
      if (Array.isArray(data)) {
        return data.filter((room: Room) => room.players < room.maxPlayers);
      }
      return [];
    } catch (err) {
      console.error("Failed to load lobbies", err);
      return [];
    }
  };

  const createRandomRoom = async () => {
    const owner = user?.username || "Guest";
    const deviceId = getOrCreateDeviceId();

    const randomDifficulty = getRandomItem(difficulties);
    const randomSize = getRandomItem(sizes);
    const randomTheme = getRandomItem(themes);
    const randomPlayers = Math.floor(Math.random() * 10) + 2;

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
      } catch {}
      localStorage.setItem("last_room", baseId);
      localStorage.setItem("room_max_players", String(randomPlayers));
      localStorage.setItem("lobby_difficulty", randomDifficulty);
      localStorage.setItem("lobby_size", String(randomSize));
      localStorage.setItem("lobby_theme", randomTheme);
    }

    router.push(`/game?room=${encodeURIComponent(roomId)}`);
  };

  const joinRandomRoom = async () => {
    setIsLoading(true);
    try {
      const rooms = await fetchAvailableRooms();
      if (rooms.length > 0) {
        const randomRoom = getRandomItem(rooms);
        const roomId = `${randomRoom.id}{${randomRoom.maxPlayers}}`;
        if (typeof window !== "undefined") {
          localStorage.setItem("last_room", randomRoom.id);
          localStorage.setItem("room_max_players", String(randomRoom.maxPlayers));
          if (randomRoom.difficulty) localStorage.setItem("lobby_difficulty", randomRoom.difficulty);
          if (randomRoom.size) localStorage.setItem("lobby_size", String(randomRoom.size));
          if (randomRoom.category) localStorage.setItem("lobby_theme", randomRoom.category);
        }
        router.push(`/game?room=${encodeURIComponent(roomId)}`);
      } else {
        await createRandomRoom();
      }
    } catch (err) {
      console.error("Error in random join:", err);
      await createRandomRoom();
    } finally {
      setIsLoading(false);
    }
  };

  // Автоматический запуск на десктопе
  useEffect(() => {
    if (isMobile === false) {
      joinRandomRoom();
    }
  }, [isMobile]);

  if (isMobile === null) {
    return (
      <div className="flex justify-center items-center h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  // Мобильная версия: кнопка
  if (isMobile) {
    return (
      <section className="flex flex-col items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-[var(--panel)] rounded-[32px] p-8 text-center shadow-xl">
          <div className="w-20 h-20 mx-auto mb-6 relative">
            <img src="/icons/random.svg" alt="Random" className="w-full h-full opacity-80" />
          </div>
          <h2 className="text-3xl text-white font-bold mb-4">Random Match</h2>
          <p className="text-white/70 mb-8">
            Find a random opponent or join an available game. Parameters will be chosen automatically.
          </p>
          <motion.button
            onClick={joinRandomRoom}
            disabled={isLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-[#00AFFF] text-white text-xl font-semibold py-4 rounded-full disabled:opacity-50"
          >
            {isLoading ? "Searching..." : "Random Match"}
          </motion.button>
        </div>
      </section>
    );
  }

  // Десктоп: моментальный редирект (отображаем лоадер)
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00AFFF] mx-auto mb-4"></div>
        <p className="text-white/80">Finding a random game for you...</p>
      </div>
    </div>
  );
}