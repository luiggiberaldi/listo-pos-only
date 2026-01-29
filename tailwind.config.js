/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // 🎨 PALETA SEMÁNTICA (Fase D.0)
      // 🎨 PALETA SEMÁNTICA (Fase D.0 - Refactor Total)
      colors: {
        // 1. LA MARCA (Acción y Foco)
        primary: {
          DEFAULT: '#6366F1', // Indigo Real (Botones, Links, Iconos activos)
          hover: '#4F46E5', // Un tono más oscuro para :hover
          light: '#E0E7FF', // Indigo Lavanda (Fondos suaves, Badges)
          focus: '#C7D2FE', // Anillo de foco en inputs
        },

        // 2. SUPERFICIES (Fondos)
        app: {
          light: '#F8FAFC', // Gris Hielo (Fondo general de la pantalla)
          dark: '#0F172A', // Azul Noche (Fondo general modo oscuro)
        },
        surface: {
          light: '#FFFFFF', // Blanco Puro (Tarjetas, Modales, Sidebar)
          dark: '#1E293B', // Slate 800 (Tarjetas en modo oscuro)
        },

        // 3. TEXTOS (Legibilidad)
        content: {
          main: '#334155', // Gris Pizarra Oscuro (Títulos, Precios)
          secondary: '#64748B', // Gris Metal (Subtítulos, Etiquetas)
          inverse: '#F8FAFC', // Texto claro para fondos oscuros/botones
        },

        // 4. ESTADOS (Semántica)
        status: {
          success: '#10B981', // Esmeralda (Venta OK)
          successBg: '#D1FAE5',
          danger: '#F43F5E', // Coral (Error, Anular, Borrar)
          dangerBg: '#FFE4E6',
          warning: '#F59E0B', // Ámbar (Alerta)
          warningBg: '#FEF3C7',
        },

        // 5. BORDES Y SEPARADORES
        border: {
          subtle: '#E2E8F0', // Gris Nube (Líneas finas, separadores)
          focus: '#6366F1', // Color del borde al escribir
        }
      },
      // Tipografía Extendida
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      }
    },
  },
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        // 🔢 Utilidad para Tablas Financieras
        '.font-numbers': {
          'font-variant-numeric': 'tabular-nums',
          'letter-spacing': '-0.02em',
        },
        // 🚫 Ocultar Scrollbar
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
        // 💅 Scrollbar Personalizado
        '.custom-scrollbar': {
          '&::-webkit-scrollbar': {
            width: '4px',
            height: '4px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#CBD5E1', // slate-300
            borderRadius: '2px',
          },
          '.dark &::-webkit-scrollbar-thumb': {
            backgroundColor: '#334155', // slate-700
          },
        }
      });
    },
  ],
}