/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        tabby: {
          green: '#6CFF93',
          black: '#080707',
          'neutral-2': '#F8F7F6',
          'neutral-5': '#D1CCC7',
          'neutral-6': '#99938E',
          'neutral-7': '#706B67',
          'neutral-8': '#59544F',
          'neutral-11': '#191817',
          yellow: '#F2CC33',
          red: '#F06859',
          blue: '#50ACFF',
          pink: '#E8A6FC',
          'green-3': '#C7FFD6',
          'green-5': '#32A952',
          'green-6': '#27733B',
        }
      },
      fontFamily: {
        display: ["'Inter'", 'Tahoma', 'sans-serif'],
        text: ["'Inter'", 'Tahoma', 'sans-serif'],
      }
    }
  },
  plugins: [],
}
