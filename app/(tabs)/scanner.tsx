import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import {
  ScanLine,
  Focus,
  Camera,
  CameraOff,
  Globe,
  ChevronLeft,
  ChevronRight,
  Zap,
  ImagePlus,
  RotateCcw,
  Keyboard,
  Layers,
  X,
} from 'lucide-react-native';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { BinderGridSkeleton } from '@/components/ui/BinderGridSkeleton';
import { ErrorCard } from '@/components/ui/ErrorCard';
import { FloatingScannedCard } from '@/components/scanner/FloatingScannedCard';
import { CardDetailModal } from '@/components/cards/CardDetailModal';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import {
  useCardSearchQuery,
  useSetsQuery,
  useCardDetailQuery,
  useSetDetailQuery,
} from '@/hooks/useTcgdex';
import {
  useCardVariantCountsQuery,
  useBindersQuery,
  useAdjustCardVariantMutation,
  useAddCardToManualBinderMutation,
  useCreateSetBinderMutation,
} from '@/hooks/useDatabase';
import {
  parseCardOcrText,
  recognizeCardFromImageUri,
  buildTcgdexQueryFromOcr,
  rankOcrCardCandidates,
  inferSuggestedSetsForOcr,
} from '@/utils/ocrParser';
import {
  getSetSymbolUrl,
  type TcgdexSetBrief,
} from '@/services/tcgdex';
import type { CardVariant } from '@/db/schema';
import {
  inferSetIdFromCardId,
  getSetOfficialCode,
} from '@/utils/cardIds';
import { resolveCardVariants } from '@/utils/cardVariants';
import { matchesPokemonRule } from '@/utils/elementalTypes';
import { TOKENS } from '@/theme/tokens';

const SAMPLE_OCR_CARDS = [
  {
    label: 'Charizard ex 199/165 (Full Art)',
    name: 'Charizard ex',
    fraction: '199/165',
    raw: 'FASE 2 Charizard ex PS 330\nMEW 199/165',
  },
  {
    label: 'Pikachu 025/165 (Común)',
    name: 'Pikachu',
    fraction: '025/165',
    raw: 'BÁSICO Pikachu PS 60\nMEW 025/165',
  },
  {
    label: 'Mew ex 151/165 (Ultra)',
    name: 'Mew ex',
    fraction: '151/165',
    raw: 'BÁSICO Mew ex PS 180\nMEW 151/165',
  },
  {
    label: 'Gengar 094/165 (Rara)',
    name: 'Gengar',
    fraction: '094/165',
    raw: 'FASE 2 Gengar PS 130\nMEW 094/165',
  },
] as const;

export default function ScannerScreen() {
  const { language, toggleLanguage } = usePreferencesStore();
  const [permission, requestPermission] = useCameraPermissions();
  // Las pestañas quedan montadas: sin esto la cámara seguía encendida en otras pantallas.
  const isFocused = useIsFocused();
  const cameraRef = useRef<CameraView>(null);

  const [cameraActive, setCameraActive] = useState(true);
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);
  const [rawOcrInput, setRawOcrInput] = useState<string>('');
  const [manualNameInput, setManualNameInput] = useState<string>('');
  const [manualNumberInput, setManualNumberInput] = useState<string>('');
  const [preferredSetId, setPreferredSetId] = useState<string | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [selectedVariant, setSelectedVariant] =
    useState<CardVariant>('normal');
  const [candidateIndex, setCandidateIndex] = useState(0);
  // -1 = Álbum Oficial de su Colección (Auto-crea si no existe), >=0 = Carpeta Manual, -2 = Solo Inventario
  const [selectedBinderIndex, setSelectedBinderIndex] = useState<number>(-1);
  const [justAddedCount, setJustAddedCount] = useState(0);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);

  // 1. Extracción estructurada OCR (Nombre superior + Fracción XXX/YYY + Código de Colección)
  const ocrData = useMemo(() => parseCardOcrText(rawOcrInput), [rawOcrInput]);
  const tcgdexQueryString = useMemo(
    () => buildTcgdexQueryFromOcr(ocrData),
    [ocrData]
  );

  // 2. Búsqueda automática en TCGdex API conectada al OCR / ingreso manual
  const searchQuery = useCardSearchQuery(language, tcgdexQueryString);
  const setsQuery = useSetsQuery(language);
  const preferredSetDetailQuery = useSetDetailQuery(language, preferredSetId);

  const setsById = useMemo(() => {
    const map: Record<string, TcgdexSetBrief> = {};
    for (const set of setsQuery.data ?? []) {
      map[set.id] = set;
    }
    return map;
  }, [setsQuery.data]);

  const setOfficialCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const set of setsQuery.data ?? []) {
      map[set.id] = set.cardCount.official;
    }
    return map;
  }, [setsQuery.data]);

  // Combinar candidatos de búsqueda global con las cartas del set elegido en 1 clic (si hay preferredSetId)
  const combinedCandidates = useMemo(() => {
    const base = [...(searchQuery.data ?? [])];
    const seen = new Set(base.map((c) => c.id));

    if (preferredSetId && preferredSetDetailQuery.data?.cards) {
      const targetLocal = ocrData.localId?.replace(/^0+/, '').toLowerCase();
      const targetName = ocrData.cleanSearchName?.toLowerCase();

      for (const setCard of preferredSetDetailQuery.data.cards) {
        if (seen.has(setCard.id)) continue;
        const cardLocal = setCard.localId.replace(/^0+/, '').toLowerCase();
        const matchesNum = Boolean(targetLocal && cardLocal === targetLocal);
        const matchesName = Boolean(
          targetName &&
            (matchesPokemonRule(setCard.name, targetName) ||
              setCard.name.toLowerCase().includes(targetName))
        );
        if (matchesNum || matchesName) {
          base.unshift(setCard);
          seen.add(setCard.id);
        }
      }
    }

    return base;
  }, [
    searchQuery.data,
    preferredSetId,
    preferredSetDetailQuery.data?.cards,
    ocrData.localId,
    ocrData.cleanSearchName,
  ]);

  const rankedCandidates = useMemo(
    () =>
      rankOcrCardCandidates(
        combinedCandidates,
        ocrData,
        setOfficialCounts,
        preferredSetId
      ),
    [combinedCandidates, ocrData, setOfficialCounts, preferredSetId]
  );

  // Colecciones probables para mostrar el "cuadradito negro de la colección" en 1 clic
  const suggestedSets = useMemo(
    () =>
      inferSuggestedSetsForOcr(
        rankedCandidates,
        ocrData,
        setsQuery.data ?? []
      ),
    [rankedCandidates, ocrData, setsQuery.data]
  );

  const safeCandidateIdx = Math.min(
    candidateIndex,
    Math.max(0, rankedCandidates.length - 1)
  );
  const matchedCard = rankedCandidates[safeCandidateIdx] ?? null;

  // Detalle completo de la carta detectada para conocer sus variantes oficiales (Normal/Reverse/Holo o Full Art)
  const matchedDetailQuery = useCardDetailQuery(
    language,
    matchedCard?.id ?? null
  );
  const matchedDetail = matchedDetailQuery.data;

  // 3. Persistencia en SQLite
  const matchedCountsQuery = useCardVariantCountsQuery(matchedCard?.id ?? null);
  const bindersQuery = useBindersQuery();
  const adjustVariantMutation = useAdjustCardVariantMutation();
  const addManualCardMutation = useAddCardToManualBinderMutation();
  const createSetBinderMutation = useCreateSetBinderMutation();

  const matchedSetId = matchedCard
    ? (matchedDetail?.set?.id ??
      inferSetIdFromCardId(matchedCard.id, matchedCard.localId))
    : null;
  const matchedSetMeta = matchedSetId ? setsById[matchedSetId] : undefined;
  const matchedSetName =
    matchedDetail?.set?.name ??
    matchedSetMeta?.name ??
    (matchedSetId ? matchedSetId.toUpperCase() : null);
  const matchedSetOfficialCount =
    matchedDetail?.set?.cardCount?.official ??
    matchedSetMeta?.cardCount.official ??
    (matchedSetId ? (setOfficialCounts[matchedSetId] ?? 0) : 0);
  const matchedSetTotalCount =
    matchedDetail?.set?.cardCount?.total ??
    matchedSetMeta?.cardCount.total ??
    matchedSetOfficialCount;
  const matchedSetLogo =
    matchedDetail?.set?.logo ?? matchedSetMeta?.logo ?? null;
  const matchedSetSymbol =
    matchedDetail?.set?.symbol ?? matchedSetMeta?.symbol ?? null;

  // Resolver variantes reales de la carta (Full Art / Secret / ex -> solo Holo; Común -> Normal + Reverse, etc.)
  const variantsInfo = useMemo(
    () =>
      resolveCardVariants({
        cardName: matchedDetail?.name ?? matchedCard?.name,
        localId: matchedDetail?.localId ?? matchedCard?.localId,
        setOfficialCount: matchedSetOfficialCount,
        rarity: matchedDetail?.rarity,
        tcgdexVariants: matchedDetail?.variants,
        existingCounts: matchedCountsQuery.data,
      }),
    [
      matchedDetail?.name,
      matchedDetail?.localId,
      matchedDetail?.rarity,
      matchedDetail?.variants,
      matchedCard?.name,
      matchedCard?.localId,
      matchedSetOfficialCount,
      matchedCountsQuery.data,
    ]
  );

  // Auto-seleccionar la variante oficial correspondiente cuando cambia la carta o se determina que es Full Art
  useEffect(() => {
    if (!variantsInfo.availableVariants.includes(selectedVariant)) {
      setSelectedVariant(variantsInfo.defaultVariant);
    }
  }, [
    matchedCard?.id,
    variantsInfo.availableVariants,
    variantsInfo.defaultVariant,
    selectedVariant,
  ]);

  const manualBinders = useMemo(() => {
    return (bindersQuery.data ?? []).filter((b) => b.type === 'manual');
  }, [bindersQuery.data]);

  const setBinders = useMemo(() => {
    return (bindersQuery.data ?? []).filter((b) => b.type === 'set');
  }, [bindersQuery.data]);

  const targetManualBinder =
    selectedBinderIndex >= 0 && selectedBinderIndex < manualBinders.length
      ? manualBinders[selectedBinderIndex]
      : null;

  const targetBinderLabel = useMemo(() => {
    if (selectedBinderIndex === -1) {
      const code = matchedSetId ? getSetOfficialCode(matchedSetId) : 'SET';
      return `Álbum ${matchedSetName ?? code} (Auto)`;
    }
    if (targetManualBinder) {
      return targetManualBinder.name;
    }
    return 'Solo Inventario';
  }, [selectedBinderIndex, matchedSetId, matchedSetName, targetManualBinder]);

  const handleCycleTargetBinder = () => {
    setSelectedBinderIndex((prev) => {
      if (prev === -1) {
        return manualBinders.length > 0 ? 0 : -2;
      }
      if (prev >= 0) {
        const next = prev + 1;
        return next < manualBinders.length ? next : -2;
      }
      return -1;
    });
  };

  // Sincronizar los campos de ingreso manual con rawOcrInput
  const applyManualInputs = (
    nextName: string,
    nextNumber: string,
    nextSetCode?: string | null
  ) => {
    setManualNameInput(nextName);
    setManualNumberInput(nextNumber);
    const lines: string[] = [];
    if (nextName.trim()) lines.push(nextName.trim());
    const bottomParts: string[] = [];
    if (nextSetCode) bottomParts.push(nextSetCode);
    if (nextNumber.trim()) bottomParts.push(nextNumber.trim());
    if (bottomParts.length > 0) lines.push(bottomParts.join(' '));
    setRawOcrInput(lines.join('\n'));
    setOcrError(null);
    setCandidateIndex(0);
    setJustAddedCount(0);
  };

  // Procesamiento nativo ML Kit OCR
  const processImageWithMlKit = async (uri: string) => {
    setIsProcessingOcr(true);
    setOcrError(null);
    setCapturedImageUri(uri);
    setCandidateIndex(0);
    setPreferredSetId(null);
    setJustAddedCount(0);
    try {
      const extractedText = await recognizeCardFromImageUri(uri);
      if (!extractedText.trim()) {
        setOcrError(
          'No se detectó texto nítido en la imagen. Acerca la carta sin reflejos o ingrésala a mano abajo.'
        );
      } else {
        setRawOcrInput(extractedText);
        const parsed = parseCardOcrText(extractedText);
        setManualNameInput(parsed.extractedName ?? '');
        setManualNumberInput(
          parsed.extractedFraction ?? parsed.localId ?? ''
        );
      }
    } catch (err) {
      setOcrError(
        err instanceof Error
          ? err.message
          : 'No se pudo procesar el texto de la imagen.'
      );
    } finally {
      setIsProcessingOcr(false);
    }
  };

  // Captura de foto con la cámara física y extracción con ML Kit
  const handleCaptureFrame = async () => {
    if (isProcessingOcr) return;

    if (capturedImageUri) {
      setCapturedImageUri(null);
      setOcrError(null);
      return;
    }

    if (!cameraRef.current || !permission?.granted || !cameraActive) return;

    setIsProcessingOcr(true);
    setOcrError(null);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.88,
      });
      if (photo?.uri) {
        await processImageWithMlKit(photo.uri);
      } else {
        setIsProcessingOcr(false);
      }
    } catch {
      setIsProcessingOcr(false);
      setOcrError('No se pudo capturar la imagen de la cámara.');
    }
  };

  // Subir una foto limpia desde la galería del teléfono y pasarla por ML Kit OCR
  const handlePickFromGallery = async () => {
    if (isProcessingOcr) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.9,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        await processImageWithMlKit(result.assets[0].uri);
      }
    } catch {
      setOcrError('No se pudo abrir la galería de imágenes.');
    }
  };

  const buildCurrentCardPayload = () => {
    if (!matchedCard || !matchedSetId) return null;
    return {
      id: matchedCard.id,
      localId: matchedDetail?.localId ?? matchedCard.localId,
      name: matchedDetail?.name ?? matchedCard.name,
      image: matchedDetail?.image ?? matchedCard.image ?? null,
      setId: matchedSetId,
      setName: matchedSetName,
      setLogo: matchedSetLogo,
      setOfficialCount: matchedSetOfficialCount,
      setTotalCount: matchedSetTotalCount,
      rarity: matchedDetail?.rarity ?? null,
      types: matchedDetail?.types ?? [],
      variants: matchedDetail?.variants,
      illustrator: matchedDetail?.illustrator ?? null,
      language,
    };
  };

  // Agregado rápido en 1 toque al inventario y álbum virtual
  const handleQuickAdd = () => {
    const cardPayload = buildCurrentCardPayload();
    if (!cardPayload || !matchedSetId) return;

    const binderModeAtTap = selectedBinderIndex;
    const manualBinderAtTap = targetManualBinder;
    const setIdAtTap = matchedSetId;
    const setNameAtTap = matchedSetName ?? matchedSetId.toUpperCase();
    const setLogoAtTap = matchedSetLogo;
    const setOfficialAtTap = matchedSetOfficialCount;
    const setTotalAtTap = matchedSetTotalCount;
    const variantToSave = variantsInfo.availableVariants.includes(
      selectedVariant
    )
      ? selectedVariant
      : variantsInfo.defaultVariant;

    setSaveError(false);

    adjustVariantMutation.mutate(
      {
        card: cardPayload,
        variant: variantToSave,
        delta: 1,
      },
      {
        onSuccess: () => {
          setJustAddedCount((prev) => prev + 1);

          // Si está en modo "Álbum Oficial de su Colección (Auto)", crear el álbum si aún no existe
          if (binderModeAtTap === -1) {
            const alreadyExists = setBinders.some(
              (b) => b.setId?.toLowerCase() === setIdAtTap.toLowerCase()
            );
            if (!alreadyExists && !createSetBinderMutation.isPending) {
              createSetBinderMutation.mutate({
                setId: setIdAtTap,
                setName: setNameAtTap,
                setLogo: setLogoAtTap,
                setOfficialCount: setOfficialAtTap || 0,
                setTotalCount: setTotalAtTap || setOfficialAtTap || 0,
              });
            }
          } else if (manualBinderAtTap) {
            addManualCardMutation.mutate({
              binderId: manualBinderAtTap.id,
              card: cardPayload,
            });
          }
        },
        onError: () => setSaveError(true),
      }
    );
  };

  // Restar 1 copia rápida en caso de toque extra al contar repetidas
  const handleQuickSubtract = () => {
    const cardPayload = buildCurrentCardPayload();
    if (!cardPayload) return;
    const variantToAdjust = variantsInfo.availableVariants.includes(
      selectedVariant
    )
      ? selectedVariant
      : variantsInfo.defaultVariant;

    adjustVariantMutation.mutate(
      {
        card: cardPayload,
        variant: variantToAdjust,
        delta: -1,
      },
      {
        onSuccess: () => {
          setJustAddedCount((prev) => Math.max(0, prev - 1));
        },
      }
    );
  };

  const activeSetId = matchedSetId ?? preferredSetId;

  return (
    <SafeAreaView
      className="flex-1 bg-binder"
      edges={['top']}
      style={{ flex: 1, backgroundColor: TOKENS.bgBinder }}
    >
      <ScreenHeader
        sectionCode="ML KIT OCR NATIVO // TCGDEX"
        title="Escáner de Cartas"
        subtitle="Escanea o escribe a mano → Detecta colección → Guarda en Álbum"
        counterText={
          isProcessingOcr
            ? 'LEYENDO OCR...'
            : ocrData.confidence === 'high'
              ? 'OCR: ALTA PRECISIÓN'
              : 'LISTO'
        }
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 12, gap: 12, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Visor de cámara / foto con retícula guía en proporción de carta 5:7 */}
        <View
          className="bg-page border border-stitch rounded-card p-3 items-center"
          style={{
            backgroundColor: TOKENS.bgPage,
            borderColor: TOKENS.borderSubtle,
            borderWidth: 1,
            borderRadius: 12,
            padding: 12,
            alignItems: 'center',
          }}
        >
          <View
            className="w-full flex-row items-center justify-between mb-2.5"
            style={{
              width: '100%',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}
          >
            <View
              className="flex-row items-center gap-1.5"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <Focus size={14} color={TOKENS.accentPrimary} />
              <Text
                className="font-mono text-xs text-ink"
                style={{
                  fontFamily: 'JetBrainsMono_600SemiBold',
                  fontSize: 11,
                  color: TOKENS.textPrimary,
                }}
              >
                VISOR 2.5&quot; × 3.5&quot;
              </Text>
            </View>

            <View
              className="flex-row items-center gap-1.5"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <AnimatedPressable
                onPress={handlePickFromGallery}
                className="min-h-[40px] bg-pocket border border-foil/60 rounded-pocket px-2.5 flex-row items-center gap-1.5 active:opacity-80"
                style={{
                  minHeight: 40,
                  backgroundColor: TOKENS.bgPocket,
                  borderColor: 'rgba(229, 169, 60, 0.6)',
                  borderWidth: 1,
                  borderRadius: 6,
                  paddingHorizontal: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <ImagePlus size={14} color={TOKENS.accentPrimary} />
                <Text
                  className="font-mono-semi text-[10px] uppercase text-foil"
                  style={{
                    fontFamily: 'JetBrainsMono_600SemiBold',
                    fontSize: 10,
                    color: TOKENS.accentPrimary,
                    fontWeight: '700',
                  }}
                >
                  Subir Foto
                </Text>
              </AnimatedPressable>

              <AnimatedPressable
                onPress={toggleLanguage}
                className="min-h-[40px] bg-pocket border border-stitch rounded-pocket px-2.5 flex-row items-center gap-1"
                style={{
                  minHeight: 40,
                  backgroundColor: TOKENS.bgPocket,
                  borderColor: TOKENS.borderSubtle,
                  borderWidth: 1,
                  borderRadius: 6,
                  paddingHorizontal: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Globe size={13} color={TOKENS.accentPrimary} />
                <Text
                  className="font-mono-semi text-[11px] uppercase text-foil"
                  style={{
                    fontFamily: 'JetBrainsMono_600SemiBold',
                    fontSize: 11,
                    color: TOKENS.accentPrimary,
                    fontWeight: '700',
                  }}
                >
                  {language}
                </Text>
              </AnimatedPressable>

              <AnimatedPressable
                onPress={() => {
                  setCapturedImageUri(null);
                  setCameraActive((prev) => !prev);
                }}
                className="min-h-[40px] bg-pocket border border-stitch rounded-pocket px-2.5 flex-row items-center gap-1"
                style={{
                  minHeight: 40,
                  backgroundColor: TOKENS.bgPocket,
                  borderColor: TOKENS.borderSubtle,
                  borderWidth: 1,
                  borderRadius: 6,
                  paddingHorizontal: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {cameraActive ? (
                  <Camera size={14} color={TOKENS.accentPrimary} />
                ) : (
                  <CameraOff size={14} color={TOKENS.textMuted} />
                )}
              </AnimatedPressable>
            </View>
          </View>

          {/* Bolsillo óptico 5:7 con cámara en vivo o foto capturada */}
          <View
            style={{
              aspectRatio: 5 / 7,
              width: '72%',
              backgroundColor: TOKENS.bgPocket,
              borderColor: TOKENS.accentPrimary,
              borderWidth: 2,
              borderRadius: 8,
              overflow: 'hidden',
              justifyContent: 'space-between',
              position: 'relative',
            }}
            className="bg-pocket border-2 border-foil rounded-pocket overflow-hidden justify-between relative"
          >
            {capturedImageUri ? (
              <Image
                source={{ uri: capturedImageUri }}
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  bottom: 0,
                  left: 0,
                }}
                resizeMode="cover"
              />
            ) : permission?.granted && cameraActive && isFocused ? (
              <CameraView
                ref={cameraRef}
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  bottom: 0,
                  left: 0,
                }}
                facing="back"
              />
            ) : null}

            {/* Contenido superpuesto dentro del marco guía */}
            <View
              className="flex-1 p-2.5 justify-between"
              style={{ flex: 1, padding: 10, justifyContent: 'space-between' }}
            >
              {/* ZONA OCR 01: Nombre Superior */}
              <View
                className="bg-binder/90 border border-foil/80 rounded-pocket p-2"
                style={{
                  backgroundColor: 'rgba(17, 16, 21, 0.92)',
                  borderColor: 'rgba(229, 169, 60, 0.8)',
                  borderWidth: 1,
                  borderRadius: 6,
                  padding: 8,
                }}
              >
                <View
                  className="flex-row items-center justify-between"
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text
                    className="font-mono text-[9px] text-foil uppercase"
                    style={{
                      fontFamily: 'JetBrainsMono_400Regular',
                      fontSize: 9,
                      color: TOKENS.accentPrimary,
                    }}
                  >
                    ZONA 01 // NOMBRE DE LA CARTA
                  </Text>
                  <Text
                    className="font-mono text-[9px] text-muted"
                    style={{
                      fontFamily: 'JetBrainsMono_400Regular',
                      fontSize: 9,
                      color: TOKENS.textMuted,
                    }}
                  >
                    ML KIT OCR
                  </Text>
                </View>
                <Text
                  className="font-display text-sm text-ink mt-0.5"
                  style={{
                    fontFamily: 'SpaceGrotesk_700Bold',
                    fontSize: 13,
                    color: TOKENS.textPrimary,
                    marginTop: 2,
                  }}
                  numberOfLines={1}
                >
                  {ocrData.extractedName ?? 'Apunta a tu carta o escribe abajo...'}
                </Text>
              </View>

              {/* Centro del visor: Botones de acción */}
              <View
                className="items-center justify-center my-auto px-2 gap-2"
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginVertical: 'auto',
                  paddingHorizontal: 8,
                  gap: 8,
                }}
              >
                {!permission?.granted && !capturedImageUri ? (
                  <AnimatedPressable
                    onPress={requestPermission}
                    className="min-h-[44px] bg-foil rounded-pocket px-4 py-2 items-center justify-center"
                    style={{
                      minHeight: 44,
                      backgroundColor: TOKENS.accentPrimary,
                      borderRadius: 6,
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      className="font-sans-semi text-xs uppercase text-binder"
                      style={{
                        color: TOKENS.bgBinder,
                        fontWeight: '700',
                        fontSize: 12,
                      }}
                    >
                      Activar Cámara
                    </Text>
                  </AnimatedPressable>
                ) : (
                  <AnimatedPressable
                    onPress={handleCaptureFrame}
                    disabled={isProcessingOcr}
                    className="min-h-[44px] bg-foil rounded-card px-4 py-2.5 flex-row items-center gap-2 active:opacity-85"
                    style={{
                      minHeight: 44,
                      backgroundColor: TOKENS.accentPrimary,
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    {capturedImageUri ? (
                      <>
                        <RotateCcw size={16} color={TOKENS.bgBinder} />
                        <Text
                          className="font-sans-semi text-xs uppercase text-binder"
                          style={{
                            color: TOKENS.bgBinder,
                            fontWeight: '700',
                            fontSize: 12,
                          }}
                        >
                          Escanear Otra Carta
                        </Text>
                      </>
                    ) : (
                      <>
                        <ScanLine size={16} color={TOKENS.bgBinder} />
                        <Text
                          className="font-sans-semi text-xs uppercase text-binder"
                          style={{
                            color: TOKENS.bgBinder,
                            fontWeight: '700',
                            fontSize: 12,
                          }}
                        >
                          {isProcessingOcr
                            ? 'Leyendo Carta...'
                            : 'Escanear Carta (OCR)'}
                        </Text>
                      </>
                    )}
                  </AnimatedPressable>
                )}
              </View>

              {/* ZONA OCR 02: Cuadradito Negro de Colección + Fracción XXX/YYY Inferior */}
              <View
                className="bg-binder/90 border border-foil/80 rounded-pocket p-2 flex-row items-center justify-between"
                style={{
                  backgroundColor: 'rgba(17, 16, 21, 0.92)',
                  borderColor: 'rgba(229, 169, 60, 0.8)',
                  borderWidth: 1,
                  borderRadius: 6,
                  padding: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View>
                  <Text
                    className="font-mono text-[9px] text-foil uppercase"
                    style={{
                      fontFamily: 'JetBrainsMono_400Regular',
                      fontSize: 9,
                      color: TOKENS.accentPrimary,
                    }}
                  >
                    ZONA 02 // COLECCIÓN + XXX/YYY
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      marginTop: 2,
                    }}
                  >
                    {ocrData.extractedSetCode || activeSetId ? (
                      <View
                        style={{
                          backgroundColor: TOKENS.bgBinder,
                          borderColor: TOKENS.textPrimary,
                          borderWidth: 1.5,
                          borderRadius: 3,
                          paddingHorizontal: 5,
                          paddingVertical: 1,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: 'JetBrainsMono_600SemiBold',
                            fontSize: 10,
                            color: TOKENS.textPrimary,
                            fontWeight: '700',
                          }}
                        >
                          {ocrData.extractedSetCode ??
                            (activeSetId
                              ? getSetOfficialCode(activeSetId)
                              : 'SET')}
                        </Text>
                      </View>
                    ) : null}
                    <Text
                      className="font-mono-semi text-sm text-ink tabular-nums"
                      style={{
                        fontFamily: 'JetBrainsMono_600SemiBold',
                        fontSize: 13,
                        color: TOKENS.textPrimary,
                      }}
                    >
                      {ocrData.extractedFraction ??
                        (ocrData.localId ? `#${ocrData.localId}` : '---/---')}
                    </Text>
                  </View>
                </View>
                <View
                  className="bg-pocket border border-stitch rounded-pocket px-2 py-1"
                  style={{
                    backgroundColor: TOKENS.bgPocket,
                    borderColor: TOKENS.borderSubtle,
                    borderWidth: 1,
                    borderRadius: 4,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                  }}
                >
                  <Text
                    className="font-mono text-[10px] text-foil uppercase tabular-nums"
                    style={{
                      fontFamily: 'JetBrainsMono_600SemiBold',
                      fontSize: 10,
                      color: TOKENS.accentPrimary,
                    }}
                  >
                    {ocrData.localId ? `#${ocrData.localId}` : 'SIN NÚM.'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Selector de "Cuadradito Negro de la Colección" en 1 clic */}
          {suggestedSets.length > 0 ? (
            <View
              style={{
                width: '100%',
                marginTop: 10,
                paddingTop: 10,
                borderTopColor: TOKENS.borderSubtle,
                borderTopWidth: 1,
                gap: 6,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
                >
                  <Layers size={12} color={TOKENS.accentPrimary} />
                  <Text
                    style={{
                      fontFamily: 'JetBrainsMono_600SemiBold',
                      fontSize: 10,
                      color: TOKENS.accentPrimary,
                      textTransform: 'uppercase',
                    }}
                  >
                    COLECCIÓN PROBABLE (ELIGE CON 1 CLIC):
                  </Text>
                </View>
                {preferredSetId ? (
                  <AnimatedPressable
                    onPress={() => {
                      setPreferredSetId(null);
                      setCandidateIndex(0);
                    }}
                    style={{
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: 'JetBrainsMono_400Regular',
                        fontSize: 10,
                        color: TOKENS.textMuted,
                        textDecorationLine: 'underline',
                      }}
                    >
                      Ver todas
                    </Text>
                  </AnimatedPressable>
                ) : null}
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6, paddingRight: 4 }}
              >
                {suggestedSets.map((setOpt) => {
                  const isSelected =
                    (preferredSetId &&
                      preferredSetId.toLowerCase() ===
                        setOpt.setId.toLowerCase()) ||
                    (!preferredSetId &&
                      matchedSetId &&
                      matchedSetId.toLowerCase() ===
                        setOpt.setId.toLowerCase());
                  const symbolUri = getSetSymbolUrl(setOpt.symbol);

                  return (
                    <AnimatedPressable
                      key={setOpt.setId}
                      onPress={() => {
                        setPreferredSetId(setOpt.setId);
                        setCandidateIndex(0);
                        setJustAddedCount(0);
                      }}
                      style={{
                        minHeight: 38,
                        backgroundColor: isSelected
                          ? TOKENS.bgPocket
                          : TOKENS.bgBinder,
                        borderColor: isSelected
                          ? TOKENS.accentPrimary
                          : TOKENS.borderSubtle,
                        borderWidth: isSelected ? 1.5 : 1,
                        borderRadius: 6,
                        paddingHorizontal: 8,
                        paddingVertical: 5,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      {/* El cuadradito negro físico de la colección */}
                      <View
                        style={{
                          backgroundColor: TOKENS.bgBinder,
                          borderColor: TOKENS.textPrimary,
                          borderWidth: 1.5,
                          borderRadius: 3,
                          paddingHorizontal: 5,
                          paddingVertical: 1.5,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 3,
                        }}
                      >
                        {symbolUri ? (
                          <Image
                            source={{ uri: symbolUri }}
                            style={{ width: 10, height: 10 }}
                            resizeMode="contain"
                          />
                        ) : null}
                        <Text
                          style={{
                            fontFamily: 'JetBrainsMono_600SemiBold',
                            fontSize: 10,
                            color: TOKENS.textPrimary,
                            fontWeight: '700',
                          }}
                        >
                          {setOpt.code}
                        </Text>
                      </View>

                      <View>
                        <Text
                          style={{
                            fontFamily: 'PlusJakartaSans_600SemiBold',
                            fontSize: 11,
                            color: isSelected
                              ? TOKENS.accentPrimary
                              : TOKENS.textPrimary,
                          }}
                          numberOfLines={1}
                        >
                          {setOpt.name}
                        </Text>
                        {setOpt.officialCount > 0 ? (
                          <Text
                            style={{
                              fontFamily: 'JetBrainsMono_400Regular',
                              fontSize: 9,
                              color: TOKENS.textMuted,
                            }}
                          >
                            /{String(setOpt.officialCount).padStart(3, '0')} cartas
                          </Text>
                        ) : null}
                      </View>
                    </AnimatedPressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          {/* Selector de candidatos si TCGdex devuelve más de una coincidencia */}
          {rankedCandidates.length > 1 ? (
            <View
              className="w-full mt-2.5 pt-2 border-t border-stitch flex-row items-center justify-between"
              style={{
                width: '100%',
                marginTop: 10,
                paddingTop: 8,
                borderTopColor: TOKENS.borderSubtle,
                borderTopWidth: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text
                className="font-mono text-[10px] text-muted tabular-nums"
                style={{
                  fontFamily: 'JetBrainsMono_400Regular',
                  fontSize: 10,
                  color: TOKENS.textMuted,
                }}
              >
                VERSIÓN {safeCandidateIdx + 1} DE {rankedCandidates.length}
              </Text>
              <View
                className="flex-row gap-1.5"
                style={{ flexDirection: 'row', gap: 6 }}
              >
                <AnimatedPressable
                  onPress={() => {
                    setCandidateIndex((prev) => Math.max(0, prev - 1));
                    setJustAddedCount(0);
                  }}
                  disabled={safeCandidateIdx <= 0}
                  className="min-h-[38px] min-w-[38px] rounded-pocket bg-pocket border border-stitch items-center justify-center"
                  style={{
                    minWidth: 38,
                    minHeight: 38,
                    borderRadius: 6,
                    backgroundColor: TOKENS.bgPocket,
                    borderColor: TOKENS.borderSubtle,
                    borderWidth: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: safeCandidateIdx <= 0 ? 0.4 : 1,
                  }}
                >
                  <ChevronLeft size={15} color={TOKENS.textPrimary} />
                </AnimatedPressable>
                <AnimatedPressable
                  onPress={() => {
                    setCandidateIndex((prev) =>
                      Math.min(rankedCandidates.length - 1, prev + 1)
                    );
                    setJustAddedCount(0);
                  }}
                  disabled={safeCandidateIdx >= rankedCandidates.length - 1}
                  className="min-h-[38px] min-w-[38px] rounded-pocket bg-pocket border border-stitch items-center justify-center"
                  style={{
                    minWidth: 38,
                    minHeight: 38,
                    borderRadius: 6,
                    backgroundColor: TOKENS.bgPocket,
                    borderColor: TOKENS.borderSubtle,
                    borderWidth: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity:
                      safeCandidateIdx >= rankedCandidates.length - 1 ? 0.4 : 1,
                  }}
                >
                  <ChevronRight size={15} color={TOKENS.textPrimary} />
                </AnimatedPressable>
              </View>
            </View>
          ) : null}
        </View>

        {ocrError ? (
          <ErrorCard
            title="Aviso del lector óptico"
            description={ocrError}
            retryLabel="Intentar con otra foto"
            onRetry={handlePickFromGallery}
          />
        ) : null}

        {saveError ? (
          <ErrorCard
            title="No se guardó la carta"
            description="Falló la escritura en tu inventario local. Tu colección no cambió."
            retryLabel="Reintentar agregado"
            onRetry={handleQuickAdd}
          />
        ) : null}

        {/* Tarjeta flotante de agregado rápido en 1 toque */}
        {isProcessingOcr || searchQuery.isLoading ? (
          <BinderGridSkeleton pageLabel="IDENTIFICANDO CARTA Y COLECCIÓN EN TCGDEX..." />
        ) : searchQuery.isError ? (
          <ErrorCard
            title="Error al consultar TCGdex desde el escáner"
            description="No fue posible cruzar el texto con el catálogo online."
            onRetry={() => searchQuery.refetch()}
          />
        ) : matchedCard ? (
          <FloatingScannedCard
            card={matchedCard}
            setName={matchedSetName}
            setSymbol={matchedSetSymbol}
            setOfficialCount={matchedSetOfficialCount}
            rarity={matchedDetail?.rarity}
            variantsInfo={variantsInfo}
            selectedVariant={selectedVariant}
            onSelectVariant={setSelectedVariant}
            variantCounts={matchedCountsQuery.data}
            targetBinderLabel={targetBinderLabel}
            onCycleTargetBinder={handleCycleTargetBinder}
            onQuickAdd={handleQuickAdd}
            onQuickSubtract={handleQuickSubtract}
            onOpenFullDetail={() => setDetailModalOpen(true)}
            justAddedCount={justAddedCount}
          />
        ) : (
          <EmptyState
            icon={ScanLine}
            badge="ESCÁNER + MANUAL"
            title={
              rawOcrInput.trim().length > 0
                ? `Sin coincidencia para "${tcgdexQueryString}"`
                : 'Escanea tu carta o ingrésala a mano abajo'
            }
            description={
              rawOcrInput.trim().length > 0
                ? 'Toca uno de los cuadraditos negros de colección sugeridos arriba, cambia el idioma ES/EN o ajusta el nombre/número abajo.'
                : 'Pulsa "Escanear Carta (OCR)" frente a tu carta física, sube una foto o escribe el nombre y número (ej. Pikachu 025/165) en el panel manual.'
            }
            actionLabel="Subir Foto de Galería"
            onAction={handlePickFromGallery}
            secondaryActionLabel="Probar Charizard ex 199/165"
            onSecondaryAction={() => {
              setManualNameInput(SAMPLE_OCR_CARDS[0].name);
              setManualNumberInput(SAMPLE_OCR_CARDS[0].fraction);
              setRawOcrInput(SAMPLE_OCR_CARDS[0].raw);
              setPreferredSetId(null);
              setCandidateIndex(0);
              setJustAddedCount(0);
            }}
          />
        )}

        {/* Panel de Ingreso a Mano Rápido + Corrección de OCR */}
        <View
          className="bg-page border border-stitch rounded-card p-3 gap-2.5"
          style={{
            backgroundColor: TOKENS.bgPage,
            borderColor: TOKENS.borderSubtle,
            borderWidth: 1,
            borderRadius: 12,
            padding: 12,
            gap: 10,
          }}
        >
          <View
            className="flex-row items-center justify-between"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View
              className="flex-row items-center gap-1.5"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <Keyboard size={14} color={TOKENS.accentPrimary} />
              <Text
                className="font-display-semi text-sm text-ink"
                style={{
                  fontFamily: 'SpaceGrotesk_600SemiBold',
                  fontSize: 13,
                  color: TOKENS.textPrimary,
                }}
              >
                Ingresar a Mano o Corregir Lectura
              </Text>
            </View>
            {rawOcrInput.trim().length > 0 ? (
              <AnimatedPressable
                onPress={() => {
                  setManualNameInput('');
                  setManualNumberInput('');
                  setRawOcrInput('');
                  setPreferredSetId(null);
                  setCandidateIndex(0);
                  setJustAddedCount(0);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 3,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                }}
              >
                <X size={12} color={TOKENS.textMuted} />
                <Text
                  style={{
                    fontFamily: 'JetBrainsMono_600SemiBold',
                    fontSize: 10,
                    color: TOKENS.textMuted,
                    textTransform: 'uppercase',
                  }}
                >
                  Limpiar
                </Text>
              </AnimatedPressable>
            ) : null}
          </View>

          {/* Dos campos dedicados para ingreso manual rápido: Nombre + Número/Colección */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 3, gap: 4 }}>
              <Text
                style={{
                  fontFamily: 'JetBrainsMono_400Regular',
                  fontSize: 10,
                  color: TOKENS.textMuted,
                }}
              >
                POKÉMON / CARTA
              </Text>
              <TextInput
                value={manualNameInput}
                onChangeText={(txt) =>
                  applyManualInputs(
                    txt,
                    manualNumberInput,
                    ocrData.extractedSetCode
                  )
                }
                placeholder="Ej. Pikachu, Charizard ex..."
                placeholderTextColor={TOKENS.textMuted}
                style={{
                  minHeight: 42,
                  backgroundColor: TOKENS.bgPocket,
                  borderColor: TOKENS.borderSubtle,
                  borderWidth: 1,
                  borderRadius: 6,
                  paddingHorizontal: 10,
                  fontFamily: 'PlusJakartaSans_500Medium',
                  fontSize: 13,
                  color: TOKENS.textPrimary,
                }}
              />
            </View>

            <View style={{ flex: 2, gap: 4 }}>
              <Text
                style={{
                  fontFamily: 'JetBrainsMono_400Regular',
                  fontSize: 10,
                  color: TOKENS.textMuted,
                }}
              >
                NÚMERO (XXX/YYY)
              </Text>
              <TextInput
                value={manualNumberInput}
                onChangeText={(txt) =>
                  applyManualInputs(
                    manualNameInput,
                    txt,
                    ocrData.extractedSetCode
                  )
                }
                placeholder="Ej. 025/165"
                placeholderTextColor={TOKENS.textMuted}
                autoCapitalize="characters"
                style={{
                  minHeight: 42,
                  backgroundColor: TOKENS.bgPocket,
                  borderColor: TOKENS.borderSubtle,
                  borderWidth: 1,
                  borderRadius: 6,
                  paddingHorizontal: 10,
                  fontFamily: 'JetBrainsMono_600SemiBold',
                  fontSize: 13,
                  color: TOKENS.accentPrimary,
                }}
              />
            </View>
          </View>

          {/* Cuadro de texto OCR crudo / libre */}
          <View style={{ gap: 4 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <Zap size={11} color={TOKENS.accentPrimary} />
                <Text
                  style={{
                    fontFamily: 'JetBrainsMono_400Regular',
                    fontSize: 10,
                    color: TOKENS.textMuted,
                  }}
                >
                  TEXTO OCR COMPLETO (O ESCRIBE &quot;PIKACHU MEW 025/165&quot;)
                </Text>
              </View>
            </View>
            <TextInput
              value={rawOcrInput}
              onChangeText={(txt) => {
                setRawOcrInput(txt);
                const parsed = parseCardOcrText(txt);
                setManualNameInput(parsed.extractedName ?? '');
                setManualNumberInput(
                  parsed.extractedFraction ?? parsed.localId ?? ''
                );
                setOcrError(null);
                setCandidateIndex(0);
                setJustAddedCount(0);
              }}
              multiline
              numberOfLines={2}
              placeholder="Texto extraído por la cámara o búsqueda directa (ej. Charizard OBF 125/197)"
              placeholderTextColor={TOKENS.textMuted}
              className="min-h-[54px] bg-pocket border border-stitch rounded-pocket p-2.5 font-mono text-xs text-ink"
              style={{
                minHeight: 54,
                backgroundColor: TOKENS.bgPocket,
                borderColor: TOKENS.borderSubtle,
                borderWidth: 1,
                borderRadius: 6,
                padding: 10,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: 12,
                color: TOKENS.textPrimary,
              }}
            />
          </View>

          <View>
            <Text
              className="font-mono text-[10px] uppercase text-muted mb-1.5"
              style={{
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: 10,
                color: TOKENS.textMuted,
                marginBottom: 6,
              }}
            >
              EJEMPLOS RÁPIDOS (FULL ART vs COMÚN vs RARA)
            </Text>
            <View
              className="flex-row flex-wrap gap-1.5"
              style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}
            >
              {SAMPLE_OCR_CARDS.map((sample) => {
                const active = rawOcrInput === sample.raw;
                return (
                  <AnimatedPressable
                    key={sample.label}
                    onPress={() => {
                      setManualNameInput(sample.name);
                      setManualNumberInput(sample.fraction);
                      setRawOcrInput(sample.raw);
                      setPreferredSetId(null);
                      setOcrError(null);
                      setCandidateIndex(0);
                      setJustAddedCount(0);
                    }}
                    className={`min-h-[38px] rounded-pocket px-3 py-1.5 border flex-row items-center justify-center ${
                      active
                        ? 'bg-pocket border-foil'
                        : 'bg-binder border-stitch'
                    }`}
                    style={{
                      minHeight: 38,
                      borderRadius: 6,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderWidth: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: active
                        ? TOKENS.bgPocket
                        : TOKENS.bgBinder,
                      borderColor: active
                        ? TOKENS.accentPrimary
                        : TOKENS.borderSubtle,
                    }}
                  >
                    <Text
                      className={`font-mono text-[10px] ${
                        active ? 'text-foil' : 'text-muted'
                      }`}
                      style={{
                        fontFamily: 'JetBrainsMono_600SemiBold',
                        fontSize: 10,
                        color: active
                          ? TOKENS.accentPrimary
                          : TOKENS.textMuted,
                      }}
                    >
                      {sample.label}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>

      <CardDetailModal
        cardId={detailModalOpen && matchedCard ? matchedCard.id : null}
        fallbackCard={matchedCard}
        fallbackSet={
          matchedSetId
            ? {
                id: matchedSetId,
                name: matchedSetName ?? matchedSetId.toUpperCase(),
                logo: matchedSetLogo ?? undefined,
                officialCount: matchedSetOfficialCount || undefined,
                totalCount: matchedSetTotalCount || undefined,
              }
            : null
        }
        onClose={() => setDetailModalOpen(false)}
      />
    </SafeAreaView>
  );
}
