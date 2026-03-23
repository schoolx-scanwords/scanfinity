// app/game/components/chat.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: Date;
}

interface ChatProps {
  sendMessage: (message: string) => void;
  isConnected: boolean;
  username: string;
  roomId?: string;
}

const CHAT_STORAGE_KEY = (roomId: string) => `chat_messages_${roomId}`;
const TAB_SESSION_KEY = (roomId: string) => `tab_session_${roomId}`;

export default function Chat({ sendMessage, isConnected, username, roomId }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!roomId) return;
    
    try {
      // Check if this is a new tab session or a refresh
      const sessionId = sessionStorage.getItem(TAB_SESSION_KEY(roomId));
      const isRefresh = sessionId !== null;
      
      if (!isRefresh) {
        // This is a new tab - clear any existing chat history
        console.log('New tab detected - clearing chat history');
        sessionStorage.removeItem(CHAT_STORAGE_KEY(roomId));
        // Set a session marker to identify this tab session
        sessionStorage.setItem(TAB_SESSION_KEY(roomId), Date.now().toString());
        setMessages([]);
      } else {
        // This is a refresh - load existing messages
        const savedMessages = sessionStorage.getItem(CHAT_STORAGE_KEY(roomId));
        if (savedMessages) {
          const parsedMessages = JSON.parse(savedMessages);
          const messagesWithDates = parsedMessages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          console.log(`Loaded ${messagesWithDates.length} messages from sessionStorage (refresh)`);
          setMessages(messagesWithDates);
        }
      }
    } catch (error) {
      console.error('Failed to load chat messages:', error);
    } finally {
      setIsInitialized(true);
    }
  }, [roomId]);

  // Save messages to sessionStorage whenever they change
  useEffect(() => {
    if (!roomId || !isInitialized) return;
    
    try {
      const messagesToStore = messages.slice(-500);
      sessionStorage.setItem(CHAT_STORAGE_KEY(roomId), JSON.stringify(messagesToStore));
      console.log(`Saved ${messagesToStore.length} messages to sessionStorage`);
    } catch (error) {
      console.error('Failed to save chat messages:', error);
    }
  }, [messages, roomId, isInitialized]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen for new chat messages
  useEffect(() => {
    const handleChatMessage = (event: CustomEvent) => {
      const data = event.detail;
      const newMessage: ChatMessage = {
        id: `${Date.now()}-${Math.random()}`,
        username: data.username,
        message: data.message,
        timestamp: new Date(data.timestamp)
      };
      
      setMessages(prev => {
        // Check for duplicates
        const isDuplicate = prev.some(msg => 
          msg.username === newMessage.username && 
          msg.message === newMessage.message && 
          Math.abs(msg.timestamp.getTime() - newMessage.timestamp.getTime()) < 1000
        );
        
        if (isDuplicate) return prev;
        return [...prev, newMessage];
      });
    };

    window.addEventListener('chat-message', handleChatMessage as EventListener);
    
    return () => {
      window.removeEventListener('chat-message', handleChatMessage as EventListener);
    };
  }, []);

  const handleSend = () => {
    if (!inputMessage.trim()) return;
    sendMessage(inputMessage.trim());
    setInputMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const clearChatHistory = () => {
    if (confirm('Are you sure you want to clear chat history?')) {
      setMessages([]);
      if (roomId) {
        sessionStorage.removeItem(CHAT_STORAGE_KEY(roomId));
      }
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-white/20">
        <div className="flex items-center justify-between">
          <h2 className="text-white text-lg font-semibold">Game Chat</h2>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={clearChatHistory}
                className="text-xs px-2 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white/70 transition-colors"
                title="Clear chat history"
              >
                Clear
              </button>
            )}
            <div className={`text-xs px-2 py-1 rounded-full ${isConnected ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
              {isConnected ? '● Connected' : '○ Disconnected'}
            </div>
          </div>
        </div>
      </div>
      
      <div className="h-80 overflow-y-auto p-4 space-y-3 bg-black/20">
        {messages.length === 0 && isInitialized && (
          <div className="flex items-center justify-center h-full">
            <div className="text-white/50 text-center">
              <p className="text-sm mb-1">💬 No messages yet</p>
              <p className="text-xs">Be the first to say hi!</p>
            </div>
          </div>
        )}
        
        {messages.map((msg) => (
          <div key={msg.id} className="flex justify-start">
            <div className="max-w-[85%]">
              <div className="flex items-baseline space-x-2 mb-1">
                <span className="text-xs font-semibold text-blue-300">
                  {msg.username}
                </span>
                <span className="text-xs text-white/40">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
              <div className="bg-white/10 rounded-lg rounded-tl-none px-3 py-2 text-sm text-white break-words">
                {msg.message}
              </div>
            </div>
          </div>
        ))}
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
            disabled={!isConnected}
            className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!isConnected || !inputMessage.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}