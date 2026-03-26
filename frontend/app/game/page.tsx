// app/game/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePuzzleData } from '../hooks/use_puzzle_data';
import CrosswordPuzzle from './components/game';
import OpponentView from './components/opponent_view';
import Chat from './components/chat';
import { useRouter } from 'next/navigation';
import { Ready, GameOver} from './components/room';

interface Player {
  id: string;
  name: string;
  guessedIds: number[];
  gridState?: [string, string][];
  isCurrentPlayer?: boolean;
}

const STORAGE_KEYS = {
  GUESSES: (roomId: string, playerId: string) => `game_progress_${roomId}_${playerId}_guesses`,
  GRID: (roomId: string, playerId: string) => `game_progress_${roomId}_${playerId}_grid`,
  OPPONENTS: (roomId: string) => `game_opponents_${roomId}`,
};

const getMaxPlayersFromRoomId = (roomId: string): number => {
  const match = roomId.match(/\{(\d+)\}/);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return 2;
};

export default function GamePage() {
  const router = useRouter();
  const { grid, words, wordCoords, puzzleId, loading } = usePuzzleData();
  const [roomId, setRoomId] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [isReady, setIsReady] = useState(false);
  const [currentPlayers, setCurrentPlayers] = useState(0);
  const [gameInProgress, setGameInProgress] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  
  const [myId] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    let id = sessionStorage.getItem('game_player_id');
    if (!id) {
      id = `player_${Math.random().toString(36).substr(2, 6)}`;
      sessionStorage.setItem('game_player_id', id);
    }
    return id;
  });
  
  const [myName] = useState<string>(() => {
    if (typeof window === 'undefined') return 'Player';
    let name = sessionStorage.getItem('game_player_name');
    if (!name) {
      name = `Player_${Math.floor(Math.random() * 1000)}`;
      sessionStorage.setItem('game_player_name', name);
    }
    return name;
  });
  
  const [myGuessedIds, setMyGuessedIds] = useState<number[]>([]);
  const [myGridStateArray, setMyGridStateArray] = useState<[string, string][]>([]);
  const [players, setPlayers] = useState<Map<string, Player>>(new Map());
  const wsRef = useRef<WebSocket | null>(null);

  const myGridStateMap = new Map(myGridStateArray);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    setMaxPlayers(getMaxPlayersFromRoomId(roomId))
  }, [maxPlayers, roomId])

  useEffect(() => {
    if (currentPlayers === maxPlayers) {
      setGameInProgress(true)
    }
  })

  const toggleReady = () => {
    if (!isReady) {
      setIsReady(true);
    }
    setCurrentPlayers(prevPlayers => prevPlayers + 1);
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'ready_update',
        increment: 1
      }));
    }
  } 

  const handleGameComplete = () => {
    setGameOver(true);
  }

  useEffect(() => {
    if (!isClient) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    let roomParam = urlParams.get('room');
    
    if (!roomParam) {
      const lastRoom = localStorage.getItem('last_room');
      if (lastRoom) {
        roomParam = lastRoom;
      } else {
        roomParam = `room_${Math.random().toString(36).substr(2, 9)}`;
      }
      window.history.pushState({}, '', `?room=${roomParam}`);
    }
    
    setRoomId(roomParam);
    localStorage.setItem('last_room', roomParam);
  }, [isClient]);

  useEffect(() => {
    if (!roomId || !isClient || !myId) return;
    
    const savedGuesses = localStorage.getItem(STORAGE_KEYS.GUESSES(roomId, myId));
    if (savedGuesses) {
      try {
        setMyGuessedIds(JSON.parse(savedGuesses));
      } catch (e) {}
    }
    
    const savedGrid = localStorage.getItem(STORAGE_KEYS.GRID(roomId, myId));
    if (savedGrid) {
      try {
        setMyGridStateArray(JSON.parse(savedGrid));
      } catch (e) {}
    }
    
    const savedOpponents = localStorage.getItem(STORAGE_KEYS.OPPONENTS(roomId));
    if (savedOpponents) {
      try {
        const parsed = JSON.parse(savedOpponents);
        const opponentsMap = new Map();
        parsed.forEach((p: any) => {
          if (p.id !== myId) {
            opponentsMap.set(p.id, p);
          }
        });
        setPlayers(opponentsMap);
      } catch (e) {}
    }
  }, [roomId, isClient, myId]);

  useEffect(() => {
    if (!roomId || !isClient || !myId) return;
    localStorage.setItem(STORAGE_KEYS.GUESSES(roomId, myId), JSON.stringify(myGuessedIds));
    localStorage.setItem(STORAGE_KEYS.GRID(roomId, myId), JSON.stringify(myGridStateArray));
  }, [myGuessedIds, myGridStateArray, roomId, isClient, myId]);

  useEffect(() => {
    if (!roomId || !isClient || players.size === 0) return;
    const opponentsArray = Array.from(players.values());
    localStorage.setItem(STORAGE_KEYS.OPPONENTS(roomId), JSON.stringify(opponentsArray));
  }, [players, roomId, isClient]);

  // Single WebSocket connection
  useEffect(() => {
    if (!roomId) return;
    
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
    const websocket = new WebSocket(`${wsUrl}/ws/game/${roomId}`);
    
    websocket.onopen = () => {
      console.log('✅ WebSocket connected');
      setIsConnected(true);
      websocket.send(JSON.stringify({
        type: 'join',
        playerId: myId,
        name: myName,
        guessedIds: myGuessedIds,
        gridState: myGridStateArray,
        requestChatHistory: true 
      }));

    }
    
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'ready_update') {
        setCurrentPlayers(data.ready)
      }


      // Game updates
      if (data.type === 'players_update') {
        const newPlayers = new Map();
        data.players.forEach((player: any) => {
          if (player.id !== myId) {
            newPlayers.set(player.id, {
              id: player.id,
              name: player.name,
              guessedIds: player.guessedIds || [],
              gridState: player.gridState || []
            });
          }
        });
        setPlayers(newPlayers);
      }
      
      if (data.type === 'player_joined') {
        if (data.playerId !== myId) {
          setPlayers(prev => {
            const updated = new Map(prev);
            updated.set(data.playerId, {
              id: data.playerId,
              name: data.name,
              guessedIds: data.guessedIds || [],
              gridState: data.gridState || []
            });
            return updated;
          });
        }
      }
      
      if (data.type === 'player_update') {
        if (data.playerId !== myId) {
          setPlayers(prev => {
            const updated = new Map(prev);
            updated.set(data.playerId, {
              id: data.playerId,
              name: data.name,
              guessedIds: data.guessedIds || [],
              gridState: data.gridState || []
            });
            return updated;
          });
        }
      }
      
      if (data.type === 'player_left') {
        setCurrentPlayers(prev => prev -1)
        setPlayers(prev => {
          const updated = new Map(prev);
          updated.delete(data.playerId);
          return updated;
        });
      }
      
      // Chat messages - forward to chat component via window event or context
      if (data.type === 'chat_message') {
        window.dispatchEvent(new CustomEvent('chat-message', { detail: data }));
      }

      if (data.type === 'chat_history') {
        console.log(`Received ${data.messages?.length || 0} historical chat messages`);
        if (data.messages && Array.isArray(data.messages)) {
          data.messages.forEach((msg: any) => {
            window.dispatchEvent(new CustomEvent('chat-message', { detail: msg }));
          });
        }
      }
    };
    
    websocket.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      setIsConnected(false);
    };
    
    websocket.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      setIsConnected(false);
      if (wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'ready_update',
          increment: -1
        }));
      }
    //  router.push('/')
    };
    
    wsRef.current = websocket;
    
    return () => {
      websocket.close();
    };
  }, [roomId, myId, myName]);

  const sendGameUpdate = useCallback((newGuessedIds: number[], newGridState: [string, string][]) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'player_update',
        playerId: myId,
        name: myName,
        guessedIds: newGuessedIds,
        gridState: newGridState
      }));
    }
  }, [myId, myName]);

  const sendChatMessage = useCallback((message: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && message.trim()) {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        message: message.trim()
      }));
    }
  }, []);

  const handleCellUpdate = useCallback((row: number, col: number, letter: string) => {
    setMyGridStateArray(prev => {
      const newArray = [...prev];
      const key = `${row},${col}`;
      const existingIndex = newArray.findIndex(([k]) => k === key);
      
      if (letter && letter.trim() !== '') {
        const newEntry: [string, string] = [key, letter.toUpperCase()];
        if (existingIndex >= 0) {
          newArray[existingIndex] = newEntry;
        } else {
          newArray.push(newEntry);
        }
      } else {
        if (existingIndex >= 0) {
          newArray.splice(existingIndex, 1);
        }
      }
      
      sendGameUpdate(myGuessedIds, newArray);
      return newArray;
    });
  }, [myGuessedIds, sendGameUpdate]);

  const handleGuessUpdate = useCallback((wordId: number, wordLetters?: { row: number; col: number; letter: string }[]) => {
    if (myGuessedIds.includes(wordId)) {
      return;
    }
    
    const newGuessedIds = [...myGuessedIds, wordId];
    
    if (wordLetters && wordLetters.length > 0) {
      const newGridState = [...myGridStateArray];
      wordLetters.forEach(({ row, col, letter }) => {
        const key = `${row},${col}`;
        const existingIndex = newGridState.findIndex(([k]) => k === key);
        const newEntry: [string, string] = [key, letter];
        
        if (existingIndex >= 0) {
          newGridState[existingIndex] = newEntry;
        } else {
          newGridState.push(newEntry);
        }
      });
      
      sendGameUpdate(newGuessedIds, newGridState);
      setMyGuessedIds(newGuessedIds);
      setMyGridStateArray(newGridState);
    } else {
      sendGameUpdate(newGuessedIds, myGridStateArray);
      setMyGuessedIds(newGuessedIds);
    }
  }, [myGuessedIds, myGridStateArray, sendGameUpdate]);

  const resetProgress = useCallback(() => {
    if (confirm('Are you sure you want to reset your progress?')) {
      const emptyGuesses: number[] = [];
      const emptyGrid: [string, string][] = [];
      sendGameUpdate(emptyGuesses, emptyGrid);
      setMyGuessedIds(emptyGuesses);
      setMyGridStateArray(emptyGrid);
      if (isClient && roomId && myId) {
        localStorage.removeItem(STORAGE_KEYS.GUESSES(roomId, myId));
        localStorage.removeItem(STORAGE_KEYS.GRID(roomId, myId));
      }
    }
  }, [roomId, myId, sendGameUpdate, isClient]);

  if (loading || !grid || !wordCoords) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  const totalWords = wordCoords.length;
  const otherPlayers = Array.from(players.values()).filter(p => p.id !== myId);

  console.log('Debug:', {
  currentPlayers,
  maxPlayers,
  gameInProgress,
  shouldShow: currentPlayers < maxPlayers && !gameInProgress
  });

  return (
    <>
      {/* Main content */}
      <main className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] p-6">
        <div className="max-w-full mx-auto">
          {/* Connection Status */}
          <div className="mb-6 flex justify-center">
            {isConnected ? (
              <div className="bg-green-500/20 text-green-200 px-4 py-2 rounded-lg text-sm">
                ✅ Connected | Players: {players.size + 1} | Words: {myGuessedIds.length}/{totalWords}
              </div>
            ) : (
              <div className="bg-yellow-500/20 text-yellow-200 px-4 py-2 rounded-lg text-sm">
                🔌 Connecting...
              </div>
            )}
          </div>

          {/* 3-column layout */}
          <div className="flex flex-col lg:flex-row gap-6 justify-center items-start">
            {/* LEFT - Chat - receives sendMessage function */}
            <div className="lg:w-80 flex-shrink-0">
              <Chat 
                sendMessage={sendChatMessage}
                isConnected={isConnected}
                username={myName}
                roomId={roomId} 
              />
            </div>
            
            {/* MIDDLE - Game */}
            <div className="flex-shrink-0">
              <CrosswordPuzzle 
                puzzleData={{ grid, words, wordCoords, puzzleId }}
                onGuessUpdate={handleGuessUpdate}
                onCellUpdate={handleCellUpdate}
                savedGuesses={myGuessedIds}
                savedGridState={myGridStateMap}
                onGameOver={handleGameComplete}
              />
            </div>
            
            {/* RIGHT - Opponents */}
            <div className="lg:w-80 flex-shrink-0">
              <div className="bg-white/10 backdrop-blur-sm p-5 rounded-2xl">
                <h2 className="text-white text-lg font-semibold mb-4 pb-2 border-b border-white/20">
                  Opponents
                </h2>
                
                {/* You */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">You</span>
                    <span className="text-white/70 text-sm">
                      {myGuessedIds.length}/{totalWords}
                    </span>
                  </div>
                  <OpponentView 
                    grid={grid}
                    wordCoords={wordCoords}
                    guessedWordIds={myGuessedIds}
                    size="sm"
                  />
                </div>

                {/* Other Players */}
                {otherPlayers.map((player) => (
                  <div key={player.id} className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium">{player.name}</span>
                      <span className="text-white/70 text-sm">
                        {player.guessedIds?.length || 0}/{totalWords}
                      </span>
                    </div>
                    <OpponentView 
                      grid={grid}
                      wordCoords={wordCoords}
                      guessedWordIds={player.guessedIds || []}
                      size="sm"
                    />
                  </div>
                ))}

                {otherPlayers.length === 0 && (
                  <div className="text-center text-white/50 text-sm py-8">
                    Waiting for other players...
                  </div>
                )}
                <div className="mt-4 pt-3 border-t border-white/10 text-white/50 text-xs text-center">
                  Press Enter to check words
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      
      {(currentPlayers < maxPlayers && !gameInProgress) && (<Ready
        max_players={maxPlayers}
        current_players={currentPlayers}
        ready_state={isReady}
        onReadyToggle={toggleReady}
      />)}
      {gameOver && (<GameOver
         winner_id='some dude'
      />)}
    </>
  );
}