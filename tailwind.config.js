/** @type {import('tailwindcss').Config} */

module.exports = {
  // mode: 'jit',
  // purge: ['./src/**/*.{js,ts,jsx,tsx}'],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",

    // Or if using `src` directory:
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    screens: {
      xxs: "320px",
      xs: "450px",
      sm: "576px",
      md: "768px",
      lg: "992px",
      xl: "1200px",
      xxl: "1400px",
      xxxl: "1600px",
      "4xl": "1801px",
      max3Xl: { max: "1800px" },
      max2Xl: { max: "1600px" },
      maxXl: { max: "1400px" },
      maxLg: { max: "1200px" },
      maxMd: { max: "991px" },
      maxSm: { max: "767px" },
      maxXs: { max: "575px" },
      maxXXs: { max: "450px" },
      minMax4Xl: { min: "1801px", max: "1900px" },
      minMax3Xl: { min: "1601px", max: "1800px" },
      minMax2Xl: { min: "1401px", max: "1600px" },
      minMaxXl: { min: "1201px", max: "1400px" },
      minMaxLg: { min: "992px", max: "1200px" },
      minMaxMd: { min: "768px", max: "991px" },
      minMaxSm: { min: "576px", max: "767px" },
    },
    fontFamily: {
      body: ["'Poppins', sans-serif"],
      heading: ["'Poppins', sans-serif"],
      fontawesome: ["Font Awesome 6 Pro"],
      icomoon: ["icomoon"],
    },
    extend: {
      colors: {
        white: {
          DEFAULT: '#FFFFFF', // true white for standard utility classes
          dark: '#FFFFFF',    // dark mode (Stay White)
        },
        card: {
          DEFAULT: '#FFFFFF', // Light Mode
          dark: '#0F172A',    // Slate 900 (Deeper than body)
        },
        light: {
          DEFAULT: '#B8B8B8', // light mode
          dark: '#6B7280',    // dark mode
        },
        lightest: {
          DEFAULT: '#99A5B5', // light mode
          dark: '#6B7280',    // dark mode
        },
        medium: {
          DEFAULT: '#424242', // light mode
          dark: '#E5E7EB',    // dark mode
        },
        dark: {
          DEFAULT: '#2E2E2E', // light mode
          dark: '#F9FAFB',    // dark mode
        },
        black: {
          DEFAULT: '#362a2a', // light mode
          dark: '#FFFFFF',    // dark mode
        },
        primary: {
          DEFAULT: '#1359FF', // Royal Blue
          dark: '#1359FF',
        },
        secondary: {
          DEFAULT: '#7B3FF2', // Violet
          dark: '#7B3FF2',
        },
        tertiary: {
          DEFAULT: '#FF3CAC', // Magenta
          dark: '#FF3CAC',
        },
        success: {
          DEFAULT: '#34B53A',
          dark: '#34B53A',
        },
        info: {
          DEFAULT: '#00B2FF', // Sky Blue
          dark: '#00B2FF',
        },
        link: {
          DEFAULT: '#9747FF', // light mode
          dark: '#9747FF',    // dark mode
        },
        warning: {
          DEFAULT: '#FF8A00', // Sunset Orange
          dark: '#FF8A00',
        },
        danger: {
          DEFAULT: '#FF3A29', // light mode
          dark: '#FF3A29',    // dark mode
        },
        placeholder: {
          DEFAULT: '#acaab1', // light mode
          dark: '#9CA3AF',    // dark mode
        },
        body: {
          DEFAULT: '#878a99', // light mode
          dark: '#E2E8F0',    // Slate 200 (Much brighter for readability)
        },
        label: {
          DEFAULT: '#495057', // light mode
          dark: '#94A3B8',    // Slate 400
        },
        taxonomy: {
          DEFAULT: '#A9ABB6', // light mode
          dark: '#94A3B8',    // Slate 400
        },
        rating: "#EC8D1D",
        //text color
        headingPrimary: {
          DEFAULT: '#444050', // light mode
          dark: '#F8FAFB',    // Brighter White
        },
        headingLight: {
          DEFAULT: '#525252', // light mode
          dark: '#CBD5E1',    // Slate 300
        },
        headingLightest: {
          DEFAULT: '#878a99', // light mode
          dark: '#94A3B8',    // Slate 400
        },
        //background
        bgBody: {
          DEFAULT: '#F8FAFC', // Slate 50
          dark: '#020617',    // Slate 950 (Deeper, more premium navy)
        },
        bgLightest: {
          DEFAULT: '#FFFFFF',
          dark: '#1F2937',
        },
        //action
        actionInfo: "#80CAFF",
        //alert
        alertSuccess: "#d1e7dd",
        alertDanger: "#f8d7da",
        alertWarning: "#fff3cd",
        alertInfo: "#cff4fc",
        alertLight: "#efefef",
        alertDark: "#ced4da",
        //border
        border: {
          DEFAULT: '#404040', // light mode
          dark: '#4B5563',    // dark mode
        },
        borderLight: {
          DEFAULT: '#CECECE', // light mode
          dark: '#6B7280',    // dark mode
        },
        borderLightest: {
          DEFAULT: '#EAEAEA', // light mode
          dark: '#374151',    // dark mode
        },
        //chart color
        chartDark: {
          DEFAULT: '#262a2a', // light mode
          dark: '#D1D5DB',    // dark mode
        },
        chartLight: {
          DEFAULT: '#7A7A7A', // light mode
          dark: '#9CA3AF',    // dark mode
        },
        //footer
        footer: {
          DEFAULT: '#878787', // light mode
          dark: '#6B7280',    // dark mode
        },
        //gradient
        gradientPrimary: {
          DEFAULT: 'linear-gradient(90deg, #1359FF 0%, #7B3FF2 33%, #FF3CAC 66%, #FF8A00 100%)',
          dark: 'linear-gradient(90deg, #1359FF 0%, #7B3FF2 33%, #FF3CAC 66%, #FF8A00 100%)',
        },
        gradientBlue: {
          DEFAULT: 'linear-gradient(90deg, #0A0F3D 0%, #1359FF 50%, #00B2FF 100%)',
          dark: 'linear-gradient(90deg, #0A0F3D 0%, #1359FF 50%, #00B2FF 100%)',
        },
        gradientAccent: {
          DEFAULT: 'linear-gradient(90deg, #FF3CAC 0%, #FF8A00 100%)',
          dark: 'linear-gradient(90deg, #FF3CAC 0%, #FF8A00 100%)',
        },
      },

      backgroundImage: {
        gradientPrimary: "linear-gradient(90deg, #1359FF 0%, #7B3FF2 33%, #FF3CAC 66%, #FF8A00 100%)",
        gradientBlue: "linear-gradient(90deg, #0A0F3D 0%, #1359FF 50%, #00B2FF 100%)",
        gradientAccent: "linear-gradient(90deg, #FF3CAC 0%, #FF8A00 100%)",
      },
    },
  },
  variants: {},
  plugins: [],
};
