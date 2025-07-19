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
    },
  },
  plugins: [],
};
