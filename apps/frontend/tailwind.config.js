/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/components/**/*.{js,vue,ts}',
    './src/layouts/**/*.vue',
    './src/pages/**/*.vue',
    './src/plugins/**/*.{js,ts}',
    './src/app.vue',
    './src/error.vue',
  ],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [
    // We'll use the typography plugin through the Nuxt module instead
  ],
} 