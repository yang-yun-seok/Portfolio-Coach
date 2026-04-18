/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "SF Pro Text",
          "SF Pro Display",
          "Pretendard",
          "Apple SD Gothic Neo",
          "Noto Sans KR",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        apple: "3px 5px 30px 0 rgba(0, 0, 0, 0.22)",
      },
      colors: {
        apple: {
          blue: "#0071e3",
          link: "#0066cc",
          bright: "#2997ff",
          black: "#000000",
          gray: "#f5f5f7",
          ink: "#1d1d1f",
        },
      },
    },
  },
  plugins: [],
}
