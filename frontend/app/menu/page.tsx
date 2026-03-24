import Link from 'next/link';

export default function MenuPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
      <h1 className="text-5xl font-bold mb-12 text-gray-900 tracking-wider">
        SCANFINITY
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-md">
        {/* Лидерборд */}
        <Link
          href="/leaderboard"
          className="flex flex-col items-center justify-center p-8 rounded-xl border border-gray-200 hover:border-green-300 transition-colors bg-white shadow-sm hover:shadow-md"
        >
          <div className="text-5xl mb-2">🏆</div>
          <span className="font-medium text-gray-700">Лидерборд</span>
        </Link>

        {/* Играть — ведёт на /players */}
        <Link
          href="/players"
          className="flex flex-col items-center justify-center p-8 rounded-xl border border-gray-200 hover:border-green-300 transition-colors bg-white shadow-sm hover:shadow-md"
        >
          <div className="text-5xl mb-2">▶️</div>
          <span className="font-medium text-gray-700">Играть</span>
        </Link>

        {/* Профиль */}
        <Link
          href="/profile"
          className="flex flex-col items-center justify-center p-8 rounded-xl border border-gray-200 hover:border-green-300 transition-colors bg-white shadow-sm hover:shadow-md"
        >
          <div className="text-5xl mb-2">👤</div>
          <span className="font-medium text-gray-700">Профиль</span>
        </Link>
      </div>

      <p className="mt-10 text-gray-500 text-sm">
        Выберите раздел для продолжения
      </p>
    </div>
  );
}