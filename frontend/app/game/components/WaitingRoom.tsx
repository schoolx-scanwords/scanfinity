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
  isRanked?: boolean;
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
  onLeaveRoom,
  isRanked = false
}: WaitingRoomProps) {
  const router = useRouter();
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isLeavingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastReadMessageIdRef = useRef<string | null>(null);
  
  const activePlayers = players.filter(p => !p.isAfk);
  const isRoomFull = activePlayers.length === maxPlayers;
  const allPlayersReady = activePlayers.length === maxPlayers && activePlayers.every(p => p.isReady);
  
  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Track unread messages
  useEffect(() => {
    if (isChatOpen) {
      if (chatMessages.length > 0) {
        lastReadMessageIdRef.current = chatMessages[chatMessages.length - 1].id;
        setHasUnreadMessages(false);
      }
    } else {
      if (chatMessages.length > 0) {
        const lastMessageId = chatMessages[chatMessages.length - 1].id;
        if (lastReadMessageIdRef.current !== lastMessageId) {
          setHasUnreadMessages(true);
        }
      }
    }
  }, [chatMessages, isChatOpen]);
  
  // Handle page/tab close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isLeavingRef.current && onLeaveRoom) {
        onLeaveRoom();
      }
      e.preventDefault();
      e.returnValue = 'Are you sure you want to leave the waiting room?';
      return 'Are you sure you want to leave the waiting room?';
    };
    
    const handleVisibilityChange = () => {
      if (document.hidden && !isLeavingRef.current && onLeaveRoom) {
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
    const handlePopState = () => {
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
  
  // Fix hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isChatOpen && messagesEndRef.current && isClient) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatOpen, isClient]);
  
  // Focus input when chat opens
  useEffect(() => {
    if (isChatOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isChatOpen]);
  
  // Timer logic
  useEffect(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    
    if (!isRanked && isRoomFull && !allPlayersReady) {
      setCountdown(30);
      
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
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
      setCountdown(null);
    }
    
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [isRoomFull, allPlayersReady, isRanked]);
  
  // Auto-start game
  useEffect(() => {
    if (!isRanked && countdown === 0 && isHost && isRoomFull) {
      onStartGame();
    }
  }, [countdown, isHost, isRoomFull, onStartGame, isRanked]);
  
  // Close chat when game starts
  useEffect(() => {
    if (!isRanked && (allPlayersReady || countdown === 0)) {
      setIsChatOpen(false);
    }
  }, [allPlayersReady, countdown, isRanked]);
  
  const handleSendMessage = useCallback(() => {
    if (inputMessage.trim() && sendChatMessage && isConnected) {
      sendChatMessage(inputMessage.trim());
      setInputMessage('');
      // Keep focus on input after sending
      setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
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
      router.push('/lobby');
    }
  }, [onLeaveRoom, router]);
  
  const toggleChat = useCallback(() => {
    setIsChatOpen(prev => !prev);
  }, []);
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const displayRoomId = roomId.replace(/[{}]/g, '').replace(/\d+$/, '');
  
  const getStatusText = () => {
    if (isRanked) {
      if (!isRoomFull) {
        return `Waiting for opponent... (${activePlayers.length}/${maxPlayers})`;
      }
      if (allPlayersReady) {
        return "Opponent found! Starting game...";
      }
      return "Opponent found! Waiting for both players to ready up...";
    }
    
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
  
  const currentPlayer = players.find(p => p.id === currentPlayerId);
  const isCurrentPlayerAfk = currentPlayer?.isAfk || false;
  
  // Don't render until client-side
  if (!isClient) {
    return null;
  }
  
  // Desktop view
  if (!isMobile) {
    return (
      <div className={`${LAYOUT_STYLES.container} flex items-center justify-center min-h-screen p-4 relative overflow-hidden`}>
        {/* Main Waiting Room Content */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 max-w-2xl w-full">
          {/* Room Info */}
          <div className="text-center mb-8">
            <h1 className={`${TEXT_STYLES.heading} text-3xl font-bold mb-2`}>
              {isRanked ? "Ranked Match" : "Game Room"}
            </h1>
            {!isRanked && (
              <>
                <p className={`${COLORS.textSecondary} text-sm`}>
                  Room Code: <span className="font-mono text-white">{displayRoomId}</span>
                </p>
                <p className={`${COLORS.textTertiary} text-xs mt-2`}>
                  Share this code with friends to join
                </p>
              </>
            )}
            {isRanked && (
              <p className={`${COLORS.textSecondary} text-sm mt-2`}>
                🏆 Competitive Match • ELO Rating at stake
              </p>
            )}
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
            {!isRanked && countdown !== null && !allPlayersReady && (
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
                      {!isRanked && player.isHost && (
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
            
            {!isRanked && isHost && isRoomFull && !allPlayersReady && (
              <button
                onClick={() => onStartGame()}
                className="px-8 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 bg-purple-500 hover:bg-purple-600 text-white"
              >
                Force Start Game
              </button>
            )}
            
            <button
              onClick={handleLeaveRoomClick}
              className="px-8 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 bg-gray-500 hover:bg-gray-600 text-white"
            >
              Leave Room
            </button>
          </div>
          
          {/* Info Text */}
          <div className="mt-6 text-center">
            {!isRanked ? (
              <>
                <p className={`${COLORS.textTertiary} text-xs`}>
                  {isHost 
                    ? "As host, the game will auto-start when the room is full and everyone is ready"
                    : "Wait for the host to start the game"}
                </p>
                <p className={`${COLORS.textTertiary} text-xs mt-2`}>
                  Leaving the room will return you to the lobby
                </p>
              </>
            ) : (
              <>
                <p className={`${COLORS.textTertiary} text-xs`}>
                  Both players must ready up to start the ranked match
                </p>
                <p className={`${COLORS.textTertiary} text-xs mt-2`}>
                  🏆 Winning increases your ELO rating • Losing decreases it
                </p>
              </>
            )}
          </div>
        </div>
        
        {/* Desktop Chat Button */}
        <button
          onClick={toggleChat}
          className="fixed right-6 top-1/2 -translate-y-1/2 z-[10000] rounded-full p-3 shadow-lg transition-all duration-300 hover:scale-105"
          style={{ 
            backgroundColor: '#754CA8',
            display: isChatOpen ? 'none' : 'flex'
          }}
          aria-label="Toggle chat"
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
                d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z"
                fill="currentColor"
              />
              <circle cx="12" cy="10" r="2" fill="white" />
              <circle cx="7" cy="10" r="2" fill="white" />
              <circle cx="17" cy="10" r="2" fill="white" />
            </svg>
            {hasUnreadMessages && !isChatOpen && (
              <span className="absolute -top-1 -right-1 block h-3.5 w-3.5 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
            )}
          </div>
        </button>
        
        {/* Desktop Chat Panel */}
        <div
          className={`fixed right-0 top-1/2 transform -translate-y-1/2 w-96 transition-all duration-300 ease-in-out z-50 ${
            isChatOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'
          }`}
          style={{ height: '600px', maxHeight: '80vh' }}
        >
          <div className="bg-gray-900/95 backdrop-blur-sm rounded-l-2xl overflow-hidden will-change-transform h-full flex flex-col shadow-2xl border-l border-t border-b border-white/10">
            <div className="p-4 border-b border-white/20 bg-gray-800/50 flex-shrink-0">
              <div className="flex items-center justify-between">
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
                  onClick={toggleChat}
                  className="text-white/70 hover:text-white transition-colors text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-hidden bg-black/40">
              <div className="h-full overflow-y-auto p-4 space-y-3">
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
                              ? 'bg-green-500/30 rounded-lg rounded-tr-none' 
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
            </div>
            
            <div className="p-4 border-t border-white/20 bg-gray-800/50 flex-shrink-0">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isConnected ? "Type a message..." : "Connecting..."}
                  disabled={!isConnected || !sendChatMessage}
                  className="flex-1 px-3 py-2 border border-[#754CA8]/30 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#754CA8] disabled:opacity-50 disabled:cursor-not-allowed bg-black/60 text-white placeholder:text-white/50"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!isConnected || !inputMessage.trim() || !sendChatMessage}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all bg-[#754CA8] hover:bg-[#8B5FC8] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Mobile view
  return (
    <div className={`${LAYOUT_STYLES.container} flex items-center justify-center min-h-screen p-4 relative overflow-hidden`}>
      {/* Main Waiting Room Content */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 max-w-2xl w-full">
        {/* Room Info */}
        <div className="text-center mb-6">
          <h1 className={`${TEXT_STYLES.heading} text-2xl font-bold mb-2`}>
            {isRanked ? "Ranked Match" : "Game Room"}
          </h1>
          {!isRanked && (
            <>
              <p className={`${COLORS.textSecondary} text-sm`}>
                Room Code: <span className="font-mono text-white">{displayRoomId}</span>
              </p>
              <p className={`${COLORS.textTertiary} text-xs mt-2`}>
                Share this code with friends to join
              </p>
            </>
          )}
          {isRanked && (
            <p className={`${COLORS.textSecondary} text-sm mt-2`}>
              🏆 Competitive Match
            </p>
          )}
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
          {!isRanked && countdown !== null && !allPlayersReady && (
            <div className="mt-2 text-2xl font-bold">
              {countdown}
            </div>
          )}
        </div>
        
        {/* Players List */}
        <div className="mb-6">
          <h2 className={`${TEXT_STYLES.heading} text-lg font-semibold mb-3`}>
            Players ({players.length}/{maxPlayers})
          </h2>
          <div className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
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
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-medium text-sm">
                    {player.name}
                    {player.id === currentPlayerId && " (You)"}
                  </span>
                  {player.isGuest && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-200 px-2 py-0.5 rounded">Guest</span>
                  )}
                  {player.isAfk && (
                    <span className="text-xs bg-gray-500/20 text-gray-200 px-2 py-0.5 rounded">AFK</span>
                  )}
                  {!isRanked && player.isHost && (
                    <span className="text-xs bg-blue-500/20 text-blue-200 px-2 py-0.5 rounded">Host</span>
                  )}
                </div>
                <div>
                  {player.isReady ? (
                    <span className="text-green-400 text-xs font-medium">✓ Ready</span>
                  ) : (
                    <span className="text-gray-400 text-xs">Not Ready</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onReadyToggle}
            disabled={isCurrentPlayerAfk}
            className={`w-full py-3 rounded-xl font-semibold transition-all transform active:scale-95 ${
              isReady
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-green-500 hover:bg-green-600 text-white'
            } ${isCurrentPlayerAfk ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isReady ? "Cancel Ready" : "Ready Up"}
          </button>
          
          {!isRanked && isHost && isRoomFull && !allPlayersReady && (
            <button
              onClick={() => onStartGame()}
              className="w-full py-3 rounded-xl font-semibold transition-all transform active:scale-95 bg-purple-500 hover:bg-purple-600 text-white"
            >
              Force Start Game
            </button>
          )}
          
          <button
            onClick={handleLeaveRoomClick}
            className="w-full py-3 rounded-xl font-semibold transition-all transform active:scale-95 bg-gray-500 hover:bg-gray-600 text-white"
          >
            Leave Room
          </button>
        </div>
        
        {/* Info Text */}
        <div className="mt-6 text-center">
          <p className={`${COLORS.textTertiary} text-xs`}>
            {isRanked 
              ? "Both players must ready up to start"
              : (isHost 
                  ? "Game starts when all players are ready"
                  : "Wait for the host to start the game")}
          </p>
        </div>
      </div>
      
      {/* Mobile Chat Button */}
      <button
        onClick={toggleChat}
        className="fixed right-4 bottom-6 z-[10000] rounded-full p-3 shadow-lg transition-all duration-300 active:scale-95"
        style={{ 
          backgroundColor: '#754CA8',
          display: isChatOpen ? 'none' : 'flex'
        }}
        aria-label="Toggle chat"
      >
        <div className="relative">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-white"
          >
            <path
              d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z"
              fill="currentColor"
            />
            <circle cx="12" cy="10" r="2" fill="white" />
            <circle cx="7" cy="10" r="2" fill="white" />
            <circle cx="17" cy="10" r="2" fill="white" />
          </svg>
          {hasUnreadMessages && !isChatOpen && (
            <span className="absolute -top-1 -right-1 block h-3 w-3 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
          )}
        </div>
      </button>
      
      {/* Mobile Chat Panel */}
      {isChatOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/70 z-[9998]"
            onClick={toggleChat}
          />
          <div 
            className="fixed left-0 right-0 bottom-0 bg-gray-900/98 backdrop-blur-lg shadow-2xl z-[9999]"
            style={{ 
              height: '60vh',
              maxHeight: '500px',
              minHeight: '300px',
              borderRadius: '20px 20px 0 0'
            }}
          >
            <div className="flex flex-col h-full">
              <div className="p-3 border-b border-[#754CA8]/30 flex-shrink-0" style={{ backgroundColor: '#754CA8' }}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h2 className="text-base font-semibold text-white">Chat</h2>
                    <p className="text-xs text-white/80">
                      {username || 'Guest'}{isGuest && " (Guest)"}
                    </p>
                  </div>
                  <button
                    onClick={toggleChat}
                    className="text-white hover:text-white/80 transition-colors text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10"
                  >
                    ×
                  </button>
                </div>
                <div className="flex justify-center mt-2">
                  <div className="w-12 h-1 bg-white/50 rounded-full" />
                </div>
              </div>
              
              <div className="flex-1 overflow-hidden bg-black/50" style={{ minHeight: 0 }}>
                <div className="h-full overflow-y-auto p-3 space-y-3">
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
                                ? 'bg-green-500/30 rounded-lg rounded-tr-none' 
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
              </div>
              
              <div className="p-3 border-t border-[#754CA8]/30 bg-gray-800/80 flex-shrink-0">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isConnected ? "Type a message..." : "Connecting..."}
                    disabled={!isConnected || !sendChatMessage}
                    className="flex-1 px-3 py-2 border border-[#754CA8]/30 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#754CA8] disabled:opacity-50 disabled:cursor-not-allowed bg-black/60 text-white placeholder:text-white/50"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!isConnected || !inputMessage.trim() || !sendChatMessage}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-all bg-[#754CA8] hover:bg-[#8B5FC8] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      
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