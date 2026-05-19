// app/game/components/game.tsx
"use client";

import { useState, useEffect, useRef } from 'react';

interface Props {
  puzzleData: any;
  onGuessUpdate?: (wordId: number, wordLetters?: { row: number; col: number; letter: string }[]) => void;
  onCellUpdate?: (row: number, col: number, letter: string) => void;
  savedGuesses?: number[];
  savedGridState?: Map<string, string>;
  onGameOver?: (gameOver: boolean) => void;
}

// Utility functions
const findWordsAtCoord = (words: any[] | undefined, x: number, y: number) => {
  if (!words) return [];
  return words.filter((word: any) => 
    word?.coords?.some(([cx, cy]: number[]) => cx === x && cy === y)
  );
};

const findStart = (words: any[] | undefined, id: number): number[] => {
  if (!words || !words[id]) return [0, 0];
  const word = words[id];
  return word.coords.reduce((closest: number[], current: number[]) => {
    const closestDistance = Math.sqrt(closest[0] ** 2 + closest[1] ** 2);
    const currentDistance = Math.sqrt(current[0] ** 2 + current[1] ** 2);
    return currentDistance < closestDistance ? current : closest;
  });
};

const findWordById = (id: number | null, words: any[] | null) => {
  if (id === null || !words) return undefined;
  return words.find((word: any) => word?.id === id);
};

const applySavedLettersToGrid = (originalGrid: any, savedState: Map<string, string>) => {
  if (!originalGrid) return null;
  if (savedState.size === 0) return originalGrid;
  const newGrid = JSON.parse(JSON.stringify(originalGrid));
  savedState.forEach((letter, key) => {
    const [row, col] = key.split(',').map(Number);
    if (newGrid.lines[row]?.cells[col]) {
      newGrid.lines[row].cells[col] = { ...newGrid.lines[row].cells[col], symbol: letter };
    }
  });
  return newGrid;
};

export default function CrosswordPuzzle({ 
  puzzleData, 
  onGuessUpdate, 
  onCellUpdate,
  savedGuesses = [],
  savedGridState = new Map(),
  onGameOver
}: Props) {
  const [hoveredWordIds, setHoveredWordIds] = useState<number[] | null>(null);
  const [selectedWord, setSelectedWord] = useState<number | null>(null);
  const [isSelected, setIsSelected] = useState<boolean>(false);
  const [selectedCell, setSelectedCell] = useState<number[] | null>(null);
  const [correct, setCorrect] = useState<number[]>(savedGuesses);
  const [gameOver, setGameOver] = useState(false);
  const crosswordInnerRef = useRef<HTMLDivElement>(null);
  const crosswordContainerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragStartPosition, setDragStartPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [mobileInputValue, setMobileInputValue] = useState('');
  const mobileInputRef = useRef<HTMLInputElement>(null);
  
  // Pinch zoom refs
  const initialPinchDistanceRef = useRef(0);
  const initialScaleRef = useRef(1);
  const isPinchingRef = useRef(false);
  
  const [grid, setGrid] = useState<any>(() => {
    if (!puzzleData?.grid) return null;
    return applySavedLettersToGrid(puzzleData.grid, savedGridState);
  });

  const { words, wordCoords, puzzleId } = puzzleData || {};

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (puzzleData?.grid) {
      const updatedGrid = applySavedLettersToGrid(puzzleData.grid, savedGridState);
      setGrid(updatedGrid);
    }
  }, [savedGridState, puzzleData]);

  useEffect(() => {
    setCorrect(savedGuesses);
  }, [savedGuesses]);

  // Set initial scale to fill the screen width - only once
  useEffect(() => {
    if (crosswordInnerRef.current && grid && crosswordContainerRef.current && scale === 1) {
      const crosswordWidth = grid.lines[0]?.cells?.length * 64;
      const containerWidth = crosswordContainerRef.current.clientWidth;
      const scaleToFit = (containerWidth - 32) / crosswordWidth;
      setScale(Math.max(0.5, Math.min(3, scaleToFit)));
      setPosition({ x: 0, y: 0 });
    }
  }, [grid, scale]);

  // Update mobile input value when selected word changes
  useEffect(() => {
    if (selectedWord !== null && words && grid && wordCoords) {
      const wordCoordsData = wordCoords.find((w: any) => w?.id === selectedWord);
      if (wordCoordsData?.coords) {
        const letters: string[] = [];
        wordCoordsData.coords.forEach(([col, row]: number[]) => {
          const cell = grid.lines[row]?.cells[col];
          letters.push(cell?.symbol || '');
        });
        setMobileInputValue(letters.join(''));
      }
    } else {
      setMobileInputValue('');
    }
  }, [selectedWord, grid, words, wordCoords]);

  if (!puzzleData || !grid || !words || !wordCoords) {
    return <div>Loading...</div>;
  }

  // Get the length of the current word
  const getCurrentWordLength = () => {
    if (selectedWord !== null && wordCoords) {
      const wordData = wordCoords.find((w: any) => w?.id === selectedWord);
      return wordData?.coords?.length || 0;
    }
    return 0;
  };

  // Function to check the entire puzzle
  const checkEntirePuzzle = () => {
    if (!puzzleId || !wordCoords) return;
    
    const collectAllWords = () => {
      const wordList: any[] = [];
      const wordLettersMap = new Map();
      
      for (const word of wordCoords) {
        const letters: string[] = [];
        const wordLetters: { row: number; col: number; letter: string }[] = [];
        
        word.coords.forEach(([col, row]: number[]) => {
          const letter = grid.lines[row]?.cells[col]?.symbol || '';
          letters.push(letter);
          wordLetters.push({ row, col, letter });
        });
        
        wordList.push({
          id: word.id,
          word: letters.join('')
        });
        wordLettersMap.set(word.id, wordLetters);
      }
      
      return { wordList, wordLettersMap };
    };
    
    const { wordList, wordLettersMap } = collectAllWords();
    const puzzleGuess = { pzl_id: puzzleId, words: wordList };
    
    fetch('/api/game/check_puzzle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(puzzleGuess),
    })
      .then(async response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then(data => {
        if (data.guessed !== null) {
          const previousCorrect = correct || [];
          const newGuesses = data.guessed.filter((id: number) => !previousCorrect.includes(id));
          setCorrect(data.guessed);
          
          if (onGuessUpdate && newGuesses.length > 0) {
            newGuesses.forEach((id: number) => {
              const wordLetters = wordLettersMap.get(id);
              onGuessUpdate(id, wordLetters);
            });
          }
          
          if (data.game_state === "game_over") {
            setGameOver(true);
            if (onGameOver) onGameOver(true);
          }
        }
      })
      .catch(error => console.error('Error checking puzzle:', error));
  };

  // Handle mobile input submission
  const handleMobileSubmit = () => {
    if (!selectedWord || !puzzleId || !wordCoords) return;
    
    // Get the word letters from the input
    const inputWord = mobileInputValue.toUpperCase();
    const expectedLength = getCurrentWordLength();
    
    // Check if input length matches expected length
    if (inputWord.length !== expectedLength) {
      alert(`Please enter exactly ${expectedLength} letters`);
      return;
    }
    
    // Find the correct word data
    const currentWordData = wordCoords.find((w: any) => w?.id === selectedWord);
    if (!currentWordData) return;
    
    // Fill the grid with the typed letters - without causing re-centering
    const newGrid = JSON.parse(JSON.stringify(grid));
    const letters = inputWord.split('');
    let hasChanges = false;
    
    currentWordData.coords.forEach(([col, row]: number[], index: number) => {
      if (index < letters.length && letters[index] && /[A-ZА-ЯЁ]/.test(letters[index])) {
        const newLetter = letters[index];
        const currentLetter = newGrid.lines[row]?.cells[col]?.symbol || '';
        if (currentLetter !== newLetter) {
          hasChanges = true;
          if (newGrid.lines[row]?.cells[col]) {
            newGrid.lines[row].cells[col] = { ...newGrid.lines[row].cells[col], symbol: newLetter };
          }
        }
      }
    });
    
    if (hasChanges) {
      setGrid(newGrid);
      // Notify parent of cell updates
      currentWordData.coords.forEach(([col, row]: number[], index: number) => {
        if (index < letters.length && letters[index]) {
          if (onCellUpdate) onCellUpdate(row, col, letters[index]);
        }
      });
    }
    
    // Always check the puzzle after submission
    checkEntirePuzzle();
    
    // Clear input after submission
    setMobileInputValue('');
  };

  // ORIGINAL WORKING SELECTION LOGIC
  const handleMouseClick = (event: React.MouseEvent<HTMLDivElement>, cellId: number[]) => {
    if (isPanning) {
      event.stopPropagation();
      return;
    }
    
    const word_ids_len = hoveredWordIds?.length;
    setSelectedWord((prevSelected: number | null) => {
      let newSelectedWord = prevSelected;
      if (word_ids_len === 1) {
        setIsSelected(true);
        newSelectedWord = hoveredWordIds?.[0] !== undefined ? hoveredWordIds[0] : null;
      } else if (word_ids_len === 2) {
        if (isSelected && prevSelected !== null) {
          newSelectedWord = prevSelected === hoveredWordIds?.[0] 
            ? (hoveredWordIds?.[1] ?? null) 
            : (hoveredWordIds?.[0] ?? null);
        } else {
          setIsSelected(true);
          newSelectedWord = hoveredWordIds?.[0] ?? null;
        }
      }
      
      if (newSelectedWord !== null && wordCoords && grid) {
        const word = wordCoords.find((w: any) => w?.id === newSelectedWord);
        if (word?.coords) {
          const wordInfo = findWordById(newSelectedWord, words);
          const sortedCoords = [...word.coords].sort((a: number[], b: number[]) => {
            if (wordInfo?.direction === 'right') return a[0] - b[0];
            else return a[1] - b[1];
          });
          const firstEmpty = sortedCoords.find(([col, row]: number[]) => {
            return !grid.lines[row]?.cells[col]?.symbol;
          });
          if (firstEmpty) setSelectedCell([firstEmpty[1], firstEmpty[0]]);
          else {
            const start = findStart(wordCoords, newSelectedWord);
            setSelectedCell([start[1], start[0]]);
          }
        }
      } else if (newSelectedWord === null && wordCoords && hoveredWordIds && hoveredWordIds[0] !== undefined) {
        const fallbackWord = hoveredWordIds[0];
        setIsSelected(true);
        const start = findStart(wordCoords, fallbackWord);
        setSelectedCell([start[1], start[0]]);
        return fallbackWord;
      } else {
        const start = findStart(wordCoords ?? [], newSelectedWord ?? -1);
        setSelectedCell([start[1], start[0]]);
      }
      return newSelectedWord;
    });
  };

  // COMPLETE KEYBOARD HANDLER - FOR PC ONLY
  useEffect(() => {
    if (isMobile) return;
    
    const handler = (event: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isTypingInInput = activeElement?.tagName === 'INPUT' || 
                              activeElement?.tagName === 'TEXTAREA';
      
      if (isTypingInInput) return;
      if (!wordCoords || !selectedCell || !grid || !words) return;

      const allCoords = wordCoords.flatMap((word: any) => word?.coords || []);
      const [row, col] = selectedCell;
      
      const isCellCorrect = (x: number, y: number) => {
        if (!correct || !wordCoords) return false;
        const word_ids = findWordsAtCoord(wordCoords, x, y).map((w: any) => w?.id);
        return word_ids.some((id: number) => correct.includes(id));
      };
      
      const hasCoord = (x: number, y: number) => {
        return allCoords.some(([cx, cy]: number[]) => cx === x && cy === y);
      };

      const findNextAvailableCell = (startRow: number, startCol: number, direction: string): [number, number] | null => {
        let currentRow = startRow, currentCol = startCol;
        while (true) {
          if (direction === 'up') currentRow--;
          else if (direction === 'down') currentRow++;
          else if (direction === 'left') currentCol--;
          else if (direction === 'right') currentCol++;
          
          if (currentRow < 0 || currentRow >= grid.lines.length || 
              currentCol < 0 || currentCol >= grid.lines[0]?.cells?.length) {
            return null;
          }
          if (hasCoord(currentCol, currentRow)) {
            return [currentRow, currentCol];
          }
        }
      };

      let newRow = row, newCol = col;

      if (event.key.startsWith('Arrow')) {
        event.preventDefault();
        let moved = false;
        switch (event.key) {
          case 'ArrowUp':
            if (row > 0 && hasCoord(col, row - 1)) { newRow = row - 1; moved = true; }
            else { const next = findNextAvailableCell(row, col, 'up'); if (next) { newRow = next[0]; newCol = next[1]; moved = true; } }
            break;
          case 'ArrowDown':
            if (row < grid.lines.length - 1 && hasCoord(col, row + 1)) { newRow = row + 1; moved = true; }
            else { const next = findNextAvailableCell(row, col, 'down'); if (next) { newRow = next[0]; newCol = next[1]; moved = true; } }
            break;
          case 'ArrowLeft':
            if (col > 0 && hasCoord(col - 1, row)) { newCol = col - 1; moved = true; }
            else { const next = findNextAvailableCell(row, col, 'left'); if (next) { newRow = next[0]; newCol = next[1]; moved = true; } }
            break;
          case 'ArrowRight':
            if (col < grid.lines[0]?.cells?.length - 1 && hasCoord(col + 1, row)) { newCol = col + 1; moved = true; }
            else { const next = findNextAvailableCell(row, col, 'right'); if (next) { newRow = next[0]; newCol = next[1]; moved = true; } }
            break;
        }
        if (!moved) { newRow = row; newCol = col; }
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        checkEntirePuzzle();
      }

      if (event.key === 'Backspace') {
        event.preventDefault();
        if (!isCellCorrect(col, row)) {
          const newGrid = JSON.parse(JSON.stringify(grid));
          if (newGrid.lines[row]?.cells[col]) {
            newGrid.lines[row].cells[col] = { ...newGrid.lines[row].cells[col], symbol: '' };
            setGrid(newGrid);
            if (onCellUpdate) onCellUpdate(row, col, '');
          }
          const currentWord = findWordById(selectedWord, words);
          if (currentWord) {
            if (currentWord.direction === 'right') {
              let prevCol = col - 1;
              while (prevCol >= 0 && hasCoord(prevCol, row) && isCellCorrect(prevCol, row)) prevCol--;
              if (prevCol >= 0 && hasCoord(prevCol, row)) { newRow = row; newCol = prevCol; }
            } else {
              let prevRow = row - 1;
              while (prevRow >= 0 && hasCoord(col, prevRow) && isCellCorrect(col, prevRow)) prevRow--;
              if (prevRow >= 0 && hasCoord(col, prevRow)) { newRow = prevRow; newCol = col; }
            }
          }
        }
      }

      if (event.key.length === 1 && /[a-zA-Zа-яА-ЯЁё]/.test(event.key)) {
        event.preventDefault();
        if (!isCellCorrect(col, row)) {
          const newLetter = event.key.toUpperCase();
          const newGrid = JSON.parse(JSON.stringify(grid));
          if (newGrid.lines[row]?.cells[col]) {
            newGrid.lines[row].cells[col] = { ...newGrid.lines[row].cells[col], symbol: newLetter };
            setGrid(newGrid);
            if (onCellUpdate) onCellUpdate(row, col, newLetter);
          }
          const currentWord = findWordById(selectedWord, words);
          if (currentWord) {
            if (currentWord.direction === 'right') {
              let nextCol = col + 1;
              while (hasCoord(nextCol, row) && isCellCorrect(nextCol, row)) nextCol++;
              if (hasCoord(nextCol, row)) newCol = nextCol;
            } else {
              let nextRow = row + 1;
              while (hasCoord(col, nextRow) && isCellCorrect(col, nextRow)) nextRow++;
              if (hasCoord(col, nextRow)) newRow = nextRow;
            }
          }
        }
      }

      if (newRow >= 0 && newRow < grid.lines.length && 
          newCol >= 0 && newCol < grid.lines[0]?.cells?.length &&
          hasCoord(newCol, newRow)) {
        const wordsAtTarget = findWordsAtCoord(wordCoords, newCol, newRow);
        if (wordsAtTarget.length) {
          setSelectedCell([newRow, newCol]);
          if (wordsAtTarget.length === 1) setSelectedWord(wordsAtTarget[0]?.id);
          else {
            const currentWord = findWordById(selectedWord, words);
            const sameDir = wordsAtTarget.find((w: any) => findWordById(w?.id, words)?.direction === currentWord?.direction);
            setSelectedWord(sameDir?.id ?? wordsAtTarget[0]?.id);
          }
        }
      }
    };
    
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [wordCoords, selectedCell, grid, selectedWord, words, puzzleId, correct, onGuessUpdate, onCellUpdate, onGameOver, isMobile]);

  // Pinch zoom
  useEffect(() => {
    const element = crosswordContainerRef.current;
    if (!element) return;
    
    const getDistance = (touches: TouchList) => {
      if (touches.length < 2) return 0;
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };
    
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        isPinchingRef.current = true;
        initialPinchDistanceRef.current = getDistance(e.touches);
        initialScaleRef.current = scale;
      }
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (isPinchingRef.current && e.touches.length === 2 && initialPinchDistanceRef.current > 0) {
        e.preventDefault();
        const currentDistance = getDistance(e.touches);
        const scaleFactor = currentDistance / initialPinchDistanceRef.current;
        let newScale = initialScaleRef.current * scaleFactor;
        newScale = Math.max(0.3, Math.min(8, newScale));
        setScale(newScale);
      }
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      if (isPinchingRef.current) {
        e.preventDefault();
        isPinchingRef.current = false;
        initialPinchDistanceRef.current = 0;
      }
    };
    
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        setScale(prev => Math.max(0.3, Math.min(8, prev + delta)));
      }
    };
    
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd);
    element.addEventListener('touchcancel', handleTouchEnd);
    element.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);
      element.removeEventListener('wheel', handleWheel);
    };
  }, [scale]);

  // Pan functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.cursor-pointer') && !isPanning) {
      return;
    }
    
    setIsDragging(true);
    setIsPanning(false);
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragStartPosition({ x: position.x, y: position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
      setIsPanning(true);
      requestAnimationFrame(() => {
        setPosition({
          x: dragStartPosition.x + (e.clientX - dragStart.x),
          y: dragStartPosition.y + (e.clientY - dragStart.y),
        });
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setTimeout(() => setIsPanning(false), 100);
  };

  const handleTouchStartPan = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && !isPinchingRef.current) {
      const target = e.target as HTMLElement;
      if (target.closest('.cursor-pointer') && !isPanning) {
        return;
      }
      
      setIsDragging(true);
      setIsPanning(false);
      setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      setDragStartPosition({ x: position.x, y: position.y });
    }
  };

  const handleTouchMovePan = (e: React.TouchEvent) => {
    if (isDragging && e.touches.length === 1 && !isPinchingRef.current) {
      e.preventDefault();
      setIsPanning(true);
      requestAnimationFrame(() => {
        setPosition({
          x: dragStartPosition.x + (e.touches[0].clientX - dragStart.x),
          y: dragStartPosition.y + (e.touches[0].clientY - dragStart.y),
        });
      });
    }
  };

  const handleTouchEndPan = () => {
    setIsDragging(false);
    setTimeout(() => setIsPanning(false), 100);
  };

  const zoomIn = () => {
    setScale(prev => Math.min(8, prev + 0.2));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(0.3, prev - 0.2));
  };

  const resetZoom = () => {
    if (grid && crosswordContainerRef.current) {
      const crosswordWidth = grid.lines[0]?.cells?.length * 64;
      const containerWidth = crosswordContainerRef.current.clientWidth;
      const scaleToFit = (containerWidth - 32) / crosswordWidth;
      setScale(Math.max(0.5, Math.min(3, scaleToFit)));
      setPosition({ x: 0, y: 0 });
    }
  };

  const ZoomControls = () => (
    <div className="fixed bottom-4 right-4 flex gap-2 z-30">
      <button onClick={zoomOut} className="bg-gray-800 text-white w-10 h-10 rounded-full shadow-lg flex items-center justify-center text-xl font-bold hover:bg-gray-700 transition-colors active:scale-95">-</button>
      <button onClick={zoomIn} className="bg-gray-800 text-white w-10 h-10 rounded-full shadow-lg flex items-center justify-center text-xl font-bold hover:bg-gray-700 transition-colors active:scale-95">+</button>
      <button onClick={resetZoom} className="bg-gray-800 text-white w-10 h-10 rounded-full shadow-lg flex items-center justify-center text-sm font-bold hover:bg-gray-700 transition-colors active:scale-95">↺</button>
    </div>
  );

  const getCurrentWordDisplay = () => {
    if (selectedWord !== null && words && grid && wordCoords) {
      const wordCoordsData = wordCoords.find((w: any) => w?.id === selectedWord);
      const currentWordData = findWordById(selectedWord, words);
      if (wordCoordsData?.coords && currentWordData) {
        const letters: string[] = [];
        wordCoordsData.coords.forEach(([col, row]: number[]) => {
          const cell = grid.lines[row]?.cells[col];
          letters.push(cell?.symbol || '_');
        });
        return letters.join(' ');
      }
    }
    return '';
  };

  // Floating PC Header Component - Fixed at top
  const FloatingPCHeader = () => {
    if (isMobile || !selectedWord) return null;
    
    const currentWordData = findWordById(selectedWord, words);
    const wordLength = getCurrentWordLength();
    
    return (
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-auto max-w-2xl min-w-[320px]">
        <div className="bg-[#754CA8]/90 backdrop-blur-md rounded-xl shadow-2xl border border-white/20 overflow-hidden">
          <div className="px-4 py-2 border-b border-white/20">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-white/70 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-white/90 flex-1 truncate">
                {currentWordData?.riddle || 'Click on any cell to start'}
              </p>
              <div className="text-xs bg-white/20 px-2 py-0.5 rounded-full text-white font-mono">
                {wordLength} letters
              </div>
            </div>
          </div>
          
          <div className="px-4 py-2 flex gap-2 items-center">
            <div className="flex-1">
              <div className="font-mono text-base font-bold text-white bg-white/10 px-3 py-1.5 rounded-lg">
                {getCurrentWordDisplay() || '___'}
              </div>
            </div>
            <button 
              onClick={checkEntirePuzzle}
              className="px-4 py-1.5 bg-white text-[#754CA8] hover:bg-white/90 font-semibold rounded-lg transition-all text-sm shadow-md"
            >
              Check →
            </button>
          </div>
          <div className="px-4 pb-2 text-right">
            <div className="text-xs text-white/50">
              Press Enter to check
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Mobile Input Component - Fixed at top (no jerking)
  const FloatingMobileInput = () => {
    if (!isMobile || !selectedWord) return null;
    
    const currentWordData = findWordById(selectedWord, words);
    const wordLength = getCurrentWordLength();
    
    return (
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-auto min-w-[300px] max-w-[90vw]">
        <div className="bg-[#754CA8]/90 backdrop-blur-md rounded-xl shadow-2xl border border-white/20 overflow-hidden">
          <div className="px-4 py-2 border-b border-white/20">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-white/70 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm text-white/90">
                  {currentWordData?.riddle || 'Enter the word'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="px-4 py-2">
            <div className="flex gap-2">
              <input
                ref={mobileInputRef}
                type="text"
                value={mobileInputValue}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  if (value.length <= wordLength) {
                    setMobileInputValue(value);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleMobileSubmit();
                  }
                }}
                className="flex-1 px-3 py-2 text-base border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent bg-white/10 text-white placeholder-white/50 font-mono"
                placeholder="Type here..."
                autoCapitalize="characters"
                autoCorrect="off"
                autoComplete="off"
                maxLength={wordLength}
                autoFocus
              />
            </div>
            
            <div className="flex justify-between items-center mt-2">
              <div className="text-xs text-white/60">
                {mobileInputValue.length}/{wordLength}
              </div>
              <div className="text-xs text-white/60">
                Press Enter →
              </div>
            </div>
            
            <div className="mt-1 h-0.5 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white transition-all duration-300"
                style={{ width: `${(mobileInputValue.length / wordLength) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen relative" style={{ backgroundColor: '#130237' }}>
      {/* Floating headers - now fixed at top for mobile too */}
      <FloatingPCHeader />
      <FloatingMobileInput />

      {/* Crossword container - no margin needed */}
      <div 
        ref={crosswordContainerRef}
        className="overflow-hidden select-none"
        style={{ 
          height: '100vh',
          cursor: isDragging ? 'grabbing' : 'grab',
          position: 'relative',
          touchAction: 'none',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStartPan}
        onTouchMove={handleTouchMovePan}
        onTouchEnd={handleTouchEndPan}
      >
        <div 
          ref={crosswordInnerRef}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            transition: isDragging ? 'none' : 'transform 0.05s ease-out',
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <div className="inline-block rounded-2xl p-4" style={{ backgroundColor: 'transparent' }}>
            {grid.lines.map((line: any, row: number) => (
              <div key={row} className="flex">
                {line.cells.map((cell: any, col: number) => {
                  if (cell?.item !== 'L') return <div key={col} className="w-12 h-12 sm:w-14 md:w-16" />;
                  const wordIds = findWordsAtCoord(wordCoords, col, row).map((w: any) => w?.id).filter((id: number | undefined): id is number => id !== undefined);
                  const isSelectedCell = selectedCell?.[0] === row && selectedCell?.[1] === col;
                  const isSelectedWord = isSelected && wordIds.includes(selectedWord ?? -1);
                  const isHoveredWord = hoveredWordIds !== null && wordIds.includes(hoveredWordIds[0]);
                  const isCorrectWord = correct.some(id => wordIds.includes(id));
                  let bgColor = 'bg-gray-300';
                  if (isSelectedCell) bgColor = 'bg-red-300';
                  else if (isCorrectWord) bgColor = 'bg-green-300';
                  else if (isSelectedWord) bgColor = 'bg-blue-300';
                  else if (isHoveredWord) bgColor = 'bg-purple-300';
                  return (
                    <div
                      key={col}
                      onMouseEnter={() => setHoveredWordIds(wordIds)}
                      onMouseLeave={() => setHoveredWordIds(null)}
                      onClick={(e) => handleMouseClick(e, [row, col])}
                      className={`w-12 h-12 sm:w-14 md:w-16 flex items-center justify-center cursor-pointer ${bgColor} ${!isSelectedCell && !isSelectedWord && !isHoveredWord && !isCorrectWord && 'hover:bg-[#b8c5d6]'} transition-colors duration-150 rounded-sm select-none`}
                      style={{ minWidth: '3rem', minHeight: '3rem' }}
                    >
                      <span className="text-base sm:text-lg md:text-xl font-bold text-blue-600">{cell?.symbol || ''}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Zoom controls - hide on mobile */}
      {!isMobile && <ZoomControls />}
    </div>
  );
}