// styles/theme.ts
export const COLORS = {
  // Background colors
  background: 'bg-gradient-to-b from-[#460045] to-[#130237]',
  backgroundSecondary: 'bg-black/30',
  backgroundInput: 'bg-black/40',
  
  // Text colors
  textPrimary: 'text-white',
  textSecondary: 'text-white/60',
  textTertiary: 'text-white/40',
  textHover: 'hover:text-white/80',
  
  // Button colors (authenticated/anonymous toggle)
  buttonActive: 'text-white',
  buttonInactive: 'text-white/60',
  
  // Form element colors
  inputBorder: 'border-white/20',
  inputFocus: 'focus:ring-white/20',
  inputError: 'border-red-500 ring-2 ring-red-500',
  inputPlaceholder: 'placeholder-white/60',
  
  // Button colors
  buttonBg: 'bg-[#754CA880]',
  buttonBgHover: 'hover:bg-[#754CA8]',
  buttonText: 'text-white',
  
  // Error/Success colors
  errorText: 'text-red-300',
  errorBg: 'bg-red-500/20',
  successText: 'text-green-300',
  successBg: 'bg-green-500/20',
  
  // Opacity levels
  activeOpacity: 'opacity-100',
  inactiveOpacity: 'opacity-40',
  
  // SVG colors
  svgFillColor: '#55DF43',
};

export const BUTTON_STYLES = {
  primary: `rounded-3xl ${COLORS.buttonBg} ${COLORS.buttonBgHover} ${COLORS.buttonText} font-semibold transition-all cursor-pointer shadow-lg hover:shadow-xl hover:scale-105`,
  secondary: `text-sm ${COLORS.textSecondary} ${COLORS.textHover}`,
  logout: `text-md text-white/30 hover:text-white/60 transition-colors mt-1`,
};

export const INPUT_STYLES = {
  base: `w-full px-2 py-2 rounded-3xl ${COLORS.backgroundInput} ${COLORS.inputBorder} ${COLORS.textPrimary} ${COLORS.inputPlaceholder} focus:outline-none focus:ring-2 ${COLORS.inputFocus} transition-all duration-200`,
  login: `text-sm`,
  register: `text-xs`,
};

export const TEXT_STYLES = {
  heading: `${COLORS.textPrimary} font-bold`,
  subheading: `${COLORS.textSecondary}`,
  link: `${COLORS.textSecondary} ${COLORS.textHover}`,
};

export const LAYOUT_STYLES = {
  container: `min-h-screen ${COLORS.background} p-4 md:p-8`,
  centerFlex: `flex items-center justify-center`,
  card: `bg-black/30 rounded-3xl`,
};