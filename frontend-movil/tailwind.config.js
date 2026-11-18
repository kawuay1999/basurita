/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        basurita: {
          primary: '#1E88E5',       // Azul GPS
          'primary-dark': '#1565C0',
          secondary: '#4CAF50',     // Verde Ecológico
          'secondary-dark': '#388E3C',
          danger: '#E53935',        // Para incidencias y alertas
          'danger-dark': '#C62828',
          bg: '#F5F7FA',            // Fondo moderno
          text: '#1A1A1A',          // Texto principal legible
          muted: '#6B7280',         // Texto secundario
          surface: '#FFFFFF',       // Tarjetas y modales
        }
      },
      borderRadius: {
        'soft': '16px',
        'softer': '20px',
      },
      boxShadow: {
        'soft': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        'floating': '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'], // Tipografía moderna y legible
      }
    },
  },
  plugins: [],
}