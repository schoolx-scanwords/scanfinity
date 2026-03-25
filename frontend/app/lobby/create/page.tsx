'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateLobbyPage() {
  const router = useRouter();
  const [roomId, setRoomId] = useState(() => {
    if (typeof window === 'undefined') return '';
    const saved = localStorage.getItem('last_room') || '';
    return saved || `room_${Math.random().toString(36).substr(2, 6)}`;
  });
  const [playerCount, setPlayerCount] = useState(2);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = roomId.trim();
    if (!trimmed) return;

    if (typeof window !== 'undefined') {
      localStorage.setItem('last_room', trimmed);
      localStorage.setItem('room_max_players', String(playerCount));
    }

    router.push(`/game?room=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 text-white">
          Создать комнату
        </h1>
        <p className="text-white/80 mb-6">
          Задайте ID комнаты и желаемое количество игроков.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              ID комнаты
            </label>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/90 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#f6d5f7]"
              placeholder="Например, room_party123"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Количество игроков
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={playerCount}
              onChange={(e) => setPlayerCount(Number(e.target.value) || 1)}
              className="w-full px-4 py-3 rounded-xl bg-white/90 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#fbe9d7]"
            />
            <p className="mt-1 text-xs text-white/60">
              Это значение пока используется только локально (для настроек игры).
            </p>
          </div>

          <button
            type="submit"
            className="w-full group relative px-6 py-3 bg-white rounded-full text-lg font-semibold text-[#667eea] overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl mt-2"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-[#fbe9d7] to-[#f6d5f7] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <span className="relative flex items-center justify-center gap-2">
              Создать и перейти к игре
              <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
            </span>
          </button>
        </form>

        <button
          type="button"
          onClick={() => router.push('/lobby')}
          className="mt-6 text-xs text-white/70 underline hover:text-white"
        >
          Назад в лобби
        </button>
      </div>
    </div>
  );
}
