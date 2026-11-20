# Plan: PokeBinder

1. [x] Inicializar proyecto (carpeta, git, CLAUDE.md, plan, nota del Cerebro).
2. [x] Crear proyecto Expo con TypeScript estricto, Expo Router y NativeWind; navegación inferior con 4 pestañas base (Mis Álbumes, Escáner, Explorar Sets, Estadísticas). Se comprueba abriendo la app en el teléfono con Expo y navegando entre las pantallas vacías sin errores.
3. [x] Integrar el servicio de TCGdex API (ES/EN) y construir "Explorar Sets" con buscador de cartas y vista de expansiones. Se comprueba buscando un Pokémon o expansión real y viendo la grilla con imágenes cargadas desde la API.
4. [x] Base de datos local con expo-sqlite + Drizzle: tablas de caché de cartas, inventario (variantes Normal/Reverse Holo/Holo y cantidades) y álbumes. Se comprueba con la migración aplicada al iniciar la app sin errores.
5. [x] Modal de detalle de carta conectado al inventario para sumar o restar copias por variante. Se comprueba agregando una carta, cerrando la app por completo y verificando que persiste al volver a abrirla.
6. [x] Gestor de "Mis Álbumes" (crear álbumes por Set Oficial y manuales). Se comprueba creando un álbum de set y uno manual y viéndolos en la lista tras reiniciar la app.
7. [x] Vista de carpeta paginada de 3x3 bolsillos (faltantes en gris, obtenidas a color) con porcentaje de progreso. Se comprueba marcando cartas como obtenidas y deslizando las páginas de 9 bolsillos viendo el progreso actualizado.
8. [x] Álbumes dinámicos basados en reglas (por nombre de Pokémon o por tipo elemental). Se comprueba creando un álbum con regla por tipo o Pokémon y verificando que reúne automáticamente las cartas coincidentes del inventario.
9. [x] Módulo de cámara (Vision Camera) con guía visual y OCR con ML Kit (nombre superior y fracción XXX/YYY inferior). Se comprueba apuntando a una carta física y viendo el texto extraído en pantalla.
10. [x] Conectar el OCR al buscador de TCGdex y mostrar tarjeta flotante de agregado rápido en 1 toque con selección de variante. Se comprueba identificando una carta física en menos de un segundo y agregándola al álbum con su variante.
11. [x] Pestaña "Estadísticas": total de cartas, desglose por rareza/variante y progreso general de colecciones. Se comprueba añadiendo cartas desde el escáner y viendo la actualización inmediata de los contadores.

Siguiente: completado (pasos 1 al 11).

---

# Auditoría senior (2026-10-31)

12. [x] Repositorio: upsert sin pisar setName/idioma/variantes con placeholders; ajuste de inventario atómico; posición MAX+1 en carpeta manual; orden natural por número; fecha de inventario en registros.
13. [x] Utilidades: inferir setId con último guion (sets "P-A", "tk-ex-latia"); regla por Pokémon por palabra completa (Mew ≠ Mewtwo); tipo Hada/Fairy.
14. [x] Servicio/hooks TCGdex: timeout en fetch; fracciones de galería (TG15/TG30) en búsqueda; catch del cacheo en segundo plano; enriquecer carta (rareza/tipos/variantes) antes de guardarla en inventario.
15. [x] Escáner: apagar cámara fuera de foco; desempate por total impreso del set; conteo por carta; +1 solo al confirmar.
16. [x] Modal de carta y carpetas: reset de imagen por carta; quitar carta de carpeta manual; paginador vuelve a la hoja 1 al filtrar; progreso unificado (obtenidas / total del set); errores en creación de álbum.
17. [x] Estadísticas: "Últimas adiciones" por fecha de inventario y progreso con el mismo criterio.
18. [x] app.json: plugins de expo-camera / expo-image-picker con textos de permiso y sin RECORD_AUDIO.
19. [x] Verificación: typecheck + pruebas de lógica pura (parser OCR, inferencia setId, regla Pokémon).

---

# Mejoras de escáner, variantes reales, colección en 1 clic, repetidas y APK Release (2026-11-20)

20. [x] Mapa oficial de códigos de colección (`SET_CODES` como `MEW`, `OBF`, `SVI`, `PAL`, `TEF`, `PRE`, etc.), detección de código de colección y mejoras de OCR/búsqueda en `src/utils/cardIds.ts`, `src/utils/ocrParser.ts` y `src/services/tcgdex.ts`.
21. [x] Lógica de variantes reales por carta (`src/utils/cardVariants.ts`): ocultar selector Normal/Reverse en cartas Full Art / ex / Secret Rare / Ilustración (auto-seleccionar Holo) y mostrar solo variantes existentes en cartas estándar en `FloatingScannedCard.tsx` y `CardDetailModal.tsx`.
22. [x] Escáner + Álbumes + Repetidas (`app/(tabs)/scanner.tsx`, `FloatingScannedCard.tsx`, `CardPocketItem.tsx`, `BinderPaginatedView.tsx`, `app/(tabs)/stats.tsx`): selector de "cuadradito negro de la colección" en 1 clic, ingreso manual directo (nombre + número + colección), auto-creación/guardado en álbum de la colección, filtro y contador de cartas repetidas.
23. [x] Optimización SQLite (`upsertCachedCardsBatch` en transacción), reglas ProGuard/R8 para ML Kit OCR (`ComponentRegistrar` + `com.google.mlkit.**`), pruebas de lógica, typecheck y compilación de APK release funcional (`android/app/build/outputs/apk/release/app-release.apk` y `pokebinder.apk`, v1.0.3 / versionCode 4).

Siguiente: completado (APK release v1.0.3 listo para instalar y probar).
