'use client';

import { useRouter } from 'next/navigation';

export default function PlayersPage() {
  const router = useRouter();

  const selectPlayers = (count: number) => {
    console.log(`Выбрано: ${count} игрок${getEnding(count)}`);
    //просто возвращаемся в меню 
    router.push('/menu');
  };

  //это тип чтоб правильно окончание подбирало , пока 2-4 игрока сделано 
  const getEnding = (num: number): string => {
    const lastDigit = num % 10;
    const lastTwoDigits = num % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
      return 'ов';
    }

    if (lastDigit === 1) {
      return '';
    }

    if (lastDigit >= 2 && lastDigit <= 4) {
      return 'а';
    }

    return 'ов';
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-8 text-gray-900">Выберите количество игроков</h1>

      <div className="grid grid-cols-1 gap-4 w-full max-w-xs">
        {[2, 3, 4].map((count) => (
          <button
            key={count}
            onClick={() => selectPlayers(count)}
            className="py-4 px-6 rounded-xl border border-gray-200 hover:border-green-300 transition-colors bg-white shadow-sm hover:shadow-md text-lg font-medium text-gray-700"
          >
            {count} игрок{getEnding(count)}
          </button>
        ))}
      </div>

      <button
        onClick={() => router.back()}
        className="mt-8 text-sm text-gray-500 hover:text-gray-700 underline"
      >
        ← Назад
      </button>
    </div>
  );
}