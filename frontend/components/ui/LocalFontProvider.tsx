'use client'

import { useEffect } from 'react'
import { logger } from '@lib/logger'

export function LocalFontProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Load local fonts
    const loadFonts = async () => {
      const geistFont = new FontFace(
        'Geist',
        'url(/fonts/GeistVF.woff) format("woff")',
        {
          weight: '100 900',
          style: 'normal',
        }
      )

      const geistMonoFont = new FontFace(
        'GeistMono',
        'url(/fonts/GeistMonoVF.woff) format("woff")',
        {
          weight: '100 900',
          style: 'normal',
        }
      )

      try {
        await Promise.all([
          geistFont.load(),
          geistMonoFont.load(),
        ])

        document.fonts.add(geistFont)
        document.fonts.add(geistMonoFont)
      } catch (error) {
        logger.error('Failed to load fonts:', error)
      }
    }

    loadFonts()
  }, [])

  return <>{children}</>
}