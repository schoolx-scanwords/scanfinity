'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { LAYOUT_STYLES, TEXT_STYLES, COLORS } from '../../styles/theme';

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

interface WaitingRoomProps {
  roomId: string;
  players: WaitingPlayer[];
  currentPlayerId: string;
  maxPlayers: number;
  isReady: boolean;
  onReadyToggle: () => void;
  onStartGame: () => void;
  isHost: boolean;
  sendChatMessage?: (message: string) => void;
  chatMessages?: ChatMessage[];
  isConnected?: boolean;
  username?: string;
  isGuest?: boolean;
  onLeaveRoom?: () => void;
}

export default function WaitingRoom({
  roomId,
  players,
  currentPlayerId,
  maxPlayers,
  isReady,
  onReadyToggle,
  onStartGame,
  isHost,
  sendChatMessage,
  chatMessages = [],
  isConnected = true,
  username = '',
  isGuest = false,
  onLeaveRoom
}: WaitingRoomProps) {
  const router = useRouter();
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isClient, setIsClient] = useState(false);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isLeavingRef = useRef(false);
  
  const activePlayers = players.filter(p => !p.isAfk);
  const isRoomFull = activePlayers.length === maxPlayers;
  const allPlayersReady = activePlayers.length === maxPlayers && activePlayers.every(p => p.isReady);
  
  // Handle page/tab close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isLeavingRef.current && onLeaveRoom) {
        // Send leave message synchronously (best effort)
        onLeaveRoom();
      }
      // Show confirmation dialog
      e.preventDefault();
      e.returnValue = 'Are you sure you want to leave the waiting room?';
      return 'Are you sure you want to leave the waiting room?';
    };
    
    const handleVisibilityChange = () => {
      if (document.hidden && !isLeavingRef.current && onLeaveRoom) {
        // Tab became hidden, user might be closing it
        onLeaveRoom();
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [onLeaveRoom]);
  
  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (!isLeavingRef.current && onLeaveRoom) {
        isLeavingRef.current = true;
        onLeaveRoom();
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [onLeaveRoom]);
  
  // Fix hydration mismatch by only rendering after client-side mount
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isChatOpen && messagesEndRef.current && isClient) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatOpen, isClient]);
  
  // Timer logic - only runs when room is full
  useEffect(() => {
    // Clear existing countdown
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    
    if (isRoomFull && !allPlayersReady) {
      // Start countdown when room is full but not all ready
      setCountdown(30);
      
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            // Clear interval when countdown reaches 0
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = null;
            }
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      // Cancel countdown if room is not full or all players are ready
      setCountdown(null);
    }
    
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [isRoomFull, allPlayersReady]);
  
  // Auto-start game when countdown reaches 0 and host is present
  useEffect(() => {
    if (countdown === 0 && isHost && isRoomFull) {
      onStartGame();
    }
  }, [countdown, isHost, isRoomFull, onStartGame]);
  
  // Format room ID for display
  const displayRoomId = roomId.replace(/[{}]/g, '').replace(/\d+$/, '');
  
  // Get status text
  const getStatusText = () => {
    if (!isRoomFull) {
      return `Waiting for players... (${activePlayers.length}/${maxPlayers})`;
    }
    if (allPlayersReady) {
      return "All players ready! Starting game...";
    }
    if (countdown !== null) {
      return `Room full! Game starting in ${countdown} seconds...`;
    }
    return `Room full! Waiting for all players to ready up...`;
  };
  
  // Get current player's AFK status
  const currentPlayer = players.find(p => p.id === currentPlayerId);
  const isCurrentPlayerAfk = currentPlayer?.isAfk || false;
  
  const handleSendMessage = useCallback(() => {
    if (inputMessage.trim() && sendChatMessage && isConnected) {
      sendChatMessage(inputMessage.trim());
      setInputMessage('');
    }
  }, [inputMessage, sendChatMessage, isConnected]);
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);
  
  const handleLeaveRoomClick = useCallback(() => {
    if (isLeavingRef.current) return;
    isLeavingRef.current = true;
    
    if (onLeaveRoom) {
      onLeaveRoom();
    } else {
      // Fallback: navigate to lobby
      router.push('/lobby');
    }
  }, [onLeaveRoom, router]);
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Don't render until client-side to avoid hydration mismatch
  if (!isClient) {
    return null;
  }
  
  return (
    <div className={`${LAYOUT_STYLES.container} flex items-center justify-center min-h-screen p-4 relative overflow-hidden`}>
      {/* Main Waiting Room Content */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 max-w-2xl w-full">
        {/* Room Info */}
        <div className="text-center mb-8">
          <h1 className={`${TEXT_STYLES.heading} text-3xl font-bold mb-2`}>
            Game Room
          </h1>
          <p className={`${COLORS.textSecondary} text-sm`}>
            Room Code: <span className="font-mono text-white">{displayRoomId}</span>
          </p>
          <p className={`${COLORS.textTertiary} text-xs mt-2`}>
            Share this code with friends to join
          </p>
        </div>
        
        {/* Status */}
        <div className={`mb-6 p-3 rounded-lg text-center ${
          isRoomFull 
            ? allPlayersReady 
              ? 'bg-green-500/20 text-green-200' 
              : 'bg-yellow-500/20 text-yellow-200'
            : 'bg-blue-500/20 text-blue-200'
        }`}>
          <p className="text-sm font-medium">
            {getStatusText()}
          </p>
          {countdown !== null && !allPlayersReady && (
            <div className="mt-2 text-2xl font-bold">
              {countdown}
            </div>
          )}
        </div>
        
        {/* Players List */}
        <div className="mb-8">
          <h2 className={`${TEXT_STYLES.heading} text-lg font-semibold mb-4`}>
            Players ({players.length}/{maxPlayers})
          </h2>
          <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
            {players.map((player) => (
              <div
                key={player.id}
                className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                  player.isAfk
                    ? 'bg-gray-500/20 opacity-60'
                    : player.id === currentPlayerId
                    ? 'bg-purple-500/20 border border-purple-500/50'
                    : 'bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">
                      {player.name}
                      {player.id === currentPlayerId && " (You)"}
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
                    {player.isHost && (
                      <span className="text-xs bg-blue-500/20 text-blue-200 px-2 py-0.5 rounded">
                        Host
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  {player.isReady ? (
                    <span className="text-green-400 text-sm font-medium">✓ Ready</span>
                  ) : (
                    <span className="text-gray-400 text-sm">Not Ready</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={onReadyToggle}
            disabled={isCurrentPlayerAfk}
            className={`px-8 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 ${
              isReady
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-green-500 hover:bg-green-600 text-white'
            } ${isCurrentPlayerAfk ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isReady ? "Cancel Ready" : "Ready Up"}
          </button>
          
          {isHost && isRoomFull && !allPlayersReady && (
            <button
              onClick={() => {
                onStartGame();
              }}
              className="px-8 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 bg-purple-500 hover:bg-purple-600 text-white"
            >
              Force Start Game
            </button>
          )}
          
          {/* Leave Room Button */}
          <button
            onClick={handleLeaveRoomClick}
            className="px-8 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 bg-gray-500 hover:bg-gray-600 text-white"
          >
            Leave Room
          </button>
        </div>
        
        {/* Info Text */}
        <div className="mt-6 text-center">
          <p className={`${COLORS.textTertiary} text-xs`}>
            {isHost 
              ? "As host, the game will auto-start when the room is full and everyone is ready"
              : "Wait for the host to start the game"}
          </p>
          <p className={`${COLORS.textTertiary} text-xs mt-2`}>
            Leaving the room will return you to the lobby
          </p>
        </div>
      </div>
      
      {/* Chat Toggle Button */}
      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed right-0 top-1/2 transform -translate-y-1/2 bg-gradient-to-l from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 text-white px-2 py-8 rounded-l-xl shadow-lg transition-all duration-300 z-30"
        style={{ writingMode: 'vertical-rl' }}
      >
        <span className="text-sm font-semibold tracking-wider">
          {isChatOpen ? '←' : '→'} CHAT
        </span>
      </button>
      
      {/* Chat Panel */}
      <div
        className={`fixed right-0 top-0 h-full w-96 bg-gradient-to-b from-gray-900/95 to-gray-800/95 backdrop-blur-md shadow-2xl transition-transform duration-300 ease-in-out z-20 ${
          isChatOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-white/20 flex justify-between items-center">
            <div>
              <h2 className={`${TEXT_STYLES.heading} text-lg font-semibold text-white`}>
                Waiting Room Chat
              </h2>
              <p className={`${COLORS.textTertiary} text-xs mt-1`}>
                Chatting as: 
                <span className={`${COLORS.textPrimary} ml-1 font-medium`}>
                  {username || 'Guest'}
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
            {chatMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-white/50 text-center">
                  <p className="text-sm mb-1">💬 No messages yet</p>
                  <p className="text-xs">Be the first to say hi!</p>
                </div>
              </div>
            ) : (
              chatMessages.map((msg) => {
                const isOwnMessage = msg.username === username;
                return (
                  <div key={msg.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-semibold ${isOwnMessage ? 'text-green-400' : 'text-blue-400'}`}>
                          {msg.username}
                          {msg.isGuest && <span className="text-xs text-yellow-500/70 ml-1">(Guest)</span>}
                        </span>
                        <span className="text-xs text-white/40">
                          {formatTime(new Date(msg.timestamp))}
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
              })
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="p-4 border-t border-white/20">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isConnected ? "Type a message..." : "Connecting..."}
                disabled={!isConnected || !sendChatMessage}
                className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed bg-black/40 text-white border-gray-600 focus:ring-purple-500"
              />
              <button
                onClick={handleSendMessage}
                disabled={!isConnected || !inputMessage.trim() || !sendChatMessage}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all bg-[#754CA880] hover:bg-[#754CA8] text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Custom scrollbar styles */}
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
    </div>
  );
}