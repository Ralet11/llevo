import * as SecureStore from 'expo-secure-store'
import { createContext, ReactNode, useContext, useEffect, useState } from 'react'
import { View } from 'react-native'
import { PaletteName, palettes, Theme, ThemeColors } from '../constants/theme'

const THEME_STORAGE_KEY = 'llevo.palette'

type ThemeContextValue = {
  palette: typeof palettes[PaletteName]
  paletteName: PaletteName
  setPalette: (name: PaletteName) => Promise<void>
}

const ThemeContext = createContext<ThemeContextValue | null>(null)
let activeColors: ThemeColors = Theme.colors

function applyPaletteColors(colors: ThemeColors) {
  // Mantiene compatibles los estilos legacy que aun consultan Theme.colors.
  Object.assign(Theme.colors, colors)
  activeColors = colors
}

export function themedStyles<T extends object>(factory: () => T): T {
  let cachedColors: ThemeColors | null = null
  let cachedStyles: T

  return new Proxy({} as T, {
    get(_target, property) {
      if (cachedColors !== activeColors) {
        cachedStyles = factory()
        cachedColors = activeColors
      }
      return cachedStyles![property as keyof T]
    },
  })
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Arrancamos con la misma paleta que verá el usuario por defecto para evitar
  // un destello de los colores históricos antes de restaurar su preferencia.
  const [paletteName, setPaletteName] = useState<PaletteName>('electric-blue')
  const [themeReady, setThemeReady] = useState(false)
  const palette = palettes[paletteName]

  applyPaletteColors(palette.colors)

  useEffect(() => {
    SecureStore.getItemAsync(THEME_STORAGE_KEY)
      .then((savedPalette) => {
        if (savedPalette && savedPalette in palettes) setPaletteName(savedPalette as PaletteName)
      })
      .catch(() => {})
      .finally(() => setThemeReady(true))
  }, [])

  async function setPalette(name: PaletteName) {
    setPaletteName(name)
    await SecureStore.setItemAsync(THEME_STORAGE_KEY, name).catch(() => {})
  }

  // No montamos las pantallas hasta restaurar la preferencia: de este modo no
  // aparece por un instante una paleta distinta durante el arranque.
  if (!themeReady) return <View style={{ flex: 1, backgroundColor: palettes['electric-blue'].colors.background }} />

  return (
    <ThemeContext.Provider value={{ palette, paletteName, setPalette }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme debe utilizarse dentro de ThemeProvider.')
  return context
}

// Alias temporal para pantallas que aun usan los tokens estaticos.
export { Theme }
