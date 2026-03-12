"use client";

import {useState,  useEffect, useRef, useCallback, use} from 'react';

type KeyPressHandler = (event: KeyboardEvent) => void;

//getting puzzle_data from .json
interface Coordinates {
  x: number;
  y: number;
  len: number;
}

interface WordData {
  id: number;
  riddle: string;
  coords: Coordinates[];
  direction: string;
}

interface ApiWord {
  id: number;
  riddle: string;
  coords: number[];
  direction: string;
}

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

interface wordCoords {
  id: number;
  coords: number[][];
}

interface Puzzle {
  grid: Grid;
  words: WordData[];
}

interface Word {
  id: number;
  word: string;
}

interface WordGuess {
  pzl_id: number;
  word: Word;
}

const findWordsAtCoord = (words: wordCoords[], x: number, y: number) => 
  words.filter(word => word.coords.some(([cx, cy]) => cx === x && cy === y));

const findStart = (words: wordCoords[], id: number): number[] => {
  const word = words[id];
  
  return word.coords.reduce((closest, current) => {
    // Calculate distance from (0,0) using Euclidean distance
    const closestDistance = Math.sqrt(closest[0] ** 2 + closest[1] ** 2);
    const currentDistance = Math.sqrt(current[0] ** 2 + current[1] ** 2);
    
    return currentDistance < closestDistance ? current : closest;
  });
};

const findWordById = (id: number | null, words: WordData[] | null) => {
  if (id === null || !words) return undefined;
  return words.find(word => word.id === id);
};

const collectWord = (grid: Grid, words: wordCoords[], id: number): { id: number; word: string } => {
  const word = words.find(word => word.id === id);
  if (!word) return { id, word: '' };
  
  const wordString = word.coords
    .map(([col, row]) => grid.lines[row]?.cells[col]?.symbol || '')
    .join('');
    
  return { id, word: wordString };
};

const collectPuzzle = (grid: Grid, words: wordCoords[], puzzle_id: number) => {
  let guesses = {
    pzl_id: puzzle_id, 
    words: [] as Array<{id: number, word: string}>
  };
  
  words.map((word) => {
    const wordGuess = collectWord(grid, words, word.id);
    guesses.words.push(wordGuess);
  });
  
  return guesses;
};


export default function Home() {
  const [puzzleId, setPuzzleId] = useState<number | null>(null); 
  const [grid, setGrid] = useState<Grid | undefined>(undefined);
  const [words, setWords] = useState<WordData[] | null>(null);
  const [wordCoords, setWordCoords] = useState<wordCoords[] | undefined>(undefined);
  const [hoveredWordIds, setHoveredWordIds] = useState<number[] | null>(null);
  const [selectedWord, setSelectedWord] = useState<number | null>(null);
  const [isSelected, setIsSelected] = useState<boolean>(false);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [correct, setCorrect] = useState<number[] | null>(null)

  const isCellCorrect = (x: number, y: number, ignoreSelected: boolean = true) => {
    if (!correct || !wordCoords) return false;
    const word_ids = findWordsAtCoord(wordCoords, x, y).map(word => word.id);
    
    if (ignoreSelected && selectedWord !== null && word_ids.includes(selectedWord)) {
      return false;
    }
    
    return word_ids.some(id => correct.includes(id));
  };

  // Fetch data from API
  useEffect(() => {
    const fetchPuzzle = async () => {
      try {
        const response = await fetch('/api/grid');
        const data = await response.json();
        
        const parsePuzzle: Puzzle = {
          grid: {
            lines: data.blank.map((row: string[]) => ({
              cells: row.map((cell: string) => ({
                item: cell,
              })),
            })),
          },
          words: data.words.map((word: ApiWord) => ({  // Add type here
            id: word.id,
            riddle: word.riddle,
            direction: word.direction,
            coords: word.coords
          })),
        };

        setGrid(parsePuzzle.grid);
        setWords(parsePuzzle.words);
        setPuzzleId(data.id);

        const word_coords = data.words.map((word: ApiWord) => {  // Add type here
          const [x, y, len] = word.coords;
          const cells: number[][] = [];
          
          if (word.direction === 'right') {
            for (let i = x + 1; i < x + len + 1; i++) cells.push([i, y]);
          } else {
            for (let i = y + 1; i < y + len + 1; i++) cells.push([x, i]);
          }
          
          return { id: word.id, coords: cells };
        });

        setWordCoords(word_coords);
      } catch (error) {
        console.error('Error fetching puzzle:', error);
      }
    };

    fetchPuzzle();
  }, []);


useEffect(() => {
  const handler = (event: KeyboardEvent) => {
    if (!wordCoords || !selectedCell || !grid) return;

    const allCoords = wordCoords.map(word => word.coords).flat();
    
    const [row, col] = selectedCell;
    
    const isCellCorrect = (x: number, y: number) => {
      if (!correct || !wordCoords) return false;
      const word_ids = findWordsAtCoord(wordCoords, x, y).map(word => word.id);
      return word_ids.some(id => correct.includes(id));
    };
    
    const hasCoord = (x: number, y: number) => {
      return allCoords.some(([cx, cy]) => cx === x && cy === y);
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
            currentCol < 0 || currentCol >= grid.lines[0].cells.length) {
          return null;
        }
        
        if (hasCoord(currentCol, currentRow)) {
          return [currentRow, currentCol];
        }
      }
    };

    let newRow = row;
    let newCol = col;

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
          if (col < grid.lines[0].cells.length - 1 && hasCoord(col + 1, row)) {
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
      
      // If we couldn't move anywhere, keep current position
      if (!moved) {
        newRow = row;
        newCol = col;
      }
    }

    if (event.key === 'Enter') {
      if (selectedWord !== null) {
        const word = collectWord(grid, wordCoords, selectedWord);
        const wordGuess: WordGuess = {
          pzl_id: puzzleId!, 
          word: word
        }
        fetch('http://localhost:8000/api/check_word', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(wordGuess)
        })
        .then(response => response.json())
        .then(data => {
          if (data.guessed !== null) {
            if (!correct) {
              setCorrect([data.guessed])
            }
            else {
              setCorrect([...correct, data.guessed])
            }
          }
        })
        .catch(error => {
          console.error('Error checking puzzle:', error);
        });
      }
    }

    if (event.key === 'Tab') {
      event.preventDefault();
      if (selectedWord !== null && puzzleId !== null) {
        const guess = collectPuzzle(grid, wordCoords, puzzleId);
        fetch('http://localhost:8000/api/check_puzzle', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(guess),
        })
        .then(response => response.json())
        .then(data => {
          if (data.guessed !== null) {
            setCorrect(data.guessed)
          }
        })
        .catch(error => {
          console.error('Error checking puzzle:', error);
        });
      }
    }

    if (event.key === 'Backspace') {
      const currentCellIsCorrect = isCellCorrect(col, row);
      if (currentCellIsCorrect) return;
      
      const newGrid = {...grid};
      newGrid.lines[row].cells[col] = {
        ...newGrid.lines[row].cells[col], 
        symbol: ''
      };
      setGrid(newGrid);
      
      const currentWord = findWordById(selectedWord, words);
      if (currentWord) {
        if (currentWord.direction === 'right') {
          // Find previous cell in the word that's not a correct cell
          let prevCol = col - 1;
          while (prevCol >= 0 && hasCoord(prevCol, row) && isCellCorrect(prevCol, row)) {
            prevCol--;
          }
          if (prevCol >= 0 && hasCoord(prevCol, row)) {
            newRow = row;
            newCol = prevCol;
          }
        } else {
          // Find previous cell in the word that's not a correct cell
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

    if (event.key.length === 1 && !event.key.startsWith('Arrow')) {
      const currentCellIsCorrect = isCellCorrect(col, row);
      if (currentCellIsCorrect) return;
      
      const newGrid = {...grid};
      newGrid.lines[row].cells[col] = {
        ...newGrid.lines[row].cells[col], 
        symbol: event.key.toUpperCase()
      };
      setGrid(newGrid);

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
          const firstWord = findWordById(wordsAtCurrent[0].id, words);
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

    // Validate bounds before updating
    if (newRow >= 0 && newRow < grid.lines.length && 
        newCol >= 0 && newCol < grid.lines[0].cells.length &&
        hasCoord(newCol, newRow)) {
      
      const wordsAtTarget = findWordsAtCoord(wordCoords, newCol, newRow);
      if (wordsAtTarget.length > 0) {
        setSelectedCell([newRow, newCol]);
        
        if (wordsAtTarget.length === 1) {
          setSelectedWord(wordsAtTarget[0].id);
        } else if (wordsAtTarget.length > 1) {
          const currentWord = findWordById(selectedWord, words);
          if (currentWord) {
            const sameDirectionWord = wordsAtTarget.find(w => {
              const wordData = findWordById(w.id, words);
              return wordData?.direction === currentWord.direction;
            });
            if (sameDirectionWord) {
              setSelectedWord(sameDirectionWord.id);
            } else {
              setSelectedWord(wordsAtTarget[0].id);
            }
          } else {
            setSelectedWord(wordsAtTarget[0].id);
          }
        }
      }
    }
  };

  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, [wordCoords, selectedCell, grid, selectedWord, words, puzzleId, correct]);

const handleMouseClick = (event: React.MouseEvent<HTMLDivElement>, cellId: number[]) => {
    const word_ids_len = hoveredWordIds?.length;
    
    setSelectedWord(prevSelected => {
      let newSelectedWord = prevSelected;
      
      if (word_ids_len == 1) {
        setIsSelected(true);
        newSelectedWord = hoveredWordIds?.[0] ?? null;
      } 
      else if (word_ids_len == 2) {
        if (isSelected) {
          if (prevSelected === hoveredWordIds?.[0]) {
            newSelectedWord = hoveredWordIds?.[1] ?? null;
          } else {
            newSelectedWord = hoveredWordIds?.[0] ?? null;
          }
        } else {
          setIsSelected(true);
          if (prevSelected === hoveredWordIds?.[0]) {
            newSelectedWord = hoveredWordIds?.[1] ?? null;
          } else {
            newSelectedWord = hoveredWordIds?.[0] ?? null;
          }
        }
      }
      
      // Find the first empty cell in the word
      if (newSelectedWord !== null && wordCoords && grid) {
        const word = wordCoords.find(w => w.id === newSelectedWord);
        if (word) {
          // Sort coordinates in order (by row for down words, by col for right words)
          const wordInfo = findWordById(newSelectedWord, words);
          const sortedCoords = [...word.coords].sort((a, b) => {
            if (wordInfo?.direction === 'right') {
              return a[0] - b[0]; // sort by column for right words
            } else {
              return a[1] - b[1]; // sort by row for down words
            }
          });
          
          // Find first empty cell
          const firstEmpty = sortedCoords.find(([col, row]) => 
            !grid.lines[row]?.cells[col]?.symbol
          );
          
          if (firstEmpty) {
            setSelectedCell([firstEmpty[1], firstEmpty[0]]);
          } else {
            // If no empty cells, go to the start
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

return (
  <div className='min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] p-4 sm:p-6 md:p-8 flex items-start justify-center'>
    <div className="w-full max-w-4xl mx-auto">
      {/* Pretty header with gradient text */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#f6d5f7] to-[#fbe9d7] drop-shadow-lg">
          Ёбаный Кроссворд
        </h1>
        <div className="w-24 h-1 bg-gradient-to-r from-[#f6d5f7] to-[#fbe9d7] mx-auto mt-2 rounded-full"></div>
      </div>
      
      {/* Riddles section at the top */}
      {selectedWord !== null && words && (
        <div className="mb-6 p-4 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/20">
          <p className="text-sm font-semibold text-[#667eea] uppercase tracking-wider mb-1">Загадка:</p>
          <p className="text-lg text-gray-800 font-medium">
            {findWordById(selectedWord, words)?.riddle || 'Нет загадки'}
          </p>
        </div>
      )}
      
      {/* Crossword container */}
      <div className="flex flex-col items-center gap-6">
        <div className="flex justify-center">
          {/* Just the words, no grid */}
          <div className="inline-block bg-white/10 backdrop-blur-sm p-4 rounded-2xl shadow-2xl">
            {grid?.lines.map((line, lineIndex) => (
              <div key={lineIndex} className="flex">
                {line.cells.map((cell, cellIndex) => {
                  if (cell.item === 'L') {
                    const word_ids = findWordsAtCoord(wordCoords ?? [], cellIndex, lineIndex).map(word => word.id);
                    const isSelectedCell = selectedCell !== null && 
                                         selectedCell[0] === lineIndex && 
                                         selectedCell[1] === cellIndex;
                    const isSelectedWord = isSelected == true && word_ids.includes(selectedWord ?? -1);
                    const isHoveredWord = hoveredWordIds !== null && word_ids.includes(hoveredWordIds[0]);
                    const isCorrectWord = correct !== null && word_ids.some(id => correct.includes(id));
                    
                    // Visible word cells with darker backgrounds
                    let bgColor = 'bg-gray-300'; // darker base
                    if (isCorrectWord) bgColor = 'bg-green-300'; // green for correct words
                    else if (isSelectedCell) bgColor = 'bg-red-300'; // bright red
                    else if (isSelectedWord) bgColor = 'bg-blue-300'; // bright blue
                    else if (isHoveredWord) bgColor = 'bg-purple-300'; // bright purple
                    
                    return (
                      <div
                        key={`${lineIndex}-${cellIndex}`}
                        onMouseEnter={() => setHoveredWordIds(word_ids)}
                        onMouseLeave={() => setHoveredWordIds(null)}
                        onClick={(event) => handleMouseClick(event, [lineIndex, cellIndex])}
                        data-word_id={word_ids.join('-')}
                        className={`
                          w-10 h-10 xs:w-12 xs:h-12 sm:w-14 sm:h-14 md:w-16 md:h-16
                          flex items-center justify-center
                          cursor-pointer
                          ${bgColor}
                          ${!isSelectedCell && !isSelectedWord && !isHoveredWord && !isCorrectWord && 'hover:bg-[#b8c5d6]'}
                          transition-colors duration-150
                          shadow-sm
                          rounded-sm
                        `}
                      >
                        <span className={`
                          text-base sm:text-lg md:text-xl font-bold
                          text-blue-600 drop-shadow-sm
                        `}>
                          {cell.symbol}
                        </span>
                      </div>
                    )
                  } else {
                    // Empty space - absolutely nothing
                    return (
                      <div
                        key={`${lineIndex}-${cellIndex}`}
                        className="
                          w-10 h-10 xs:w-12 xs:h-12 sm:w-14 sm:h-14 md:w-16 md:h-16
                        "
                      />
                    );
                  }
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Win message when all words are correct */}
        {words && correct && correct.length === words.length && (
          <div className="mt-6 p-6 bg-gradient-to-r from-green-400 to-emerald-500 border-2 border-white/50 rounded-xl shadow-2xl w-full max-w-md text-center animate-bounce">
            <h2 className="text-3xl font-bold text-white mb-2">🎉 ПОБЕДА! 🎉</h2>
            <p className="text-white/90 text-lg">Ты разгадал все слова!</p>
          </div>
        )}
      </div>
      
      {/* Minimal hint */}
      {wordCoords && wordCoords.length > 0 && (
        <div className="mt-8 text-center text-sm text-white/70">
          {wordCoords.length} слов • кликни на клетку
        </div>
      )}
    </div>
  </div>
);
}