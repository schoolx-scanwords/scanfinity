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
}

export default function Chat({ sendMessage, isConnected, username }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen for chat messages from the parent via window event
  useEffect(() => {
    const handleChatMessage = (event: CustomEvent) => {
      const data = event.detail;
      const newMessage: ChatMessage = {
        id: `${Date.now()}-${Math.random()}`,
        username: data.username,
        message: data.message,
        timestamp: new Date(data.timestamp)
      };
      setMessages(prev => [...prev, newMessage]);
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

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-white/20">
        <div className="flex items-center justify-between">
          <h2 className="text-white text-lg font-semibold">Game Chat</h2>
          <div className={`text-xs px-2 py-1 rounded-full ${isConnected ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
            {isConnected ? '● Connected' : '○ Disconnected'}
          </div>
        </div>
      </div>
      
      <div className="h-80 overflow-y-auto p-4 space-y-3 bg-black/20">
        {messages.length === 0 && (
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