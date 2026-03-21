import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        {/* Animated title */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold mb-6 animate-fade-in">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#f6d5f7] to-[#fbe9d7]">
            Crossword
          </span>
          <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#fbe9d7] to-[#f6d5f7]">
            Challenge
          </span>
        </h1>

        {/* Description */}
        <p className="text-xl text-white/80 mb-12 max-w-lg mx-auto">
          Test your vocabulary and solve engaging crossword puzzles. 
          Click below to start your journey!
        </p>

        {/* Play button - redirects to game page */}
        <Link href="/game">
          <button className="group relative px-8 py-4 bg-white rounded-full text-xl font-bold text-[#667eea] overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl">
            {/* Animated background effect */}
            <span className="absolute inset-0 bg-gradient-to-r from-[#f6d5f7] to-[#fbe9d7] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            
            {/* Button content */}
            <span className="relative flex items-center gap-3">
              <svg 
                className="w-6 h-6" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" 
                />
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
              Play Now
              <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
            </span>
          </button>
        </Link>

        {/* Optional: Stats or features section */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 text-white/80">
          <div className="p-4 backdrop-blur-sm bg-white/10 rounded-xl">
            <div className="text-2xl mb-2">🎯</div>
            <div className="font-semibold">Multiple Puzzles</div>
            <div className="text-sm">Different challenges await</div>
          </div>
          <div className="p-4 backdrop-blur-sm bg-white/10 rounded-xl">
            <div className="text-2xl mb-2">⚡</div>
            <div className="font-semibold">Real-time Feedback</div>
            <div className="text-sm">Instant validation</div>
          </div>
          <div className="p-4 backdrop-blur-sm bg-white/10 rounded-xl">
            <div className="text-2xl mb-2">🏆</div>
            <div className="font-semibold">Track Progress</div>
            <div className="text-sm">See your correct answers</div>
          </div>
        </div>

        {/* Optional: Footer note */}
        <p className="mt-12 text-white/50 text-sm">
          Click the button above to start playing
        </p>
      </div>
    </div>
  );
}