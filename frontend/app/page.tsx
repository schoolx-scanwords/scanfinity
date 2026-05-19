'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from './contexts/auth_context';
import { COLORS, BUTTON_STYLES, TEXT_STYLES, LAYOUT_STYLES } from '@/app/styles/theme';
import Button from './components/ui/Button';
import Input from './components/ui/Input';
import Card from './components/ui/Card';

type ActivePlack = 'authenticated' | 'anonymous';
type AuthState = 'login' | 'register' | 'profile';

const getButtonClass = (isActive: boolean, isAuthenticated: boolean) => {
  const baseClass = `absolute font-bold text-[8px] sm:text-[10px] md:text-xs uppercase tracking-wider transition-all z-50 hover:scale-105 whitespace-nowrap`;
  const activeClass = isActive ? COLORS.buttonActive : `${COLORS.buttonInactive} ${COLORS.textHover}`;
  return `${baseClass} ${activeClass}`;
};

// Generate a unique guest ID
const generateUniqueGuestId = (): string => {
  const adjectives = [
    'Happy', 'Sad', 'Sleepy', 'Angry', 'Excited', 'Calm', 'Brave', 'Clever', 
    'Witty', 'Kind', 'Lucky', 'Mighty', 'Swift', 'Bold', 'Bright', 'Dark', 
    'Fierce', 'Gentle', 'Jolly', 'Mystic', 'Noble', 'Quick', 'Royal', 'Smart',
    'Wild', 'Zealous', 'Awesome', 'Cool', 'Epic', 'Funny', 'Great', 'Heroic'
  ];
  
  const nouns = [
    'Fox', 'Wolf', 'Eagle', 'Hawk', 'Lion', 'Tiger', 'Bear', 'Dragon', 
    'Phoenix', 'Raven', 'Falcon', 'Owl', 'Shark', 'Dolphin', 'Panther', 
    'Leopard', 'Cheetah', 'Horse', 'Deer', 'Rabbit', 'Squirrel', 'Otter',
    'Panda', 'Koala', 'Kangaroo', 'Penguin', 'Duck', 'Swan', 'Crow', 'Hawk'
  ];
  
  const numbers = Math.floor(Math.random() * 1000);
  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  
  return `${randomAdjective}${randomNoun}${numbers}`;
};

const getUsedGuestIds = (): Set<string> => {
  if (typeof window === 'undefined') return new Set();
  const stored = localStorage.getItem('used_guest_ids');
  if (stored) {
    try {
      return new Set(JSON.parse(stored));
    } catch {
      return new Set();
    }
  }
  return new Set();
};

const saveUsedGuestId = (id: string) => {
  if (typeof window === 'undefined') return;
  const usedIds = getUsedGuestIds();
  usedIds.add(id);
  localStorage.setItem('used_guest_ids', JSON.stringify(Array.from(usedIds)));
};

interface GuestUser {
  username: string;
  isAnonymous: boolean;
  guestId: string;
  avatar?: string;
}

const createGuestUser = (): GuestUser => {
  let uniqueId = generateUniqueGuestId();
  const usedIds = getUsedGuestIds();
  
  let attempts = 0;
  while (usedIds.has(uniqueId) && attempts < 10) {
    uniqueId = generateUniqueGuestId();
    attempts++;
  }
  
  if (usedIds.has(uniqueId)) {
    uniqueId = `${uniqueId}_${Date.now()}`;
  }
  
  saveUsedGuestId(uniqueId);
  
  const guestUserData: GuestUser = {
    username: uniqueId,
    isAnonymous: true,
    guestId: uniqueId,
    avatar: undefined
  };
  
  localStorage.setItem('auth_token', 'anonymous');
  localStorage.setItem('auth_user', JSON.stringify(guestUserData));
  sessionStorage.setItem('guest_id', uniqueId);
  
  return guestUserData;
};

export default function UnifiedAuthScreen() {
  const router = useRouter();
  const { user: authUser, isLoading: authLoading, login, logout } = useAuth();
  const [activePlack, setActivePlack] = useState<ActivePlack>('anonymous');
  const [authState, setAuthState] = useState<AuthState>('profile');
  const [rightColumnHeight, setRightColumnHeight] = useState(0);
  const rightColumnRef = useRef<HTMLDivElement>(null);
  const [guestUser, setGuestUser] = useState<GuestUser | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Login state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginNeedsVerification, setLoginNeedsVerification] = useState(false);
  const [loginResendLoading, setLoginResendLoading] = useState(false);
  const [loginResendMessage, setLoginResendMessage] = useState<string | null>(null);
  
  // Register state
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [regPendingEmail, setRegPendingEmail] = useState<string | null>(null);
  const [regResendLoading, setRegResendLoading] = useState(false);

  const [loginUsernameError, setLoginUsernameError] = useState(false);
  const [loginPasswordError, setLoginPasswordError] = useState(false);
  const [regUsernameError, setRegUsernameError] = useState(false);
  const [regEmailError, setRegEmailError] = useState(false);
  const [regPasswordError, setRegPasswordError] = useState(false);

  // Load guest user from localStorage
  const loadGuestUser = () => {
    const token = localStorage.getItem('auth_token');
    const userStr = localStorage.getItem('auth_user');
    if (token === 'anonymous' && userStr) {
      try {
        const userData = JSON.parse(userStr);
        if (userData.isAnonymous) {
          setGuestUser({
            username: userData.username,
            isAnonymous: true,
            guestId: userData.guestId || userData.username,
            avatar: userData.avatar
          });
          return true;
        }
      } catch (e) { console.error(e); }
    }
    return false;
  };

  useEffect(() => {
    if (authLoading) return;
    
    if (authUser) {
      setActivePlack('authenticated');
      setAuthState('profile');
      setGuestUser(null);
    } else {
      setActivePlack('anonymous');
      const hasGuest = loadGuestUser();
      if (!hasGuest) {
        const newGuest = createGuestUser();
        setGuestUser(newGuest);
      }
      setAuthState('profile');
    }
    setIsInitialized(true);
  }, [authUser, authLoading]);

  const highlightInput = (setErrorState: (value: boolean) => void) => {
    setErrorState(true);
    setTimeout(() => setErrorState(false), 1000);
  };

  useEffect(() => {
    const updateHeight = () => {
      if (rightColumnRef.current) setRightColumnHeight(rightColumnRef.current.clientHeight);
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    setTimeout(updateHeight, 100);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginNeedsVerification(false);
    setLoginResendMessage(null);
    setLoginLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const detail = data.detail || 'Invalid credentials';
        if (typeof detail === 'string' && detail.toLowerCase().includes('not verified')) setLoginNeedsVerification(true);
        throw new Error(detail);
      }
      const data = await res.json();
      login({ username: data.user.username || loginUsername, email: data.user.email || '' }, data.access_token);
      setAuthState('profile');
      setGuestUser(null);
    } catch (err: any) {
      setLoginError(err.message || 'Invalid credentials');
      highlightInput(setLoginUsernameError);
      highlightInput(setLoginPasswordError);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLoginResend = async () => {
    setLoginResendMessage(null);
    setLoginError(null);
    setLoginResendLoading(true);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail }),
      });
      if (!res.ok) throw new Error((await res.json()).detail);
      setLoginResendMessage('If account exists, verification email sent.');
    } catch (err: any) {
      setLoginError(err.message);
    } finally {
      setLoginResendLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegSuccess(null);
    setRegLoading(true);
    setRegPendingEmail(null);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: regUsername, email: regEmail, password: regPassword }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Registration failed');
      setRegPendingEmail(regEmail);
      setRegSuccess('Registration successful! Please check your email to verify your account.');
      setRegPassword('');
    } catch (err: any) {
      setRegError(err.message);
      highlightInput(setRegUsernameError);
      highlightInput(setRegEmailError);
      highlightInput(setRegPasswordError);
    } finally {
      setRegLoading(false);
    }
  };

  const handleRegisterResend = async () => {
    if (!regPendingEmail) return;
    setRegResendLoading(true);
    setRegError(null);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regPendingEmail }),
      });
      if (!res.ok) throw new Error((await res.json()).detail);
      setRegSuccess('Verification email resent.');
    } catch (err: any) {
      setRegError(err.message);
    } finally {
      setRegResendLoading(false);
    }
  };

  const handleGuestLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    sessionStorage.removeItem('guest_id');
    const newGuest = createGuestUser();
    setGuestUser(newGuest);
  };

  const handleProfile = () => {
    if (authUser) router.push('/profile');
  };

  const handlePlay = () => {
    if (authUser) {
      router.push('/lobby');
    } else if (guestUser) {
      router.push('/lobby');
    } else {
      const newGuest = createGuestUser();
      setGuestUser(newGuest);
      router.push('/lobby');
    }
  };

  const handleLogout = () => {
    logout();
    setAuthState('login');
    setLoginUsername('');
    setLoginPassword('');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    sessionStorage.removeItem('guest_id');
    setGuestUser(null);
  };

  const displayUser = authUser;
  
  // Determine which buttons to show
  const showAuthButtons = authState === 'profile' && (activePlack === 'authenticated' || activePlack === 'anonymous');
  const showLoginRegisterButtons = (authState === 'login' || authState === 'register') && activePlack === 'authenticated';

  if (!isInitialized) {
    return (
      <div className={LAYOUT_STYLES.container}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <div className={TEXT_STYLES.heading}>Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${LAYOUT_STYLES.container} overflow-hidden h-screen`}>
      <div className="fixed bottom-0 left-0 w-full pointer-events-none z-0">
        <Image 
          src="/footer.png" 
          alt="Icon" 
          width={0}
          height={0}
          sizes="100vw"
          className="w-full h-auto"
          unoptimized
        />
      </div>
      <div className="relative z-10 h-screen overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col lg:flex-row items-center justify-start lg:justify-center min-h-screen gap-4 sm:gap-6 lg:gap-8 pt-8 sm:pt-12 lg:pt-16 pb-32 sm:pb-40 lg:pb-56">
            {/* Right side - Content */}
            <div ref={rightColumnRef} className="lg:w-2/4 flex flex-col items-center lg:items-start w-full">
              <div className="relative h-24 sm:h-28 md:h-32 w-full max-w-md mb-4 sm:mb-6 lg:mb-8 self-center lg:self-start">
                <Image src="/logo_left.svg" alt="Icon" fill className="object-contain object-center lg:object-left" />
              </div>

              <div className="relative w-full max-w-[580px] mx-auto lg:mx-0">
                <div className="relative">
                  <div className={`transition-opacity duration-500 ${activePlack === 'authenticated' ? COLORS.activeOpacity : COLORS.inactiveOpacity}`}>
                    <img src="/homepage_plack.svg" alt="Authenticated Plack" className="w-full h-auto" />
                  </div>
                  <div className={`absolute inset-0 transition-opacity duration-500 ${activePlack === 'anonymous' ? COLORS.activeOpacity : COLORS.inactiveOpacity}`}>
                    <div className="transform scale-x-[-1] w-full h-full">
                      <img src="/homepage_plack.svg" alt="Anonymous Plack" className="w-full h-auto" />
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setActivePlack('authenticated');
                      setAuthState('login');
                    }}
                    className={getButtonClass(activePlack === 'authenticated', true)}
                    style={{ left: '4%', top: '4%' }}
                  >
                    AUTHENTICATED
                  </button>
                  <button
                    onClick={() => {
                      setActivePlack('anonymous');
                      setAuthState('profile');
                    }}
                    className={getButtonClass(activePlack === 'anonymous', false)}
                    style={{ right: '4%', top: '4%' }}
                  >
                    ANONYMOUS
                  </button>
                </div>

                {/* Authenticated Content */}
                <div className={`absolute inset-0 transition-all duration-500 ${activePlack === 'authenticated' ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
                  <div className="absolute inset-0 flex flex-col px-[4%] sm:px-[6%] md:px-[8%] pt-[10%] sm:pt-[12%] md:pt-[14%] pb-[8%] sm:pb-[10%] md:pb-[12%]">
                    {authState === 'profile' && displayUser ? (
                      <Card className="w-[calc(100%+40px)] -mx-5 p-2 sm:p-3 md:p-4 -mt-2">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full bg-white/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {displayUser.avatar ? (
                              <img src={displayUser.avatar} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                              <svg className="w-5 h-5 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white/60" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className={`${TEXT_STYLES.heading} text-[10px] sm:text-xs md:text-base truncate`}>{displayUser.username}</h3>
                            <p className={`${TEXT_STYLES.subheading} text-[8px] sm:text-[10px] md:text-xs truncate`}>{displayUser.email}</p>
                            <button onClick={handleLogout} className={`${BUTTON_STYLES.logout} text-[7px] sm:text-[9px] mt-0.5`}>Logout</button>
                          </div>
                        </div>
                      </Card>
                    ) : (
                      <>
                        <h3 className={`${TEXT_STYLES.heading} text-[10px] sm:text-xs md:text-sm text-center mb-1 sm:mb-2`}>
                          {!showRegister ? 'LOGIN' : 'REGISTER'}
                        </h3>
                        <div className="w-full">
                          {!showRegister ? (
                            <form onSubmit={handleLogin} className="w-full space-y-1">
                              <button type="button" onClick={() => setShowRegister(true)} className={`w-full ${BUTTON_STYLES.secondary} text-[8px] sm:text-[9px] py-0.5 sm:py-1`}>No account? Register</button>
                              <Input type="text" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} placeholder="Username" error={loginUsernameError} variant="login" />
                              <Input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Password" error={loginPasswordError} variant="login" />
                              {loginError && <p className={`text-[7px] sm:text-[8px] ${COLORS.errorText} ${COLORS.errorBg} rounded-lg px-1 py-0.5 text-center`}>{loginError}</p>}
                              <button type="submit" disabled={loginLoading} className={`w-full ${COLORS.textPrimary} hover:${COLORS.textHover} font-semibold transition-all text-[8px] sm:text-[9px] py-1 sm:py-1.5`}>{loginLoading ? 'Logging in...' : 'Login'}</button>
                            </form>
                          ) : (
                            <form onSubmit={handleRegister} className="w-full space-y-1">
                              <button type="button" onClick={() => setShowRegister(false)} className={`${BUTTON_STYLES.secondary} text-left w-full text-[8px] sm:text-[9px] py-0.5 sm:py-1`}>Back to Login</button>
                              <Input type="text" value={regUsername} onChange={(e) => setRegUsername(e.target.value)} placeholder="Username" error={regUsernameError} variant="register" />
                              <Input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="Email" error={regEmailError} variant="register" />
                              <Input type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} placeholder="Password" error={regPasswordError} variant="register" />
                              {regSuccess && <p className={`text-[7px] sm:text-[8px] ${COLORS.successText} ${COLORS.successBg} rounded-lg px-1 py-0.5 text-center`}>{regSuccess}</p>}
                              {regError && <p className={`text-[7px] sm:text-[8px] ${COLORS.errorText} ${COLORS.errorBg} rounded-lg px-1 py-0.5 text-center`}>{regError}</p>}
                              {regPendingEmail && (
                                <div className="space-y-1">
                                  <button type="button" onClick={handleRegisterResend} disabled={regResendLoading} className={`w-full ${BUTTON_STYLES.secondary} text-[8px] sm:text-[9px] py-0.5 sm:py-1`}>{regResendLoading ? 'Sending...' : 'Resend'}</button>
                                  <button type="button" onClick={() => setShowRegister(false)} className={`w-full ${BUTTON_STYLES.secondary} text-[8px] sm:text-[9px] py-0.5 sm:py-1`}>Go to Login</button>
                                </div>
                              )}
                              <button type="submit" disabled={regLoading} className={`w-full ${COLORS.textPrimary} hover:${COLORS.textHover} font-semibold transition-all text-[8px] sm:text-[9px] py-1 sm:py-1.5`}>{regLoading ? 'Registering...' : 'Register'}</button>
                            </form>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Anonymous Content */}
                <div className={`absolute inset-0 transition-all duration-500 ${activePlack === 'anonymous' ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
                  <div className="absolute inset-0 flex flex-col px-[4%] sm:px-[6%] md:px-[8%] pt-[10%] sm:pt-[12%] md:pt-[14%] pb-[8%] sm:pb-[10%] md:pb-[12%]">
                    {guestUser ? (
                      <Card className="w-[calc(100%+40px)] -mx-5 p-2 sm:p-3 md:p-4 -mt-2">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full bg-white/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {guestUser.avatar ? (
                              <img src={guestUser.avatar} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                              <svg className="w-5 h-5 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white/60" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className={`${TEXT_STYLES.heading} text-[10px] sm:text-xs md:text-base flex flex-wrap items-center gap-1`}>
                              <span className="truncate">{guestUser.username}</span>
                              <span className="text-[5px] sm:text-[7px] bg-yellow-500/20 text-yellow-200 px-0.5 sm:px-1 py-0.5 rounded">Guest</span>
                            </h3>
                            <p className={`${TEXT_STYLES.subheading} text-[8px] sm:text-[10px] md:text-xs text-yellow-400/70`}>Guest Player</p>
                            <button onClick={handleGuestLogout} className={`${BUTTON_STYLES.logout} text-[7px] sm:text-[9px] mt-0.5`}>New Guest</button>
                          </div>
                        </div>
                      </Card>
                    ) : (
                      <div className="text-center space-y-1">
                        <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-purple-500 mx-auto"></div>
                        <div className={`${TEXT_STYLES.subheading} text-[8px] sm:text-[9px]`}>Loading guest profile...</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Dynamic Buttons */}
              <div className="flex gap-2 sm:gap-3 w-full max-w-[580px] mt-3 sm:mt-4 relative z-50 mx-auto lg:mx-0">
                {showAuthButtons && authUser && (
                  <Button onClick={handleProfile} className="flex-1 py-1 sm:py-1.5 text-[8px] sm:text-[9px]">PROFILE</Button>
                )}
                {showAuthButtons && (
                  <Button onClick={handlePlay} className="flex-1 py-1 sm:py-1.5 text-[8px] sm:text-[9px]">PLAY</Button>
                )}
                {showLoginRegisterButtons && authState === 'login' && (
                  <Button onClick={() => setAuthState('register')} className="flex-1 py-1 sm:py-1.5 text-[8px] sm:text-[9px]">REGISTER</Button>
                )}
                {showLoginRegisterButtons && authState === 'register' && (
                  <Button onClick={() => setAuthState('login')} className="flex-1 py-1 sm:py-1.5 text-[8px] sm:text-[9px]">LOGIN</Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}