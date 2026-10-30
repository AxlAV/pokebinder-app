const path = require('path');

const rootDir = path.resolve(__dirname).split(path.sep).join('/');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    `${rootDir}/app/**/*.{js,jsx,ts,tsx}`,
    `${rootDir}/src/**/*.{js,jsx,ts,tsx}`,
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
    '../app/**/*.{js,jsx,ts,tsx}',
    '../src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        binder: '#111015',
        page: '#1A1820',
        pocket: '#23202B',
        ink: '#F5F2EB',
        muted: '#8E8899',
        foil: '#E5A93C',
        lacquer: '#D94E34',
        stitch: '#2E2A38',
      },
      fontFamily: {
        display: ['SpaceGrotesk_700Bold', 'System'],
        'display-semi': ['SpaceGrotesk_600SemiBold', 'System'],
        sans: ['PlusJakartaSans_400Regular', 'System'],
        'sans-medium': ['PlusJakartaSans_500Medium', 'System'],
        'sans-semi': ['PlusJakartaSans_600SemiBold', 'System'],
        mono: ['JetBrainsMono_400Regular', 'monospace'],
        'mono-semi': ['JetBrainsMono_600SemiBold', 'monospace'],
      },
      borderRadius: {
        pocket: '6px',
        card: '12px',
      },
    },
  },
  plugins: [],
};
