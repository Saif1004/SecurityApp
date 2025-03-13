/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("nativewind/preset")],  // ✅ Add this line
  content: ["./App.{js,jsx,ts,tsx}", "./screens/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};
