import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Semantic aliases
        obsidian: 'var(--dark-base-primary)',
        'safety-orange': 'var(--accent-100)',
        steel: 'var(--neutral-500)',
        'pure-white': 'var(--light-base-secondary)',

        // Accent colors
        accent: {
          100: 'var(--accent-100)',
          200: 'var(--accent-200)',
          300: 'var(--accent-300)',
        },
        // Base colors
        'dark-base': {
          primary: 'var(--dark-base-primary)',
          secondary: 'var(--dark-base-secondary)',
        },
        'light-base': {
          primary: 'var(--light-base-primary)',
          secondary: 'var(--light-base-secondary)',
        },
        // Neutral scale
        neutral: {
          100: 'var(--neutral-100)',
          200: 'var(--neutral-200)',
          300: 'var(--neutral-300)',
          400: 'var(--neutral-400)',
          500: 'var(--neutral-500)',
          600: 'var(--neutral-600)',
          700: 'var(--neutral-700)',
          800: 'var(--neutral-800)',
          900: 'var(--neutral-900)',
          1000: 'var(--neutral-1000)',
        }
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
      },
      fontFamily: {
        sans: ['"Geist Custom"', 'var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono Custom"', 'var(--font-geist-mono)', 'monospace'],
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200px 0' },
          '100%': { backgroundPosition: 'calc(200px + 100%) 0' },
        },
      },
      animation: {
        marquee: 'marquee 20s linear infinite',
        shimmer: 'shimmer 1.5s infinite',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}

export default config
