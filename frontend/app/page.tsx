'use client';

import { useState, useEffect, useRef } from 'react';

// Types
type GridCell = string;
type GridRow = GridCell[];
type GridData = GridRow[];

interface SelectedWord {
  row: number;
  col: number;
  direction: 'across' | 'down';
}

interface ActiveCell {
  row: number;
  col: number;
}

interface PanPosition {
  x: number;
  y: number;
}

export default function Crossword() {
  const [grid, setGrid] = useState<GridData>([]);
  const [initialGrid, setInitialGrid] = useState<GridData>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWord, setSelectedWord] = useState<SelectedWord | null>(null);
  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<PanPosition>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<PanPosition>({ x: 0, y: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
   const wheelTimerRef = useRef<number | null>(null);

  // Fetch grid data from FastAPI
  useEffect(() => {
    fetch('/api/grid')
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to fetch grid: ${response.status}`);
        }
        return response.json();
      })
      .then((data: GridData) => {
        console.log('Grid loaded:', data); // Debug log
        setInitialGrid(data);
        
        // Create blank grid from the fetched data
        const blankGrid = data.map((row: GridRow) => 
          row.map((cell: GridCell) => {
            // Keep structure markers, blank out letter positions
            if (cell !== '#' && cell !== '0' && cell !== '%') {
              return ''; // Blank for letter positions
            }
            return cell; // Keep structure markers
          })
        );
        setGrid(blankGrid);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading grid:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Focus the container when component mounts
  useEffect(() => {
    if (!loading && containerRef.current) {
      containerRef.current.focus();
    }
  }, [loading]);

  // Helper functions that depend on initialGrid
  const isLetter = (cell: string): boolean => {
    return cell !== '0' && cell !== '#' && cell !== '%';
  };

  const isEditable = (row: number, col: number): boolean => {
    if (!initialGrid.length || !initialGrid[row]) return false;
    const originalCell = initialGrid[row]?.[col];
    return originalCell !== '0' && originalCell !== '#' && originalCell !== '%';
  };

  // Find the start of the word at a given position
  const findWordStart = (row: number, col: number, direction: 'across' | 'down'): [number, number] => {
    if (!initialGrid.length) return [row, col];
    
    let r = row;
    let c = col;
    
    if (direction === 'across') {
      // Move left to the start of the word
      while (c > 0 && isLetter(initialGrid[r]?.[c - 1] || '0')) {
        c--;
      }
    } else {
      // Move up to the start of the word
      while (r > 0 && isLetter(initialGrid[r - 1]?.[c] || '0')) {
        r--;
      }
    }
    
    return [r, c];
  };

  // Get all cells in a word
  const getWordCells = (row: number, col: number, direction: 'across' | 'down'): [number, number][] => {
    if (!initialGrid.length) return [];
    
    const [startRow, startCol] = findWordStart(row, col, direction);
    const cells: [number, number][] = [];
    
    if (direction === 'across') {
      let c = startCol;
      while (c < initialGrid[0].length && isLetter(initialGrid[startRow]?.[c] || '0')) {
        cells.push([startRow, c]);
        c++;
      }
    } else {
      let r = startRow;
      while (r < initialGrid.length && isLetter(initialGrid[r]?.[startCol] || '0')) {
        cells.push([r, startCol]);
        r++;
      }
    }
    
    return cells;
  };

  // Check if a cell is part of the selected word
  const isPartOfSelectedWord = (row: number, col: number): boolean => {
    if (!selectedWord) return false;
    
    const wordCells = getWordCells(selectedWord.row, selectedWord.col, selectedWord.direction);
    return wordCells.some(([r, c]) => r === row && c === col);
  };

  // Check if a word exists in a given direction
  const hasWordInDirection = (row: number, col: number, direction: 'across' | 'down'): boolean => {
    const cells = getWordCells(row, col, direction);
    return cells.length >= 2;
  };

  const handleCellClick = (rowIndex: number, colIndex: number): void => {
    if (!isEditable(rowIndex, colIndex) || isDragging) return;

    setActiveCell({ row: rowIndex, col: colIndex });

    if (!selectedWord || 
        selectedWord.row !== rowIndex || 
        selectedWord.col !== colIndex) {
      
      if (hasWordInDirection(rowIndex, colIndex, 'across')) {
        setSelectedWord({ row: rowIndex, col: colIndex, direction: 'across' });
      } else if (hasWordInDirection(rowIndex, colIndex, 'down')) {
        setSelectedWord({ row: rowIndex, col: colIndex, direction: 'down' });
      }
    } else {
      const newDirection = selectedWord.direction === 'across' ? 'down' : 'across';
      
      if (hasWordInDirection(rowIndex, colIndex, newDirection)) {
        setSelectedWord({
          row: rowIndex,
          col: colIndex,
          direction: newDirection
        });
      }
    }
  };

  const moveToNextCell = (currentRow: number, currentCol: number): void => {
    if (!selectedWord) return;

    const wordCells = getWordCells(selectedWord.row, selectedWord.col, selectedWord.direction);
    const currentIndex = wordCells.findIndex(([r, c]) => r === currentRow && c === currentCol);
    
    if (currentIndex < wordCells.length - 1) {
      const [nextRow, nextCol] = wordCells[currentIndex + 1];
      setActiveCell({ row: nextRow, col: nextCol });
    }
  };

  const moveToPreviousCell = (currentRow: number, currentCol: number): void => {
    if (!selectedWord) return;

    const wordCells = getWordCells(selectedWord.row, selectedWord.col, selectedWord.direction);
    const currentIndex = wordCells.findIndex(([r, c]) => r === currentRow && c === currentCol);
    
    if (currentIndex > 0) {
      const [prevRow, prevCol] = wordCells[currentIndex - 1];
      setActiveCell({ row: prevRow, col: prevCol });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (!activeCell) return;

    const { row, col } = activeCell;
    const key = e.key;

    if (key === 'Enter') {
      e.preventDefault();
      
      if (selectedWord) {
        const currentWord = getWordCells(selectedWord.row, selectedWord.col, selectedWord.direction)
          .map(([r, c]) => grid[r]?.[c] || '')
          .join('');
        
        fetch('/api/check-word', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            word: currentWord,
            row: activeCell.row,
            col: activeCell.col,
            direction: selectedWord.direction,
          }),
        })
        .then(response => response.json())
        .then(data => {
          console.log('API response:', data);
        })
        .catch(error => {
          console.error('API error:', error);
        });
      }
      return;
    }

    if (key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      
      setGrid(prevGrid => {
        const newGrid = [...prevGrid];
        if (newGrid[row]) {
          newGrid[row] = [...prevGrid[row]];
          newGrid[row][col] = key;
        }
        return newGrid;
      });

      moveToNextCell(row, col);
      return;
    }

    if (key === 'Backspace') {
      e.preventDefault();
      
      setGrid(prevGrid => {
        const newGrid = [...prevGrid];
        if (newGrid[row]) {
          newGrid[row] = [...prevGrid[row]];
          newGrid[row][col] = '';
        }
        return newGrid;
      });

      moveToPreviousCell(row, col);
      return;
    }

    if (key === 'Delete') {
      e.preventDefault();
      
      setGrid(prevGrid => {
        const newGrid = [...prevGrid];
        if (newGrid[row]) {
          newGrid[row] = [...prevGrid[row]];
          newGrid[row][col] = '';
        }
        return newGrid;
      });
      return;
    }
    
    if (key === ' ') {
      e.preventDefault();
      
      setGrid(prevGrid => {
        const newGrid = [...prevGrid];
        if (newGrid[row]) {
          newGrid[row] = [...prevGrid[row]];
          newGrid[row][col] = ' ';
        }
        return newGrid;
      });

      moveToNextCell(row, col);
      return;
    }

    if (key.startsWith('Arrow')) {
      e.preventDefault();
      
      let newRow = row;
      let newCol = col;
      
      switch (key) {
        case 'ArrowRight':
          newCol = col + 1;
          while (newCol < (grid[0]?.length || 0) && !isEditable(row, newCol)) {
            newCol++;
          }
          break;
        case 'ArrowLeft':
          newCol = col - 1;
          while (newCol >= 0 && !isEditable(row, newCol)) {
            newCol--;
          }
          break;
        case 'ArrowDown':
          newRow = row + 1;
          while (newRow < grid.length && !isEditable(newRow, col)) {
            newRow++;
          }
          break;
        case 'ArrowUp':
          newRow = row - 1;
          while (newRow >= 0 && !isEditable(newRow, col)) {
            newRow--;
          }
          break;
      }
      
      if (newRow >= 0 && newRow < grid.length && 
          newCol >= 0 && newCol < (grid[0]?.length || 0) && 
          isEditable(newRow, newCol)) {
        setActiveCell({ row: newRow, col: newCol });
        handleCellClick(newRow, newCol);
      }
    }
  };

  // Handle mouse wheel for zooming
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>): void => {
    e.preventDefault();
    
    if (!containerRef.current || !contentRef.current) return;

    if (wheelTimerRef.current) {
      clearTimeout(wheelTimerRef.current);
    }

    const containerRect = containerRef.current.getBoundingClientRect();

    const mouseX = e.clientX - containerRect.left;
    const mouseY = e.clientY - containerRect.top;

    const contentMouseX = (mouseX - pan.x - containerRect.width / 2) / zoom;
    const contentMouseY = (mouseY - pan.y - containerRect.height / 2) / zoom;

    const zoomFactor = 0.05;
    const delta = e.deltaY > 0 ? -zoomFactor : zoomFactor;
    const newZoom = Math.min(Math.max(0.25, zoom + delta), 4);

    const newPanX = mouseX - containerRect.width / 2 - contentMouseX * newZoom;
    const newPanY = mouseY - containerRect.height / 2 - contentMouseY * newZoom;

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });

    wheelTimerRef.current = window.setTimeout(() => {
      if (contentRef.current) {
        contentRef.current.style.transition = 'transform 0.1s ease';
      }
    }, 50);

    // When clearing
    if (wheelTimerRef.current) {
      clearTimeout(wheelTimerRef.current);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (e.button === 1) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({
        x: e.clientX - pan.x,
        y: e.clientY - pan.y
      });
      
      if (contentRef.current) {
        contentRef.current.style.transition = 'none';
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (isDragging) {
      e.preventDefault();
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (e.button === 1) {
      setIsDragging(false);
      
      if (contentRef.current) {
        contentRef.current.style.transition = 'transform 0.1s ease';
      }
    }
  };

  const handleMouseLeave = (): void => {
    if (isDragging) {
      setIsDragging(false);
      
      if (contentRef.current) {
        contentRef.current.style.transition = 'transform 0.1s ease';
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (e.button === 1) {
      e.preventDefault();
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl">Loading crossword puzzle...</div>
      </div>
    );
  }

  // Error state
  if (error || !grid.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl text-red-600">
          {error || 'Failed to load crossword puzzle'}
        </div>
      </div>
    );
  }

  // Calculate cell size based on zoom
  const cellSize = 32 * zoom;

  return (
    <div 
      ref={containerRef}
      className="bg-gray-100 overflow-hidden"
      onKeyDown={handleKeyDown}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onContextMenu={handleContextMenu}
      tabIndex={0}
      style={{ 
        outline: 'none',
        cursor: isDragging ? 'grabbing' : 'default',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        ref={contentRef}
        style={{
          position: 'relative',
          transform: `translate(${pan.x}px, ${pan.y}px)`,
        }}
      >
        <div 
          style={{
            display: 'inline-grid',
            gridTemplateColumns: `repeat(${grid[0]?.length || 0}, ${cellSize}px)`,
            gap: '0px',
            backgroundColor: 'transparent',
          }}
        >
          {grid.map((row, rowIndex) => 
            row.map((cell, colIndex) => {
              const isEditableCell = isEditable(rowIndex, colIndex);
              const isSelected = isPartOfSelectedWord(rowIndex, colIndex);
              const isActive = activeCell?.row === rowIndex && activeCell?.col === colIndex;
              
              // Determine background color
              let bgColor = 'transparent';
              if (isEditableCell) {
                if (isSelected) {
                  bgColor = '#fde047';
                } else {
                  bgColor = '#dbeafe';
                }
              }

              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  onClick={() => handleCellClick(rowIndex, colIndex)}
                  style={{
                    width: `${cellSize}px`,
                    height: `${cellSize}px`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: `${cellSize * 0.5}px`,
                    fontWeight: '500',
                    fontFamily: 'Arial, sans-serif',
                    backgroundColor: bgColor,
                    color: 'black',
                    cursor: isEditableCell && !isDragging ? 'pointer' : 'default',
                    transition: 'background-color 0.2s ease',
                    position: 'relative',
                    border: isActive ? `2px solid #2563eb` : 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  {/* Only show content for editable cells */}
                  {isEditableCell && cell}
                  
                  {/* Small dot indicator for empty editable cells */}
                  {isEditableCell && !cell && !isActive && (
                    <span style={{
                      position: 'absolute',
                      width: `${cellSize * 0.125}px`,
                      height: `${cellSize * 0.125}px`,
                      borderRadius: '50%',
                      backgroundColor: '#94a3b8',
                      opacity: 0.3,
                    }} />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}