/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'academic-blue': '#2A3B8C',
        'off-white': '#F8F9FA',
        'trust-green': '#4CAF50',
        'alert-red': '#E53935',
        'admin-purple': '#6A1B9A',
        'button-blue': '#3B82F6',
        'inscription-blue': '#4361EE',
      },
      fontFamily: {
        'heading': ['Merriweather', 'serif'],
        'body': ['Open Sans', 'sans-serif'],
      },
      opacity: {
        '98': '0.98',
      },
    },
  },
  plugins: [],
}

