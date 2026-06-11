/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0f172a', // Slate 900
        secondary: '#334155', // Slate 700
        accent: '#0ea5e9', // Sky 500
        'accent-dark': '#0284c7', // Sky 600 - darker accent for hover states
        'accent-soft': '#e0f2fe', // Sky 100 - soft accent background
        background: '#f8fafc', // Slate 50
        surface: '#ffffff',
        // ── Polendach24 brand palette (polendach24.de) ──
        brand: {
          dark: '#0A1628',     // darkest navy (hero/footers base)
          navy: '#1B2B44',     // dark sections gradient end
          cta: '#1E6FD9',      // primary action blue
          'cta-hover': '#195FC0',
          accent: '#6DB1FF',   // light accent on dark / links
          'accent-2': '#93C5FD',
          bg: '#F7F8FA',       // page background
          border: '#E5E7EB',
          muted: '#6B7280',
          success: '#10B981',
          warm: '#F59E0B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        // Premium soft card elevation used across the public offer page.
        card: '0 1px 3px rgba(10,22,40,0.04), 0 6px 16px rgba(10,22,40,0.06)',
        'card-hover': '0 2px 6px rgba(10,22,40,0.06), 0 14px 32px rgba(10,22,40,0.10)',
        cta: '0 6px 16px rgba(30,111,217,0.28)',
      },
      backgroundImage: {
        // 135° dark→navy used on hero & dark CTA sections.
        // Named distinctly from the `brand.dark` color to avoid a bg-* utility clash.
        'brand-gradient': 'linear-gradient(135deg, #0A1628 0%, #1B2B44 100%)',
        'brand-accent-text': 'linear-gradient(135deg, #6DB1FF, #93C5FD)',
      },
    },
  },
  plugins: [],
}
