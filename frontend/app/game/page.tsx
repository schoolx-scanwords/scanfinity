'use client';

import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { useRouter } from 'next/navigation';
import { usePuzzleData } from '../hooks/use_puzzle_data';
import { useAuth } from '../contexts/auth_context';
import { useLanguage } from '../contexts/LanguageContext';
import { LAYOUT_STYLES, TEXT_STYLES, COLORS } from '../styles/theme';
import CrosswordPuzzle from './components/game';
import OpponentView from './components/opponent_view';
import Chat from './components/chat';
import WaitingRoom from './components/WaitingRoom';
import LanguageSwitcher from '../components/LanguageSwitcher';
import GameOver from './components/GameOver';

interface Player {
  id: string;
  name: string;
  guessedIds: number[];
  gridState?: [string, string][];
  isGuest?: boolean;
  email?: string;
  isReady?: boolean;
  isAfk?: boolean;
}

interface WaitingPlayer {
  id: string;
  name: string;
  isReady: boolean;
  isGuest?: boolean;
  isHost?: boolean;
  joinOrder: number;
  isAfk?: boolean;
}

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: Date;
  isGuest?: boolean;
  email?: string;
}

interface PlayerWithScore {
  id: string;
  name: string;
  guessedIds: number[];
  isGuest?: boolean;
  isAfk?: boolean;
  score: number;
}

const ConnectionStatus = memo(({ 
  isActuallyConnected, 
  playerCount, 
  wordsFound, 
  totalWords 
}: { 
  isActuallyConnected: boolean; 
  playerCount: number; 
  wordsFound: number; 
  totalWords: number;
}) => {
  const [showConnected, setShowConnected] = useState(true);
  const disconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isActuallyConnected) {
      if (disconnectTimerRef.current) {
        clearTimeout(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
      }
      setShowConnected(true);
    } else {
      if (disconnectTimerRef.current) {
        clearTimeout(disconnectTimerRef.current);
      }
      disconnectTimerRef.current = setTimeout(() => {
        setShowConnected(false);
        disconnectTimerRef.current = null;
      }, 3000);
    }
    
    return () => {
      if (disconnectTimerRef.current) {
        clearTimeout(disconnectTimerRef.current);
      }
    };
  }, [isActuallyConnected]);

  return (
    <div className={`${showConnected ? 'bg-green-500/20 text-green-200' : 'bg-red-500/20 text-red-200'} px-4 py-2 rounded-lg text-sm transition-all duration-300`}>
      {showConnected ? '✅ Connected' : '❌ Disconnected'} | Players: {playerCount} | Words: {wordsFound}/{totalWords}
    </div>
  );
});

ConnectionStatus.displayName = 'ConnectionStatus';

const getMaxPlayersFromRoomId = (roomId: string): number => {
  const match = roomId.match(/\{(\d+)\}/);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return 2;
};

const getSessionId = (): string => {
  if (typeof window === 'undefined') return '';
  let sessionId = sessionStorage.getItem('game_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 10)}`;
    sessionStorage.setItem('game_session_id', sessionId);
  }
  return sessionId;
};

const getUserInfoFromStorage = () => {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('auth_token');
  const userStr = localStorage.getItem('auth_user');
  if (!token || !userStr) return null;
  try {
    const userData = JSON.parse(userStr);
    const isGuest = token === 'anonymous';
    return {
      id: isGuest ? userData.username : (userData.id || userData.username),
      name: userData.username,
      email: userData.email || '',
      isGuest: isGuest,
    };
  } catch {
    return null;
  }
};

export default function GamePage() {
  const router = useRouter();
  const { user: authUser, isLoading: authLoading } = useAuth();
  const { t } = useLanguage();
  const { grid, words, wordCoords, puzzleId, loading } = usePuzzleData();
  
  const [roomId, setRoomId] = useState<string>('');
  const [isActuallyConnected, setIsActuallyConnected] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [isReady, setIsReady] = useState(false);
  const [gameInProgress, setGameInProgress] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [showWaitingRoom, setShowWaitingRoom] = useState(true);
  const [waitingPlayers, setWaitingPlayers] = useState<WaitingPlayer[]>([]);
  const [isHostPlayer, setIsHostPlayer] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  // null = verifying room, true = valid, false = invalid (will redirect)
  const [isRoomValid, setIsRoomValid] = useState<boolean | null>(null);
  
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isOpponentsOpen, setIsOpponentsOpen] = useState(false);
  
  const [gameWinner, setGameWinner] = useState<{ id: string; name: string } | null>(null);
  const [playerFinalScore, setPlayerFinalScore] = useState(0);
  const [opponentFinalScore, setOpponentFinalScore] = useState(0);
  const [isDraw, setIsDraw] = useState(false);
  const [myGuessedIds, setMyGuessedIds] = useState<number[]>([]);
  const [myGridStateArray, setMyGridStateArray] = useState<[string, string][]>([]);
  const [players, setPlayers] = useState<Map<string, Player>>(new Map());
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  
  const wsRef = useRef<WebSocket | null>(null);
  const isConnectingRef = useRef(false);
  const completionCheckRef = useRef(false);
  const gameStartTimeRef = useRef<number>(0);
  const hasJoinedRef = useRef(false);
  const mountedRef = useRef(true);
  const redirectDoneRef = useRef(false);
  const afkTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isAfkRef = useRef(false);
  const isLeavingRef = useRef(false);
  const currentRoomIdRef = useRef<string>('');
  
  // Redirect to main page when lobby doesn't exist
  const redirectToMain = useCallback(() => {
    if (redirectDoneRef.current) return;
    redirectDoneRef.current = true;
    router.push('/');
  }, [router]);
  
  useEffect(() => {
    const savedChatState = localStorage.getItem('game_chat_open');
    const savedOpponentsState = localStorage.getItem('game_opponents_open');
    if (savedChatState !== null) setIsChatOpen(savedChatState === 'true');
    if (savedOpponentsState !== null) setIsOpponentsOpen(savedOpponentsState === 'true');
  }, []);
  
  useEffect(() => {
    localStorage.setItem('game_chat_open', String(isChatOpen));
  }, [isChatOpen]);
  
  useEffect(() => {
    localStorage.setItem('game_opponents_open', String(isOpponentsOpen));
  }, [isOpponentsOpen]);
  
  useEffect(() => {
    const handlePopState = () => {
      if (!isLeavingRef.current && mountedRef.current) {
        isLeavingRef.current = true;
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.close();
        }
        router.push('/lobby');
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [router]);
  
  const getUserInfo = useCallback(() => {
    if (authUser && authUser.username) {
      return {
        id: String(authUser.id || authUser.username),
        name: authUser.username,
        email: authUser.email || '',
        isGuest: false,
      };
    }
    return getUserInfoFromStorage();
  }, [authUser]);
  
  const userInfo = getUserInfo();
  const myId = userInfo?.id || '';
  const myName = userInfo?.name || '';
  const myEmail = userInfo?.email || '';
  const isGuest = userInfo?.isGuest || false;
  const isUserAuthenticated = userInfo !== null;
  
  const myGridStateMap = new Map(myGridStateArray);
  
  const getSortedPlayers = useCallback(() => {
    const totalWordsCount = wordCoords?.length || 0;
    const allPlayers: PlayerWithScore[] = [];
    
    allPlayers.push({
      id: myId,
      name: myName,
      guessedIds: myGuessedIds,
      isGuest: isGuest,
      isAfk: isAfkRef.current,
      score: myGuessedIds.length
    });
    
    players.forEach((player) => {
      allPlayers.push({
        id: player.id,
        name: player.name,
        guessedIds: player.guessedIds || [],
        isGuest: player.isGuest,
        isAfk: player.isAfk,
        score: (player.guessedIds || []).length
      });
    });
    
    const sorted = [...allPlayers];
    const currentPlayerIndex = sorted.findIndex(p => p.id === myId);
    const [currentPlayer] = sorted.splice(currentPlayerIndex, 1);
    sorted.sort((a, b) => b.score - a.score);
    
    return [currentPlayer, ...sorted];
  }, [myId, myName, myGuessedIds, isGuest, players, wordCoords?.length]);
  
  useEffect(() => {
    if (redirectDoneRef.current) return;
    if (typeof window === 'undefined') return;
    
    const timer = setTimeout(() => {
      if (!isUserAuthenticated && !redirectDoneRef.current && !authLoading) {
        redirectDoneRef.current = true;
        const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
        router.push(`/auth?return=${returnUrl}`);
      } else if (isUserAuthenticated) {
        redirectDoneRef.current = true;
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [isUserAuthenticated, authLoading, router]);
  
  useEffect(() => {
    setIsClient(true);
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      if (wsRef.current?.readyState === WebSocket.OPEN && !isLeavingRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (afkTimeoutRef.current) clearTimeout(afkTimeoutRef.current);
    };
  }, []);
  
  useEffect(() => {
    if (roomId) setMaxPlayers(getMaxPlayersFromRoomId(roomId));
  }, [roomId]);
  
  useEffect(() => {
    if (gameOver) return;
    
    const resetAfkTimer = () => {
      if (afkTimeoutRef.current) clearTimeout(afkTimeoutRef.current);
      
      if (isAfkRef.current) {
        isAfkRef.current = false;
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ 
            type: 'player_active', 
            playerId: myId, 
            afk: false 
          }));
        }
      }
      
      afkTimeoutRef.current = setTimeout(() => {
        if (!isAfkRef.current && mountedRef.current && !gameOver && isActuallyConnected) {
          isAfkRef.current = true;
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ 
              type: 'player_afk', 
              playerId: myId, 
              afk: true 
            }));
          }
        }
      }, 60000);
    };
    
    const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => window.addEventListener(event, resetAfkTimer));
    resetAfkTimer();
    
    return () => {
      events.forEach(event => window.removeEventListener(event, resetAfkTimer));
      if (afkTimeoutRef.current) clearTimeout(afkTimeoutRef.current);
    };
  }, [gameOver, myId, isActuallyConnected]);
  
  const handleStartGame = () => {
    setShowWaitingRoom(false);
    setGameInProgress(true);
    gameStartTimeRef.current = Date.now();
    completionCheckRef.current = false;
  };
  
  const toggleReady = () => {
    const newReadyState = !isReady;
    setIsReady(newReadyState);
    setWaitingPlayers(prev => prev.map(p => 
      p.id === myId ? { ...p, isReady: newReadyState } : p
    ));
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'ready_update', ready: newReadyState }));
    }
  };
  
  const onGameComplete = useCallback(() => {
    if (completionCheckRef.current) return;
    if (gameOver) return;
    
    const totalWordsCount = wordCoords?.length || 0;
    if (totalWordsCount === 0) return;
    
    const playerScore = myGuessedIds.length;
    
    const opponentScores: { id: string; name: string; score: number }[] = [];
    players.forEach((player) => {
      opponentScores.push({
        id: player.id,
        name: player.name,
        score: player.guessedIds?.length || 0
      });
    });
    
    const highestOpponent = opponentScores.length > 0 
      ? opponentScores.reduce((highest, current) => current.score > highest.score ? current : highest, opponentScores[0])
      : null;
    
    const opponentScore = highestOpponent?.score || 0;
    const isPlayerWinner = playerScore > opponentScore;
    const isGameDraw = playerScore === opponentScore;
    
    completionCheckRef.current = true;
    setPlayerFinalScore(playerScore);
    setOpponentFinalScore(opponentScore);
    
    if (isGameDraw) {
      setIsDraw(true);
      setGameWinner(null);
    } else if (isPlayerWinner) {
      setGameWinner({ id: myId, name: myName });
      setIsDraw(false);
    } else if (highestOpponent) {
      setGameWinner({ id: highestOpponent.id, name: highestOpponent.name });
      setIsDraw(false);
    }
    
    setGameOver(true);
    setGameInProgress(false);
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'game_complete',
        playerId: myId,
        winner_id: isPlayerWinner ? myId : (highestOpponent?.id || null),
        winner_name: isPlayerWinner ? myName : (highestOpponent?.name || null),
        player_score: playerScore,
        opponent_score: opponentScore,
        is_draw: isGameDraw
      }));
    }
  }, [myGuessedIds.length, players, myId, myName, wordCoords?.length, gameOver]);
  
  const checkGameCompletion = useCallback(() => {
    if (Date.now() - gameStartTimeRef.current < 2000) return;
    if (completionCheckRef.current) return;
    
    const totalWordsCount = wordCoords?.length || 0;
    if (totalWordsCount === 0) return;
    
    const allWordsFound = myGuessedIds.length === totalWordsCount;
    
    let anyOpponentDone = false;
    players.forEach((player) => {
      if ((player.guessedIds?.length || 0) === totalWordsCount) {
        anyOpponentDone = true;
      }
    });
    
    if ((allWordsFound || anyOpponentDone) && !gameOver) {
      onGameComplete();
    }
  }, [myGuessedIds.length, players, wordCoords?.length, gameOver, onGameComplete]);
  
  useEffect(() => {
    if (gameInProgress && !gameOver && wordCoords?.length) {
      const timer = setTimeout(() => checkGameCompletion(), 500);
      return () => clearTimeout(timer);
    }
  }, [myGuessedIds, players, gameInProgress, gameOver, wordCoords, checkGameCompletion]);
  
  const handlePlayAgain = useCallback(() => {
    if (isLeavingRef.current) return;
    
    console.log('Play again clicked - staying in same room:', roomId);
    
    // Send play_again message to server
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'play_again',
        playerId: myId
      }));
    }
    
    // Reset local state for the new game
    setGameOver(false);
    setGameWinner(null);
    setIsDraw(false);
    setPlayerFinalScore(0);
    setOpponentFinalScore(0);
    setMyGuessedIds([]);
    setMyGridStateArray([]);
    setGameInProgress(false);
    setShowWaitingRoom(true);
    setIsReady(false);
    completionCheckRef.current = false;
    gameStartTimeRef.current = 0;
    isAfkRef.current = false;
    
    // Clear local storage progress for this room
    if (roomId && myId) {
      localStorage.removeItem(`game_progress_${roomId}_${myId}_guesses`);
      localStorage.removeItem(`game_progress_${roomId}_${myId}_grid`);
    }
  }, [roomId, myId]);
  
  const handleReturnToLobby = useCallback(() => {
    if (isLeavingRef.current) return;
    isLeavingRef.current = true;
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.close();
      wsRef.current = null;
    }
    router.push('/lobby');
  }, [router]);
  
  const handleLeaveRoom = useCallback(() => {
    if (isLeavingRef.current) return;
    isLeavingRef.current = true;
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'leave',
        playerId: myId
      }));
      setTimeout(() => {
        if (wsRef.current) {
          wsRef.current.close();
          wsRef.current = null;
        }
      }, 100);
    }
    
    router.push('/lobby');
  }, [router, myId]);
  
  // Extract lobby ID from room string and set roomId
  useEffect(() => {
    if (!isClient) return;
    const urlParams = new URLSearchParams(window.location.search);
    let roomParam = urlParams.get('room');
    if (!roomParam) {
      const lastRoom = localStorage.getItem('current_game_room');
      if (lastRoom) {
        roomParam = lastRoom;
      } else {
        // Fallback – should not happen for legitimate room
        roomParam = `room_${Math.random().toString(36).substr(2, 9)}`;
      }
      window.history.replaceState({}, '', `?room=${roomParam}`);
    }
    setRoomId(roomParam);
    currentRoomIdRef.current = roomParam;
    localStorage.setItem('current_game_room', roomParam);
  }, [isClient]);
  
  // WebSocket connection and room validation
  useEffect(() => {
    if (!myId || !myName || !roomId) return;
    if (isConnectingRef.current || hasJoinedRef.current) return;
    
    isConnectingRef.current = true;
    const hostname = window.location.hostname;
    const wsUrl = (hostname === 'localhost' || hostname === '127.0.0.1') ? 'ws://localhost:8000' : `ws://${hostname}:8000`;
    const sessionId = getSessionId();
    
    const websocket = new WebSocket(`${wsUrl}/ws/game/${encodeURIComponent(roomId)}`);
    
    const connectionTimeout = setTimeout(() => {
      if (websocket.readyState !== WebSocket.OPEN && mountedRef.current) {
        websocket.close();
        setConnectionError('Connection timeout');
        setIsActuallyConnected(false);
        isConnectingRef.current = false;
        setIsRoomValid(false);
        redirectToMain();
      }
    }, 10000);
    
    websocket.onopen = () => {
      clearTimeout(connectionTimeout);
      setIsActuallyConnected(true);
      setConnectionError(null);
      
      websocket.send(JSON.stringify({
        type: 'join',
        playerId: myId,
        sessionId: sessionId,
        name: myName,
        email: myEmail,
        isGuest: isGuest,
        isReady: false,
        guessedIds: [],
        gridState: [],
        joinTime: Date.now(),
        requestChatHistory: true
      }));
      hasJoinedRef.current = true;
      isConnectingRef.current = false;
    };
    
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      // Error handling – if lobby doesn't exist, mark invalid and redirect
      if (data.type === 'error') {
        console.error('Server error:', data.message);
        setConnectionError(data.message);
        if (data.message && (data.message.includes('Lobby does not exist') || 
            data.message.includes('lobby no longer exists') ||
            data.message.includes('closed'))) {
          setIsRoomValid(false);
          redirectToMain();
        }
        return;
      }
      
      // Once we receive any non‑error message, the room is valid.
      if (isRoomValid === null) {
        setIsRoomValid(true);
      }
      
      if (data.type === 'game_reset_for_play_again') {
        console.log('Game reset for play again - showing waiting room');
        setGameOver(false);
        setGameWinner(null);
        setIsDraw(false);
        setPlayerFinalScore(0);
        setOpponentFinalScore(0);
        setMyGuessedIds([]);
        setMyGridStateArray([]);
        setGameInProgress(false);
        setShowWaitingRoom(true);
        setIsReady(false);
        completionCheckRef.current = false;
        gameStartTimeRef.current = 0;
        isAfkRef.current = false;
        return;
      }
      
      if (data.type === 'room_full') {
        setConnectionError('Room is full');
        setIsRoomValid(false);
        redirectToMain();
        return;
      }
      
      if (data.type === 'players_update') {
        const newPlayers = new Map();
        const waitingPlayersList: WaitingPlayer[] = [];
        const sortedPlayers = data.players || [];
        
        sortedPlayers.forEach((player: any) => {
          const playerData: WaitingPlayer = {
            id: player.id,
            name: player.isAfk && player.id !== myId ? `${player.name} (AFK)` : player.name,
            isReady: player.isReady || false,
            isGuest: player.isGuest || false,
            isHost: player.isHost || false,
            joinOrder: player.joinOrder || 0,
            isAfk: player.isAfk || false
          };
          
          if (player.id !== myId) {
            newPlayers.set(player.id, {
              id: player.id,
              name: player.name,
              email: player.email,
              isGuest: player.isGuest,
              guessedIds: player.guessedIds || [],
              gridState: player.gridState || [],
              isAfk: player.isAfk || false
            });
          }
          waitingPlayersList.push(playerData);
        });
        
        const uniquePlayers = waitingPlayersList.filter((p, i, self) => i === self.findIndex(t => t.id === p.id));
        uniquePlayers.sort((a, b) => a.joinOrder - b.joinOrder);
        setWaitingPlayers(uniquePlayers);
        setPlayers(newPlayers);
        setIsHostPlayer(uniquePlayers[0]?.id === myId);
      }
      
      if (data.type === 'player_reconnected') {
        setPlayers(prev => new Map(prev).set(data.playerId, {
          ...(prev.get(data.playerId) || {}),
          id: data.playerId,
          name: data.name,
          isGuest: data.isGuest,
          guessedIds: data.guessedIds || [],
          gridState: data.gridState || [],
          isAfk: false
        }));
        setWaitingPlayers(prev => prev.map(p => 
          p.id === data.playerId 
            ? { ...p, isAfk: false, name: p.name.replace(' (AFK)', '') }
            : p
        ));
      }
      
      if (data.type === 'player_afk') {
        setPlayers(prev => new Map(prev).set(data.playerId, {
          ...(prev.get(data.playerId) || {}),
          id: data.playerId,
          name: data.name,
          isGuest: data.isGuest,
          guessedIds: data.guessedIds || [],
          gridState: data.gridState || [],
          isAfk: data.afk
        }));
        setWaitingPlayers(prev => prev.map(p => 
          p.id === data.playerId 
            ? { ...p, isAfk: data.afk, name: data.afk ? `${p.name} (AFK)` : p.name.replace(' (AFK)', '') }
            : p
        ));
      }
      
      if (data.type === 'player_joined' && data.playerId !== myId) {
        setPlayers(prev => new Map(prev).set(data.playerId, {
          id: data.playerId,
          name: data.name,
          email: data.email,
          isGuest: data.isGuest,
          guessedIds: data.guessedIds || [],
          gridState: data.gridState || [],
          isAfk: false
        }));
        setWaitingPlayers(prev => {
          if (prev.some(p => p.id === data.playerId)) return prev;
          const updated = [...prev, {
            id: data.playerId,
            name: data.name,
            isReady: false,
            isGuest: data.isGuest,
            isHost: false,
            joinOrder: data.joinOrder || Date.now(),
            isAfk: false
          }];
          updated.sort((a, b) => a.joinOrder - b.joinOrder);
          return updated;
        });
      }
      
      if (data.type === 'player_update' && data.playerId !== myId) {
        setPlayers(prev => new Map(prev).set(data.playerId, {
          id: data.playerId,
          name: data.name,
          email: data.email,
          isGuest: data.isGuest,
          guessedIds: data.guessedIds || [],
          gridState: data.gridState || [],
          isAfk: data.isAfk || false
        }));
        setWaitingPlayers(prev => prev.map(p => 
          p.id === data.playerId 
            ? { ...p, isReady: data.isReady || false, isAfk: data.isAfk || false }
            : p
        ));
      }
      
      if (data.type === 'player_left') {
        setPlayers(prev => { const updated = new Map(prev); updated.delete(data.playerId); return updated; });
        setWaitingPlayers(prev => {
          const filtered = prev.filter(p => p.id !== data.playerId);
          filtered.sort((a, b) => a.joinOrder - b.joinOrder);
          if (filtered.length) setIsHostPlayer(filtered[0].id === myId);
          return filtered;
        });
      }
      
      if (data.type === 'game_start') {
        setShowWaitingRoom(false);
        setGameInProgress(true);
        gameStartTimeRef.current = Date.now();
        completionCheckRef.current = false;
      }
      
      if (data.type === 'game_complete') {
        setGameWinner(data.winner_id ? { id: data.winner_id, name: data.winner_name } : null);
        setPlayerFinalScore(data.player_score || 0);
        setOpponentFinalScore(data.opponent_score || 0);
        setIsDraw(data.is_draw || false);
        setGameOver(true);
        setGameInProgress(false);
      }
      
      if (data.type === 'chat_message') {
        const newMessage: ChatMessage = {
          id: `${data.timestamp}-${Math.random()}`,
          username: data.username || data.name,
          message: data.message,
          timestamp: new Date(data.timestamp || Date.now()),
          isGuest: data.isGuest,
          email: data.email
        };
        setChatMessages(prev => [...prev, newMessage]);
      }
      
      if (data.type === 'chat_history') {
        const historyMessages: ChatMessage[] = data.messages.map((msg: any) => ({
          id: `${msg.timestamp}-${msg.username}-${Math.random()}`,
          username: msg.username || msg.name,
          message: msg.message,
          timestamp: new Date(msg.timestamp),
          isGuest: msg.isGuest,
          email: msg.email
        }));
        historyMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        setChatMessages(historyMessages);
      }
    };
    
    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsActuallyConnected(false);
      setConnectionError('Connection failed');
      isConnectingRef.current = false;
      setIsRoomValid(false);
      redirectToMain();
    };
    
    websocket.onclose = (event) => {
      clearTimeout(connectionTimeout);
      setIsActuallyConnected(false);
      isConnectingRef.current = false;
      hasJoinedRef.current = false;
      
      // If we never validated the room (isRoomValid still null) and close code indicates policy violation or reason mentions lobby,
      // or if we already know it's invalid, redirect.
      if (event.code === 1008 || (event.reason && event.reason.includes('Lobby does not exist'))) {
        setIsRoomValid(false);
        redirectToMain();
      } else if (isRoomValid === null) {
        // Closed before any valid message, likely room doesn't exist or other error
        setIsRoomValid(false);
        redirectToMain();
      }
    };
    
    wsRef.current = websocket;
    return () => {
      clearTimeout(connectionTimeout);
      isConnectingRef.current = false;
      if (wsRef.current?.readyState === WebSocket.OPEN && !isLeavingRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      hasJoinedRef.current = false;
    };
  }, [roomId, myId, myName, myEmail, isGuest, redirectToMain]);
  
  const sendGameUpdate = useCallback((newGuessedIds: number[], newGridState: [string, string][]) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'player_update',
        playerId: myId,
        name: myName,
        email: myEmail,
        isGuest: isGuest,
        isReady: isReady,
        guessedIds: newGuessedIds,
        gridState: newGridState
      }));
    }
  }, [myId, myName, myEmail, isGuest, isReady]);
  
  const sendChatMessage = useCallback((message: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && message.trim()) {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        message: message.trim(),
        username: myName,
        email: myEmail,
        isGuest: isGuest
      }));
    }
  }, [myName, myEmail, isGuest]);
  
  const handleCellUpdate = useCallback((row: number, col: number, letter: string) => {
    setMyGridStateArray(prev => {
      const key = `${row},${col}`;
      const existingIndex = prev.findIndex(([k]) => k === key);
      const newArray = [...prev];
      if (letter?.trim()) {
        const newEntry: [string, string] = [key, letter.toUpperCase()];
        if (existingIndex >= 0) newArray[existingIndex] = newEntry;
        else newArray.push(newEntry);
      } else if (existingIndex >= 0) {
        newArray.splice(existingIndex, 1);
      }
      sendGameUpdate(myGuessedIds, newArray);
      return newArray;
    });
  }, [myGuessedIds, sendGameUpdate]);
  
  const handleGuessUpdate = useCallback((wordId: number, wordLetters?: { row: number; col: number; letter: string }[]) => {
    if (myGuessedIds.includes(wordId)) return;
    const newGuessedIds = [...myGuessedIds, wordId];
    if (wordLetters?.length) {
      const newGridState = [...myGridStateArray];
      wordLetters.forEach(({ row, col, letter }) => {
        const key = `${row},${col}`;
        const idx = newGridState.findIndex(([k]) => k === key);
        if (idx >= 0) newGridState[idx] = [key, letter];
        else newGridState.push([key, letter]);
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
    if (confirm('Reset your progress?')) {
      sendGameUpdate([], []);
      setMyGuessedIds([]);
      setMyGridStateArray([]);
    }
  }, [sendGameUpdate]);
  
  const connectionStatusProps = {
    isActuallyConnected: isActuallyConnected,
    playerCount: players.size + 1,
    wordsFound: myGuessedIds.length,
    totalWords: wordCoords?.length || 0,
  };
  
  // 1) Show loading spinner while room validity is being checked
  if (isRoomValid === null) {
    return (
      <div className={`${LAYOUT_STYLES.container} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <div className={`${TEXT_STYLES.heading} text-xl`}>Connecting to game...</div>
        </div>
      </div>
    );
  }
  
  // 2) If room is invalid, show nothing (redirect already triggered)
  if (isRoomValid === false) {
    return null;
  }
  
  // 3) Normal rendering (room is valid)
  if (!isUserAuthenticated) {
    return (
      <div className={`${LAYOUT_STYLES.container} flex items-center justify-center`}>
        <div className={`${TEXT_STYLES.heading} text-xl`}>Redirecting to login...</div>
      </div>
    );
  }
  
  if (!myId || !myName) {
    return (
      <div className={`${LAYOUT_STYLES.container} flex items-center justify-center`}>
        <div className={`${TEXT_STYLES.heading} text-xl`}>Loading user...</div>
      </div>
    );
  }
  
  if (gameOver) {
    return (
      <>
        <LanguageSwitcher />
        <GameOver
          winnerId={gameWinner?.id}
          winnerName={gameWinner?.name}
          playerScore={playerFinalScore}
          opponentScore={opponentFinalScore}
          isDraw={isDraw}
          onPlayAgain={handlePlayAgain}
          onReturnToLobby={handleReturnToLobby}
          currentPlayerId={myId}
          currentPlayerName={myName}
        />
      </>
    );
  }
  
  if (connectionError) {
    return (
      <div className={`${LAYOUT_STYLES.container} flex items-center justify-center`}>
        <div className="bg-red-500/20 backdrop-blur-sm rounded-2xl p-8 max-w-md text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className={`${TEXT_STYLES.heading} text-xl font-bold mb-3`}>Error</h2>
          <p className={`${COLORS.textSecondary} text-sm mb-6`}>{connectionError}</p>
          <button onClick={() => window.location.reload()} className={`px-6 py-2 rounded-xl ${COLORS.buttonBg} ${COLORS.buttonBgHover} ${COLORS.buttonText} font-semibold transition-all`}>Retry</button>
        </div>
      </div>
    );
  }
  
  if (showWaitingRoom && !gameInProgress) {
    return (
      <WaitingRoom
        roomId={roomId}
        players={waitingPlayers}
        currentPlayerId={myId}
        maxPlayers={maxPlayers}
        isReady={isReady}
        onReadyToggle={toggleReady}
        onStartGame={handleStartGame}
        isHost={isHostPlayer}
        sendChatMessage={sendChatMessage}
        chatMessages={chatMessages}
        isConnected={isActuallyConnected}
        username={myName}
        isGuest={isGuest}
        onLeaveRoom={handleLeaveRoom}
      />
    );
  }
  
  if (loading || !grid || !wordCoords) {
    return (
      <div className={`${LAYOUT_STYLES.container} flex items-center justify-center`}>
        <div className={`${TEXT_STYLES.heading} text-xl`}>Loading puzzle...</div>
      </div>
    );
  }
  
  const totalWords = wordCoords.length;
  const sortedPlayers = getSortedPlayers();
  
  return (
    <>
      <LanguageSwitcher />
      <main className={`${LAYOUT_STYLES.container} relative overflow-hidden`}>
        <div className="max-w-full mx-auto p-6">
          <div className="mb-6 flex justify-center gap-3">
            <ConnectionStatus {...connectionStatusProps} />
            <button onClick={resetProgress} className="bg-red-500/20 text-red-200 px-4 py-2 rounded-lg text-sm hover:bg-red-500/30 transition-all">Reset Progress</button>
          </div>
          
          <div className="flex justify-center items-center">
            <CrosswordPuzzle 
              puzzleData={{ grid, words, wordCoords, puzzleId }} 
              onGuessUpdate={handleGuessUpdate} 
              onCellUpdate={handleCellUpdate} 
              savedGuesses={myGuessedIds} 
              savedGridState={myGridStateMap} 
              onGameOver={onGameComplete} 
            />
          </div>
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsOpponentsOpen(!isOpponentsOpen);
          }}
          className="fixed left-0 top-1/2 transform -translate-y-1/2 bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 text-white px-2 py-8 rounded-r-xl shadow-lg transition-all duration-300 z-30"
          style={{ writingMode: 'vertical-rl' }}
        >
          <span className="text-sm font-semibold tracking-wider">
            {isOpponentsOpen ? '→' : '←'} OPPONENTS
          </span>
        </button>
        
        <div
          className={`fixed left-0 top-0 h-full w-96 bg-gradient-to-b from-gray-900/95 to-gray-800/95 backdrop-blur-md shadow-2xl transition-transform duration-300 ease-in-out z-20 ${
            isOpponentsOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-white/20">
              <h2 className={`${TEXT_STYLES.heading} text-xl font-semibold text-white`}>
                Players & Scores
              </h2>
              <button
                onClick={() => setIsOpponentsOpen(false)}
                className="text-white/70 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {sortedPlayers.map((player) => {
                const isCurrentPlayer = player.id === myId;
                return (
                  <div
                    key={player.id}
                    className={`p-4 rounded-xl transition-all ${
                      isCurrentPlayer
                        ? 'bg-gradient-to-r from-purple-600/30 to-purple-800/30 border border-purple-500/50'
                        : 'bg-white/5 hover:bg-white/10'
                    } ${player.isAfk ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white">
                          {player.name}
                          {isCurrentPlayer && " (You)"}
                        </span>
                        {player.isGuest && (
                          <span className="text-xs bg-yellow-500/20 text-yellow-200 px-2 py-0.5 rounded">
                            Guest
                          </span>
                        )}
                        {player.isAfk && (
                          <span className="text-xs bg-gray-500/20 text-gray-200 px-2 py-0.5 rounded">
                            AFK
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-purple-400">
                          {player.score}
                        </div>
                        <div className="text-xs text-white/50">
                          /{totalWords} words
                        </div>
                      </div>
                    </div>
                    <OpponentView
                      grid={grid}
                      wordCoords={wordCoords}
                      guessedWordIds={player.guessedIds}
                      size="sm"
                      isAfk={player.isAfk}
                    />
                  </div>
                );
              })}
            </div>
            
            <div className="mt-4 pt-3 border-t border-white/10 text-white/40 text-xs text-center">
              Sorted by score • Higher is better
            </div>
          </div>
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsChatOpen(!isChatOpen);
          }}
          className="fixed right-0 top-1/2 transform -translate-y-1/2 bg-gradient-to-l from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 text-white px-2 py-8 rounded-l-xl shadow-lg transition-all duration-300 z-30"
          style={{ writingMode: 'vertical-rl' }}
        >
          <span className="text-sm font-semibold tracking-wider">
            {isChatOpen ? '←' : '→'} CHAT
          </span>
        </button>
        
        <div
          className={`fixed right-0 top-0 h-full w-96 bg-gradient-to-b from-gray-900/95 to-gray-800/95 backdrop-blur-md shadow-2xl transition-transform duration-300 ease-in-out z-20 ${
            isChatOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-white/20 flex justify-between items-center">
              <div>
                <h2 className={`${TEXT_STYLES.heading} text-lg font-semibold text-white`}>
                  Game Chat
                </h2>
                <p className={`${COLORS.textTertiary} text-xs mt-1`}>
                  Chatting as: 
                  <span className={`${COLORS.textPrimary} ml-1 font-medium`}>
                    {myName}
                    {isGuest && <span className="text-xs text-yellow-500/70 ml-1">(Guest)</span>}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="text-white/70 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-black/20">
              <div className="space-y-3">
                {chatMessages.map((msg) => {
                  const isOwnMessage = msg.username === myName;
                  return (
                    <div key={msg.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-semibold ${isOwnMessage ? 'text-green-400' : 'text-blue-400'}`}>
                            {msg.username}
                            {msg.isGuest && <span className="text-xs text-yellow-500/70 ml-1">(Guest)</span>}
                          </span>
                          <span className="text-xs text-white/40">
                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className={`px-3 py-2 text-sm text-white break-words ${
                          isOwnMessage 
                            ? 'bg-green-500/20 rounded-lg rounded-tr-none' 
                            : 'bg-white/10 rounded-lg rounded-tl-none'
                        }`}>
                          {msg.message}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {chatMessages.length === 0 && (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-white/50 text-center">
                      <p className="text-sm mb-1">💬 No messages yet</p>
                      <p className="text-xs">Be the first to say hi!</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4 border-t border-white/20">
              <div className="flex gap-2">
                <input
                  type="text"
                  id="chat-input"
                  placeholder={isActuallyConnected ? "Type a message..." : "Connecting..."}
                  disabled={!isActuallyConnected}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed bg-black/40 text-white border-gray-600 focus:ring-purple-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      e.stopPropagation();
                      const input = e.target as HTMLInputElement;
                      if (input.value.trim() && isActuallyConnected) {
                        sendChatMessage(input.value.trim());
                        input.value = '';
                      }
                    }
                  }}
                />
                <button
                  onClick={() => {
                    const input = document.getElementById('chat-input') as HTMLInputElement;
                    if (input.value.trim() && isActuallyConnected) {
                      sendChatMessage(input.value.trim());
                      input.value = '';
                    }
                  }}
                  disabled={!isActuallyConnected}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all bg-[#754CA880] hover:bg-[#754CA8] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.5);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 92, 246, 0.8);
        }
      `}</style>
    </>
  );
}