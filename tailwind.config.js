// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    // adicione mais diretórios conforme seu projeto
  ],
  theme: {
    extend: {
      colors: {
        yellowBrand: "#f5b719", // substitua com o valor real da sua constante YELLOW
        blueBrand: "#0126fB", // substitua com o valor real da sua constante BLUE
        darkblueBrand: "#00205e", // substitua com o valor real da sua constante BLUE
      },
      animation: {
        'spin-reverse': 'spin-reverse 1s linear infinite', // Define a duração e o tipo de animação
      },
      keyframes: {
        'spin-reverse': {
          from: { transform: 'rotate(360deg)' }, // Começa em 360 para girar ao contrário
          to: { transform: 'rotate(0deg)' },    // Termina em 0
        }
      }
    },
  },
  plugins: [],
};
