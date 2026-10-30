import React, { useState, useMemo, useRef } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
} from 'lucide-react-native';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { BinderGridSkeleton } from '@/components/ui/BinderGridSkeleton';
import { ErrorCard } from '@/components/ui/ErrorCard';
import { FloatingScannedCard } from '@/components/scanner/FloatingScannedCard';
import { CardDetailModal } from '@/components/cards/CardDetailModal';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { useCardSearchQuery } from '@/hooks/useTcgdex';
import {
  useOwnedCardsQuery,
  useBindersQuery,
  useAdjustCardVariantMutation,
  useAddCardToManualBinderMutation,
} from '@/hooks/useDatabase';
import {
  parseCardOcrText,
  recognizeCardFromImageUri,
  buildTcgdexQueryFromOcr,
  rankOcrCardCandidates,
} from '@/utils/ocrParser';
import type { CardVariant } from '@/db/schema';
import type { CardVariantCounts } from '@/db/repository';
import { TOKENS } from '@/theme/tokens';

const SAMPLE_OCR_CARDS = [
  {
    label: 'Charizard 199/165',
    raw: 'FASE 2 Charizard ex PS 330\n199/165',
  },
  {
    label: 'Pikachu 025/165',
    raw: 'BÁSICO Pikachu PS 60\n025/165',
  },
  {
    label: 'Mew 151/165',
    raw: 'BÁSICO Mew ex PS 180\n151/165',
  },
  {
    label: 'Gengar 094/165',
    raw: 'FASE 2 Gengar PS 130\n094/165',
  },
] as const;

export default function ScannerScreen() {
  const { language, toggleLanguage } = usePreferencesStore();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [cameraActive, setCameraActive] = useState(true);
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);
  const [rawOcrInput, setRawOcrInput] = useState<string>('');
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] =
    useState<CardVariant>('normal');
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [selectedBinderIndex, setSelectedBinderIndex] = useState<number>(-1);
  const [justAddedCount, setJustAddedCount] = useState(0);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);

  // 1. Extracción estructurada OCR (Nombre superior + Fracción XXX/YYY inferior)
  const ocrData = useMemo(() => parseCardOcrText(rawOcrInput), [rawOcrInput]);
  const tcgdexQueryString = useMemo(
    () => buildTcgdexQueryFromOcr(ocrData),
    [ocrData]
  );

  // 2. Búsqueda automática en TCGdex API conectada al OCR
  const searchQuery = useCardSearchQuery(language, tcgdexQueryString);

  const rankedCandidates = useMemo(
    () => rankOcrCardCandidates(searchQuery.data ?? [], ocrData),
    [searchQuery.data, ocrData]
  );

  const safeCandidateIdx = Math.min(
    candidateIndex,
    Math.max(0, rankedCandidates.length - 1)
  );
  const matchedCard = rankedCandidates[safeCandidateIdx] ?? null;

  // 3. Persistencia en SQLite
  const ownedCardsQuery = useOwnedCardsQuery();
  const bindersQuery = useBindersQuery();
  const adjustVariantMutation = useAdjustCardVariantMutation();
  const addManualCardMutation = useAddCardToManualBinderMutation();

  const manualBinders = useMemo(() => {
    return (bindersQuery.data ?? []).filter((b) => b.type === 'manual');
  }, [bindersQuery.data]);

  const targetManualBinder =
    selectedBinderIndex >= 0 && selectedBinderIndex < manualBinders.length
      ? manualBinders[selectedBinderIndex]
      : null;

  const handleCycleTargetBinder = () => {
    if (manualBinders.length === 0) return;
    setSelectedBinderIndex((prev) => {
      const next = prev + 1;
      return next >= manualBinders.length ? -1 : next;
    });
  };

  const ownedMap = useMemo(() => {
    const map: Record<string, CardVariantCounts> = {};
    for (const item of ownedCardsQuery.data ?? []) {
      map[item.card.id] = item.counts;
    }
    return map;
  }, [ownedCardsQuery.data]);

  // Procesamiento nativo ML Kit OCR
  const processImageWithMlKit = async (uri: string) => {
    setIsProcessingOcr(true);
    setOcrError(null);
    setCapturedImageUri(uri);
    setCandidateIndex(0);
    setJustAddedCount(0);
    try {
      const extractedText = await recognizeCardFromImageUri(uri);
      if (!extractedText.trim()) {
        setOcrError(
          'No se detectó texto nítido en la imagen. Acerca la carta con buena luz o edita el texto manualmente abajo.'
        );
      } else {
        setRawOcrInput(extractedText);
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
        quality: 0.85,
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

  // Agregado rápido en 1 toque al inventario
  const handleQuickAdd = () => {
    if (!matchedCard) return;
    const inferredSetId = matchedCard.id.split('-')[0] ?? 'unknown';
    const cardPayload = {
      id: matchedCard.id,
      localId: matchedCard.localId,
      name: matchedCard.name,
      image: matchedCard.image ?? null,
      setId: inferredSetId,
      setName: inferredSetId.toUpperCase(),
      setOfficialCount: ocrData.printedSetTotal
        ? parseInt(ocrData.printedSetTotal, 10) || 0
        : 0,
      language,
    };

    adjustVariantMutation.mutate({
      card: cardPayload,
      variant: selectedVariant,
      delta: 1,
    });

    if (targetManualBinder) {
      addManualCardMutation.mutate({
        binderId: targetManualBinder.id,
        card: cardPayload,
      });
    }

    setJustAddedCount((prev) => prev + 1);
  };

  return (
    <SafeAreaView
      className="flex-1 bg-binder"
      edges={['top']}
      style={{ flex: 1, backgroundColor: TOKENS.bgBinder }}
    >
      <ScreenHeader
        sectionCode="ML KIT OCR NATIVO // TCGDEX"
        title="Escáner de Cartas"
        subtitle="Cámara o foto de galería → OCR (Nombre + XXX/YYY) → 1 toque"
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
            style={{ width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}
          >
            <View
              className="flex-row items-center gap-1.5"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <Focus size={14} color={TOKENS.accentPrimary} />
              <Text
                className="font-mono text-xs text-ink"
                style={{ fontFamily: 'JetBrainsMono_600SemiBold', fontSize: 11, color: TOKENS.textPrimary }}
              >
                GUÍA 2.5&quot; × 3.5&quot;
              </Text>
            </View>

            <View
              className="flex-row items-center gap-1.5"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <AnimatedPressable
                onPress={handlePickFromGallery}
                className="min-h-[44px] bg-pocket border border-foil/60 rounded-pocket px-2.5 flex-row items-center gap-1.5 active:opacity-80"
                style={{
                  minHeight: 44,
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
                  style={{ fontFamily: 'JetBrainsMono_600SemiBold', fontSize: 10, color: TOKENS.accentPrimary, fontWeight: '700' }}
                >
                  Subir Foto
                </Text>
              </AnimatedPressable>

              <AnimatedPressable
                onPress={toggleLanguage}
                className="min-h-[44px] bg-pocket border border-stitch rounded-pocket px-2.5 flex-row items-center gap-1"
                style={{
                  minHeight: 44,
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
                  style={{ fontFamily: 'JetBrainsMono_600SemiBold', fontSize: 11, color: TOKENS.accentPrimary, fontWeight: '700' }}
                >
                  {language}
                </Text>
              </AnimatedPressable>

              <AnimatedPressable
                onPress={() => {
                  setCapturedImageUri(null);
                  setCameraActive((prev) => !prev);
                }}
                className="min-h-[44px] bg-pocket border border-stitch rounded-pocket px-2.5 flex-row items-center gap-1"
                style={{
                  minHeight: 44,
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
              width: '74%',
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
            ) : permission?.granted && cameraActive ? (
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
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Text
                    className="font-mono text-[9px] text-foil uppercase"
                    style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 9, color: TOKENS.accentPrimary }}
                  >
                    ZONA OCR 01 // NOMBRE SUPERIOR
                  </Text>
                  <Text
                    className="font-mono text-[9px] text-muted"
                    style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 9, color: TOKENS.textMuted }}
                  >
                    ML KIT
                  </Text>
                </View>
                <Text
                  className="font-display text-sm text-ink mt-0.5"
                  style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 13, color: TOKENS.textPrimary, marginTop: 2 }}
                  numberOfLines={1}
                >
                  {ocrData.extractedName ?? 'Apunta o sube foto de carta...'}
                </Text>
              </View>

              {/* Centro del visor: Botones de acción */}
              <View
                className="items-center justify-center my-auto px-2 gap-2"
                style={{ alignItems: 'center', justifyContent: 'center', marginVertical: 'auto', paddingHorizontal: 8, gap: 8 }}
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
                      style={{ color: TOKENS.bgBinder, fontWeight: '700', fontSize: 12 }}
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
                          style={{ color: TOKENS.bgBinder, fontWeight: '700', fontSize: 12 }}
                        >
                          Nueva Captura
                        </Text>
                      </>
                    ) : (
                      <>
                        <ScanLine size={16} color={TOKENS.bgBinder} />
                        <Text
                          className="font-sans-semi text-xs uppercase text-binder"
                          style={{ color: TOKENS.bgBinder, fontWeight: '700', fontSize: 12 }}
                        >
                          {isProcessingOcr
                            ? 'Extrayendo OCR...'
                            : 'Capturar y Leer OCR'}
                        </Text>
                      </>
                    )}
                  </AnimatedPressable>
                )}
              </View>

              {/* ZONA OCR 02: Fracción XXX/YYY Inferior */}
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
                    style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 9, color: TOKENS.accentPrimary }}
                  >
                    ZONA OCR 02 // FRACCIÓN XXX/YYY
                  </Text>
                  <Text
                    className="font-mono-semi text-sm text-ink tabular-nums mt-0.5"
                    style={{ fontFamily: 'JetBrainsMono_600SemiBold', fontSize: 13, color: TOKENS.textPrimary, marginTop: 2 }}
                  >
                    {ocrData.extractedFraction ?? '---/---'}
                  </Text>
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
                    style={{ fontFamily: 'JetBrainsMono_600SemiBold', fontSize: 10, color: TOKENS.accentPrimary }}
                  >
                    {ocrData.localId ? `#${ocrData.localId}` : 'SIN NÚM.'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

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
                style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 10, color: TOKENS.textMuted }}
              >
                COINCIDENCIA {safeCandidateIdx + 1} DE {rankedCandidates.length}
              </Text>
              <View className="flex-row gap-1.5" style={{ flexDirection: 'row', gap: 6 }}>
                <AnimatedPressable
                  onPress={() =>
                    setCandidateIndex((prev) => Math.max(0, prev - 1))
                  }
                  disabled={safeCandidateIdx <= 0}
                  className="min-h-[44px] min-w-[44px] rounded-pocket bg-pocket border border-stitch items-center justify-center"
                  style={{
                    minWidth: 44,
                    minHeight: 44,
                    borderRadius: 6,
                    backgroundColor: TOKENS.bgPocket,
                    borderColor: TOKENS.borderSubtle,
                    borderWidth: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ChevronLeft size={15} color={TOKENS.textPrimary} />
                </AnimatedPressable>
                <AnimatedPressable
                  onPress={() =>
                    setCandidateIndex((prev) =>
                      Math.min(rankedCandidates.length - 1, prev + 1)
                    )
                  }
                  disabled={safeCandidateIdx >= rankedCandidates.length - 1}
                  className="min-h-[44px] min-w-[44px] rounded-pocket bg-pocket border border-stitch items-center justify-center"
                  style={{
                    minWidth: 44,
                    minHeight: 44,
                    borderRadius: 6,
                    backgroundColor: TOKENS.bgPocket,
                    borderColor: TOKENS.borderSubtle,
                    borderWidth: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
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

        {/* Tarjeta flotante de agregado rápido en 1 toque (Paso 10) */}
        {isProcessingOcr || searchQuery.isLoading ? (
          <BinderGridSkeleton pageLabel="IDENTIFICANDO CARTA EN TCGDEX..." />
        ) : searchQuery.isError ? (
          <ErrorCard
            title="Error al consultar TCGdex desde el escáner"
            description="No fue posible cruzar el texto OCR con el catálogo online."
            onRetry={() => searchQuery.refetch()}
          />
        ) : matchedCard ? (
          <FloatingScannedCard
            card={matchedCard}
            selectedVariant={selectedVariant}
            onSelectVariant={setSelectedVariant}
            variantCounts={ownedMap[matchedCard.id]}
            targetBinder={targetManualBinder}
            onCycleTargetBinder={handleCycleTargetBinder}
            onQuickAdd={handleQuickAdd}
            onOpenFullDetail={() => setDetailModalOpen(true)}
            justAddedCount={justAddedCount}
          />
        ) : (
          <EmptyState
            icon={ScanLine}
            badge="ML KIT OCR"
            title={
              rawOcrInput.trim().length > 0
                ? `Sin coincidencia para "${tcgdexQueryString}"`
                : 'Captura una carta o sube una foto limpia'
            }
            description={
              rawOcrInput.trim().length > 0
                ? 'Prueba cambiando el idioma ES/EN arriba o corrige el nombre/número en el recuadro de lectura OCR abajo.'
                : 'Pulsa "Capturar y Leer OCR" frente a tu carta física o toca "Subir Foto" para analizar una imagen de tu galería con Google ML Kit.'
            }
            actionLabel="Subir Foto de Galería"
            onAction={handlePickFromGallery}
            secondaryActionLabel="Probar con Charizard 199/165"
            onSecondaryAction={() => {
              setRawOcrInput(SAMPLE_OCR_CARDS[0].raw);
              setCandidateIndex(0);
              setJustAddedCount(0);
            }}
          />
        )}

        {/* Panel de texto OCR extraído y simulador de cartas reales para pruebas */}
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
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <View
              className="flex-row items-center gap-1.5"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <Zap size={14} color={TOKENS.accentPrimary} />
              <Text
                className="font-display-semi text-sm text-ink"
                style={{ fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 13, color: TOKENS.textPrimary }}
              >
                Lectura OCR Extraída (Nombre + XXX/YYY)
              </Text>
            </View>
            <Text
              className="font-mono text-[10px] text-foil uppercase"
              style={{ fontFamily: 'JetBrainsMono_600SemiBold', fontSize: 10, color: TOKENS.accentPrimary }}
            >
              EDITABLE EN VIVO
            </Text>
          </View>

          <TextInput
            value={rawOcrInput}
            onChangeText={(txt) => {
              setRawOcrInput(txt);
              setOcrError(null);
              setCandidateIndex(0);
              setJustAddedCount(0);
            }}
            multiline
            numberOfLines={2}
            placeholder="Aquí aparecerá el texto extraído por ML Kit (o escríbelo: ej. Charizard 199/165)"
            placeholderTextColor={TOKENS.textMuted}
            className="min-h-[60px] bg-pocket border border-stitch rounded-pocket p-2.5 font-mono text-xs text-ink"
            style={{
              minHeight: 60,
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

          <View>
            <Text
              className="font-mono text-[10px] uppercase text-muted mb-1.5"
              style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 10, color: TOKENS.textMuted, marginBottom: 6 }}
            >
              EJEMPLOS RÁPIDOS // 1 TOQUE
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
                      setRawOcrInput(sample.raw);
                      setOcrError(null);
                      setCandidateIndex(0);
                      setJustAddedCount(0);
                    }}
                    className={`min-h-[44px] px-3 rounded-pocket border items-center justify-center ${
                      active
                        ? 'bg-pocket border-foil'
                        : 'bg-binder border-stitch'
                    }`}
                    style={{
                      minHeight: 44,
                      paddingHorizontal: 12,
                      borderRadius: 6,
                      borderWidth: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: active ? TOKENS.bgPocket : TOKENS.bgBinder,
                      borderColor: active ? TOKENS.accentPrimary : TOKENS.borderSubtle,
                    }}
                  >
                    <Text
                      className={`font-mono text-[11px] tabular-nums ${
                        active ? 'text-foil' : 'text-ink'
                      }`}
                      style={{
                        fontFamily: 'JetBrainsMono_600SemiBold',
                        fontSize: 11,
                        color: active ? TOKENS.accentPrimary : TOKENS.textPrimary,
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
        onClose={() => setDetailModalOpen(false)}
      />
    </SafeAreaView>
  );
}
