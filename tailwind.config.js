/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--c-canvas)',
        surface: 'var(--c-surface)',
        elevated: 'var(--c-elevated)',
        line: 'var(--c-line)',
        ink: 'var(--c-ink)',
        muted: 'var(--c-muted)',
        brand: 'var(--c-brand)',
        'brand-dark': 'var(--c-brand-dark)',
        'brand-soft': 'var(--c-brand-soft)',
        'brand-ink': 'var(--c-brand-ink)',
        'brand-ring': 'var(--c-brand-ring)',
        focus: 'var(--c-focus)',
        success: 'var(--c-success)',
        'success-soft': 'var(--c-success-soft)',
        warning: 'var(--c-warning)',
        'warning-soft': 'var(--c-warning-soft)',
        danger: 'var(--c-danger)',
        'danger-soft': 'var(--c-danger-soft)',
        info: 'var(--c-info)',
        'info-soft': 'var(--c-info-soft)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        xl2: '1.125rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 24, 40, 0.04), 0 8px 24px -12px rgba(16, 24, 40, 0.12)',
        float: '0 12px 32px -12px rgba(16, 24, 40, 0.24)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '70%': { transform: 'scale(1.35)', opacity: '0' },
          '100%': { transform: 'scale(1.35)', opacity: '0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 220ms ease-out both',
        'slide-up': 'slide-up 260ms ease-out both',
        'pulse-ring': 'pulse-ring 1.8s ease-out infinite',
      },
    },
  },
  plugins: [],
};
