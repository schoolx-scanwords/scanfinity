'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from './contexts/auth_context';
import { useLanguage } from './contexts/LanguageContext';
import { COLORS, BUTTON_STYLES, TEXT_STYLES, LAYOUT_STYLES } from '@/app/styles/theme';
import Button from './components/ui/Button';
import Input from './components/ui/Input';
import Card from './components/ui/Card';
import LanguageSwitcher from './components/LanguageSwitcher';


type ActivePlack = 'authenticated' | 'anonymous';
type AuthState = 'login' | 'register' | 'profile';

const getButtonClass = (isActive: boolean, isAuthenticated: boolean) => {
  const baseClass = `absolute font-bold text-[10px] sm:text-xs md:text-sm uppercase tracking-wider transition-all z-50 hover:scale-105 whitespace-nowrap px-1 sm:px-2`;
  const activeClass = isActive ? COLORS.buttonActive : `${COLORS.buttonInactive} ${COLORS.textHover}`;
  return `${baseClass} ${activeClass}`;
};

const generateUniqueGuestId = (): string => {
  const adjectives = ['Happy','Sad','Sleepy','Angry','Excited','Calm','Brave','Clever','Witty','Kind','Lucky','Mighty','Swift','Bold','Bright','Dark','Fierce','Gentle','Jolly','Mystic','Noble','Quick','Royal','Smart','Wild','Zealous','Awesome','Cool','Epic','Funny','Great','Heroic'];
  const nouns = ['Fox','Wolf','Eagle','Hawk','Lion','Tiger','Bear','Dragon','Phoenix','Raven','Falcon','Owl','Shark','Dolphin','Panther','Leopard','Cheetah','Horse','Deer','Rabbit','Squirrel','Otter','Panda','Koala','Kangaroo','Penguin','Duck','Swan','Crow','Hawk'];
  const numbers = Math.floor(Math.random() * 1000);
  return `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${numbers}`;
};

const getUsedGuestIds = (): Set<string> => {
  if (typeof window === 'undefined') return new Set();
  const stored = localStorage.getItem('used_guest_ids');
  return stored ? new Set(JSON.parse(stored)) : new Set();
};

const saveUsedGuestId = (id: string) => {
  if (typeof window === 'undefined') return;
  const usedIds = getUsedGuestIds();
  usedIds.add(id);
  localStorage.setItem('used_guest_ids', JSON.stringify(Array.from(usedIds)));
};

export default function UnifiedAuthScreen() {
  const router = useRouter();
  const { user: authUser, isLoading: authLoading, login, logout, setGuest } = useAuth();
  const { t } = useLanguage();
  const [activePlack, setActivePlack] = useState<ActivePlack>('anonymous');
  const [authState, setAuthState] = useState<AuthState>('login');
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Login state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginNeedsVerification, setLoginNeedsVerification] = useState(false);
  const [loginResendLoading, setLoginResendLoading] = useState(false);
  
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

  const createAndSetGuest = () => {
    let uniqueId = generateUniqueGuestId();
    const usedIds = getUsedGuestIds();
    let attempts = 0;
    while (usedIds.has(uniqueId) && attempts < 10) {
      uniqueId = generateUniqueGuestId();
      attempts++;
    }
    if (usedIds.has(uniqueId)) uniqueId = `${uniqueId}_${Date.now()}`;
    saveUsedGuestId(uniqueId);
    
    // Use AuthContext's setGuest method
    setGuest({
      username: uniqueId,
      email: `guest_${uniqueId}@temp.local`,
      avatar: "/avatars/frog.svg",
      isAnonymous: true
    });
  };

  useEffect(() => {
    if (authLoading) return;
    
    if (authUser) {
      setActivePlack('authenticated');
      setAuthState('profile');
    } else {
      setActivePlack('anonymous');
      // Only create guest if no user exists
      const token = localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('auth_user');
      
      // Check if guest already exists
      if (!token || token !== 'anonymous' || !storedUser) {
        createAndSetGuest();
      }
      setAuthState('profile');
    }
    setIsInitialized(true);
  }, [authUser, authLoading]);

  const highlightInput = (setErrorState: (value: boolean) => void) => {
    setErrorState(true);
    setTimeout(() => setErrorState(false), 1000);
  };

  const submitLogin = async () => {
    setLoginError(null);
    setLoginNeedsVerification(false);
    setLoginLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const detail = data.detail || t('authError');
        if (typeof detail === 'string' && detail.toLowerCase().includes('not verified')) setLoginNeedsVerification(true);
        throw new Error(detail);
      }
      const data = await res.json();
      login({ 
        id: data.user.id,
        username: data.user.username || loginUsername, 
        email: data.user.email || '',
        avatar: data.user.avatar || "/avatars/frog.svg"
      }, data.access_token);
      setAuthState('profile');
    } catch (err: any) {
      setLoginError(err.message || t('invalidCredentials'));
      highlightInput(setLoginUsernameError);
      highlightInput(setLoginPasswordError);
    } finally {
      setLoginLoading(false);
    }
  };

  const submitRegister = async () => {
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
      if (!res.ok) throw new Error((await res.json()).detail || t('registerError'));
      setRegPendingEmail(regEmail);
      setRegSuccess(t('registerSuccessVerifyEmail'));
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitLogin();
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitRegister();
  };

  const handleLoginResend = async () => {
    setLoginError(null);
    setLoginResendLoading(true);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail }),
      });
      if (!res.ok) throw new Error((await res.json()).detail);
      setLoginError('Письмо отправлено, проверьте почту');
    } catch (err: any) {
      setLoginError(err.message);
    } finally {
      setLoginResendLoading(false);
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
      setRegSuccess('Письмо отправлено повторно');
    } catch (err: any) {
      setRegError(err.message);
    } finally {
      setRegResendLoading(false);
    }
  };

  const handleNewGuest = () => {
    logout(); // Clear current user/guest
    createAndSetGuest();
  };

  const handleProfile = () => authUser && router.push('/profile');
  const handlePlay = () => router.push('/lobby');
  const handleLeaders = () => console.log('Leaders clicked');

  const handleLogout = () => {
    logout();
    setAuthState('login');
    setLoginUsername('');
    setLoginPassword('');
    setShowRegister(false);
  };

  if (!isInitialized) {
    return (
      <div className={LAYOUT_STYLES.container}>
        <LanguageSwitcher />
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <div className={TEXT_STYLES.heading}>Loading...</div>
        </div>
      </div>
    );
  }

  const isLoggedIn = !!authUser && !authUser.isAnonymous;
  const isGuest = authUser?.isAnonymous === true;
  const isGuestActive = activePlack === 'anonymous';
  const isAuthActive = activePlack === 'authenticated';

  const hideScrollbarStyle = {
    overflowY: 'auto' as const,
    scrollbarWidth: 'none' as const,
    msOverflowStyle: 'none' as const,
  };

  return (
    <div className={LAYOUT_STYLES.container}>
      <LanguageSwitcher />
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center justify-center min-h-screen">
          <div className="flex flex-col items-center w-full max-w-[580px]">
            <div className="relative h-32 w-full max-w-md mb-6">
              <Image src="/logo_left.svg" alt="Icon" fill className="object-contain object-left" />
            </div>

            <div className="relative w-full">
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
                  onClick={() => setActivePlack('authenticated')}
                  className={getButtonClass(activePlack === 'authenticated', true)}
                  style={{ left: '2%', top: '4%' }}
                >
                  {t('authenticated')}
                </button>
                <button
                  onClick={() => setActivePlack('anonymous')}
                  className={getButtonClass(activePlack === 'anonymous', false)}
                  style={{ right: '2%', top: '4%' }}
                >
                  {t('anonymous')}
                </button>
              </div>

              {/* Authenticated Content */}
              <div className={`absolute inset-0 transition-all duration-500 ${activePlack === 'authenticated' ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
                <div 
                  className="absolute inset-0 flex flex-col justify-start px-4 sm:px-[8%] md:px-[12%] pt-10 md:pt-16 lg:pt-20 pb-6"
                  style={hideScrollbarStyle}
                >
                  <style jsx>{`
                    div::-webkit-scrollbar {
                      display: none;
                    }
                  `}</style>
                  
                  {authState === 'profile' && isLoggedIn ? (
                    <Card className="w-full p-3 sm:p-4 md:p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
                          {authUser.avatar ? (
                            <img src={authUser.avatar} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            <svg className="w-12 h-12 sm:w-16 sm:h-16 text-white/60" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                            </svg>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className={`${TEXT_STYLES.heading} text-base sm:text-lg md:text-2xl`}>{authUser.username}</h3>
                          <p className={`${TEXT_STYLES.subheading} text-xs sm:text-base md:text-xl`}>{authUser.email}</p>
                          <button onClick={handleLogout} className={BUTTON_STYLES.logout}>{t('logout')}</button>
                        </div>
                      </div>
                    </Card>
                  ) : (
                    <>
                      {!showRegister ? (
                        <form onSubmit={handleLogin} className="w-full space-y-1.5 sm:space-y-2">
                          <div className="flex justify-between items-center mb-2">
                            <span className={`${TEXT_STYLES.heading} text-sm sm:text-base md:text-lg`}>
                              {t('login')}
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowRegister(true)}
                              className="text-sm sm:text-base text-purple-300 hover:text-purple-100 transition-colors"
                            >
                              {t('register')}
                            </button>
                          </div>
                          <Input type="text" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} placeholder={t('username')} error={loginUsernameError} variant="login" />
                          <Input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder={t('password')} error={loginPasswordError} variant="login" />
                          {loginError && <p className={`text-xs ${COLORS.errorText} ${COLORS.errorBg} rounded-lg px-2 py-1 text-center`}>{loginError}</p>}
                          {loginNeedsVerification && (
                            <button type="button" onClick={handleLoginResend} disabled={loginResendLoading} className={BUTTON_STYLES.secondary}>
                              {loginResendLoading ? t('sending') : t('resendVerification')}
                            </button>
                          )}
                        </form>
                      ) : (
                        <form onSubmit={handleRegister} className="w-full space-y-1.5 sm:space-y-2">
                          <div className="flex justify-between items-center mb-2">
                            <button
                              type="button"
                              onClick={() => setShowRegister(false)}
                              className="text-sm sm:text-base text-purple-300 hover:text-purple-100 transition-colors"
                            >
                              {t('backToLogin')}
                            </button>
                            <span className={`${TEXT_STYLES.heading} text-sm sm:text-base md:text-lg`}>
                              {t('register')}
                            </span>
                          </div>
                          <Input type="text" value={regUsername} onChange={(e) => setRegUsername(e.target.value)} placeholder={t('username')} error={regUsernameError} variant="register" />
                          <Input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder={t('email')} error={regEmailError} variant="register" />
                          <Input type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} placeholder={t('password')} error={regPasswordError} variant="register" />
                          {regSuccess && <p className={`text-[10px] ${COLORS.successText} ${COLORS.successBg} rounded-lg px-2 py-1 text-center`}>{regSuccess}</p>}
                          {regError && <p className={`text-xs ${COLORS.errorText} ${COLORS.errorBg} rounded-lg px-2 py-1 text-center`}>{regError}</p>}
                          {regPendingEmail && (
                            <div className="space-y-2">
                              <button type="button" onClick={handleRegisterResend} disabled={regResendLoading} className={`w-full ${BUTTON_STYLES.secondary}`}>{regResendLoading ? t('sending') : t('resendVerification')}</button>
                              <button type="button" onClick={() => setShowRegister(false)} className={`w-full ${BUTTON_STYLES.secondary}`}>{t('goToLogin')}</button>
                            </div>
                          )}
                        </form>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Anonymous Content */}
              <div className={`absolute inset-0 transition-all duration-500 ${activePlack === 'anonymous' ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
                <div className="absolute inset-0 flex flex-col justify-start px-4 sm:px-[8%] md:px-[12%] pt-14 sm:pt-10 md:pt-16 lg:pt-20 pb-6">
                  {isGuest ? (
                    <Card className="w-full p-3 sm:p-4 md:p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
                          {authUser.avatar ? (
                            <img src={authUser.avatar} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            <svg className="w-12 h-12 sm:w-16 sm:h-16 text-white/60" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                            </svg>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className={`${TEXT_STYLES.heading} text-base sm:text-lg md:text-2xl`}>
                            {authUser.username}
                            <span className="ml-2 text-xs bg-yellow-500/20 text-yellow-200 px-2 py-0.5 rounded">Guest</span>
                          </h3>
                          <p className={`${TEXT_STYLES.subheading} text-xs sm:text-base md:text-xl text-yellow-400/70`}>Guest Player</p>
                          <button onClick={handleNewGuest} className={BUTTON_STYLES.logout}>New Guest</button>
                        </div>
                      </div>
                    </Card>
                  ) : (
                    <div className="text-center">Loading guest...</div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Buttons */}
            <div className="mt-4 relative z-50 w-full">
              {isLoggedIn ? (
                <div className="flex gap-3 w-full">
                  <Button onClick={handleProfile} className="flex-1 py-2 text-xs sm:text-sm">{t('profileBtn')}</Button>
                  <Button onClick={handlePlay} className="flex-1 py-2 text-xs sm:text-sm">{t('play')}</Button>
                  <Button onClick={handleLeaders} className="flex-1 py-2 text-xs sm:text-sm">{t('leaders')}</Button>
                </div>
              ) : isGuestActive ? (
                <Button onClick={handlePlay} className="w-full py-2 text-xs sm:text-sm">
                  {t('play')}
                </Button>
              ) : isAuthActive && !isLoggedIn ? (
                <Button
                  onClick={() => {
                    if (showRegister) {
                      submitRegister();
                    } else {
                      submitLogin();
                    }
                  }}
                  className="w-full py-2 text-xs sm:text-sm"
                  disabled={(showRegister ? regLoading : loginLoading)}
                >
                  {showRegister ? t('registerBtn') : t('loginBtn')}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      {/* Footer Image */}
      <div 
        className="fixed bottom-0 left-0 right-0 z-40"
        style={{
          width: '100vw',
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          pointerEvents: 'none'
        }}
      >
        <img 
          src="/footer.png" 
          alt="Footer" 
          style={{
            width: '100%',
            height: 'auto',
            display: 'block'
          }}
        />
      </div>
    </div>
  );
}