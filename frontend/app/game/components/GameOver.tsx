'use client';

import { useRouter } from 'next/navigation';
import { COLORS, TEXT_STYLES, BUTTON_STYLES } from '../../styles/theme';

interface GameOverProps {
  winnerId?: string;
  winnerName?: string;
  playerScore?: number;
  opponentScore?: number;
  isDraw?: boolean;
  onPlayAgain?: () => void;
  onReturnToLobby?: () => void;
  currentPlayerId?: string;
  currentPlayerName?: string;
}

export default function GameOver({ 
  winnerId, 
  winnerName, 
  playerScore = 0, 
  opponentScore = 0, 
  isDraw = false,
  onPlayAgain,
  onReturnToLobby,
  currentPlayerId,
  currentPlayerName
}: GameOverProps) {
  const router = useRouter();

  const handlePlayAgain = () => {
    if (onPlayAgain) {
      onPlayAgain();
    } else {
      window.location.reload();
    }
  };

  const handleReturnToLobby = () => {
    if (onReturnToLobby) {
      onReturnToLobby();
    } else {
      router.push('/lobby');
    }
  };

  // Determine winner based on scores (most reliable method)
  const determineWinner = () => {
    // If explicitly marked as draw or scores are equal
    if (isDraw || playerScore === opponentScore) {
      return { isDraw: true, winner: null, isCurrentPlayerWinner: false };
    }
    
    // Determine who has higher score
    const playerWins = playerScore > opponentScore;
    
    if (playerWins) {
      return { 
        isDraw: false, 
        winner: { id: currentPlayerId, name: currentPlayerName || 'You' },
        isCurrentPlayerWinner: true 
      };
    } else {
      return { 
        isDraw: false, 
        winner: { id: winnerId || 'opponent', name: winnerName || 'Opponent' },
        isCurrentPlayerWinner: false 
      };
    }
  };

  const winnerInfo = determineWinner();
  const isWinner = winnerInfo.isCurrentPlayerWinner;
  const displayWinnerName = winnerInfo.winner?.name;
  
  // Get the appropriate message
  const getWinnerMessage = () => {
    if (winnerInfo.isDraw) return null;
    if (isWinner) return "You won!";
    return `${displayWinnerName} won!`;
  };

  // Get the appropriate subtitle
  const getSubtitle = () => {
    if (winnerInfo.isDraw) return "Well played!";
    if (isWinner) return "Congratulations!";
    return "Better luck next time!";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-black/60 backdrop-blur-xl rounded-2xl p-8 max-w-md w-full mx-4 border border-white/20 shadow-2xl transform animate-in slide-in-from-bottom-10 duration-500">
        {/* Trophy Icon */}
        <div className="text-center mb-6">
          {winnerInfo.isDraw ? (
            <div className="text-7xl mb-2">🤝</div>
          ) : isWinner ? (
            <div className="text-7xl mb-2 animate-bounce">🏆</div>
          ) : (
            <div className="text-7xl mb-2">🎮</div>
          )}
        </div>

        {/* Title */}
        <h2 className={`${TEXT_STYLES.heading} text-3xl font-bold text-center mb-3`}>
          {winnerInfo.isDraw ? "It's a Draw!" : "Game Over!"}
        </h2>

        {/* Winner Info */}
        {!winnerInfo.isDraw && (
          <div className="text-center mb-6">
            <p className={`${COLORS.textSecondary} text-sm mb-2`}>
              {getSubtitle()}
            </p>
            <p className={`${TEXT_STYLES.heading} text-2xl font-bold ${
              isWinner 
                ? 'bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent'
                : 'bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent'
            }`}>
              {getWinnerMessage()}
            </p>
          </div>
        )}

        {/* Score Display */}
        <div className="bg-white/5 rounded-xl p-4 mb-6">
          <div className={`flex justify-between items-center mb-3 ${
            !winnerInfo.isDraw && isWinner ? 'border-b border-green-500/30 pb-2' : ''
          }`}>
            <span className={`${COLORS.textSecondary} text-sm`}>
              Your Score
              {!winnerInfo.isDraw && isWinner && <span className="ml-2 text-green-400 text-xs">🏆 Winner!</span>}
              {!winnerInfo.isDraw && !isWinner && playerScore > opponentScore && <span className="ml-2 text-green-400 text-xs">You're winning but game ended?</span>}
            </span>
            <span className={`${TEXT_STYLES.heading} text-2xl font-bold ${
              !winnerInfo.isDraw && isWinner ? 'text-green-400' : ''
            }`}>
              {playerScore}
            </span>
          </div>
          <div className={`flex justify-between items-center ${
            !winnerInfo.isDraw && !isWinner ? 'border-t border-yellow-500/30 pt-2' : ''
          }`}>
            <span className={`${COLORS.textSecondary} text-sm`}>
              Opponent Score
              {!winnerInfo.isDraw && !isWinner && (
                <span className="ml-2 text-yellow-400 text-xs">🏆 Winner!</span>
              )}
            </span>
            <span className={`${TEXT_STYLES.heading} text-2xl font-bold ${
              !winnerInfo.isDraw && !isWinner ? 'text-yellow-400' : ''
            }`}>
              {opponentScore}
            </span>
          </div>
        </div>

        {/* Score Comparison Bar */}
        {!winnerInfo.isDraw && (
          <div className="mb-6">
            <div className="flex justify-between text-xs text-white/60 mb-1">
              <span>You ({playerScore})</span>
              <span>Opponent ({opponentScore})</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                style={{ 
                  width: `${(playerScore / (playerScore + opponentScore)) * 100}%` 
                }}
              />
            </div>
          </div>
        )}

        {/* Stats Summary */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white/5 rounded-lg p-3 text-center">
            <div className="text-2xl mb-1">🎯</div>
            <div className={`${COLORS.textTertiary} text-xs`}>Words Found</div>
            <div className={`${TEXT_STYLES.heading} text-lg font-bold`}>{playerScore}</div>
          </div>
          <div className="bg-white/5 rounded-lg p-3 text-center">
            <div className="text-2xl mb-1">📊</div>
            <div className={`${COLORS.textTertiary} text-xs`}>Total Words</div>
            <div className={`${TEXT_STYLES.heading} text-lg font-bold`}>{playerScore + opponentScore}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handlePlayAgain}
            className="flex-1 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg"
          >
            Play Again
          </button>
          <button
            onClick={handleReturnToLobby}
            className="flex-1 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 bg-white/10 hover:bg-white/20 text-white border border-white/20"
          >
            Lobby
          </button>
        </div>

        {/* Close Button */}
        <button
          onClick={handleReturnToLobby}
          className="absolute top-4 right-4 text-white/40 hover:text-white/60 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}