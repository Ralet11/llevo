import * as SecureStore from 'expo-secure-store'
import { createContext, ReactNode, useContext, useEffect, useState } from 'react'
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
  const [paletteName, setPaletteName] = useState<PaletteName>('lime-night')
  const palette = palettes[paletteName]

  applyPaletteColors(palette.colors)

  useEffect(() => {
    SecureStore.getItemAsync(THEME_STORAGE_KEY)
      .then((savedPalette) => {
        if (savedPalette && savedPalette in palettes) setPaletteName(savedPalette as PaletteName)
      })
      .catch(() => {})
  }, [])

  async function setPalette(name: PaletteName) {
    setPaletteName(name)
    await SecureStore.setItemAsync(THEME_STORAGE_KEY, name).catch(() => {})
  }

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
