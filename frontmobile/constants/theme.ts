const baseColors = {
    background: '#151515',
    backgroundDeep: '#0F0F0F',
    surface: '#202020',
    surfaceElevated: '#282828',
    surfaceMuted: '#323334',
    border: '#3F3F3F',
    borderSoft: 'rgba(255,255,255,0.10)',
    text: '#FFFFFF',
    textMuted: '#A8A8A8',
    textSubtle: '#707070',
    lime: '#B8FF00',
    limePressed: '#9CE000',
    limeSoft: '#D8FF66',
    danger: '#F87171',
    dangerSurface: '#8F312D',
    warning: '#FFB84D',
    success: '#44D07B',
    info: '#7DD3FC',
    white: '#FFFFFF',
    black: '#050505',
    scrim: 'rgba(0,0,0,0.58)',
    mapOverlay: 'rgba(21,21,21,0.92)',
}

export type ThemeColors = typeof baseColors
export type PaletteName =
  | 'lime-night'
  | 'ocean'
  | 'sunset'
  | 'electric-blue'
  | 'forest'
  | 'sand'
  | 'cherry'
  | 'lavender'
  | 'copper'
  | 'mono-neon'

export type Palette = {
  id: PaletteName
  name: string
  description: string
  colors: ThemeColors
}

export const palettes: Record<PaletteName, Palette> = {
  'lime-night': {
    id: 'lime-night',
    name: 'Lima nocturna',
    description: 'La identidad actual de Llevo.',
    colors: { ...baseColors },
  },
  ocean: {
    id: 'ocean',
    name: 'Oceano',
    description: 'Azules profundos con acentos celestes.',
    colors: {
      ...baseColors,
      background: '#0B1620', backgroundDeep: '#071018', surface: '#102431', surfaceElevated: '#173345',
      surfaceMuted: '#214357', border: '#386176', borderSoft: 'rgba(183,225,242,0.16)',
      textMuted: '#B3C9D4', textSubtle: '#7894A3', lime: '#57D8FF', limePressed: '#2ABFEA', limeSoft: '#9CEAFF',
      dangerSurface: '#542F35', warning: '#FFC766', success: '#55D99A', info: '#8BDFFF',
      scrim: 'rgba(3,13,20,0.65)', mapOverlay: 'rgba(11,22,32,0.92)',
    },
  },
  sunset: {
    id: 'sunset',
    name: 'Atardecer',
    description: 'Grafito con un acento coral energico.',
    colors: {
      ...baseColors,
      background: '#1B1512', backgroundDeep: '#120D0B', surface: '#2A201C', surfaceElevated: '#372A24',
      surfaceMuted: '#47352D', border: '#675047', borderSoft: 'rgba(255,232,218,0.14)',
      textMuted: '#D0B9AD', textSubtle: '#927A6E', lime: '#FF9D5C', limePressed: '#E67E3D', limeSoft: '#FFC399',
      dangerSurface: '#6D302B', warning: '#FFD166', success: '#75D6A1', info: '#8FD3FF',
      scrim: 'rgba(18,13,11,0.66)', mapOverlay: 'rgba(27,21,18,0.92)',
    },
  },
  'electric-blue': {
    id: 'electric-blue',
    name: 'Azul electrico',
    description: 'Tinta profesional con azul intenso.',
    colors: {
      ...baseColors,
      background: '#10131C', backgroundDeep: '#090C13', surface: '#191E2B', surfaceElevated: '#232B3B',
      surfaceMuted: '#2E3950', border: '#465674', borderSoft: 'rgba(210,222,255,0.14)',
      textMuted: '#BCC6DE', textSubtle: '#8290AF', lime: '#5B8CFF', limePressed: '#3E70E8', limeSoft: '#AFC6FF',
      dangerSurface: '#602F3C', warning: '#FFCA68', success: '#60D9A1', info: '#78C9FF',
      scrim: 'rgba(5,8,15,0.66)', mapOverlay: 'rgba(16,19,28,0.92)',
    },
  },
  forest: {
    id: 'forest',
    name: 'Bosque',
    description: 'Verde profundo con acento menta.',
    colors: {
      ...baseColors,
      background: '#0E1B16', backgroundDeep: '#08120E', surface: '#152920', surfaceElevated: '#1D362A',
      surfaceMuted: '#294838', border: '#416854', borderSoft: 'rgba(204,244,222,0.14)',
      textMuted: '#B8D0C0', textSubtle: '#789987', lime: '#72E6A6', limePressed: '#4DCF88', limeSoft: '#B4F5CF',
      dangerSurface: '#613B38', warning: '#F5C76A', success: '#72E6A6', info: '#82D6E8',
      scrim: 'rgba(4,15,10,0.66)', mapOverlay: 'rgba(14,27,22,0.92)',
    },
  },
  sand: {
    id: 'sand',
    name: 'Arena',
    description: 'Tonos tierra con dorado premium.',
    colors: {
      ...baseColors,
      background: '#201D17', backgroundDeep: '#15130F', surface: '#2C2921', surfaceElevated: '#39352B',
      surfaceMuted: '#494337', border: '#6A6251', borderSoft: 'rgba(255,244,215,0.14)',
      textMuted: '#D2C9B5', textSubtle: '#938A76', lime: '#F5C76A', limePressed: '#DAA841', limeSoft: '#FFE0A0',
      dangerSurface: '#6C3730', warning: '#F5C76A', success: '#7DD6A1', info: '#94D8F0',
      scrim: 'rgba(16,14,10,0.66)', mapOverlay: 'rgba(32,29,23,0.92)',
    },
  },
  cherry: {
    id: 'cherry',
    name: 'Cereza',
    description: 'Grafito veloz con rojo vibrante.',
    colors: {
      ...baseColors,
      background: '#191417', backgroundDeep: '#100C0E', surface: '#281E23', surfaceElevated: '#35272E',
      surfaceMuted: '#45333B', border: '#674A55', borderSoft: 'rgba(255,222,228,0.14)',
      textMuted: '#D1BAC2', textSubtle: '#947883', lime: '#FF5C70', limePressed: '#E63D54', limeSoft: '#FFA8B4',
      danger: '#FF7182', dangerSurface: '#6B2E39', warning: '#FFC766', success: '#6DD9A1', info: '#8FD3FF',
      scrim: 'rgba(15,8,11,0.66)', mapOverlay: 'rgba(25,20,23,0.92)',
    },
  },
  lavender: {
    id: 'lavender',
    name: 'Lavanda mineral',
    description: 'Pizarra suave con lavanda luminosa.',
    colors: {
      ...baseColors,
      background: '#17161E', backgroundDeep: '#0F0E14', surface: '#24222E', surfaceElevated: '#302D3D',
      surfaceMuted: '#403C50', border: '#5E5873', borderSoft: 'rgba(231,225,255,0.14)',
      textMuted: '#C9C3DA', textSubtle: '#8C849F', lime: '#B9A6FF', limePressed: '#9981EB', limeSoft: '#D8CEFF',
      dangerSurface: '#603640', warning: '#FFD071', success: '#76D8B0', info: '#98D6FF',
      scrim: 'rgba(10,9,15,0.66)', mapOverlay: 'rgba(23,22,30,0.92)',
    },
  },
  copper: {
    id: 'copper',
    name: 'Cobre',
    description: 'Negro calido con cobre artesanal.',
    colors: {
      ...baseColors,
      background: '#181411', backgroundDeep: '#100D0B', surface: '#27201B', surfaceElevated: '#342A23',
      surfaceMuted: '#46372E', border: '#684E40', borderSoft: 'rgba(255,227,211,0.14)',
      textMuted: '#D1BCAF', textSubtle: '#92786A', lime: '#E7975A', limePressed: '#CA733B', limeSoft: '#F8C39B',
      dangerSurface: '#6B302A', warning: '#F3BE62', success: '#71D2A2', info: '#8DD5EF',
      scrim: 'rgba(14,10,8,0.66)', mapOverlay: 'rgba(24,20,17,0.92)',
    },
  },
  'mono-neon': {
    id: 'mono-neon',
    name: 'Monocromo neon',
    description: 'Negro absoluto y blanco hielo minimalista.',
    colors: {
      ...baseColors,
      background: '#0C0C0C', backgroundDeep: '#050505', surface: '#171717', surfaceElevated: '#222222',
      surfaceMuted: '#303030', border: '#4A4A4A', borderSoft: 'rgba(234,240,242,0.14)',
      text: '#EAF0F2', textMuted: '#B4BEC2', textSubtle: '#788286', lime: '#EAF0F2', limePressed: '#C9D4D8', limeSoft: '#FFFFFF',
      dangerSurface: '#552D32', warning: '#F2C86B', success: '#75D3A5', info: '#91D9F2', white: '#EAF0F2',
      scrim: 'rgba(0,0,0,0.72)', mapOverlay: 'rgba(12,12,12,0.94)',
    },
  },
}

export const Theme = {
  colors: { ...baseColors },
  fonts: {
    display: 'SpaceGrotesk_700Bold',
    body: 'Manrope_400Regular',
    medium: 'Manrope_500Medium',
    semiBold: 'Manrope_600SemiBold',
    bold: 'Manrope_700Bold',
    extraBold: 'Manrope_800ExtraBold',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 22,
    pill: 999,
  },
} as const
