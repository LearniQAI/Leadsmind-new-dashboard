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
      // => @media (min-width: 320px) { ... }
      xs: "450px",
      // => @media (min-width: 450px) { ... }

      sm: "576px",
      // => @media (min-width: 576px) { ... }

      md: "768px",
      // => @media (min-width: 768px) { ... }

      lg: "992px",
      // => @media (min-width: 992px) { ... }

      xl: "1200px",
      // => @media (min-width: 1200px) { ... }

      xxl: "1400px",
      // => @media (min-width: 1400px) { ... }

      xxxl: "1600px",
      // => @media (min-width: 1600px) { ... }

      "4xl": "1801px",
      // => @media (min-width: 1601px) { ... }

      max3Xl: { max: "1800px" },
      // => @media (max-width: 1700px) { ... }

      max2Xl: { max: "1600px" },
      // => @media (max-width: 1600px) { ... }

      maxXl: { max: "1400px" },
      // => @media (max-width: 1200px) { ... }

      maxLg: { max: "1200px" },
      // => @media (max-width: 1200px) { ... }

      maxMd: { max: "991px" },
      // => @media (max-width: 991px) { ... }

      maxSm: { max: "767px" },
      // => @media (max-width: 767px) { ... }

      maxXs: { max: "575px" },
      // => @media (max-width: 575px) { ... }
      maxXXs: { max: "450px" },
      // => @media (max-width: 450px) { ... }

      minMax4Xl: { min: "1801px", max: "1900px" },
      // => @media (min-width: 1601px) and (max-width: 1800px) { ... }
      minMax3Xl: { min: "1601px", max: "1800px" },
      // => @media (min-width: 1601px) and (max-width: 1800px) { ... }

      minMax2Xl: { min: "1401px", max: "1600px" },
      // => @media (min-width: 1401px) and (max-width: 1600px) { ... }

      minMaxXl: { min: "1201px", max: "1400px" },
      // => @media (min-width: 1201px) and (max-width: 1400px) { ... }

      minMaxLg: { min: "992px", max: "1200px" },
      // => @media (min-width: 992px) and (max-width: 1200px) { ... }

      minMaxMd: { min: "768px", max: "991px" },
      // => @media (min-width: 768px) and (max-width: 991px) { ... }

      minMaxSm: { min: "576px", max: "767px" },
      // => @media (min-width: 576px) and (max-width: 576px) { ... }
    },
    fontFamily: {
      body: ["'Roboto', sans-serif"],
      heading: ["'Roboto', sans-serif"],
      fontawesome: ["Font Awesome 6 Pro"],
      icomoon: ["icomoon"],
    },
    extend: {
      colors: {
        white: {
          DEFAULT: '#FFFFFF', // light mode
          dark: '#362a2a',    // dark mode
        },
        card: {
          DEFAULT: '#FFFFFF', // light mode
          dark: '#1F2937',    // dark mode
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
          DEFAULT: '#6C5FFC', // light mode
          dark: '#6C5FFC',    // dark mode
        },
        secondary: {
          DEFAULT: '#1ABC9C', // light mode
          dark: '#1ABC9C',    // dark mode
        },
        tertiary: {
          DEFAULT: '#ABA3FD', // light mode
          dark: '#ABA3FD',    // dark mode
        },
        success: {
          DEFAULT: '#34B53A', // light mode
          dark: '#34B53A',    // dark mode
        },
        info: {
          DEFAULT: '#0dcaf0', // light mode
          dark: '#0dcaf0',    // dark mode
        },
        link: {
          DEFAULT: '#9747FF', // light mode
          dark: '#9747FF',    // dark mode
        },
        warning: {
          DEFAULT: '#FFB200', // light mode
          dark: '#FFB200',    // dark mode
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
          dark: '#9CA3AF',    // dark mode
        },
        label: {
          DEFAULT: '#495057', // light mode
          dark: '#C6C8CC',    // dark mode
        },
        taxonomy: {
          DEFAULT: '#A9ABB6', // light mode
          dark: '#9CA3AF',    // dark mode
        },
        rating: "#EC8D1D",
        //text color
        headingPrimary: {
          DEFAULT: '#444050', // light mode
          dark: '#D1D5DB',    // dark mode
        },
        headingLight: {
          DEFAULT: '#525252', // light mode
          dark: '#9CA3AF',    // dark mode
        },
        headingLightest: {
          DEFAULT: '#878a99', // light mode
          dark: '#9CA3AF',    // dark mode
        },
        //background
        bgBody: {
          DEFAULT: '#f8f8fb', // light mode
          dark: '#111827',    // dark mode
        },
        bgLightest: {
          DEFAULT: '#f8f9fd', // light mode
          dark: '#374151',    // dark mode
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
          DEFAULT: 'linear-gradient(90deg, #6C5FFC 0%, #003cff 100%)', // light mode
          dark: 'linear-gradient(90deg, #4C51BF 0%, #2C5282 100%)',    // dark mode
        },
        gradientSecondary: {
          DEFAULT: 'linear-gradient(90deg, #FF6339 0%, #FF2259 100%)', // light mode
          dark: 'linear-gradient(90deg, #D53F8C 0%, #B83280 100%)',    // dark mode
        },
      },

      backgroundImage: {
        gradientPrimary: "linear-gradient(90deg, #6C5FFC 0%, #003cff 100%)", //gradient1
        gradientSecondary: "linear-gradient(90deg, #FF6339 0%, #FF2259 100%)", //gradient2
      },
    },
  },
  variants: {},
  plugins: [],
};
