// app/hooks/usePuzzleData.ts
"use client";

import { useState, useEffect } from 'react';

export function usePuzzleData(initialPuzzleId?: number) {
  const [puzzleData, setPuzzleData] = useState({
    grid: { lines: [] }, // Default empty grid
    words: [], // Default empty array
    wordCoords: [], // Default empty array
    puzzleId: null,
    loading: true
  });

  useEffect(() => {
    const fetchPuzzle = async () => {
      try {
        const url = initialPuzzleId 
          ? `/api/game/grid?id=${initialPuzzleId}`
          : '/api/game/grid';
        
        const response = await fetch(url);
        const data = await response.json();
        
        // Parse grid with safety
        const grid = {
          lines: data.blank?.map((row: string[]) => ({
            cells: row?.map((cell: string) => ({ item: cell })) || []
          })) || []
        };

        // Parse words with safety
        const words = data.words?.map((word: any) => ({
          id: word.id,
          riddle: word.riddle,
          direction: word.direction,
          coords: word.coords
        })) || [];

        // Parse word coordinates with safety
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

        setPuzzleData({
          grid,
          words,
          wordCoords,
          puzzleId: data.id,
          loading: false
        });
      } catch (error) {
        console.error('Error:', error);
        setPuzzleData(prev => ({ 
          ...prev, 
          loading: false,
          grid: { lines: [] },
          words: [],
          wordCoords: []
        }));
      }
    };

    fetchPuzzle();
  }, [initialPuzzleId]);

  return puzzleData;
}