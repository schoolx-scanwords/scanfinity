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
      whileHover={{ scale: 1.005 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.18 }}
      className="
        relative
        w-full
        rounded-[22px]
        bg-white/5
        backdrop-blur-sm
        border
        border-white/5
        px-3 md:px-8
        py-2 md:py-4
        text-white
        flex
        items-center
        gap-2 md:gap-4
        shadow-[0_8px_20px_rgba(0,0,0,0.08)]
        hover:bg-white/[0.07]
        transition-all
        duration-200
      "
    >
      {/* ROOM ID */}
      <div className="shrink-0 min-w-[60px] md:min-w-[130px]">
        <span className="text-[16px] md:text-[22px] font-medium">№{id}</span>
      </div>

      {/* PLAYERS */}
      <div className="flex items-center gap-1 md:gap-2 shrink-0">
        <div className="relative w-[14px] md:w-[18px] h-[14px] md:h-[18px]">
          <Image
            src="/icons/people.svg"
            alt="Players"
            fill
            className="object-contain opacity-80"
          />
        </div>
        <span
          className={`text-[14px] md:text-[20px] font-medium ${
            isFull ? "text-red-300" : "text-white"
          }`}
        >
          {players}/{maxPlayers}
        </span>
      </div>

      {/* CATEGORY */}
      <div className="flex-1 text-[14px] md:text-[22px] font-medium truncate min-w-0">
        {category}
      </div>

      {/* OWNER */}
      <div className="flex items-center gap-1 md:gap-3 shrink-0 max-w-[100px] md:max-w-none overflow-hidden">
        {/* Аватар виден только на десктопе */}
        <div className="hidden md:block relative w-[46px] h-[46px] rounded-full overflow-hidden shrink-0">
          <Image src={safeAvatar} alt={owner} fill className="object-cover" />
        </div>

        <span
          className="text-[13px] md:text-[20px] truncate"
          title={owner}
        >
          {owner}
        </span>

        {isPremium && (
          <Star
            size={14}
            fill="#FFD93B"
            color="#FFD93B"
            className="shrink-0 hidden md:inline-block"
          />
        )}
      </div>

      {/* DELETE + ARROW */}
      <div className="flex items-center gap-1 md:gap-2 shrink-0">
        {canDelete && (
          <button
            type="button"
            onClick={handleDeleteClick}
            className="p-1 md:p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
            aria-label="Delete lobby"
          >
            <Trash2 size={14} className="text-white/70 md:w-[17px] md:h-[17px]" />
          </button>
        )}
        <ChevronRight size={20} className="text-white/50 shrink-0 md:w-[34px] md:h-[34px]" />
      </div>
    </motion.div>
  );
}