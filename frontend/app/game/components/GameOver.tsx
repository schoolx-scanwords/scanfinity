'use client';

import { useRouter } from 'next/navigation';
import { COLORS, TEXT_STYLES } from '../../styles/theme';

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

  const displayWinnerScore = isWinner ? playerScore : opponentScore;
  const winnerAvatarSrc = isWinner ? '/avatars/frog.svg' : '/avatars/frog.svg';
  
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
    <div className={`fixed inset-0 z-50 ${COLORS.background} text-white`}>
      <section className="flex min-h-screen w-full flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-[520px] flex flex-col items-center">
          <h1 className={`text-center ${TEXT_STYLES.heading} text-5xl sm:text-6xl leading-none text-purple-300`}>
            Game Over
          </h1>

          <div className="mt-5 text-center">
            <h2 className={`${TEXT_STYLES.heading} text-3xl sm:text-4xl leading-none`}>
              {winnerInfo.isDraw ? "Draw!" : "Winner!"}
            </h2>
            <p className={`mt-2 ${COLORS.textSecondary} text-sm`}>
              {getSubtitle()}
            </p>

            {!winnerInfo.isDraw ? (
              <div className="mt-5 flex items-center justify-center gap-4">
                <img
                  className="h-[55px] w-[55px] rounded-full object-cover"
                  alt="Winner avatar"
                  src={winnerAvatarSrc}
                />
                <div className="text-left">
                  <p className={`${TEXT_STYLES.heading} text-2xl leading-none`}>
                    {getWinnerMessage()}
                  </p>
                  <p className={`${TEXT_STYLES.heading} mt-1 text-lg leading-none`}>
                    {displayWinnerScore} pts.
                  </p>
                </div>
                <div className="text-4xl leading-none">🏆</div>
              </div>
            ) : (
              <div className="mt-5 flex items-center justify-center gap-3">
                <div className="text-4xl leading-none">🤝</div>
                <p className={`${TEXT_STYLES.heading} text-xl leading-none`}>Same score</p>
              </div>
            )}
          </div>

          <nav className="mt-8 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={handlePlayAgain}
              className="rounded-full bg-[#754CA880] px-8 py-3 text-[28px] sm:text-[32px] font-medium leading-none text-white transition-colors hover:bg-[#754CA8] focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-transparent"
            >
              play again
            </button>

            <button
              type="button"
              onClick={handleReturnToLobby}
              className="rounded-full bg-[#754CA880] px-8 py-3 text-[28px] sm:text-[32px] font-medium leading-none text-white transition-colors hover:bg-[#754CA8] focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-transparent"
            >
              lobby
            </button>
          </nav>
        </div>
      </section>
    </div>
  );
}