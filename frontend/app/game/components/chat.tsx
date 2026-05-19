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
const ChatInput = memo(({ onSendMessage, isConnected }: { onSendMessage: (message: string) => void; isConnected: boolean }) => {
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
        type="text"
        value={inputMessage}
        onChange={(e) => setInputMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={isConnected ? "Type a message..." : "Connecting..."}
        disabled={!isConnected}
        className={`flex-1 px-3 py-2 border ${COLORS.inputBorder} rounded-lg ${COLORS.inputPlaceholder} text-sm focus:outline-none focus:ring-2 ${COLORS.inputFocus} disabled:opacity-50 disabled:cursor-not-allowed bg-black/40 text-white`}
      />
      <button
        onClick={handleSend}
        disabled={!isConnected || !inputMessage.trim()}
        className="px-4 py-2 rounded-lg text-sm font-medium transition-all bg-[#754CA880] hover:bg-[#754CA8] text-white disabled:opacity-50 disabled:cursor-not-allowed"
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

  const formatTime = useCallback((date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  useEffect(() => {
    if (!isInitialMount.current) {
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
    <>
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
                  ? 'bg-green-500/20 rounded-lg rounded-tr-none' 
                  : 'bg-white/10 rounded-lg rounded-tl-none'
              }`}>
                {msg.message}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </>
  );
});

MessageList.displayName = 'MessageList';

// Chat Toggle Button Component
const ChatToggleButton = memo(({ hasUnreadMessages, onToggle, isChatOpen }: { hasUnreadMessages: boolean; onToggle: () => void; isChatOpen: boolean }) => {
  return (
    <button
      onClick={onToggle}
      className="relative p-2 rounded-lg transition-all bg-white/10 hover:bg-white/20"
      aria-label="Toggle chat"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z"
          fill="currentColor"
          className="text-white/80"
        />
        <circle
          cx="12"
          cy="10"
          r="2"
          fill="white"
        />
        <circle
          cx="7"
          cy="10"
          r="2"
          fill="white"
        />
        <circle
          cx="17"
          cy="10"
          r="2"
          fill="white"
        />
      </svg>
      {hasUnreadMessages && !isChatOpen && (
        <span className="absolute top-0 right-0 block h-3 w-3 rounded-full bg-red-500 ring-2 ring-white" />
      )}
    </button>
  );
});

ChatToggleButton.displayName = 'ChatToggleButton';

// Main Chat component - now just composes the subcomponents
const Chat = memo(function Chat({ 
  sendMessage, 
  isConnected, 
  username, 
  roomId,
  userEmail,
  isGuest = false,
  messages
}: ChatProps) {
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevMessagesLengthRef = useRef(messages.length);
  const lastReadMessageIdRef = useRef<string | null>(null);

  // Track unread messages
  useEffect(() => {
    if (isChatOpen) {
      // If chat is open, mark all messages as read
      if (messages.length > 0) {
        lastReadMessageIdRef.current = messages[messages.length - 1].id;
        setUnreadCount(0);
      }
    } else {
      // If chat is closed, check for new messages
      const currentLastMessageId = messages.length > 0 ? messages[messages.length - 1].id : null;
      
      if (prevMessagesLengthRef.current !== messages.length && lastReadMessageIdRef.current !== currentLastMessageId) {
        // New message arrived while chat is closed
        setUnreadCount(prev => prev + (messages.length - prevMessagesLengthRef.current));
      }
    }
    
    prevMessagesLengthRef.current = messages.length;
  }, [messages, isChatOpen]);

  const toggleChat = useCallback(() => {
    setIsChatOpen(prev => !prev);
  }, []);

  // Stabilize sendMessage to prevent unnecessary re-renders of ChatInput
  const stableSendMessage = useCallback((message: string) => {
    sendMessage(message);
  }, [sendMessage]);

  return (
    <>
      <ChatToggleButton 
        hasUnreadMessages={unreadCount > 0} 
        onToggle={toggleChat} 
        isChatOpen={isChatOpen}
      />
      
      {isChatOpen && (
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl overflow-hidden will-change-transform">
          <div className="p-4 border-b border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <h2 className={`${TEXT_STYLES.heading} text-lg font-semibold`}>
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
            </div>
          </div>
          
          <div className="h-80 overflow-y-auto p-4 space-y-3 bg-black/20">
            <MessageList messages={messages} username={username} />
          </div>
          
          <div className="p-4 border-t border-white/20">
            <ChatInput onSendMessage={stableSendMessage} isConnected={isConnected} />
          </div>
        </div>
      )}
    </>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render when messages actually change or username changes
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