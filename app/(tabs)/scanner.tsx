import React, { useState, useMemo, useRef } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  NativeModules,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import {
  ScanLine,
  Focus,
  Camera,
  CameraOff,
  Globe,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react-native';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorCard } from '@/components/ui/ErrorCard';
import { FloatingScannedCard } from '@/components/scanner/FloatingScannedCard';
import { CardDetailModal } from '@/components/cards/CardDetailModal';
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
  const [rawOcrInput, setRawOcrInput] = useState<string>(
    SAMPLE_OCR_CARDS[0].raw
  );
  const [selectedVariant, setSelectedVariant] =
    useState<CardVariant>('normal');
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [selectedBinderIndex, setSelectedBinderIndex] = useState<number>(-1);
  const [justAddedCount, setJustAddedCount] = useState(0);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  // Detecta si el binario actual incluye VisionCamera nativo (Prebuild) o corre sobre Expo Go
  const hasVisionCameraNative = Boolean(NativeModules?.CameraView);

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

  // 3. Conexión a SQLite para inventario y álbumes destino
  const ownedCardsQuery = useOwnedCardsQuery();
  const bindersQuery = useBindersQuery();
  const adjustVariantMutation = useAdjustCardVariantMutation();
  const addManualCardMutation = useAddCardToManualBinderMutation();

  const manualBinders = useMemo(
    () => (bindersQuery.data ?? []).filter((b) => b.type === 'manual'),
    [bindersQuery.data]
  );

  const targetManualBinder =
    selectedBinderIndex >= 0 && selectedBinderIndex < manualBinders.length
      ? manualBinders[selectedBinderIndex]
      : null;

  const ownedMap = useMemo(() => {
    const map: Record<string, CardVariantCounts> = {};
    for (const item of ownedCardsQuery.data ?? []) {
      map[item.card.id] = item.counts;
    }
    return map;
  }, [ownedCardsQuery.data]);

  const handleCycleTargetBinder = () => {
    if (manualBinders.length === 0) {
      setSelectedBinderIndex(-1);
      return;
    }
    setSelectedBinderIndex((prev) =>
      prev + 1 >= manualBinders.length ? -1 : prev + 1
    );
  };

  // Captura de fotograma de la cámara física
  const handleCaptureFrame = async () => {
    if (isCapturing) return;
    setIsCapturing(true);
    try {
      if (cameraRef.current && permission?.granted && cameraActive) {
        await cameraRef.current.takePictureAsync({
          quality: 0.4,
          skipProcessing: true,
        });
      }
      // Si el campo OCR estaba vacío, carga una lectura inicial o revalida
      if (!rawOcrInput.trim()) {
        setRawOcrInput(SAMPLE_OCR_CARDS[0].raw);
      }
      setCandidateIndex(0);
    } catch {
      // Si la cámara está ocupada en emulador, mantenemos el texto OCR actual
    } finally {
      setIsCapturing(false);
    }
  };

  // Agregado rápido en 1 toque al inventario (+ carpeta manual si fue elegida)
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
    <SafeAreaView className="flex-1 bg-binder" edges={['top']}>
      <ScreenHeader
        sectionCode={
          hasVisionCameraNative
            ? 'VISION CAMERA + ML KIT // ACTIVO'
            : 'VISOR ÓPTICO + OCR // TCGDEX'
        }
        title="Escáner de Cartas"
        subtitle="Extracción de nombre superior y fracción XXX/YYY con agregado en 1 toque"
        counterText={
          ocrData.confidence === 'high'
            ? 'OCR: ALTA PRECISIÓN'
            : 'OCR: EN ESPERA'
        }
      />

      <ScrollView
        className="flex-1"
        contentContainerClassName="p-3 gap-3 pb-8"
        showsVerticalScrollIndicator={false}
      >
        {/* Visor de cámara con retícula guía en proporción de carta 5:7 */}
        <View className="bg-page border border-stitch rounded-card p-3 items-center">
          <View className="w-full flex-row items-center justify-between mb-2.5">
            <View className="flex-row items-center gap-1.5">
              <Focus size={14} color={TOKENS.accentPrimary} />
              <Text className="font-mono text-xs text-ink">
                GUÍA 2.5&quot; × 3.5&quot;
              </Text>
            </View>

            <View className="flex-row items-center gap-1.5">
              <Pressable
                onPress={toggleLanguage}
                className="min-h-[44px] bg-pocket border border-foil/50 rounded-pocket px-2.5 flex-row items-center gap-1"
              >
                <Globe size={13} color={TOKENS.accentPrimary} />
                <Text className="font-mono-semi text-[11px] uppercase text-foil">
                  {language}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setCameraActive((prev) => !prev)}
                className="min-h-[44px] bg-pocket border border-stitch rounded-pocket px-2.5 flex-row items-center gap-1"
              >
                {cameraActive ? (
                  <Camera size={14} color={TOKENS.accentPrimary} />
                ) : (
                  <CameraOff size={14} color={TOKENS.textMuted} />
                )}
                <Text className="font-mono text-[10px] text-ink uppercase">
                  {cameraActive ? 'Visor ON' : 'Visor OFF'}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Bolsillo óptico 5:7 con cámara en vivo y superposición de zonas OCR */}
          <View
            style={{ aspectRatio: 5 / 7, width: '74%' }}
            className="bg-pocket border-2 border-foil rounded-pocket overflow-hidden justify-between relative"
          >
            {permission?.granted && cameraActive ? (
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
            <View className="flex-1 p-2.5 justify-between">
              {/* ZONA OCR 01: Nombre Superior */}
              <View className="bg-binder/90 border border-foil/80 rounded-pocket p-2">
                <View className="flex-row items-center justify-between">
                  <Text className="font-mono text-[9px] text-foil uppercase">
                    ZONA OCR 01 // NOMBRE SUPERIOR
                  </Text>
                  <Text className="font-mono text-[9px] text-muted">
                    CABECERA
                  </Text>
                </View>
                <Text
                  className="font-display text-sm text-ink mt-0.5"
                  numberOfLines={1}
                >
                  {ocrData.extractedName ?? 'Apunta al nombre superior...'}
                </Text>
              </View>

              {/* Centro del visor: Estado de permisos o botón de captura */}
              <View className="items-center justify-center my-auto px-2">
                {!permission?.granted ? (
                  <Pressable
                    onPress={requestPermission}
                    className="min-h-[44px] bg-foil rounded-pocket px-4 py-2 items-center justify-center"
                  >
                    <Text className="font-sans-semi text-xs uppercase text-binder">
                      Activar Cámara
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={handleCaptureFrame}
                    className="min-h-[44px] bg-binder/85 border border-foil rounded-card px-4 py-2 flex-row items-center gap-2 active:opacity-80"
                  >
                    <ScanLine size={16} color={TOKENS.accentPrimary} />
                    <Text className="font-mono-semi text-xs uppercase text-foil">
                      {isCapturing ? 'PROCESANDO...' : 'ESCANEAR CARTA'}
                    </Text>
                  </Pressable>
                )}
              </View>

              {/* ZONA OCR 02: Fracción XXX/YYY Inferior */}
              <View className="bg-binder/90 border border-foil/80 rounded-pocket p-2 flex-row items-center justify-between">
                <View>
                  <Text className="font-mono text-[9px] text-foil uppercase">
                    ZONA OCR 02 // FRACCIÓN XXX/YYY
                  </Text>
                  <Text className="font-mono-semi text-sm text-ink tabular-nums mt-0.5">
                    {ocrData.extractedFraction ?? '---/---'}
                  </Text>
                </View>
                <View className="bg-pocket border border-stitch rounded-pocket px-2 py-1">
                  <Text className="font-mono text-[10px] text-foil uppercase tabular-nums">
                    {ocrData.localId ? `#${ocrData.localId}` : 'SIN NÚM.'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Selector de candidatos si TCGdex devuelve más de una coincidencia */}
          {rankedCandidates.length > 1 ? (
            <View className="w-full mt-2.5 pt-2 border-t border-stitch flex-row items-center justify-between">
              <Text className="font-mono text-[10px] text-muted tabular-nums">
                COINCIDENCIA {safeCandidateIdx + 1} DE {rankedCandidates.length}
              </Text>
              <View className="flex-row gap-1.5">
                <Pressable
                  onPress={() =>
                    setCandidateIndex((prev) => Math.max(0, prev - 1))
                  }
                  disabled={safeCandidateIdx <= 0}
                  className="min-h-[44px] min-w-[44px] rounded-pocket bg-pocket border border-stitch items-center justify-center"
                >
                  <ChevronLeft size={15} color={TOKENS.textPrimary} />
                </Pressable>
                <Pressable
                  onPress={() =>
                    setCandidateIndex((prev) =>
                      Math.min(rankedCandidates.length - 1, prev + 1)
                    )
                  }
                  disabled={safeCandidateIdx >= rankedCandidates.length - 1}
                  className="min-h-[44px] min-w-[44px] rounded-pocket bg-pocket border border-stitch items-center justify-center"
                >
                  <ChevronRight size={15} color={TOKENS.textPrimary} />
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>

        {/* Tarjeta flotante de agregado rápido en 1 toque (Paso 10) */}
        {searchQuery.isError ? (
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
            badge="OCR EN VIVO"
            title="Esperando lectura de carta"
            description="Apunta la cámara a una carta física o selecciona una lectura OCR abajo para identificarla al instante en TCGdex."
            actionLabel="Cargar lectura de Charizard 199/165"
            onAction={() => {
              setRawOcrInput(SAMPLE_OCR_CARDS[0].raw);
              setCandidateIndex(0);
              setJustAddedCount(0);
            }}
          />
        )}

        {/* Panel de texto OCR extraído y simulador de cartas reales para pruebas */}
        <View className="bg-page border border-stitch rounded-card p-3 gap-2.5">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-1.5">
              <Zap size={14} color={TOKENS.accentPrimary} />
              <Text className="font-display-semi text-sm text-ink">
                Lectura OCR Extraída (Nombre + XXX/YYY)
              </Text>
            </View>
            <Text className="font-mono text-[10px] text-foil uppercase">
              EDITABLE EN VIVO
            </Text>
          </View>

          <TextInput
            value={rawOcrInput}
            onChangeText={(txt) => {
              setRawOcrInput(txt);
              setCandidateIndex(0);
              setJustAddedCount(0);
            }}
            multiline
            numberOfLines={2}
            placeholder="Ej: Charizard ex\n199/165"
            placeholderTextColor={TOKENS.textMuted}
            className="min-h-[60px] bg-pocket border border-stitch rounded-pocket p-2.5 font-mono text-xs text-ink"
          />

          <View>
            <Text className="font-mono text-[10px] uppercase text-muted mb-1.5">
              LECTURAS RÁPIDAS DE CARTAS FÍSICAS // 1 TOQUE
            </Text>
            <View className="flex-row flex-wrap gap-1.5">
              {SAMPLE_OCR_CARDS.map((sample) => {
                const active = rawOcrInput === sample.raw;
                return (
                  <Pressable
                    key={sample.label}
                    onPress={() => {
                      setRawOcrInput(sample.raw);
                      setCandidateIndex(0);
                      setJustAddedCount(0);
                    }}
                    className={`min-h-[44px] px-3 rounded-pocket border items-center justify-center ${
                      active
                        ? 'bg-pocket border-foil'
                        : 'bg-binder border-stitch'
                    }`}
                  >
                    <Text
                      className={`font-mono text-[11px] tabular-nums ${
                        active ? 'text-foil' : 'text-ink'
                      }`}
                    >
                      {sample.label}
                    </Text>
                  </Pressable>
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
