// app/game/components/opponent_view.tsx
'use client';

import React, { useState } from 'react';

// Types matching your game
interface Cell {
  item: string;
  symbol?: string;
}

interface Line {
  cells: Cell[];
}

interface Grid {
  lines: Line[];
}

interface WordCoords {
  id: number;
  coords: number[][]; // [col, row] pairs
}

interface OpponentViewProps {
  grid: Grid;
  wordCoords: WordCoords[];
  guessedWordIds: number[];
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

// Helper function
const findWordsAtCoord = (words: WordCoords[], x: number, y: number) => {
  return words.filter(word => 
    word.coords.some(([cx, cy]) => cx === x && cy === y)
  );
};

const OpponentView: React.FC<OpponentViewProps> = ({ 
  grid,
  wordCoords,
  guessedWordIds,
  className = '',
  size = 'md'
}) => {
  // Create a Set of guessed cells for O(1) lookup
  const guessedCells = new Set<string>();
  
  // Mark all cells of guessed words
  wordCoords.forEach(word => {
    if (guessedWordIds.includes(word.id)) {
      word.coords.forEach(([col, row]) => {
        guessedCells.add(`${row},${col}`);
      });
    }
  });

  // Determine cell size based on prop
  const getCellSizeClass = () => {
    switch(size) {
      case 'sm': return 'w-3 h-3 sm:w-4 sm:h-4';
      case 'lg': return 'w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10';
      default: return 'w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6';
    }
  };

  const cellSizeClass = getCellSizeClass();

  return (
    <div className={`inline-block ${className}`}>
      <div className="inline-block bg-white/5 backdrop-blur-sm p-1.5 rounded-lg">
        {grid.lines.map((line, rowIndex) => (
          <div key={`row-${rowIndex}`} className="flex">
            {line.cells.map((cell, colIndex) => {
              // Only render playable cells (where item is 'L')
              if (cell.item === 'L') {
                const isGuessed = guessedCells.has(`${rowIndex},${colIndex}`);
                
                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className={`
                      ${cellSizeClass}
                      ${isGuessed ? 'bg-green-400/80' : 'bg-gray-300/30'}
                      rounded-sm
                      transition-colors duration-200
                    `}
                    title={isGuessed ? 'Guessed' : 'Not guessed'}
                  />
                );
              } else {
                // Empty cell - maintains grid structure
                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className={cellSizeClass}
                  />
                );
              }
            })}
          </div>
        ))}
      </div>
      
      {/* Optional: Word count badge */}
      <div className="text-xs text-white/60 text-center mt-1">
        {guessedWordIds.length}/{wordCoords.length} words
      </div>
    </div>
  );
};

// Test component with proper typing
export const OpponentViewTest: React.FC<{
  grid: Grid;
  wordCoords: WordCoords[];
}> = ({ grid, wordCoords }) => {
  // Properly typed state
  const [guessedIds, setGuessedIds] = useState<number[]>([]);
  
  // Properly typed handler
  const toggleWord = (wordId: number) => {
    setGuessedIds((prev: number[]): number[] => {
      if (prev.includes(wordId)) {
        return prev.filter((id: number) => id !== wordId);
      }
      return [...prev, wordId];
    });
  };
  
  return (
    <div className="p-5 bg-gradient-to-br from-[#667eea] to-[#764ba2] rounded-xl">
      <h3 className="text-lg font-semibold mb-3 text-white">
        Opponent Progress: {guessedIds.length}/{wordCoords.length} words
      </h3>
      
      <div className="mb-4 flex flex-wrap gap-2">
        {wordCoords.map(word => (
          <button
            key={word.id}
            onClick={() => toggleWord(word.id)}
            className={`px-2 py-1 text-xs rounded ${
              guessedIds.includes(word.id) 
                ? 'bg-green-500 text-white' 
                : 'bg-white/20 text-white'
            }`}
          >
            Word {word.id}
          </button>
        ))}
      </div>
      
      <OpponentView 
        grid={grid}
        wordCoords={wordCoords}
        guessedWordIds={guessedIds}
        size="lg"
      />
    </div>
  );
};

export default OpponentView;