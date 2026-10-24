# Plan: PokeBinder

1. [x] Inicializar proyecto (carpeta, git, CLAUDE.md, plan, nota del Cerebro).
2. [x] Crear proyecto Expo con TypeScript estricto, Expo Router y NativeWind; navegación inferior con 4 pestañas base (Mis Álbumes, Escáner, Explorar Sets, Estadísticas). Se comprueba abriendo la app en el teléfono con Expo y navegando entre las pantallas vacías sin errores.
3. [x] Integrar el servicio de TCGdex API (ES/EN) y construir "Explorar Sets" con buscador de cartas y vista de expansiones. Se comprueba buscando un Pokémon o expansión real y viendo la grilla con imágenes cargadas desde la API.
4. [ ] Base de datos local con expo-sqlite + Drizzle: tablas de caché de cartas, inventario (variantes Normal/Reverse Holo/Holo y cantidades) y álbumes. Se comprueba con la migración aplicada al iniciar la app sin errores.
5. [ ] Modal de detalle de carta conectado al inventario para sumar o restar copias por variante. Se comprueba agregando una carta, cerrando la app por completo y verificando que persiste al volver a abrirla.
6. [ ] Gestor de "Mis Álbumes" (crear álbumes por Set Oficial y manuales). Se comprueba creando un álbum de set y uno manual y viéndolos en la lista tras reiniciar la app.
7. [ ] Vista de carpeta paginada de 3x3 bolsillos (faltantes en gris, obtenidas a color) con porcentaje de progreso. Se comprueba marcando cartas como obtenidas y deslizando las páginas de 9 bolsillos viendo el progreso actualizado.
8. [ ] Álbumes dinámicos basados en reglas (por nombre de Pokémon o por tipo elemental). Se comprueba creando un álbum con regla por tipo o Pokémon y verificando que reúne automáticamente las cartas coincidentes del inventario.
9. [ ] Módulo de cámara (Vision Camera) con guía visual y OCR con ML Kit (nombre superior y fracción XXX/YYY inferior). Se comprueba apuntando a una carta física y viendo el texto extraído en pantalla.
10. [ ] Conectar el OCR al buscador de TCGdex y mostrar tarjeta flotante de agregado rápido en 1 toque con selección de variante. Se comprueba identificando una carta física en menos de un segundo y agregándola al álbum con su variante.
11. [ ] Pestaña "Estadísticas": total de cartas, desglose por rareza/variante y progreso general de colecciones. Se comprueba añadiendo cartas desde el escáner y viendo la actualización inmediata de los contadores.

Siguiente: paso 4.
