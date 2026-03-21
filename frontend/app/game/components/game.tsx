// app/game/components/game.tsx
"use client";

import { useState, useEffect, useRef } from 'react';

interface Props {
  puzzleData: any;
  onGuessUpdate?: (wordId: number, wordLetters?: { row: number; col: number; letter: string }[]) => void;
  onCellUpdate?: (row: number, col: number, letter: string) => void;
  savedGuesses?: number[];
  savedGridState?: Map<string, string>;
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

// Function to apply saved letters to grid
const applySavedLettersToGrid = (originalGrid: any, savedState: Map<string, string>) => {
  if (!originalGrid) return null;
  if (savedState.size === 0) return originalGrid;
  
  // Deep clone the grid
  const newGrid = JSON.parse(JSON.stringify(originalGrid));
  
  savedState.forEach((letter, key) => {
    const [row, col] = key.split(',').map(Number);
    if (newGrid.lines[row]?.cells[col]) {
      newGrid.lines[row].cells[col] = {
        ...newGrid.lines[row].cells[col],
        symbol: letter
      };
    }
  });
  
  return newGrid;
};

export default function CrosswordPuzzle({ 
  puzzleData, 
  onGuessUpdate, 
  onCellUpdate,
  savedGuesses = [],
  savedGridState = new Map()
}: Props) {
  const [hoveredWordIds, setHoveredWordIds] = useState<number[] | null>(null);
  const [selectedWord, setSelectedWord] = useState<number | null>(null);
  const [isSelected, setIsSelected] = useState<boolean>(false);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [correct, setCorrect] = useState<number[]>(savedGuesses);
  
  // Initialize grid with saved letters - THIS IS THE KEY FIX
  const [grid, setGrid] = useState<any>(() => {
    if (!puzzleData?.grid) return null;
    // Apply saved letters immediately on initialization
    return applySavedLettersToGrid(puzzleData.grid, savedGridState);
  });

  const { words, wordCoords, puzzleId } = puzzleData || {};

  // Update grid when savedGridState changes (from parent)
  useEffect(() => {
    if (puzzleData?.grid) {
      const updatedGrid = applySavedLettersToGrid(puzzleData.grid, savedGridState);
      setGrid(updatedGrid);
    }
  }, [savedGridState, puzzleData]);

  // Update correct guesses when savedGuesses changes
  useEffect(() => {
    setCorrect(savedGuesses);
  }, [savedGuesses]);

  // Debug: Log when savedGridState changes
  useEffect(() => {
    console.log('🔄 savedGridState changed:', Array.from(savedGridState.entries()));
    if (savedGridState.size > 0 && grid) {
      console.log('📊 Current grid after update:', grid.lines.map((line: any) => line.cells.map((c: any) => c?.symbol || '_')));
    }
  }, [savedGridState, grid]);

  // Safety check
  if (!puzzleData || !grid || !words || !wordCoords) {
    return <div>Loading...</div>;
  }

  // Handle mouse click
  const handleMouseClick = (event: React.MouseEvent<HTMLDivElement>, cellId: number[]) => {
    const word_ids_len = hoveredWordIds?.length;
    
    setSelectedWord((prevSelected: number | null) => {
      let newSelectedWord = prevSelected;
      
      if (word_ids_len === 1) {
        setIsSelected(true);
        newSelectedWord = hoveredWordIds?.[0] !== undefined ? hoveredWordIds[0] : null;
      } 
      else if (word_ids_len === 2) {
        if (isSelected) {
          if (prevSelected === hoveredWordIds?.[0]) {
            newSelectedWord = hoveredWordIds?.[1] !== undefined ? hoveredWordIds[1] : null;
          } else {
            newSelectedWord = hoveredWordIds?.[0] !== undefined ? hoveredWordIds[0] : null;
          }
        } else {
          setIsSelected(true);
          if (prevSelected === hoveredWordIds?.[0]) {
            newSelectedWord = hoveredWordIds?.[1] !== undefined ? hoveredWordIds[1] : null;
          } else {
            newSelectedWord = hoveredWordIds?.[0] !== undefined ? hoveredWordIds[0] : null;
          }
        }
      }
      
      if (newSelectedWord !== null && wordCoords && grid) {
        const word = wordCoords.find((w: any) => w?.id === newSelectedWord);
        if (word?.coords) {
          const wordInfo = findWordById(newSelectedWord, words);
          const sortedCoords = [...word.coords].sort((a: number[], b: number[]) => {
            if (wordInfo?.direction === 'right') {
              return a[0] - b[0];
            } else {
              return a[1] - b[1];
            }
          });
          
          const firstEmpty = sortedCoords.find(([col, row]: number[]) => {
            const cell = grid.lines[row]?.cells[col];
            return !cell?.symbol;
          });
          
          if (firstEmpty) {
            setSelectedCell([firstEmpty[1], firstEmpty[0]]);
          } else {
            const start = findStart(wordCoords, newSelectedWord);
            setSelectedCell([start[1], start[0]]);
          }
        }
      } else {
        const start = findStart(wordCoords ?? [], newSelectedWord ?? -1);
        setSelectedCell([start[1], start[0]]);
      }
      
      return newSelectedWord;
    });
  };

  // Main keyboard handler
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!wordCoords || !selectedCell || !grid || !words) return;

      const allCoords = wordCoords.flatMap((word: any) => word?.coords || []);
      
      const [row, col] = selectedCell;
      
      const isCellCorrect = (x: number, y: number) => {
        if (!correct || !wordCoords) return false;
        const word_ids = findWordsAtCoord(wordCoords, x, y).map((word: any) => word?.id);
        return word_ids.some((id: number) => correct.includes(id));
      };
      
      const hasCoord = (x: number, y: number) => {
        return allCoords.some(([cx, cy]: number[]) => cx === x && cy === y);
      };

      const findNextAvailableCell = (startRow: number, startCol: number, direction: string): [number, number] | null => {
        let currentRow = startRow;
        let currentCol = startCol;
        
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

      let newRow = row;
      let newCol = col;

      // Arrow keys
      if (event.key.startsWith('Arrow')) {
        event.preventDefault();
        
        let moved = false;
        
        switch (event.key) {
          case 'ArrowUp':
            if (row > 0 && hasCoord(col, row - 1)) {
              newRow = row - 1;
              moved = true;
            } else {
              const nextCell = findNextAvailableCell(row, col, 'up');
              if (nextCell) {
                newRow = nextCell[0];
                newCol = nextCell[1];
                moved = true;
              }
            }
            break;
          case 'ArrowDown':
            if (row < grid.lines.length - 1 && hasCoord(col, row + 1)) {
              newRow = row + 1;
              moved = true;
            } else {
              const nextCell = findNextAvailableCell(row, col, 'down');
              if (nextCell) {
                newRow = nextCell[0];
                newCol = nextCell[1];
                moved = true;
              }
            }
            break;
          case 'ArrowLeft':
            if (col > 0 && hasCoord(col - 1, row)) {
              newCol = col - 1;
              moved = true;
            } else {
              const nextCell = findNextAvailableCell(row, col, 'left');
              if (nextCell) {
                newRow = nextCell[0];
                newCol = nextCell[1];
                moved = true;
              }
            }
            break;
          case 'ArrowRight':
            if (col < grid.lines[0]?.cells?.length - 1 && hasCoord(col + 1, row)) {
              newCol = col + 1;
              moved = true;
            } else {
              const nextCell = findNextAvailableCell(row, col, 'right');
              if (nextCell) {
                newRow = nextCell[0];
                newCol = nextCell[1];
                moved = true;
              }
            }
            break;
        }
        
        if (!moved) {
          newRow = row;
          newCol = col;
        }
      }

      // Enter handler
      if (event.key === 'Enter') {
        event.preventDefault();
        if (selectedWord !== null && puzzleId !== null) {
          const collectAllWords = () => {
            const wordList = [];
            const wordLettersMap: Map<number, { row: number; col: number; letter: string }[]> = new Map();
            
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
          const puzzleGuess = {
            pzl_id: puzzleId,
            words: wordList
          };
          
          fetch('/api/game/check_puzzle', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(puzzleGuess),
          })
          .then(async response => {
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }
            return response.json();
          })
          .then(data => {
            console.log('Puzzle check result:', data);
            if (data.guessed !== null) {
              const previousCorrect = correct || [];
              const newGuesses = data.guessed.filter((id: number) => 
                !previousCorrect.includes(id)
              );
              
              setCorrect(data.guessed);
              
              if (onGuessUpdate && newGuesses.length > 0) {
                newGuesses.forEach((id: number) => {
                  console.log('Word correctly guessed:', id);
                  const wordLetters = wordLettersMap.get(id);
                  onGuessUpdate(id, wordLetters);
                });
              }
            }
          })
          .catch(error => {
            console.error('Error checking puzzle:', error);
          });
        }
      }

      // Backspace handler
      if (event.key === 'Backspace') {
        event.preventDefault();
        
        const currentCellIsCorrect = isCellCorrect(col, row);
        if (currentCellIsCorrect) return;
        
        // Update grid
        const newGrid = {...grid};
        if (newGrid.lines[row]?.cells[col]) {
          newGrid.lines[row].cells[col] = {
            ...newGrid.lines[row].cells[col], 
            symbol: ''
          };
          setGrid(newGrid);
          
          // Notify parent to save
          if (onCellUpdate) {
            onCellUpdate(row, col, '');
          }
        }
        
        // Navigate to previous cell
        const currentWord = findWordById(selectedWord, words);
        if (currentWord) {
          if (currentWord.direction === 'right') {
            let prevCol = col - 1;
            while (prevCol >= 0 && hasCoord(prevCol, row) && isCellCorrect(prevCol, row)) {
              prevCol--;
            }
            if (prevCol >= 0 && hasCoord(prevCol, row)) {
              newRow = row;
              newCol = prevCol;
            }
          } else {
            let prevRow = row - 1;
            while (prevRow >= 0 && hasCoord(col, prevRow) && isCellCorrect(col, prevRow)) {
              prevRow--;
            }
            if (prevRow >= 0 && hasCoord(col, prevRow)) {
              newRow = prevRow;
              newCol = col;
            }
          }
        }
      }

      // Letter handler
      if (event.key.length === 1) {
        event.preventDefault();
        
        const currentCellIsCorrect = isCellCorrect(col, row);
        if (currentCellIsCorrect) return;
        
        const newLetter = event.key.toUpperCase();
        
        // Update grid
        const newGrid = {...grid};
        if (newGrid.lines[row]?.cells[col]) {
          newGrid.lines[row].cells[col] = {
            ...newGrid.lines[row].cells[col], 
            symbol: newLetter
          };
          setGrid(newGrid);
          
          // Notify parent to save
          if (onCellUpdate) {
            onCellUpdate(row, col, newLetter);
          }
        }

        // Navigate to next cell
        const currentWord = findWordById(selectedWord, words);
        
        if (currentWord) {
          if (currentWord.direction === 'right') {
            let nextCol = col + 1;
            while (hasCoord(nextCol, row) && isCellCorrect(nextCol, row)) {
              nextCol++;
            }
            if (hasCoord(nextCol, row)) {
              newCol = nextCol;
            }
          } else { 
            let nextRow = row + 1;
            while (hasCoord(col, nextRow) && isCellCorrect(col, nextRow)) {
              nextRow++;
            }
            if (hasCoord(col, nextRow)) {
              newRow = nextRow;
            }
          }
        } else {
          const wordsAtCurrent = findWordsAtCoord(wordCoords, col, row);
          if (wordsAtCurrent.length > 0) {
            const firstWord = findWordById(wordsAtCurrent[0]?.id, words);
            if (firstWord) {
              setSelectedWord(firstWord.id);
              if (firstWord.direction === 'right') {
                let nextCol = col + 1;
                while (hasCoord(nextCol, row) && isCellCorrect(nextCol, row)) {
                  nextCol++;
                }
                if (hasCoord(nextCol, row)) {
                  newCol = nextCol;
                }
              } else {
                let nextRow = row + 1;
                while (hasCoord(col, nextRow) && isCellCorrect(col, nextRow)) {
                  nextRow++;
                }
                if (hasCoord(col, nextRow)) {
                  newRow = nextRow;
                }
              }
            }
          }
        }
      }

      // Update selected cell position
      if (newRow >= 0 && newRow < grid.lines.length && 
          newCol >= 0 && newCol < grid.lines[0]?.cells?.length &&
          hasCoord(newCol, newRow)) {
        
        const wordsAtTarget = findWordsAtCoord(wordCoords, newCol, newRow);
        if (wordsAtTarget.length > 0) {
          setSelectedCell([newRow, newCol]);
          
          if (wordsAtTarget.length === 1) {
            setSelectedWord(wordsAtTarget[0]?.id);
          } else if (wordsAtTarget.length > 1) {
            const currentWord = findWordById(selectedWord, words);
            if (currentWord) {
              const sameDirectionWord = wordsAtTarget.find((w: any) => {
                const wordData = findWordById(w?.id, words);
                return wordData?.direction === currentWord.direction;
              });
              if (sameDirectionWord) {
                setSelectedWord(sameDirectionWord?.id);
              } else {
                setSelectedWord(wordsAtTarget[0]?.id);
              }
            } else {
              setSelectedWord(wordsAtTarget[0]?.id);
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [wordCoords, selectedCell, grid, selectedWord, words, puzzleId, correct, onGuessUpdate, onCellUpdate]);

  return (
    <div className="p-4">
      {selectedWord !== null && words && (
        <div className="mb-4 p-4 bg-white rounded-lg">
          {findWordById(selectedWord, words)?.riddle || 'Нет загадки'}
        </div>
      )}

      <div className="inline-block bg-white/10 p-4 rounded-2xl">
        {grid.lines.map((line: any, row: number) => (
          <div key={row} className="flex">
            {line.cells.map((cell: any, col: number) => {
              if (cell?.item !== 'L') {
                return <div key={col} className="w-16 h-16" />;
              }
              
              const wordIds = findWordsAtCoord(wordCoords, col, row).map((w: any) => w?.id).filter((id: number | undefined) => id !== undefined);
              const isSelectedCell = selectedCell !== null && 
                                   selectedCell[0] === row && 
                                   selectedCell[1] === col;
              const isSelectedWord = isSelected == true && wordIds.includes(selectedWord ?? -1);
              const isHoveredWord = hoveredWordIds !== null && wordIds.includes(hoveredWordIds[0]);
              const isCorrectWord = correct !== null && wordIds.some((id: number) => correct.includes(id));
              
              let bgColor = 'bg-gray-300';
              if (isSelectedCell) {
                bgColor = 'bg-red-300';
              } else if (isCorrectWord) {
                bgColor = 'bg-green-300';
              } else if (isSelectedWord) {
                bgColor = 'bg-blue-300';
              } else if (isHoveredWord) {
                bgColor = 'bg-purple-300';
              }
              
              return (
                <div
                  key={col}
                  onMouseEnter={() => setHoveredWordIds(wordIds)}
                  onMouseLeave={() => setHoveredWordIds(null)}
                  onClick={(event) => handleMouseClick(event, [row, col])}
                  className={`
                    w-16 h-16
                    flex items-center justify-center
                    cursor-pointer
                    ${bgColor}
                    ${!isSelectedCell && !isSelectedWord && !isHoveredWord && !isCorrectWord && 'hover:bg-[#b8c5d6]'}
                    transition-colors duration-150
                    rounded-sm
                  `}
                >
                  <span className="text-xl font-bold text-blue-600">
                    {cell?.symbol || ''}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {words && correct && correct.length === words.length && (
        <div className="mt-4 p-4 bg-green-500 text-white rounded-lg text-center">
          🎉 ПОБЕДА! 🎉
        </div>
      )}
    </div>
  );
}