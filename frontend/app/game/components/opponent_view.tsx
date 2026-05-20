'use client';

import React, { useState, useEffect, useRef } from 'react';

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

interface PlayerStats {
  id: string;
  name: string;
  guessedIds: number[];
  score: number;
  isAfk?: boolean;
  isGuest?: boolean;
}

interface OpponentViewProps {
  grid: Grid;
  wordCoords: WordCoords[];
  players: PlayerStats[];
  currentPlayerId: string;
  totalWords: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const OpponentView: React.FC<OpponentViewProps> = ({ 
  grid,
  wordCoords,
  players,
  currentPlayerId,
  totalWords,
  className = '',
  size = 'md'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [hasUnreadProgress, setHasUnreadProgress] = useState(false);
  const lastGuessedCountsRef = useRef<Map<string, number>>(new Map());
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Detect keyboard height on mobile (exactly like chat)
  useEffect(() => {
    if (!isMobile) return;

    let resizeTimeout: NodeJS.Timeout;
    
    const handleResize = () => {
      requestAnimationFrame(() => {
        const visualViewport = window.visualViewport;
        if (visualViewport) {
          const windowHeight = window.innerHeight;
          const visualHeight = visualViewport.height;
          const keyboardOpen = visualHeight < windowHeight - 100;
          
          if (keyboardOpen) {
            const keyboardSize = windowHeight - visualHeight;
            setKeyboardHeight(keyboardSize);
          } else {
            setKeyboardHeight(0);
          }
        }
      });
    };

    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleResize, 100);
    };

    window.visualViewport?.addEventListener('resize', debouncedResize);
    window.addEventListener('resize', debouncedResize);
    handleResize();
    
    return () => {
      clearTimeout(resizeTimeout);
      window.visualViewport?.removeEventListener('resize', debouncedResize);
      window.removeEventListener('resize', debouncedResize);
    };
  }, [isMobile]);

  // Initialize last guessed counts
  useEffect(() => {
    players.forEach(player => {
      if (!lastGuessedCountsRef.current.has(player.id)) {
        lastGuessedCountsRef.current.set(player.id, player.guessedIds.length);
      }
    });
  }, [players]);

  // Track unread progress for opponents only
  useEffect(() => {
    if (!isOpen) {
      let hasNewProgress = false;
      players.forEach(player => {
        if (player.id !== currentPlayerId) {
          const lastCount = lastGuessedCountsRef.current.get(player.id) || 0;
          if (player.guessedIds.length > lastCount) {
            hasNewProgress = true;
            lastGuessedCountsRef.current.set(player.id, player.guessedIds.length);
          }
        }
      });
      if (hasNewProgress) {
        setHasUnreadProgress(true);
      }
    } else {
      setHasUnreadProgress(false);
      players.forEach(player => {
        lastGuessedCountsRef.current.set(player.id, player.guessedIds.length);
      });
    }
  }, [players, isOpen, currentPlayerId]);

  const getCellSizeClass = () => {
    switch(size) {
      case 'sm': return 'w-3 h-3 sm:w-4 sm:h-4';
      case 'lg': return 'w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10';
      default: return 'w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6';
    }
  };

  const cellSizeClass = getCellSizeClass();

  // Helper to get guessed cells for a player
  const getGuessedCellsForPlayer = (guessedIds: number[]) => {
    const guessedCells = new Set<string>();
    wordCoords.forEach(word => {
      if (guessedIds.includes(word.id)) {
        word.coords.forEach(([col, row]) => {
          guessedCells.add(`${row},${col}`);
        });
      }
    });
    return guessedCells;
  };

  // Sort players by score (highest first) - ensure unique by id
  const sortedPlayers = [...players]
    .filter((player, index, self) => self.findIndex(p => p.id === player.id) === index)
    .sort((a, b) => b.score - a.score);

  // Render a single player's grid
  const PlayerGrid = ({ player, placement }: { player: PlayerStats; placement: number }) => {
    const guessedCells = getGuessedCellsForPlayer(player.guessedIds);
    const isCurrentPlayer = player.id === currentPlayerId;

    return (
      <div className={`flex-shrink-0 ${isMobile ? 'w-64 mr-4' : 'mb-6 last:mb-0'}`}>
        <div className="text-center mb-2">
          <div className="font-semibold text-white text-sm">
            {player.name}
            {isCurrentPlayer && " (You)"}
            {player.isAfk && <span className="ml-2 text-xs text-gray-400">(AFK)</span>}
          </div>
          <div className="text-xs text-white/60">
            Score: {player.score}/{totalWords} words
            <span className="ml-2 text-purple-400">
              #{placement}
            </span>
          </div>
        </div>
        
        <div className="inline-block bg-white/5 backdrop-blur-sm p-1.5 rounded-lg">
          {grid.lines.map((line, rowIndex) => (
            <div key={`row-${rowIndex}`} className="flex">
              {line.cells.map((cell, colIndex) => {
                if (cell.item === 'L') {
                  const isGuessed = guessedCells.has(`${rowIndex},${colIndex}`);
                  
                  let cellColor = '';
                  if (isGuessed) {
                    cellColor = player.isAfk ? 'bg-gray-400/60' : 'bg-green-400/80';
                  } else {
                    cellColor = player.isAfk ? 'bg-gray-300/15' : 'bg-gray-300/30';
                  }
                  
                  return (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      className={`${cellSizeClass} ${cellColor} rounded-sm transition-colors duration-200`}
                      title={player.isAfk ? 'Player AFK' : (isGuessed ? 'Guessed' : 'Not guessed')}
                    />
                  );
                } else {
                  return <div key={`${rowIndex}-${colIndex}`} className={cellSizeClass} />;
                }
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Desktop styles (exactly like chat)
  if (!isMobile) {
    return (
      <>
        {/* Desktop Toggle Button */}
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="fixed left-6 top-1/2 -translate-y-1/2 z-[10000] rounded-full p-3 shadow-lg transition-all duration-300 hover:scale-105"
            style={{ backgroundColor: '#754CA8' }}
            aria-label="Toggle players"
          >
            <div className="relative">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-white"
              >
                <path
                  d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                  fill="currentColor"
                />
                <circle cx="12" cy="9" r="2.5" fill="white" />
              </svg>
              {hasUnreadProgress && (
                <span className="absolute -top-1 -right-1 block h-3.5 w-3.5 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
              )}
            </div>
          </button>
        )}

        {/* Desktop Panel */}
        <div
          className={`fixed left-0 top-1/2 transform -translate-y-1/2 w-96 transition-all duration-300 ease-in-out z-50 ${
            isOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 pointer-events-none'
          }`}
          style={{ height: '600px', maxHeight: '80vh' }}
        >
          <div className="bg-gray-900/95 backdrop-blur-sm rounded-r-2xl overflow-hidden will-change-transform h-full flex flex-col shadow-2xl border-r border-t border-b border-white/10">
            <div className="p-4 border-b border-white/20 bg-gray-800/50 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h2 className={`text-lg font-semibold text-white`}>
                  Players & Scores
                </h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white/70 hover:text-white transition-colors text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/40">
              {sortedPlayers.map((player, index) => (
                <PlayerGrid key={player.id} player={player} placement={index + 1} />
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  // Mobile styles (exactly like chat)
  return (
    <>
      {/* Mobile Toggle Button - exactly like chat button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed left-6 z-[10000] rounded-full p-3 shadow-lg transition-all duration-300 active:scale-95"
          style={{ 
            bottom: keyboardHeight > 0 ? `${keyboardHeight + 16}px` : '24px',
            backgroundColor: '#754CA8'
          }}
          aria-label="Toggle players"
        >
          <div className="relative">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-white"
            >
              <path
                d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                fill="currentColor"
              />
              <circle cx="12" cy="9" r="2.5" fill="white" />
            </svg>
            {hasUnreadProgress && (
              <span className="absolute -top-1 -right-1 block h-3.5 w-3.5 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
            )}
          </div>
        </button>
      )}

      {/* Mobile Panel */}
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/70 z-[9998]"
            onClick={() => setIsOpen(false)}
          />
          
          <div 
            className="fixed left-0 right-0 bg-gray-900/98 backdrop-blur-lg shadow-2xl z-[9999]"
            style={{ 
              bottom: keyboardHeight > 0 ? `${keyboardHeight}px` : '0',
              maxHeight: '60vh',
              borderRadius: '20px 20px 0 0',
              transition: 'bottom 0.2s ease'
            }}
          >
            <div className="flex flex-col h-full">
              <div className="p-3 border-b border-[#754CA8]/30 flex-shrink-0" style={{ backgroundColor: '#754CA8' }}>
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-white">Players & Scores</h2>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-white hover:text-white/80 transition-colors text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10"
                  >
                    ×
                  </button>
                </div>
                <div className="flex justify-center mt-2">
                  <div className="w-12 h-1 bg-white/50 rounded-full" />
                </div>
              </div>
              
              {/* Horizontal scroll container for mobile */}
              <div 
                ref={scrollContainerRef}
                className="flex-1 overflow-x-auto overflow-y-hidden p-4"
                style={{ 
                  WebkitOverflowScrolling: 'touch'
                }}
              >
                <div className="flex flex-row gap-4" style={{ minWidth: 'min-content' }}>
                  {sortedPlayers.map((player, index) => (
                    <PlayerGrid key={player.id} player={player} placement={index + 1} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default OpponentView;