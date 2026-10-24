import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  Image,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Plus,
  BookOpen,
  Layers,
  Sparkles,
} from 'lucide-react-native';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import {
  useSetDetailQuery,
  useCardSearchQuery,
  useCardsByElementalTypeQuery,
} from '@/hooks/useTcgdex';
import {
  useSetOwnedMapQuery,
  useOwnedCardsQuery,
  useManualBinderCardsQuery,
  useAdjustCardVariantMutation,
} from '@/hooks/useDatabase';
import { getSetLogoUrl, type TcgdexCardBrief } from '@/services/tcgdex';
import type { BinderRow } from '@/db/schema';
import type { CardVariantCounts } from '@/db/repository';
import { matchesElementalType } from '@/utils/elementalTypes';
import { CardPocketItem } from '@/components/cards/CardPocketItem';
import { CardDetailModal } from '@/components/cards/CardDetailModal';
import { AddCardToBinderModal } from '@/components/binders/AddCardToBinderModal';
import { BinderGridSkeleton } from '@/components/ui/BinderGridSkeleton';
import { ErrorCard } from '@/components/ui/ErrorCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { TOKENS } from '@/theme/tokens';

interface BinderPaginatedViewProps {
  binder: BinderRow;
  onBack: () => void;
}

type OwnershipFilter = 'all' | 'owned' | 'missing';

interface PocketPage {
  pageNumber: number;
  slots: Array<TcgdexCardBrief | null>;
}

const POCKETS_PER_PAGE = 9;

/**
 * Vista de carpeta paginada de 3x3 bolsillos (9 cartas por hoja).
 * Soporta álbumes por Set Oficial, Carpetas Manuales y Álbumes Dinámicos por regla.
 */
export function BinderPaginatedView({
  binder,
  onBack,
}: BinderPaginatedViewProps) {
  const { width: windowWidth } = useWindowDimensions();
  const { language } = usePreferencesStore();
  const pagerRef = useRef<FlatList<PocketPage>>(null);

  const [currentPage, setCurrentPage] = useState(0);
  const [ownershipFilter, setOwnershipFilter] =
    useState<OwnershipFilter>('all');
  const [activeCard, setActiveCard] = useState<TcgdexCardBrief | null>(null);
  const [addModalVisible, setAddModalVisible] = useState(false);

  const isSetBinder = binder.type === 'set';
  const isManualBinder = binder.type === 'manual';
  const isDynamicBinder = binder.type === 'dynamic';

  // Consultas de datos según el tipo de álbum
  const setDetailQuery = useSetDetailQuery(
    language,
    isSetBinder ? (binder.setId ?? null) : null
  );
  const setOwnedMapQuery = useSetOwnedMapQuery(
    isSetBinder ? (binder.setId ?? null) : null
  );
  const ownedCardsQuery = useOwnedCardsQuery();
  const manualCardsQuery = useManualBinderCardsQuery(
    isManualBinder ? binder.id : null
  );

  // Para álbumes dinámicos por tipo elemental, consultamos también el índice de tipos de TCGdex
  // para identificar cartas del inventario cuyo typesJson aún no hubiera sido descargado.
  const typeCatalogQuery = useCardsByElementalTypeQuery(
    language,
    isDynamicBinder && binder.ruleType === 'element'
      ? (binder.ruleValue ?? null)
      : null
  );

  // Para álbumes dinámicos por Pokémon, también permitimos consultar el catálogo si el inventario está vacío
  const pokemonCatalogQuery = useCardSearchQuery(
    language,
    isDynamicBinder && binder.ruleType === 'pokemon'
      ? (binder.ruleValue ?? '')
      : ''
  );

  const adjustMutation = useAdjustCardVariantMutation();

  // Mapa global cardId -> conteo de variantes en inventario
  const globalOwnedMap = useMemo(() => {
    const map: Record<string, CardVariantCounts> = {};
    for (const item of ownedCardsQuery.data ?? []) {
      map[item.card.id] = item.counts;
    }
    return map;
  }, [ownedCardsQuery.data]);

  const activeOwnedMap = isSetBinder
    ? { ...globalOwnedMap, ...(setOwnedMapQuery.data ?? {}) }
    : globalOwnedMap;

  // Construcción de la lista base de cartas del álbum
  const baseCards: TcgdexCardBrief[] = useMemo(() => {
    if (isSetBinder) {
      return setDetailQuery.data?.cards ?? [];
    }

    if (isManualBinder) {
      return (manualCardsQuery.data ?? []).map((row) => ({
        id: row.id,
        localId: row.localId,
        name: row.name,
        image: row.image ?? undefined,
      }));
    }

    if (isDynamicBinder) {
      const ruleVal = (binder.ruleValue ?? '').trim().toLowerCase();
      if (!ruleVal) return [];

      const ownedList = ownedCardsQuery.data ?? [];

      if (binder.ruleType === 'pokemon') {
        const matchedOwned = ownedList
          .filter((entry) =>
            entry.card.name.toLowerCase().includes(ruleVal)
          )
          .map((entry) => ({
            id: entry.card.id,
            localId: entry.card.localId,
            name: entry.card.name,
            image: entry.card.image ?? undefined,
          }));
        return matchedOwned;
      }

      if (binder.ruleType === 'element') {
        const catalogTypeIds = new Set(
          (typeCatalogQuery.data ?? []).map((c) => c.id)
        );
        const matchedOwned = ownedList
          .filter(
            (entry) =>
              matchesElementalType(
                entry.card.typesJson,
                binder.ruleValue ?? ''
              ) || catalogTypeIds.has(entry.card.id)
          )
          .map((entry) => ({
            id: entry.card.id,
            localId: entry.card.localId,
            name: entry.card.name,
            image: entry.card.image ?? undefined,
          }));
        return matchedOwned;
      }
    }

    return [];
  }, [
    isSetBinder,
    isManualBinder,
    isDynamicBinder,
    setDetailQuery.data?.cards,
    manualCardsQuery.data,
    ownedCardsQuery.data,
    typeCatalogQuery.data,
    binder.ruleType,
    binder.ruleValue,
  ]);

  // Estadísticas de progreso del álbum
  const progressStats = useMemo(() => {
    const totalSlots = isSetBinder
      ? binder.setOfficialCount || baseCards.length
      : baseCards.length;

    let ownedCount = 0;
    for (const card of baseCards) {
      if ((activeOwnedMap[card.id]?.total ?? 0) > 0) {
        ownedCount += 1;
      }
    }

    const percentage =
      totalSlots > 0 ? Math.min(100, (ownedCount / totalSlots) * 100) : 0;

    return {
      ownedCount,
      totalSlots,
      percentage,
    };
  }, [isSetBinder, binder.setOfficialCount, baseCards, activeOwnedMap]);

  // Filtrado por estado (Todas / Obtenidas / Faltantes)
  const filteredCards = useMemo(() => {
    if (ownershipFilter === 'all') return baseCards;
    return baseCards.filter((c) => {
      const owned = (activeOwnedMap[c.id]?.total ?? 0) > 0;
      return ownershipFilter === 'owned' ? owned : !owned;
    });
  }, [baseCards, ownershipFilter, activeOwnedMap]);

  // Agrupación en páginas de 9 bolsillos (3x3)
  const pages: PocketPage[] = useMemo(() => {
    if (filteredCards.length === 0) return [];
    const totalPages = Math.ceil(filteredCards.length / POCKETS_PER_PAGE);
    const result: PocketPage[] = [];

    for (let p = 0; p < totalPages; p++) {
      const slice = filteredCards.slice(
        p * POCKETS_PER_PAGE,
        (p + 1) * POCKETS_PER_PAGE
      );
      const slots: Array<TcgdexCardBrief | null> = [...slice];
      while (slots.length < POCKETS_PER_PAGE) {
        slots.push(null);
      }
      result.push({
        pageNumber: p + 1,
        slots,
      });
    }

    return result;
  }, [filteredCards]);

  const safePageIndex = Math.min(
    currentPage,
    Math.max(0, pages.length - 1)
  );

  const goToPage = (targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= pages.length) return;
    setCurrentPage(targetIndex);
    pagerRef.current?.scrollToIndex({
      index: targetIndex,
      animated: true,
    });
  };

  const handleMomentumScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const pageWidth = event.nativeEvent.layoutMeasurement.width || windowWidth;
    const newIndex = Math.round(offsetX / pageWidth);
    if (newIndex >= 0 && newIndex < pages.length) {
      setCurrentPage(newIndex);
    }
  };

  // Marcar como obtenida (+1 Normal) o abrir modal si ya se tiene
  const handleQuickToggleOwned = (
    card: TcgdexCardBrief,
    currentlyOwned: boolean
  ) => {
    if (currentlyOwned) {
      setActiveCard(card);
      return;
    }

    const inferredSetId =
      binder.setId ?? card.id.split('-')[0] ?? 'unknown';

    adjustMutation.mutate({
      card: {
        id: card.id,
        localId: card.localId,
        name: card.name,
        image: card.image ?? null,
        setId: inferredSetId,
        setName: binder.setName ?? binder.name,
        setLogo: binder.setLogo ?? null,
        setOfficialCount: binder.setOfficialCount ?? undefined,
        setTotalCount: binder.setTotalCount ?? undefined,
        language,
      },
      variant: 'normal',
      delta: 1,
    });
  };

  const isLoading =
    (isSetBinder && setDetailQuery.isLoading) ||
    (isManualBinder && manualCardsQuery.isLoading) ||
    (isDynamicBinder && ownedCardsQuery.isLoading);

  const isError =
    (isSetBinder && setDetailQuery.isError) ||
    (isManualBinder && manualCardsQuery.isError);

  const setLogoUrl = isSetBinder
    ? getSetLogoUrl(binder.setLogo ?? setDetailQuery.data?.logo)
    : null;

  return (
    <SafeAreaView className="flex-1 bg-binder" edges={['top']}>
      {/* Cabecera de la carpeta abierta */}
      <View className="px-3 pt-2.5 pb-3 border-b border-stitch bg-page">
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={onBack}
            className="min-h-[44px] flex-row items-center gap-2 pr-3 active:opacity-80"
          >
            <View className="w-8 h-8 rounded-pocket bg-pocket border border-stitch items-center justify-center">
              <ArrowLeft size={16} color={TOKENS.accentPrimary} />
            </View>
            <Text className="font-mono text-xs uppercase text-foil">
              Mis Álbumes
            </Text>
          </Pressable>

          {isManualBinder ? (
            <Pressable
              onPress={() => setAddModalVisible(true)}
              className="min-h-[44px] bg-foil rounded-pocket px-3 flex-row items-center gap-1.5 active:opacity-85"
            >
              <Plus size={15} color={TOKENS.bgBinder} />
              <Text className="font-sans-semi text-xs uppercase text-binder">
                Insertar Carta
              </Text>
            </Pressable>
          ) : (
            <View className="bg-pocket border border-stitch rounded-pocket px-2.5 py-1 flex-row items-center gap-1.5">
              {isSetBinder ? (
                <Layers size={12} color={TOKENS.accentPrimary} />
              ) : (
                <Sparkles size={12} color={TOKENS.accentPrimary} />
              )}
              <Text className="font-mono text-[10px] text-foil uppercase">
                {isSetBinder
                  ? `SET ${(binder.setId ?? '').toUpperCase()}`
                  : `REGLA: ${binder.ruleValue}`}
              </Text>
            </View>
          )}
        </View>

        {/* Título + Logo + Progreso */}
        <View className="flex-row items-center gap-3 mt-1.5">
          {setLogoUrl ? (
            <View className="w-16 h-11 bg-pocket border border-stitch rounded-pocket p-1 items-center justify-center">
              <Image
                source={{ uri: setLogoUrl }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="contain"
              />
            </View>
          ) : null}

          <View className="flex-1">
            <Text
              className="font-display text-xl text-ink"
              numberOfLines={1}
            >
              {binder.name}
            </Text>

            <View className="flex-row items-center justify-between mt-1">
              <Text className="font-mono text-xs text-muted tabular-nums">
                OBTENIDAS: {progressStats.ownedCount}/
                {progressStats.totalSlots} CARTAS
              </Text>
              <Text className="font-mono-semi text-xs text-foil tabular-nums">
                {progressStats.percentage.toFixed(1)}%
              </Text>
            </View>

            <View className="mt-1.5 h-2 w-full bg-binder border border-stitch rounded-pocket overflow-hidden">
              <View
                style={{ width: `${progressStats.percentage}%` }}
                className="h-full bg-foil"
              />
            </View>
          </View>
        </View>

        {/* Controles de filtro (Todas / Obtenidas / Faltantes) y Paginación */}
        <View className="flex-row items-center justify-between mt-3 pt-2.5 border-t border-stitch">
          <View className="flex-row gap-1.5">
            {(
              [
                { id: 'all', label: 'Todas' },
                { id: 'owned', label: 'Obtenidas' },
                { id: 'missing', label: 'Faltantes' },
              ] as const
            ).map((f) => {
              const active = ownershipFilter === f.id;
              return (
                <Pressable
                  key={f.id}
                  onPress={() => {
                    setOwnershipFilter(f.id);
                    setCurrentPage(0);
                  }}
                  className={`min-h-[44px] px-2.5 rounded-pocket border items-center justify-center ${
                    active
                      ? 'bg-pocket border-foil'
                      : 'bg-binder border-stitch'
                  }`}
                >
                  <Text
                    className={`font-mono text-[10px] uppercase ${
                      active ? 'text-foil' : 'text-muted'
                    }`}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {pages.length > 0 ? (
            <View className="flex-row items-center gap-1.5">
              <Pressable
                onPress={() => goToPage(safePageIndex - 1)}
                disabled={safePageIndex <= 0}
                className={`min-h-[44px] min-w-[44px] rounded-pocket border items-center justify-center ${
                  safePageIndex > 0
                    ? 'bg-pocket border-stitch active:border-foil'
                    : 'bg-binder border-stitch/40 opacity-40'
                }`}
              >
                <ChevronLeft size={16} color={TOKENS.textPrimary} />
              </Pressable>

              <View className="bg-pocket border border-stitch rounded-pocket px-2.5 py-1.5">
                <Text className="font-mono-semi text-[11px] text-ink tabular-nums">
                  {String(safePageIndex + 1).padStart(2, '0')}/
                  {String(pages.length).padStart(2, '0')}
                </Text>
              </View>

              <Pressable
                onPress={() => goToPage(safePageIndex + 1)}
                disabled={safePageIndex >= pages.length - 1}
                className={`min-h-[44px] min-w-[44px] rounded-pocket border items-center justify-center ${
                  safePageIndex < pages.length - 1
                    ? 'bg-pocket border-stitch active:border-foil'
                    : 'bg-binder border-stitch/40 opacity-40'
                }`}
              >
                <ChevronRight size={16} color={TOKENS.textPrimary} />
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>

      {/* Cuerpo: Hojas de 3x3 bolsillos paginadas horizontalmente */}
      <View className="flex-1 justify-center">
        {isLoading ? (
          <View className="p-3">
            <BinderGridSkeleton pageLabel="CARGANDO HOJA DE 9 BOLSILLOS..." />
          </View>
        ) : isError ? (
          <View className="p-3">
            <ErrorCard
              title="No se pudo abrir las hojas del álbum"
              description="Verifica tu conexión si es la primera vez que abres este set oficial."
              onRetry={() => {
                if (isSetBinder) setDetailQuery.refetch();
                if (isManualBinder) manualCardsQuery.refetch();
              }}
            />
          </View>
        ) : pages.length === 0 ? (
          <View className="p-3">
            {isManualBinder && baseCards.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                badge="CARPETA MANUAL"
                title="Esta carpeta aún no tiene cartas"
                description="Agrega cartas desde tu inventario físico o desde el catálogo global de TCGdex para llenar los bolsillos 3×3."
                actionLabel="Insertar Primera Carta"
                onAction={() => setAddModalVisible(true)}
              />
            ) : isDynamicBinder && baseCards.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                badge={`REGLA: ${(binder.ruleValue ?? '').toUpperCase()}`}
                title="Aún no tienes cartas en inventario que cumplan esta regla"
                description={
                  binder.ruleType === 'pokemon'
                    ? `En cuanto sumes cualquier carta de "${binder.ruleValue}" a tu inventario (desde Explorar Sets o el Escáner), aparecerá automáticamente en esta carpeta.`
                    : `En cuanto sumes cartas de tipo "${binder.ruleValue}" a tu inventario, se reunirán automáticamente en esta carpeta.`
                }
                actionLabel={
                  pokemonCatalogQuery.data && pokemonCatalogQuery.data.length > 0
                    ? `Agregar primera carta de ${binder.ruleValue}`
                    : 'Volver a Mis Álbumes'
                }
                onAction={() => {
                  if (
                    pokemonCatalogQuery.data &&
                    pokemonCatalogQuery.data.length > 0
                  ) {
                    setActiveCard(pokemonCatalogQuery.data[0]);
                  } else {
                    onBack();
                  }
                }}
              />
            ) : (
              <EmptyState
                icon={Layers}
                badge="FILTRO"
                title="No hay cartas en este filtro"
                description="Cambia el filtro superior a 'Todas' para ver la hoja completa de 9 bolsillos."
                actionLabel="Mostrar Todas las Cartas"
                onAction={() => setOwnershipFilter('all')}
              />
            )}
          </View>
        ) : (
          <FlatList
            ref={pagerRef}
            data={pages}
            keyExtractor={(item) => `page-${item.pageNumber}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleMomentumScrollEnd}
            getItemLayout={(_data, index) => ({
              length: windowWidth,
              offset: windowWidth * index,
              index,
            })}
            renderItem={({ item: page }) => {
              const startSlot = (page.pageNumber - 1) * POCKETS_PER_PAGE + 1;
              const endSlot = page.pageNumber * POCKETS_PER_PAGE;

              return (
                <View style={{ width: windowWidth }} className="p-3">
                  <View className="bg-page border border-stitch rounded-card p-2.5">
                    {/* Encabezado de hoja de polipropileno */}
                    <View className="flex-row items-center justify-between mb-1.5 pb-1.5 px-1 border-b border-stitch">
                      <Text className="font-mono text-[11px] text-foil uppercase tabular-nums">
                        HOJA {String(page.pageNumber).padStart(2, '0')} DE{' '}
                        {String(pages.length).padStart(2, '0')}
                      </Text>
                      <Text className="font-mono text-[10px] text-muted tabular-nums">
                        BOLSILLOS {String(startSlot).padStart(3, '0')}–
                        {String(endSlot).padStart(3, '0')} • DESLIZA ⟷
                      </Text>
                    </View>

                    {/* Grilla 3x3 exacta (9 bolsillos) */}
                    <View className="flex-row flex-wrap -mx-1">
                      {page.slots.map((slotCard, idx) => {
                        const slotNum = startSlot + idx;
                        if (!slotCard) {
                          return (
                            <View
                              key={`empty-${page.pageNumber}-${slotNum}`}
                              className="w-1/3 p-1"
                            >
                              <View className="bg-pocket/60 border border-dashed border-stitch rounded-pocket p-1.5">
                                <View
                                  style={{ aspectRatio: 5 / 7 }}
                                  className="w-full rounded-pocket bg-binder/60 items-center justify-center p-2"
                                >
                                  <Text className="font-mono text-[10px] text-muted/50 tabular-nums">
                                    #{String(slotNum).padStart(3, '0')}
                                  </Text>
                                  <Text className="font-mono text-[9px] text-muted/40 uppercase mt-1">
                                    VACÍO
                                  </Text>
                                </View>
                                <View className="mt-1.5 px-0.5">
                                  <Text className="font-mono text-[10px] text-muted/40 tabular-nums">
                                    #{String(slotNum).padStart(3, '0')}
                                  </Text>
                                  <Text className="font-sans text-xs text-muted/40 mt-0.5">
                                    Disponible
                                  </Text>
                                </View>
                              </View>
                            </View>
                          );
                        }

                        return (
                          <CardPocketItem
                            key={slotCard.id}
                            card={slotCard}
                            officialTotal={
                              isSetBinder
                                ? (binder.setOfficialCount ?? undefined)
                                : undefined
                            }
                            variantCounts={activeOwnedMap[slotCard.id]}
                            dimIfMissing
                            onPress={(c) => setActiveCard(c)}
                            onQuickToggleOwned={handleQuickToggleOwned}
                          />
                        );
                      })}
                    </View>
                  </View>
                </View>
              );
            }}
          />
        )}
      </View>

      <CardDetailModal
        cardId={activeCard?.id ?? null}
        fallbackCard={activeCard}
        fallbackSet={
          isSetBinder && binder.setId
            ? {
                id: binder.setId,
                name: binder.setName ?? binder.name,
                logo: binder.setLogo ?? undefined,
                officialCount: binder.setOfficialCount ?? undefined,
                totalCount: binder.setTotalCount ?? undefined,
              }
            : null
        }
        onClose={() => setActiveCard(null)}
      />

      {isManualBinder ? (
        <AddCardToBinderModal
          visible={addModalVisible}
          binderId={binder.id}
          binderName={binder.name}
          onClose={() => setAddModalVisible(false)}
        />
      ) : null}
    </SafeAreaView>
  );
}
