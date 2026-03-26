import { useState, useEffect } from 'react';

interface readyProps {
    max_players: number;
    current_players: number;
    ready_state: boolean;
    onReadyToggle: () => void;
}

interface GameOverProps {
    winner_id: string;
}


export const Ready: React.FC<readyProps> = ({
    max_players,
    current_players, 
    ready_state,
    onReadyToggle
}) => {

    function handleReadyClick() {
        if (!ready_state) {
            onReadyToggle();
        }
    }

return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop with blur */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        
        {/* Modal content */}
        <div className="relative bg-gradient-to-br from-[#667eea] to-[#764ba2] p-8 rounded-2xl shadow-2xl border border-white/20 min-w-[300px]">
            <div className="text-center space-y-6">
                {/* Ready counter */}
                <div className="text-white text-2xl font-bold">
                    {current_players}/{max_players}
                    <span className="text-white/70 text-lg ml-2">players ready</span>
                </div>
                
                {/* Ready button */}
                <button
                    onClick={handleReadyClick}
                    disabled={ready_state}
                    className="w-full px-6 py-3 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-[#667eea]"
                    autoFocus
                >
                    {ready_state ? "✓ Ready!" : "Set Ready"}
                </button>
            </div>
        </div>
    </div>
);
}

export const GameOver: React.FC<GameOverProps> = ({
    winner_id
}) => {
    // Handle escape key to close? Optional
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                window.location.href = '/';
            }
        };
        
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop with blur */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            
            {/* Modal content */}
            <div className="relative bg-gradient-to-br from-[#667eea] to-[#764ba2] rounded-2xl p-8 shadow-2xl text-center max-w-md mx-4 border-2 border-white/20">
                {/* Trophy icon */}
                <div className="text-7xl mb-4 animate-bounce">🏆</div>
                
                <h2 className="text-3xl font-bold mb-2 text-white">Game Over!</h2>
                
                <div className="bg-white/20 rounded-lg p-4 mb-6">
                    <p className="text-white/80 text-sm mb-1">Winner</p>
                    <p className="text-2xl font-bold text-yellow-300">{winner_id}</p>
                </div>
                
                <button
                    onClick={() => {
                        if (typeof window !== 'undefined') {
                            window.location.href = '/';
                        }
                    }}
                    className="w-full px-6 py-3 bg-white text-[#667eea] rounded-lg hover:bg-gray-100 transition-all duration-200 font-semibold shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#667eea]"
                    autoFocus
                >
                    Main Menu
                </button>
                
                <p className="text-white/40 text-xs mt-4">Press ESC to exit</p>
            </div>
        </div>
    );
};

