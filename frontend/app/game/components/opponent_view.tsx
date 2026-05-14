'use client';

import React, { useState } from 'react';

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
  coords: number[][];
}

interface OpponentViewProps {
  grid: Grid;
  wordCoords: WordCoords[];
  guessedWordIds: number[];
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  isAfk?: boolean;
}

const OpponentView: React.FC<OpponentViewProps> = ({ 
  grid,
  wordCoords,
  guessedWordIds,
  className = '',
  size = 'md',
  isAfk = false
}) => {
  const guessedCells = new Set<string>();
  
  wordCoords.forEach(word => {
    if (guessedWordIds.includes(word.id)) {
      word.coords.forEach(([col, row]) => {
        guessedCells.add(`${row},${col}`);
      });
    }
  });

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
              if (cell.item === 'L') {
                const isGuessed = guessedCells.has(`${rowIndex},${colIndex}`);
                
                let cellColor = '';
                if (isGuessed) {
                  cellColor = isAfk ? 'bg-gray-400/60' : 'bg-green-400/80';
                } else {
                  cellColor = isAfk ? 'bg-gray-300/15' : 'bg-gray-300/30';
                }
                
                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className={`${cellSizeClass} ${cellColor} rounded-sm transition-colors duration-200`}
                    title={isAfk ? 'Player AFK' : (isGuessed ? 'Guessed' : 'Not guessed')}
                  />
                );
              } else {
                return <div key={`${rowIndex}-${colIndex}`} className={cellSizeClass} />;
              }
            })}
          </div>
        ))}
      </div>
      
      <div className="text-xs text-center mt-1">
        <span className={isAfk ? 'text-gray-400' : 'text-white/60'}>
          {guessedWordIds.length}/{wordCoords.length} words
        </span>
      </div>
    </div>
  );
};

export default OpponentView;