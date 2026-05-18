"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/auth_context";
import RankedWaitingRoom from "./RankedWaitingRoom";

interface RankedButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export default function RankedButton({ className = "", children }: RankedButtonProps) {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [showWaitingRoom, setShowWaitingRoom] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRankedGame = () => {
    // Check if user is authenticated
    if (!user || !user.username) {
      const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
      router.push(`/auth?return=${returnUrl}`);
      return;
    }

    // Check if user is guest
    const isGuest = (user as any).isGuest || (user as any).is_guest || (user as any).guest;
    
    if (isGuest) {
      setError("Guests cannot play ranked matches. Please sign up!");
      setTimeout(() => setError(null), 3000);
      return;
    }

    // Immediately show waiting room
    setShowWaitingRoom(true);
  };

  const handleCancel = () => {
    setShowWaitingRoom(false);
  };

  return (
    <>
      <button
        className={`
          bg-gradient-to-r from-[#FFD700] to-[#FFA500]
          text-[#1a1a2e]
          px-8
          py-3
          rounded-full
          text-[18px]
          font-bold
          hover:from-[#FFE44D]
          hover:to-[#FFB347]
          transition-all
          shadow-lg
          disabled:opacity-50
          disabled:cursor-not-allowed
          ${className}
        `}
        onClick={handleRankedGame}
        disabled={authLoading}
      >
        🎮 Ranked Match
      </button>

      {/* Error toast */}
      {error && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg">
            {error}
          </div>
        </div>
      )}

      {/* Waiting Room Modal */}
      {showWaitingRoom && <RankedWaitingRoom onCancel={handleCancel} />}
    </>
  );
}