'use client';

import { useRouter } from 'next/navigation';

export default function LobbyPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold mb-4 text-white">
          Лобби
        </h1>
        <p className="text-white/80 mb-8">
          Выберите, хотите ли вы создать новую комнату или присоединиться к существующей.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => router.push('/lobby/join')}
            className="group relative px-6 py-4 bg-white rounded-2xl text-lg font-semibold text-[#667eea] overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-[#f6d5f7] to-[#fbe9d7] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <span className="relative flex flex-col items-center gap-1">
              <span>Присоединиться</span>
              <span className="text-xs text-[#667eea]/80">Ввести ID уже созданной комнаты</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => router.push('/lobby/create')}
            className="group relative px-6 py-4 bg-white rounded-2xl text-lg font-semibold text-[#667eea] overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-[#fbe9d7] to-[#f6d5f7] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <span className="relative flex flex-col items-center gap-1">
              <span>Создать</span>
              <span className="text-xs text-[#667eea]/80">Задать ID комнаты и настройки</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
