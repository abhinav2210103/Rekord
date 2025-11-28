/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      boxShadow: {
        custom: "0px 1px 7px rgba(0, 0, 0, 0.08)",
      },
    },
  },
  plugins: [],
};