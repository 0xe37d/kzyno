import localFont from 'next/font/local'
import { Atkinson_Hyperlegible } from 'next/font/google'

export const daydream = localFont({
  src: '../../public/fonts/Daydream.ttf',
  display: 'swap',
})

export const hyperlegible = Atkinson_Hyperlegible({
  weight: ['400', '700'],
  subsets: ['latin'],
  display: 'swap',
})
