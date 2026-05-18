"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/auth_context";

interface RankedWaitingRoomProps {
  onCancel?: () => void;
}

export default function RankedWaitingRoom({ onCancel }: RankedWaitingRoomProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [status, setStatus] = useState<string>("Searching for opponent...");
  const [waitingTime, setWaitingTime] = useState<number>(0);
  const [queueSize, setQueueSize] = useState<number>(1);
  const [isCancelling, setIsCancelling] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const playerId = String(user?.id || user?.username || "");
  const playerName = user?.username || "Player";
  const playerElo = (user as any)?.elo || 1200;
  const isGuest = (user as any)?.isGuest || (user as any)?.is_guest || false;

  // Format waiting time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  // Connect to WebSocket for matchmaking
  useEffect(() => {
    if (!playerId || isGuest) return;

    const hostname = window.location.hostname;
    const wsUrl = (hostname === 'localhost' || hostname === '127.0.0.1') 
      ? 'ws://localhost:8000' 
      : `ws://${hostname}:8000`;
    
    console.log(`Connecting to matchmaking WebSocket at ${wsUrl}/ws/matchmaking/${playerId}`);
    
    const ws = new WebSocket(
      `${wsUrl}/ws/matchmaking/${playerId}?name=${encodeURIComponent(playerName)}&elo=${playerElo}&is_guest=${isGuest}`
    );
    
    ws.onopen = () => {
      console.log("Connected to matchmaking server");
      setStatus("Searching for opponent...");
      
      // Send ping every 20 seconds to keep connection alive
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 20000);
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("Received message:", data.type);
      
      if (data.type === "queue_joined") {
        setQueueSize(data.queue_size || 1);
        setStatus("Searching for opponent...");
      }
      
      else if (data.type === "match_found") {
        console.log("Match found! Room ID:", data.room_id);
        // Match found! Redirect to game room
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }
        
        // Store match info
        localStorage.setItem("ranked_match_room", data.room_id);
        localStorage.setItem("ranked_opponent", JSON.stringify(data.opponent));
        
        // Close WebSocket
        ws.close();
        
        // Redirect to game
        router.push(`/game?room=${encodeURIComponent(data.room_id)}&ranked=true`);
      }
      
      else if (data.type === "error") {
        console.error("Error from server:", data.message);
        setStatus("Error: " + data.message);
        setTimeout(() => {
          if (onCancel) onCancel();
          else router.push("/lobby?tab=ranking");
        }, 2000);
      }
    };
    
    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setStatus("Connection error. Retrying...");
    };
    
    ws.onclose = () => {
      console.log("Disconnected from matchmaking");
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
    };
    
    wsRef.current = ws;
    
    // Update waiting time timer
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setWaitingTime(elapsed);
      
      // Update status messages based on wait time
      if (elapsed > 45) {
        setStatus("Taking longer than usual... expanding search range");
      } else if (elapsed > 30) {
        setStatus("Still searching... looking for players with similar skill");
      } else if (elapsed > 15) {
        setStatus("Analyzing player skill levels...");
      } else {
        setStatus("Searching for opponent...");
      }
    }, 1000);
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, [playerId, playerName, playerElo, isGuest, router, onCancel]);
  
  // Handle cancel
  const handleCancel = async () => {
    if (isCancelling) return;
    setIsCancelling(true);
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "cancel" }));
      setTimeout(() => {
        if (wsRef.current) wsRef.current.close();
      }, 100);
    }
    
    if (onCancel) {
      onCancel();
    } else {
      router.push("/lobby?tab=ranking");
    }
  };

  // Don't show if guest
  if (isGuest) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md mx-4">
        <div className="bg-gradient-to-b from-[#1a1a2e] to-[#16213e] rounded-2xl p-8 shadow-2xl border border-[#00AFFF]/20">
          {/* Loading spinner */}
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 border-4 border-[#00AFFF]/20 border-t-[#00AFFF] rounded-full animate-spin"></div>
          </div>

          {/* Status text */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">
              Ranked Matchmaking
            </h2>
            <p className="text-[#00AFFF] font-medium">{status}</p>
          </div>

          {/* Timer and stats */}
          <div className="bg-black/30 rounded-xl p-4 mb-6">
            <div className="flex justify-between items-center mb-3">
              <span className="text-white/60 text-sm">Waiting time:</span>
              <span className="text-white font-mono text-lg">
                {formatTime(waitingTime)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/60 text-sm">Players in queue:</span>
              <span className="text-white/80 text-sm">
                {queueSize}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-6">
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#00AFFF] to-[#00D4FF] rounded-full transition-all duration-500"
                style={{ width: `${Math.min((waitingTime / 60) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Tips */}
          <div className="text-center mb-6">
            <p className="text-white/40 text-xs">
              🏆 Ranked matches are 1v1 and affect your ELO rating
            </p>
            <p className="text-white/40 text-xs mt-1">
              🎯 Find opponents with similar skill level
            </p>
            <p className="text-white/40 text-xs mt-1">
              ⚡ Average wait time: 30-60 seconds
            </p>
          </div>

          {/* Cancel button */}
          <button
            onClick={handleCancel}
            disabled={isCancelling}
            className="w-full py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCancelling ? "Cancelling..." : "Cancel Search"}
          </button>
        </div>
      </div>
    </div>
  );
}