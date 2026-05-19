// app/game/components/chat.tsx
'use client';

import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import { COLORS, TEXT_STYLES } from '../../styles/theme';

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: Date;
  isGuest?: boolean;
  email?: string;
}

interface ChatProps {
  sendMessage: (message: string) => void;
  isConnected: boolean;
  username: string;
  roomId?: string;
  userEmail?: string;
  isGuest?: boolean;
  messages: ChatMessage[];
}

// Separate component for the message input to isolate local state
const ChatInput = memo(({ onSendMessage, isConnected, inputRef, onFocus }: { 
  onSendMessage: (message: string) => void; 
  isConnected: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFocus?: () => void;
}) => {
  const [inputMessage, setInputMessage] = useState('');

  const handleSend = useCallback(() => {
    if (!inputMessage.trim()) return;
    onSendMessage(inputMessage.trim());
    setInputMessage('');
  }, [inputMessage, onSendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <div className="flex gap-2">
      <input
        ref={inputRef}
        type="text"
        value={inputMessage}
        onChange={(e) => setInputMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={onFocus}
        placeholder={isConnected ? "Type a message..." : "Connecting..."}
        disabled={!isConnected}
        className="flex-1 px-3 py-2 border border-[#754CA8]/30 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#754CA8] disabled:opacity-50 disabled:cursor-not-allowed bg-black/60 text-white placeholder:text-white/50"
      />
      <button
        onClick={handleSend}
        disabled={!isConnected || !inputMessage.trim()}
        className="px-4 py-2 rounded-lg text-sm font-medium transition-all bg-[#754CA8] hover:bg-[#8B5FC8] text-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Send
      </button>
    </div>
  );
});

ChatInput.displayName = 'ChatInput';

// Message list component
const MessageList = memo(({ messages, username }: { messages: ChatMessage[]; username: string }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const formatTime = useCallback((date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  useEffect(() => {
    if (!isInitialMount.current && scrollContainerRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    isInitialMount.current = false;
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-white/50 text-center">
          <p className="text-sm mb-1">💬 No messages yet</p>
          <p className="text-xs">Be the first to say hi!</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollContainerRef} className="h-full overflow-y-auto">
      <div className="space-y-3">
        {messages.map((msg) => {
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
                    {formatTime(msg.timestamp)}
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
        })}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
});

MessageList.displayName = 'MessageList';

// Main Chat component
const Chat = memo(function Chat({ 
  sendMessage, 
  isConnected, 
  username, 
  roomId,
  userEmail,
  isGuest = false,
  messages
}: ChatProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const lastReadMessageIdRef = useRef<string | null>(null);
  const originalScrollPosition = useRef(0);
  const isLockingScroll = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousActiveElement = useRef<Element | null>(null);
  const isFocusingRef = useRef(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Detect keyboard height on mobile
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

  // Lock scroll when chat opens
  const lockBodyScroll = useCallback(() => {
    if (isLockingScroll.current) return;
    isLockingScroll.current = true;
    
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    originalScrollPosition.current = window.scrollY;
    
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${originalScrollPosition.current}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.paddingRight = `${scrollBarWidth}px`;
    document.documentElement.style.overflow = 'hidden';
    
    isLockingScroll.current = false;
  }, []);

  const unlockBodyScroll = useCallback(() => {
    if (isLockingScroll.current) return;
    isLockingScroll.current = true;
    
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    document.body.style.paddingRight = '';
    document.documentElement.style.overflow = '';
    
    window.scrollTo(0, originalScrollPosition.current);
    
    isLockingScroll.current = false;
  }, []);

  // Focus input smoothly
  const focusInputSmoothly = useCallback(() => {
    if (isFocusingRef.current) return;
    isFocusingRef.current = true;
    
    setTimeout(() => {
      if (inputRef.current && isChatOpen) {
        inputRef.current.focus({ preventScroll: true });
      }
      isFocusingRef.current = false;
    }, 150);
  }, [isChatOpen]);

  // Handle chat open/close
  useEffect(() => {
    if (isMobile) {
      if (isChatOpen) {
        lockBodyScroll();
        focusInputSmoothly();
      } else {
        if (inputRef.current) {
          inputRef.current.blur();
        }
        setTimeout(() => {
          unlockBodyScroll();
          if (previousActiveElement.current && 'focus' in previousActiveElement.current) {
            (previousActiveElement.current as HTMLElement).focus();
          }
        }, 50);
      }
    }
    
    return () => {
      if (isMobile && isChatOpen) {
        unlockBodyScroll();
      }
    };
  }, [isMobile, isChatOpen, lockBodyScroll, unlockBodyScroll, focusInputSmoothly]);

  // Track unread messages
  useEffect(() => {
    if (isChatOpen) {
      if (messages.length > 0) {
        lastReadMessageIdRef.current = messages[messages.length - 1].id;
        setHasUnreadMessages(false);
      }
    } else {
      if (messages.length > 0) {
        const lastMessageId = messages[messages.length - 1].id;
        if (lastReadMessageIdRef.current !== lastMessageId) {
          setHasUnreadMessages(true);
        }
      }
    }
  }, [messages, isChatOpen]);

  // Initialize last read message ID on mount
  useEffect(() => {
    if (messages.length > 0 && !lastReadMessageIdRef.current) {
      lastReadMessageIdRef.current = messages[messages.length - 1].id;
    }
  }, [messages]);

  // Save active element when focusing input
  const handleInputFocus = useCallback(() => {
    previousActiveElement.current = document.activeElement;
  }, []);

  const toggleChat = useCallback(() => {
    setIsChatOpen(prev => !prev);
  }, []);

  const stableSendMessage = useCallback((message: string) => {
    sendMessage(message);
  }, [sendMessage]);

  // Desktop styles
  if (!isMobile) {
    return (
      <>
        {/* Desktop Chat Toggle Button - Purple circle with SVG */}
        {!isChatOpen && (
          <button
            onClick={toggleChat}
            className="fixed right-6 top-1/2 -translate-y-1/2 z-[10000] rounded-full p-3 shadow-lg transition-all duration-300 hover:scale-105"
            style={{ backgroundColor: '#754CA8' }}
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
              {hasUnreadMessages && (
                <span className="absolute -top-1 -right-1 block h-3.5 w-3.5 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
              )}
            </div>
          </button>
        )}

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
                    Game Chat
                  </h2>
                  <p className={`${COLORS.textTertiary} text-xs mt-1`}>
                    Chatting as: 
                    <span className={`${COLORS.textPrimary} ml-1 font-medium`}>
                      {username}
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
              <MessageList messages={messages} username={username} />
            </div>
            
            <div className="p-4 border-t border-white/20 bg-gray-800/50 flex-shrink-0">
              <ChatInput 
                onSendMessage={stableSendMessage} 
                isConnected={isConnected}
                inputRef={inputRef}
                onFocus={handleInputFocus}
              />
            </div>
          </div>
        </div>
      </>
    );
  }

  // Mobile styles
  const CHAT_HEIGHT = 400;

  return (
    <>
      {/* Mobile Chat Toggle Button */}
      {!isChatOpen && (
        <button
          onClick={toggleChat}
          className="fixed right-6 z-[10000] rounded-full p-3 shadow-lg transition-all duration-300 active:scale-95"
          style={{ 
            bottom: keyboardHeight > 0 ? `${keyboardHeight + 16}px` : '24px',
            backgroundColor: '#754CA8'
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
            {hasUnreadMessages && (
              <span className="absolute -top-1 -right-1 block h-3.5 w-3.5 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
            )}
          </div>
        </button>
      )}

      {/* Mobile Chat Panel */}
      {isChatOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/70 z-[9998]"
            onClick={toggleChat}
          />
          
          <div 
            className="fixed left-0 right-0 bg-gray-900/98 backdrop-blur-lg shadow-2xl z-[9999]"
            style={{ 
              bottom: keyboardHeight > 0 ? `${keyboardHeight}px` : '0',
              height: `${CHAT_HEIGHT}px`,
              borderRadius: '20px 20px 0 0',
              transform: 'translateZ(0)',
              WebkitTransform: 'translateZ(0)',
              transition: 'bottom 0.2s ease'
            }}
          >
            <div className="flex flex-col h-full">
              <div className="p-3 border-b border-[#754CA8]/30 flex-shrink-0" style={{ backgroundColor: '#754CA8' }}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h2 className="text-base font-semibold text-white">Game Chat</h2>
                    <p className="text-xs text-white/80">
                      {username}{isGuest && " (Guest)"}
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
                <div className="h-full overflow-y-auto p-3">
                  <div className="space-y-3">
                    {messages.map((msg) => {
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
                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                    })}
                    {messages.length === 0 && (
                      <div className="flex items-center justify-center h-full min-h-[200px]">
                        <div className="text-white/50 text-center">
                          <p className="text-sm mb-1">💬 No messages yet</p>
                          <p className="text-xs">Be the first to say hi!</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="p-3 border-t border-[#754CA8]/30 bg-gray-800/80 flex-shrink-0">
                <ChatInput 
                  onSendMessage={stableSendMessage} 
                  isConnected={isConnected}
                  inputRef={inputRef}
                  onFocus={handleInputFocus}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.username === nextProps.username &&
    prevProps.isGuest === nextProps.isGuest &&
    prevProps.isConnected === nextProps.isConnected &&
    prevProps.messages.length === nextProps.messages.length &&
    prevProps.messages[prevProps.messages.length - 1]?.id === nextProps.messages[nextProps.messages.length - 1]?.id &&
    prevProps.sendMessage === nextProps.sendMessage
  );
});

export default Chat;