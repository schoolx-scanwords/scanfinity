'use client';

import { useRouter } from 'next/navigation';

export default function MenuPage() {
  const router = useRouter();

  const navigate = (path: string) => {
    router.push(path);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
      <h1 className="text-5xl font-bold mb-12 text-gray-900 tracking-wider">
        SCANFINITY
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-md">
        {/* Лидерборд */}
        <button
          onClick={() => navigate('/leaderboard')}
          className="flex flex-col items-center justify-center p-8 rounded-xl border border-gray-200 hover:border-green-300 transition-colors bg-white shadow-sm hover:shadow-md"
        >
          <div className="text-5xl mb-2">🏆</div>
          <span className="font-medium text-gray-700">Лидерборд</span>
        </button>

        {/* Играть — ведёт на /players */}
        <button
          onClick={() => navigate('/players')}
          className="flex flex-col items-center justify-center p-8 rounded-xl border border-gray-200 hover:border-green-300 transition-colors bg-white shadow-sm hover:shadow-md"
        >
          <div className="text-5xl mb-2">▶️</div>
          <span className="font-medium text-gray-700">Играть</span>
        </button>

        {/* Профиль */}
        <button
          onClick={() => navigate('/profile')}
          className="flex flex-col items-center justify-center p-8 rounded-xl border border-gray-200 hover:border-green-300 transition-colors bg-white shadow-sm hover:shadow-md"
        >
          <div className="text-5xl mb-2">👤</div>
          <span className="font-medium text-gray-700">Профиль</span>
        </button>
      </div>

      <p className="mt-10 text-gray-500 text-sm">
        Выберите раздел для продолжения
      </p>
    </div>
  );
}