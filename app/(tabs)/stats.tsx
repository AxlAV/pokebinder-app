import React, { useMemo, useState } from 'react';
import { ScrollView, View, Text, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
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
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
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
      } else {
        map.set(sId, {
          setId: sId,
          setName: entry.card.setName,
          uniqueOwned: 1,
          physicalCopies: entry.counts.total,
          officialTotal:
            entry.card.setOfficialCount || entry.card.setTotalCount || 0,
        });
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => b.physicalCopies - a.physicalCopies
    );
  }, [allBinders, ownedCards]);

  const recentCards = useMemo(() => {
    return [...ownedCards]
      .sort((a, b) => b.card.updatedAt - a.card.updatedAt)
      .slice(0, 10);
  }, [ownedCards]);

  const isLoading = statsQuery.isLoading || ownedCardsQuery.isLoading;
  const isError = statsQuery.isError || ownedCardsQuery.isError;

  return (
    <SafeAreaView
      className="flex-1 bg-binder"
      edges={['top']}
      style={{ flex: 1, backgroundColor: TOKENS.bgBinder }}
    >
      <ScreenHeader
        sectionCode="REGISTRO DE INVENTARIO // OFFLINE"
        title="Estadísticas"
        subtitle="Conteo físico por variante, rareza y progreso de expansiones"
        counterText={`${String(stats.totalPhysicalCopies).padStart(4, '0')} CARTAS`}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 12, gap: 12, paddingBottom: 32 }}
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
            <Animated.View
              entering={FadeInDown.duration(260).springify()}
              className="bg-page border border-stitch rounded-card p-3"
              style={{
                backgroundColor: TOKENS.bgPage,
                borderColor: TOKENS.borderSubtle,
                borderWidth: 1,
                borderRadius: 12,
                padding: 12,
              }}
            >
              <View
                className="flex-row items-center justify-between pb-2.5 mb-2.5 border-b border-stitch"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: 10,
                  marginBottom: 10,
                  borderBottomColor: TOKENS.borderSubtle,
                  borderBottomWidth: 1,
                }}
              >
                <View
                  className="flex-row items-center gap-2"
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                >
                  <Award size={16} color={TOKENS.accentPrimary} />
                  <Text
                    className="font-display-semi text-sm text-ink"
                    style={{
                      fontFamily: 'SpaceGrotesk_600SemiBold',
                      fontSize: 14,
                      color: TOKENS.textPrimary,
                    }}
                  >
                    Balance de Colección
                  </Text>
                </View>
                <Text
                  className="font-mono text-xs text-foil tabular-nums"
                  style={{
                    fontFamily: 'JetBrainsMono_600SemiBold',
                    fontSize: 12,
                    color: TOKENS.accentPrimary,
                  }}
                >
                  {stats.totalBinders} ÁLBUMES
                </Text>
              </View>

              <View className="flex-row gap-2" style={{ flexDirection: 'row', gap: 8 }}>
                <View
                  className="flex-1 bg-pocket border border-stitch rounded-pocket p-3"
                  style={{
                    flex: 1,
                    backgroundColor: TOKENS.bgPocket,
                    borderColor: TOKENS.borderSubtle,
                    borderWidth: 1,
                    borderRadius: 6,
                    padding: 12,
                  }}
                >
                  <Text
                    className="font-mono text-[10px] text-muted uppercase"
                    style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 10, color: TOKENS.textMuted }}
                  >
                    TOTAL FÍSICO
                  </Text>
                  <Text
                    className="font-mono-semi text-2xl text-ink tabular-nums mt-1"
                    style={{
                      fontFamily: 'JetBrainsMono_600SemiBold',
                      fontSize: 24,
                      color: TOKENS.textPrimary,
                      marginTop: 4,
                    }}
                  >
                    {String(stats.totalPhysicalCopies).padStart(4, '0')}
                  </Text>
                  <Text
                    className="font-sans text-xs text-muted mt-0.5"
                    style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: 11, color: TOKENS.textMuted, marginTop: 2 }}
                  >
                    Copias registradas
                  </Text>
                </View>

                <View
                  className="flex-1 bg-pocket border border-stitch rounded-pocket p-3"
                  style={{
                    flex: 1,
                    backgroundColor: TOKENS.bgPocket,
                    borderColor: TOKENS.borderSubtle,
                    borderWidth: 1,
                    borderRadius: 6,
                    padding: 12,
                  }}
                >
                  <Text
                    className="font-mono text-[10px] text-muted uppercase"
                    style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 10, color: TOKENS.textMuted }}
                  >
                    CARTAS ÚNICAS
                  </Text>
                  <Text
                    className="font-mono-semi text-2xl text-foil tabular-nums mt-1"
                    style={{
                      fontFamily: 'JetBrainsMono_600SemiBold',
                      fontSize: 24,
                      color: TOKENS.accentPrimary,
                      marginTop: 4,
                    }}
                  >
                    {String(stats.uniqueOwnedCards).padStart(4, '0')}
                  </Text>
                  <Text
                    className="font-sans text-xs text-muted mt-0.5"
                    style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: 11, color: TOKENS.textMuted, marginTop: 2 }}
                  >
                    Distintas en bóveda
                  </Text>
                </View>
              </View>

              {/* Desglose por variante física */}
              <View
                className="mt-3 pt-2.5 border-t border-stitch gap-2"
                style={{ marginTop: 12, paddingTop: 10, borderTopColor: TOKENS.borderSubtle, borderTopWidth: 1, gap: 8 }}
              >
                <View
                  className="flex-row items-center justify-between"
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <View
                    className="flex-row items-center gap-1.5"
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                  >
                    <Sparkles size={13} color={TOKENS.accentPrimary} />
                    <Text
                      className="font-sans-medium text-xs text-ink"
                      style={{ fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, color: TOKENS.textPrimary }}
                    >
                      Desglose por Acabado (Variante)
                    </Text>
                  </View>
                  <Layers size={13} color={TOKENS.textMuted} />
                </View>

                {variantBreakdown.map((item) => (
                  <View
                    key={item.code}
                    className="bg-pocket border border-stitch rounded-pocket px-3 py-2 gap-1.5"
                    style={{
                      backgroundColor: TOKENS.bgPocket,
                      borderColor: TOKENS.borderSubtle,
                      borderWidth: 1,
                      borderRadius: 6,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      gap: 6,
                    }}
                  >
                    <View
                      className="flex-row items-center justify-between"
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                    >
                      <View
                        className="flex-row items-center gap-2"
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                      >
                        <View
                          className="bg-page border border-stitch rounded-pocket px-1.5 py-0.5"
                          style={{
                            backgroundColor: TOKENS.bgPage,
                            borderColor: TOKENS.borderSubtle,
                            borderWidth: 1,
                            borderRadius: 4,
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                          }}
                        >
                          <Text
                            className="font-mono text-[10px] text-foil"
                            style={{ fontFamily: 'JetBrainsMono_600SemiBold', fontSize: 10, color: TOKENS.accentPrimary }}
                          >
                            {item.code}
                          </Text>
                        </View>
                        <Text
                          className="font-sans text-xs text-ink"
                          style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: 12, color: TOKENS.textPrimary }}
                        >
                          {item.label}
                        </Text>
                      </View>

                      <View
                        className="flex-row items-center gap-3"
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
                      >
                        <Text
                          className="font-mono text-xs text-muted tabular-nums"
                          style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 11, color: TOKENS.textMuted }}
                        >
                          {item.share}
                        </Text>
                        <Text
                          className="font-mono-semi text-xs text-ink tabular-nums"
                          style={{ fontFamily: 'JetBrainsMono_600SemiBold', fontSize: 12, color: TOKENS.textPrimary }}
                        >
                          {String(item.count).padStart(4, '0')}
                        </Text>
                      </View>
                    </View>

                    <View
                      className="h-1.5 w-full bg-binder rounded-pocket overflow-hidden"
                      style={{
                        height: 6,
                        width: '100%',
                        backgroundColor: TOKENS.bgBinder,
                        borderRadius: 4,
                        overflow: 'hidden',
                      }}
                    >
                      <View
                        style={{ width: `${item.pct}%`, height: '100%', backgroundColor: TOKENS.accentPrimary }}
                        className="h-full bg-foil"
                      />
                    </View>
                  </View>
                ))}
              </View>
            </Animated.View>

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
                <Animated.View
                  entering={FadeInDown.duration(280).delay(80).springify()}
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
                    className="flex-row items-center justify-between pb-2 border-b border-stitch"
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingBottom: 8,
                      borderBottomColor: TOKENS.borderSubtle,
                      borderBottomWidth: 1,
                    }}
                  >
                    <View
                      className="flex-row items-center gap-1.5"
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                    >
                      <BookOpen size={14} color={TOKENS.accentPrimary} />
                      <Text
                        className="font-display-semi text-sm text-ink"
                        style={{ fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 14, color: TOKENS.textPrimary }}
                      >
                        Progreso de Expansiones
                      </Text>
                    </View>
                    <Text
                      className="font-mono text-[11px] text-muted tabular-nums"
                      style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 11, color: TOKENS.textMuted }}
                    >
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
                        style={{
                          backgroundColor: TOKENS.bgPocket,
                          borderColor: TOKENS.borderSubtle,
                          borderWidth: 1,
                          borderRadius: 6,
                          padding: 10,
                          gap: 6,
                        }}
                      >
                        <View
                          className="flex-row items-center justify-between"
                          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                        >
                          <View className="flex-1 pr-2" style={{ flex: 1, paddingRight: 8 }}>
                            <Text
                              className="font-display text-sm text-ink"
                              style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 13, color: TOKENS.textPrimary }}
                              numberOfLines={1}
                            >
                              {setInfo.setName}
                            </Text>
                            <Text
                              className="font-mono text-[10px] text-muted uppercase tabular-nums"
                              style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 10, color: TOKENS.textMuted, marginTop: 2 }}
                            >
                              SET {setInfo.setId.toUpperCase()} •{' '}
                              {setInfo.physicalCopies} COPIAS FÍSICAS
                            </Text>
                          </View>

                          <View className="items-end" style={{ alignItems: 'flex-end' }}>
                            <Text
                              className="font-mono-semi text-xs text-foil tabular-nums"
                              style={{ fontFamily: 'JetBrainsMono_600SemiBold', fontSize: 11, color: TOKENS.accentPrimary }}
                            >
                              {setInfo.officialTotal > 0
                                ? `${setInfo.uniqueOwned}/${setInfo.officialTotal} (${pct.toFixed(1)}%)`
                                : `${setInfo.uniqueOwned} ÚNICAS`}
                            </Text>
                          </View>
                        </View>

                        {setInfo.officialTotal > 0 ? (
                          <View
                            className="h-1.5 w-full bg-binder rounded-pocket overflow-hidden"
                            style={{
                              height: 6,
                              width: '100%',
                              backgroundColor: TOKENS.bgBinder,
                              borderRadius: 4,
                              overflow: 'hidden',
                            }}
                          >
                            <View
                              style={{ width: `${pct}%`, height: '100%', backgroundColor: TOKENS.accentPrimary }}
                              className="h-full bg-foil"
                            />
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </Animated.View>

                {/* Panel 3: Desglose por Rareza */}
                <Animated.View
                  entering={FadeInDown.duration(280).delay(140).springify()}
                  className="bg-page border border-stitch rounded-card p-3 gap-2"
                  style={{
                    backgroundColor: TOKENS.bgPage,
                    borderColor: TOKENS.borderSubtle,
                    borderWidth: 1,
                    borderRadius: 12,
                    padding: 12,
                    gap: 8,
                  }}
                >
                  <View
                    className="flex-row items-center justify-between pb-2 border-b border-stitch"
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingBottom: 8,
                      borderBottomColor: TOKENS.borderSubtle,
                      borderBottomWidth: 1,
                    }}
                  >
                    <View
                      className="flex-row items-center gap-1.5"
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                    >
                      <Star size={14} color={TOKENS.accentPrimary} />
                      <Text
                        className="font-display-semi text-sm text-ink"
                        style={{ fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 14, color: TOKENS.textPrimary }}
                      >
                        Desglose por Rareza
                      </Text>
                    </View>
                    <Text
                      className="font-mono text-[11px] text-muted tabular-nums"
                      style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 11, color: TOKENS.textMuted }}
                    >
                      {stats.byRarity.length} CATEGORÍAS
                    </Text>
                  </View>

                  {stats.byRarity.map((r) => (
                    <View
                      key={r.rarity}
                      className="flex-row items-center justify-between bg-pocket border border-stitch rounded-pocket px-3 py-2"
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: TOKENS.bgPocket,
                        borderColor: TOKENS.borderSubtle,
                        borderWidth: 1,
                        borderRadius: 6,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                      }}
                    >
                      <Text
                        className="font-sans-medium text-xs text-ink"
                        style={{ fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, color: TOKENS.textPrimary }}
                      >
                        {r.rarity}
                      </Text>
                      <View
                        className="flex-row items-center gap-2"
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                      >
                        <Text
                          className="font-mono-semi text-xs text-foil tabular-nums"
                          style={{ fontFamily: 'JetBrainsMono_600SemiBold', fontSize: 12, color: TOKENS.accentPrimary }}
                        >
                          {r.count} {r.count === 1 ? 'carta' : 'cartas'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </Animated.View>

                {/* Panel 4: Registro de Últimas Adiciones */}
                {recentCards.length > 0 ? (
                  <Animated.View
                    entering={FadeInDown.duration(280).delay(200).springify()}
                    className="bg-page border border-stitch rounded-card p-3 gap-2"
                    style={{
                      backgroundColor: TOKENS.bgPage,
                      borderColor: TOKENS.borderSubtle,
                      borderWidth: 1,
                      borderRadius: 12,
                      padding: 12,
                      gap: 8,
                    }}
                  >
                    <View
                      className="flex-row items-center justify-between pb-2 border-b border-stitch"
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingBottom: 8,
                        borderBottomColor: TOKENS.borderSubtle,
                        borderBottomWidth: 1,
                      }}
                    >
                      <Text
                        className="font-display-semi text-sm text-ink"
                        style={{ fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 14, color: TOKENS.textPrimary }}
                      >
                        Últimas Adiciones a la Bóveda
                      </Text>
                      <Text
                        className="font-mono text-[10px] text-foil uppercase"
                        style={{ fontFamily: 'JetBrainsMono_600SemiBold', fontSize: 10, color: TOKENS.accentPrimary }}
                      >
                        EN MEMORIA
                      </Text>
                    </View>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
                    >
                      {recentCards.map((entry) => {
                        const img = getCardImageUrl(entry.card.image ?? undefined, 'low');
                        return (
                          <AnimatedPressable
                            key={entry.card.id}
                            onPress={() =>
                              setSelectedCard({
                                id: entry.card.id,
                                localId: entry.card.localId,
                                name: entry.card.name,
                                image: entry.card.image ?? undefined,
                              })
                            }
                            className="w-20 bg-pocket border border-stitch rounded-pocket p-1.5 items-center active:border-foil"
                            style={{
                              width: 80,
                              backgroundColor: TOKENS.bgPocket,
                              borderColor: TOKENS.borderSubtle,
                              borderWidth: 1,
                              borderRadius: 6,
                              padding: 6,
                              alignItems: 'center',
                            }}
                          >
                            <View
                              style={{
                                aspectRatio: 5 / 7,
                                width: '100%',
                                backgroundColor: TOKENS.bgBinder,
                                borderRadius: 4,
                                overflow: 'hidden',
                              }}
                            >
                              {img ? (
                                <Image
                                  source={{ uri: img }}
                                  style={{ width: '100%', height: '100%' }}
                                  resizeMode="contain"
                                />
                              ) : null}
                            </View>
                            <Text
                              className="font-mono text-[9px] text-foil tabular-nums mt-1"
                              style={{ fontFamily: 'JetBrainsMono_600SemiBold', fontSize: 9, color: TOKENS.accentPrimary, marginTop: 4 }}
                              numberOfLines={1}
                            >
                              #{entry.card.localId}
                            </Text>
                            <Text
                              className="font-sans-medium text-[10px] text-ink text-center"
                              style={{ fontFamily: 'PlusJakartaSans_500Medium', fontSize: 10, color: TOKENS.textPrimary, textAlign: 'center' }}
                              numberOfLines={1}
                            >
                              {entry.card.name}
                            </Text>
                          </AnimatedPressable>
                        );
                      })}
                    </ScrollView>
                  </Animated.View>
                ) : null}
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Modal para ver y editar copias de la carta seleccionada */}
      <CardDetailModal
        cardId={selectedCard?.id ?? null}
        fallbackCard={selectedCard}
        onClose={() => setSelectedCard(null)}
      />
    </SafeAreaView>
  );
}
