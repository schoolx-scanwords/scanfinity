"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ChevronRight, Star, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface RoomCardProps {
  id: string;
  players: number;
  maxPlayers: number;
  category: string;
  owner: string;
  avatar?: string;
  isPremium?: boolean;
  canDelete?: boolean;
  onDelete?: (id: string) => void;
}

export default function RoomCard({
  id,
  players,
  maxPlayers,
  category,
  owner,
  avatar,
  isPremium,
  canDelete = false,
  onDelete,
}: RoomCardProps) {
  const router = useRouter();
  const isFull = players >= maxPlayers;
  const safeAvatar = avatar && avatar.trim() !== "" ? avatar : "/avatars/frog.svg";

  const handleOpen = () => {
    const combinedRoomId = `${id}{${maxPlayers}}`;
    if (typeof window !== "undefined") {
      localStorage.setItem("last_room", id);
      localStorage.setItem("room_max_players", String(maxPlayers));
    }
    router.push(`/game?room=${encodeURIComponent(combinedRoomId)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleOpen();
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(id);
  };

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={handleKeyDown}
      whileHover={{ scale: 1.012, y: -2 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.18 }}
      className="relative w-full min-h-[102px] rounded-[28px] overflow-hidden flex items-center px-10 text-white shadow-[0_8px_20px_rgba(0,0,0,0.14)]"
    >
      <div className="absolute inset-0 -z-10 rounded-[28px] overflow-hidden">
        <Image src="/icons/roomcards.svg" alt="Room Background" fill className="object-cover" />
      </div>

      <div className="w-[190px] shrink-0">
        <span className="text-[28px] font-medium ml-4 block">№{id}</span>
      </div>

      <div className="w-px h-[54px] bg-white/15 shrink-0 mr-8" />

      <div className="flex items-center gap-3 w-[140px] shrink-0">
        <div className="relative w-[22px] h-[22px]">
          <Image src="/icons/people.svg" alt="Players" fill className="object-contain" />
        </div>
        <span className={`text-[24px] font-medium ${isFull ? "text-red-300" : "text-white"}`}>
          {players}/{maxPlayers}
        </span>
      </div>

      <div className="flex-1 text-left text-[26px] font-medium">{category}</div>

      <div className="flex items-center w-[340px] shrink-0">
        <div className="flex items-center gap-4 overflow-hidden">
          <div className="relative w-[58px] h-[58px] rounded-full overflow-hidden shrink-0">
            <Image src={safeAvatar} alt={owner} fill className="object-cover" />
          </div>
          <span className="text-[24px] truncate" title={owner}>
            {owner}
          </span>
          {isPremium ? (
            <Star size={18} fill="#FFD93B" color="#FFD93B" className="shrink-0" />
          ) : null}
        </div>
      </div>

      {canDelete ? (
        <button
          type="button"
          onClick={handleDeleteClick}
          className="absolute top-3 right-3 p-2 rounded-full bg-black/25 hover:bg-black/35"
          aria-label="Delete lobby"
        >
          <Trash2 size={18} className="text-white/90" />
        </button>
      ) : null}

      <ChevronRight size={40} className="text-white/70 shrink-0 ml-auto" />
    </motion.div>
  );
}