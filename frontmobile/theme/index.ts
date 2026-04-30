import type { TextStyle, ViewStyle } from 'react-native'

const palette = {
  slate950: '#0F172A',
  slate900: '#162033',
  slate800: '#22324A',
  slate700: '#42526B',
  slate600: '#5E708A',
  slate500: '#7C8BA1',
  slate300: '#D5DEEA',
  slate200: '#E6EDF5',
  slate100: '#F4F7FB',
  white: '#FFFFFF',
  blue700: '#2F5B88',
  blue500: '#4E7AA7',
  blue100: '#E8F1FB',
  amber500: '#F4B544',
  amber100: '#FFF2D8',
  green700: '#0F7A59',
  green100: '#E3F5EE',
  red700: '#C43D52',
  red100: '#FBE9EC',
} as const

export const colors = {
  background: {
    app: palette.slate100,
    surface: palette.white,
    elevated: '#FBFDFF',
    brand: palette.slate900,
    brandMuted: palette.blue700,
    brandSoft: palette.blue100,
    accentSoft: palette.amber100,
    successSoft: palette.green100,
    dangerSoft: palette.red100,
  },
  text: {
    primary: palette.slate950,
    secondary: palette.slate700,
    muted: palette.slate600,
    subtle: palette.slate500,
    inverse: palette.white,
    brand: palette.slate900,
    accent: '#8A5B08',
    success: palette.green700,
    danger: palette.red700,
  },
  border: {
    subtle: '#EEF3F8',
    default: palette.slate300,
    strong: '#BCC9D7',
    inverse: 'rgba(255,255,255,0.18)',
  },
  icon: {
    primary: palette.slate950,
    secondary: palette.slate700,
    muted: palette.slate500,
    inverse: palette.white,
    brand: palette.slate900,
    accent: palette.amber500,
    success: palette.green700,
    danger: palette.red700,
  },
  action: {
    primary: palette.slate900,
    primaryText: palette.white,
    secondary: palette.white,
    secondaryText: palette.slate900,
    accent: palette.amber500,
    accentText: palette.slate900,
    danger: palette.red700,
    dangerText: palette.white,
  },
  status: {
    success: {
      surface: palette.green100,
      text: palette.green700,
    },
    warning: {
      surface: palette.amber100,
      text: '#8A5B08',
    },
    danger: {
      surface: palette.red100,
      text: palette.red700,
    },
    info: {
      surface: palette.blue100,
      text: palette.blue700,
    },
    neutral: {
      surface: palette.slate200,
      text: palette.slate700,
    },
  },
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  jumbo: 40,
  hero: 56,
} as const

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const

export const fontFamilies = {
  regular: 'Manrope_500Medium',
  medium: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  display: 'Manrope_800ExtraBold',
} as const

export const fontSizes = {
  caption: 12,
  label: 13,
  body: 15,
  bodyLarge: 16,
  titleSmall: 18,
  title: 20,
  h3: 24,
  h2: 28,
  h1: 32,
  display: 40,
} as const

export const lineHeights = {
  caption: 16,
  label: 18,
  body: 22,
  bodyLarge: 24,
  titleSmall: 24,
  title: 26,
  h3: 30,
  h2: 34,
  h1: 38,
  display: 46,
} as const

export const textStyles = {
  display: {
    fontFamily: fontFamilies.display,
    fontSize: fontSizes.display,
    lineHeight: lineHeights.display,
    letterSpacing: -1.2,
  } satisfies TextStyle,
  h1: {
    fontFamily: fontFamilies.display,
    fontSize: fontSizes.h1,
    lineHeight: lineHeights.h1,
    letterSpacing: -0.8,
  } satisfies TextStyle,
  h2: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.h2,
    lineHeight: lineHeights.h2,
    letterSpacing: -0.5,
  } satisfies TextStyle,
  h3: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.h3,
    lineHeight: lineHeights.h3,
    letterSpacing: -0.3,
  } satisfies TextStyle,
  title: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.title,
    lineHeight: lineHeights.title,
  } satisfies TextStyle,
  titleSmall: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.titleSmall,
    lineHeight: lineHeights.titleSmall,
  } satisfies TextStyle,
  bodyLarge: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.bodyLarge,
    lineHeight: lineHeights.bodyLarge,
  } satisfies TextStyle,
  body: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.body,
    lineHeight: lineHeights.body,
  } satisfies TextStyle,
  label: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.label,
    lineHeight: lineHeights.label,
    letterSpacing: 0.1,
  } satisfies TextStyle,
  caption: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.caption,
    lineHeight: lineHeights.caption,
    letterSpacing: 0.2,
  } satisfies TextStyle,
} as const

export const shadows = {
  none: {} satisfies ViewStyle,
  sm: {
    shadowColor: palette.slate950,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  } satisfies ViewStyle,
  md: {
    shadowColor: palette.slate950,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
  } satisfies ViewStyle,
  lg: {
    shadowColor: palette.slate950,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  } satisfies ViewStyle,
} as const

export const theme = {
  palette,
  colors,
  spacing,
  radius,
  fontFamilies,
  fontSizes,
  lineHeights,
  textStyles,
  shadows,
} as const

export type AppTheme = typeof theme
