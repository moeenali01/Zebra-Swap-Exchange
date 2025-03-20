/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    backgroundImage: {
      'hero-pattern': "url('/img/banner-bg-img.png')",
      'footer-pattern': "url('/img/footer-bg.png')"
    },
  },

  plugins: [],
};
