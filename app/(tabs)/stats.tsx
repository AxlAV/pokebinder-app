import React, { useMemo, useState } from 'react';
import { ScrollView, View, Text, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  BarChart3,
  Award,
  Layers,
  Sparkles,
  BookOpen,
  Star,
} from 'lucide-react-native';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { BinderGridSkeleton } from '@/components/ui/BinderGridSkeleton';
import { ErrorCard } from '@/components/ui/ErrorCard';
import { CardDetailModal } from '@/components/cards/CardDetailModal';
import {
  useInventoryStatsQuery,
  useOwnedCardsQuery,
  useBindersQuery,
} from '@/hooks/useDatabase';
import { getCardImageUrl, type TcgdexCardBrief } from '@/services/tcgdex';
import { TOKENS } from '@/theme/tokens';

export default function StatsScreen() {
  const router = useRouter();
  const [selectedCard, setSelectedCard] = useState<TcgdexCardBrief | null>(
    null
  );

  const statsQuery = useInventoryStatsQuery();
  const ownedCardsQuery = useOwnedCardsQuery();
  const bindersQuery = useBindersQuery();

  const stats = statsQuery.data ?? {
    totalPhysicalCopies: 0,
    uniqueOwnedCards: 0,
    totalBinders: 0,
    byVariant: { normal: 0, reverse: 0, holo: 0 },
    byRarity: [],
  };

  const ownedCards = ownedCardsQuery.data ?? [];
  const allBinders = bindersQuery.data ?? [];

  // Desglose por variante con porcentaje real
  const variantBreakdown = useMemo(() => {
    const total = stats.totalPhysicalCopies;
    const formatPct = (val: number) =>
      total > 0 ? `${((val / total) * 100).toFixed(1)}%` : '0.0%';

    return [
      {
        code: 'NRM',
        label: 'Normal',
        count: stats.byVariant.normal,
        share: formatPct(stats.byVariant.normal),
        pct: total > 0 ? (stats.byVariant.normal / total) * 100 : 0,
      },
      {
        code: 'REV',
        label: 'Reverse Holo',
        count: stats.byVariant.reverse,
        share: formatPct(stats.byVariant.reverse),
        pct: total > 0 ? (stats.byVariant.reverse / total) * 100 : 0,
      },
      {
        code: 'HLO',
        label: 'Holo Foil',
        count: stats.byVariant.holo,
        share: formatPct(stats.byVariant.holo),
        pct: total > 0 ? (stats.byVariant.holo / total) * 100 : 0,
      },
    ] as const;
  }, [stats]);

  // Progreso general por expansión (combina álbumes de set y sets con cartas en inventario)
  const setProgressList = useMemo(() => {
    const map = new Map<
      string,
      {
        setId: string;
        setName: string;
        uniqueOwned: number;
        physicalCopies: number;
        officialTotal: number;
      }
    >();

    for (const binder of allBinders) {
      if (binder.type === 'set' && binder.setId) {
        map.set(binder.setId, {
          setId: binder.setId,
          setName: binder.setName ?? binder.name,
          uniqueOwned: 0,
          physicalCopies: 0,
          officialTotal:
            binder.setOfficialCount || binder.setTotalCount || 0,
        });
      }
    }

    for (const entry of ownedCards) {
      const sId = entry.card.setId;
      const existing = map.get(sId);
      if (existing) {
        existing.uniqueOwned += 1;
        existing.physicalCopies += entry.counts.total;
        if (
          existing.officialTotal === 0 &&
          entry.card.setOfficialCount > 0
        ) {
          existing.officialTotal = entry.card.setOfficialCount;
        }
      } else {
        map.set(sId, {
          setId: sId,
          setName: entry.card.setName || sId.toUpperCase(),
          uniqueOwned: 1,
          physicalCopies: entry.counts.total,
          officialTotal:
            entry.card.setOfficialCount || entry.card.setTotalCount || 0,
        });
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => b.uniqueOwned - a.uniqueOwned
    );
  }, [allBinders, ownedCards]);

  const isLoading = statsQuery.isLoading || ownedCardsQuery.isLoading;
  const isError = statsQuery.isError || ownedCardsQuery.isError;

  return (
    <SafeAreaView className="flex-1 bg-binder" edges={['top']}>
      <ScreenHeader
        sectionCode="REGISTRO DE INVENTARIO // OFFLINE"
        title="Estadísticas"
        subtitle="Conteo físico por variante, rareza y progreso de expansiones"
        counterText={`${String(stats.totalPhysicalCopies).padStart(4, '0')} CARTAS`}
      />

      <ScrollView
        className="flex-1"
        contentContainerClassName="p-3 gap-3 pb-8"
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <BinderGridSkeleton pageLabel="CALCULANDO MÉTRICAS DE INVENTARIO..." />
        ) : isError ? (
          <ErrorCard
            title="Error al calcular métricas del inventario"
            description="No se pudo agregar el conteo de variantes desde SQLite local."
            retryLabel="Recalcular inventario"
            onRetry={() => {
              statsQuery.refetch();
              ownedCardsQuery.refetch();
            }}
          />
        ) : (
          <>
            {/* Panel 1: Balance de Colección y Desglose por Variante */}
            <View className="bg-page border border-stitch rounded-card p-3">
              <View className="flex-row items-center justify-between pb-2.5 mb-2.5 border-b border-stitch">
                <View className="flex-row items-center gap-2">
                  <Award size={16} color={TOKENS.accentPrimary} />
                  <Text className="font-display-semi text-sm text-ink">
                    Balance de Colección
                  </Text>
                </View>
                <Text className="font-mono text-xs text-foil tabular-nums">
                  {stats.totalBinders} ÁLBUMES
                </Text>
              </View>

              <View className="flex-row gap-2">
                <View className="flex-1 bg-pocket border border-stitch rounded-pocket p-3">
                  <Text className="font-mono text-[10px] text-muted uppercase">
                    TOTAL FÍSICO
                  </Text>
                  <Text className="font-mono-semi text-2xl text-ink tabular-nums mt-1">
                    {String(stats.totalPhysicalCopies).padStart(4, '0')}
                  </Text>
                  <Text className="font-sans text-xs text-muted mt-0.5">
                    Copias registradas
                  </Text>
                </View>

                <View className="flex-1 bg-pocket border border-stitch rounded-pocket p-3">
                  <Text className="font-mono text-[10px] text-muted uppercase">
                    CARTAS ÚNICAS
                  </Text>
                  <Text className="font-mono-semi text-2xl text-foil tabular-nums mt-1">
                    {String(stats.uniqueOwnedCards).padStart(4, '0')}
                  </Text>
                  <Text className="font-sans text-xs text-muted mt-0.5">
                    Distintas en bóveda
                  </Text>
                </View>
              </View>

              {/* Desglose por variante física */}
              <View className="mt-3 pt-2.5 border-t border-stitch gap-2">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-1.5">
                    <Sparkles size={13} color={TOKENS.accentPrimary} />
                    <Text className="font-sans-medium text-xs text-ink">
                      Desglose por Acabado (Variante)
                    </Text>
                  </View>
                  <Layers size={13} color={TOKENS.textMuted} />
                </View>

                {variantBreakdown.map((item) => (
                  <View
                    key={item.code}
                    className="bg-pocket border border-stitch rounded-pocket px-3 py-2 gap-1.5"
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2">
                        <View className="bg-page border border-stitch rounded-pocket px-1.5 py-0.5">
                          <Text className="font-mono text-[10px] text-foil">
                            {item.code}
                          </Text>
                        </View>
                        <Text className="font-sans text-xs text-ink">
                          {item.label}
                        </Text>
                      </View>

                      <View className="flex-row items-center gap-3">
                        <Text className="font-mono text-xs text-muted tabular-nums">
                          {item.share}
                        </Text>
                        <Text className="font-mono-semi text-xs text-ink tabular-nums">
                          {String(item.count).padStart(4, '0')}
                        </Text>
                      </View>
                    </View>

                    <View className="h-1.5 w-full bg-binder rounded-pocket overflow-hidden">
                      <View
                        style={{ width: `${item.pct}%` }}
                        className="h-full bg-foil"
                      />
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {stats.totalPhysicalCopies === 0 ? (
              <EmptyState
                icon={BarChart3}
                badge="SIN REGISTROS"
                title="Aún no hay cartas contabilizadas"
                description="Escanea una carta en 1 toque o agrégala desde Explorar Sets para ver tu distribución por rareza, variante y progreso de colecciones."
                actionLabel="Escanear Primera Carta"
                onAction={() => router.push('/(tabs)/scanner')}
                secondaryActionLabel="Explorar Catálogo"
                onSecondaryAction={() => router.push('/(tabs)/explore')}
              />
            ) : (
              <>
                {/* Panel 2: Progreso General de Colecciones / Sets */}
                <View className="bg-page border border-stitch rounded-card p-3 gap-2.5">
                  <View className="flex-row items-center justify-between pb-2 border-b border-stitch">
                    <View className="flex-row items-center gap-1.5">
                      <BookOpen size={14} color={TOKENS.accentPrimary} />
                      <Text className="font-display-semi text-sm text-ink">
                        Progreso de Expansiones
                      </Text>
                    </View>
                    <Text className="font-mono text-[11px] text-muted tabular-nums">
                      {setProgressList.length} SETS CON REGISTRO
                    </Text>
                  </View>

                  {setProgressList.map((setInfo) => {
                    const pct =
                      setInfo.officialTotal > 0
                        ? Math.min(
                            100,
                            (setInfo.uniqueOwned / setInfo.officialTotal) * 100
                          )
                        : 0;
                    return (
                      <View
                        key={setInfo.setId}
                        className="bg-pocket border border-stitch rounded-pocket p-2.5 gap-1.5"
                      >
                        <View className="flex-row items-center justify-between">
                          <View className="flex-1 pr-2">
                            <Text
                              className="font-display text-sm text-ink"
                              numberOfLines={1}
                            >
                              {setInfo.setName}
                            </Text>
                            <Text className="font-mono text-[10px] text-muted uppercase tabular-nums">
                              SET {setInfo.setId.toUpperCase()} •{' '}
                              {setInfo.physicalCopies} COPIAS FÍSICAS
                            </Text>
                          </View>

                          <View className="items-end">
                            <Text className="font-mono-semi text-xs text-foil tabular-nums">
                              {setInfo.officialTotal > 0
                                ? `${setInfo.uniqueOwned}/${setInfo.officialTotal} (${pct.toFixed(1)}%)`
                                : `${setInfo.uniqueOwned} ÚNICAS`}
                            </Text>
                          </View>
                        </View>

                        {setInfo.officialTotal > 0 ? (
                          <View className="h-1.5 w-full bg-binder rounded-pocket overflow-hidden">
                            <View
                              style={{ width: `${pct}%` }}
                              className="h-full bg-foil"
                            />
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>

                {/* Panel 3: Desglose por Rareza */}
                <View className="bg-page border border-stitch rounded-card p-3 gap-2">
                  <View className="flex-row items-center justify-between pb-2 border-b border-stitch">
                    <View className="flex-row items-center gap-1.5">
                      <Star size={14} color={TOKENS.accentPrimary} />
                      <Text className="font-display-semi text-sm text-ink">
                        Desglose por Rareza
                      </Text>
                    </View>
                    <Text className="font-mono text-[11px] text-muted tabular-nums">
                      {stats.byRarity.length} CATEGORÍAS
                    </Text>
                  </View>

                  {stats.byRarity.map((r) => (
                    <View
                      key={r.rarity}
                      className="flex-row items-center justify-between bg-pocket border border-stitch rounded-pocket px-3 py-2"
                    >
                      <Text className="font-sans-medium text-xs text-ink">
                        {r.rarity}
                      </Text>
                      <Text className="font-mono-semi text-xs text-foil tabular-nums">
                        {String(r.count).padStart(3, '0')} COPIAS
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Panel 4: Últimas Adiciones al Inventario */}
                <View className="bg-page border border-stitch rounded-card p-3 gap-2">
                  <View className="flex-row items-center justify-between pb-2 border-b border-stitch">
                    <Text className="font-display-semi text-sm text-ink">
                      Últimas Cartas Registradas
                    </Text>
                    <Text className="font-mono text-[10px] text-foil uppercase">
                      TOCA PARA EDITAR
                    </Text>
                  </View>

                  {ownedCards.slice(0, 8).map(({ card, counts }) => {
                    const img = getCardImageUrl(card.image ?? undefined, 'low');
                    return (
                      <Pressable
                        key={card.id}
                        onPress={() =>
                          setSelectedCard({
                            id: card.id,
                            localId: card.localId,
                            name: card.name,
                            image: card.image ?? undefined,
                          })
                        }
                        className="min-h-[44px] bg-pocket border border-stitch rounded-pocket px-2.5 py-2 flex-row items-center justify-between active:border-foil"
                      >
                        <View className="flex-row items-center gap-2.5 flex-1 pr-2">
                          <View className="w-8 h-11 bg-binder border border-stitch rounded-pocket overflow-hidden items-center justify-center">
                            {img ? (
                              <Image
                                source={{ uri: img }}
                                style={{ width: '100%', height: '100%' }}
                                resizeMode="contain"
                              />
                            ) : null}
                          </View>
                          <View className="flex-1">
                            <Text
                              className="font-display text-sm text-ink"
                              numberOfLines={1}
                            >
                              {card.name}
                            </Text>
                            <Text className="font-mono text-[10px] text-muted tabular-nums">
                              #{card.localId} • {card.setName}
                            </Text>
                          </View>
                        </View>

                        <View className="bg-page border border-foil/60 rounded-pocket px-2 py-1">
                          <Text className="font-mono-semi text-xs text-foil tabular-nums">
                            ×{counts.total}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>

      <CardDetailModal
        cardId={selectedCard?.id ?? null}
        fallbackCard={selectedCard}
        onClose={() => setSelectedCard(null)}
      />
    </SafeAreaView>
  );
}
