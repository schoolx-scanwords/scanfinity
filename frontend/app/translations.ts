// app/translations.ts
export type Language = 'ru' | 'en';

export const translations = {
  ru: {

    // Auth states
    login: 'Вход в игру',
    register: 'Регистрация',
    profile: 'Профиль',
    
    // Buttons
    loginBtn: 'Войти',
    registerBtn: 'Зарегистрироваться',
    logout: 'Выйти',
    play: 'Играть',
    leaders: 'Лидеры',
    profileBtn: 'Профиль',
    
    // Form labels
    username: 'Логин',
    email: 'Email',
    password: 'Пароль',
    
    // Form links
    noAccount: 'Нет аккаунта? Зарегистрироваться',
    backToLogin: '← Назад к входу',
    
    // Anonymous play
    playAnonymous: 'Играть без регистрации',
    clickToStart: 'Нажмите чтобы начать',
    progressNotSaved: 'Прогресс не сохранится',
    
    // Loading states
    loggingIn: 'Входим...',
    registering: 'Регистрируем...',
    
    // Error messages
    authError: 'Ошибка авторизации',
    registerError: 'Ошибка регистрации',
    invalidCredentials: 'Неверное имя пользователя или пароль',
    
    // Success messages
    registerSuccess: 'Регистрация прошла успешно!',
    
    // Plack toggles
    authenticated: 'авторизваться',
    anonymous: 'играть как гость',
  },
  en: {
    // Auth states
    login: 'Login',
    register: 'Register',
    profile: 'Profile',
    
    // Buttons
    loginBtn: 'Login',
    registerBtn: 'Register',
    logout: 'Logout',
    play: 'Play',
    leaders: 'Leaders',
    profileBtn: 'Profile',
    
    // Form labels
    username: 'Username',
    email: 'Email',
    password: 'Password',
    
    // Form links
    noAccount: "Don't have an account? Register",
    backToLogin: '← Back to login',
    
    // Anonymous play
    playAnonymous: 'Play without registration',
    clickToStart: 'Click to start',
    progressNotSaved: 'Progress will not be saved',
    
    // Loading states
    loggingIn: 'Logging in...',
    registering: 'Registering...',
    
    // Error messages
    authError: 'Authentication error',
    registerError: 'Registration error',
    invalidCredentials: 'Invalid username or password',
    
    // Success messages
    registerSuccess: 'Registration successful!',
    
    // Plack toggles
    authenticated: 'authenticated',
    anonymous: 'anonymous',
  },
};

export type TranslationKey = keyof typeof translations.ru;