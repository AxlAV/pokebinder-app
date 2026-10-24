# PokeBinder

Aplicación móvil de colección de cartas Pokémon TCG inspirada en HoloDex sin límites premium, con escáner por cámara y álbumes virtuales personalizables (por set oficial, Pokémon o tipo). Plan en `.claude/plan-actual.md`; plan original en `docs/plan-original.md`.

## Contexto del proyecto
- Stack: TypeScript, React Native (Expo con Expo Router), NativeWind (Tailwind CSS), Reanimated, expo-sqlite con Drizzle ORM, Zustand, TanStack Query, React Native Vision Camera + Google ML Kit OCR, TCGdex API.
- Plataformas: Android, iOS.

## Reglas del proyecto
- Arquitectura offline-first con SQLite local.
- Cero límites artificiales en cantidad de álbumes o cartas almacenadas.
- Tipado estricto en TypeScript.
- Soporte multiidioma en datos de cartas (español e inglés vía TCGdex API).
- Separación clara entre catálogo en caché, inventario físico del usuario (con variantes Normal, Reverse Holo, Holo) y álbumes (manuales o dinámicos).

## Identidad visual
- **Dirección estética:** Ultra PRO Leather & Foil (táctil / coleccionista clásico, inspirado en carpetas de cuero sintético negro/carbón Ultra PRO y el brillo dorado/holográfico de cartas raras).
- **Cuadrículas:** 3x3 bolsillos, con contraste entre cartas obtenidas (a color) y faltantes (escala de grises y opacidad reducida).
- **Paleta (Tokens CSS / Tailwind):**
  - `--bg-binder`: `#111015` (Carbón profundo con subtono cálido — fondo principal)
  - `--bg-page`: `#1A1820` (Textura de hoja de polipropileno negro — superficies / tarjetas / tab bar)
  - `--bg-pocket`: `#23202B` (Bolsillo vacío con borde cosido sutil)
  - `--text-primary`: `#F5F2EB` (Blanco hueso / papel impreso)
  - `--text-muted`: `#8E8899` (Gris ceniza)
  - `--accent-primary`: `#E5A93C` (Dorado Foil / Secret Rare)
  - `--accent-secondary`: `#D94E34` (Rojo lacado / Pokéball clásico)
  - `--border-subtle`: `#2E2A38` (Borde cosido / divisores)
- **Tipografías:**
  - Titulares y nombres de sets: `Space Grotesk` (`font-display`)
  - Cuerpo, navegación y filtros: `Plus Jakarta Sans` (`font-sans`)
  - Numeración `XXX/YYY`, conteos y estadísticas: `JetBrains Mono` (`font-mono`)
- **Radio y densidad:**
  - Radio: `6px` (`rounded-pocket`) en bolsillos de carta (proporción real `2.5" × 3.5"`), `12px` (`rounded-card`) en modales y tarjetas contenedoras.
  - Densidad: compacta en grillas (`gap-2`, padding `12px`) para maximizar el área visible de las cartas.
- **Regla de tokens:** Colores siempre vía clases/tokens configurados en Tailwind/CSS; prohibido usar hex sueltos en los componentes o emojis como íconos (usar `@expo/vector-icons` o `lucide-react-native`).

## Fuera de alcance
- Sincronización en la nube o cuentas de usuario multi-dispositivo.
- Pasarelas de pago o suscripciones.
- Mercado de compraventa entre usuarios.
- Constructor de mazos competitivos (deck builder).
