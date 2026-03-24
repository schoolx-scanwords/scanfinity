// app/game/page.tsx

import GameClient from './GameClient';

interface GamePageProps {
  searchParams: { room?: string };
}

async function fetchPuzzle() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';

  const res = await fetch(`${apiBase}/api/game/grid`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Failed to load puzzle');
  }

  const data = await res.json();

  const grid = {
    lines: data.blank?.map((row: string[]) => ({
      cells: row?.map((cell: string) => ({ item: cell })) || [],
    })) || [],
  };

  const words = data.words?.map((word: any) => ({
    id: word.id,
    riddle: word.riddle,
    direction: word.direction,
    coords: word.coords,
  })) || [];

  const wordCoords = data.words?.map((word: any) => {
    const [x, y, len] = word.coords || [];
    const cells: number[][] = [];

    if (word.direction === 'right' && x !== undefined && y !== undefined && len) {
      for (let i = x + 1; i < x + len + 1; i++) cells.push([i, y]);
    } else if (y !== undefined && x !== undefined && len) {
      for (let i = y + 1; i < y + len + 1; i++) cells.push([x, i]);
    }

    return { id: word.id, coords: cells };
  }) || [];

  return {
    grid,
    words,
    wordCoords,
    puzzleId: data.id ?? null,
  };
}

export default async function GamePage({ searchParams }: GamePageProps) {
  const puzzleData = await fetchPuzzle();
  const initialRoomId = searchParams.room;

  return <GameClient puzzleData={puzzleData} initialRoomId={initialRoomId} />;
}