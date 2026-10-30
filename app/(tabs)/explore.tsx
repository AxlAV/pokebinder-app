import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Compass,
  Search,
  Globe,
  ArrowLeft,
  X,
  Layers,
  Sparkles,
  Calendar,
} from 'lucide-react-native';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { BinderGridSkeleton } from '@/components/ui/BinderGridSkeleton';
import { ErrorCard } from '@/components/ui/ErrorCard';
import { CardPocketItem } from '@/components/cards/CardPocketItem';
import { CardDetailModal } from '@/components/cards/CardDetailModal';
import { SetListItem } from '@/components/sets/SetListItem';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import {
  useSetsQuery,
  useSetDetailQuery,
  useCardSearchQuery,
} from '@/hooks/useTcgdex';
import {
  useSetOwnedMapQuery,
  useOwnedCardsQuery,
} from '@/hooks/useDatabase';
import {
  getSetLogoUrl,
  type TcgdexCardBrief,
  type TcgdexSetBrief,
} from '@/services/tcgdex';
import type { CardVariantCounts } from '@/db/repository';
import { TOKENS } from '@/theme/tokens';

type ExploreTabMode = 'sets' | 'cards';

const QUICK_POKEMON_CHIPS = [
  'Charizard',
  'Pikachu',
  'Mew',
  'Gengar',
  'Umbreon',
  'Rayquaza',
] as const;

export default function ExploreScreen() {
  const { language, toggleLanguage } = usePreferencesStore();
  const [mode, setMode] = useState<ExploreTabMode>('sets');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedSet, setSelectedSet] = useState<TcgdexSetBrief | null>(null);
  const [setCardFilter, setSetCardFilter] = useState('');
  const [activeCard, setActiveCard] = useState<TcgdexCardBrief | null>(null);

  // Debounce para búsqueda de cartas en la API
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  const setsQuery = useSetsQuery(language);
  const setDetailQuery = useSetDetailQuery(language, selectedSet?.id ?? null);
  const cardSearchQuery = useCardSearchQuery(
    language,
    mode === 'cards' ? debouncedQuery : ''
  );

  // Estado de inventario en SQLite para pintar insignias de copias en tiempo real
  const setOwnedMapQuery = useSetOwnedMapQuery(selectedSet?.id ?? null);
  const ownedCardsQuery = useOwnedCardsQuery();

  const globalOwnedMap = useMemo(() => {
    const map: Record<string, CardVariantCounts> = {};
    for (const item of ownedCardsQuery.data ?? []) {
      map[item.card.id] = item.counts;
    }
    return map;
  }, [ownedCardsQuery.data]);

  // Filtrado local de expansiones cuando está en modo "sets"
  const filteredSets = useMemo(() => {
    const list = setsQuery.data ?? [];
    const term = query.trim().toLowerCase();
    if (!term) return list;
    return list.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.id.toLowerCase().includes(term)
    );
  }, [setsQuery.data, query]);

  // Filtrado local de cartas dentro de la vista detalle de una expansión
  const filteredSetCards = useMemo(() => {
    const cards = setDetailQuery.data?.cards ?? [];
    const term = setCardFilter.trim().toLowerCase();
    if (!term) return cards;
    return cards.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.localId.toLowerCase().includes(term) ||
        c.id.toLowerCase().includes(term)
    );
  }, [setDetailQuery.data?.cards, setCardFilter]);

  // Vista 1: Detalle de una expansión seleccionada con grilla 3x3 de cartas
  if (selectedSet) {
    const detail = setDetailQuery.data;
    const setLogoUrl = getSetLogoUrl(detail?.logo ?? selectedSet.logo);
    const ownedMap = setOwnedMapQuery.data ?? {};
    const ownedUniqueCount = Object.keys(ownedMap).length;

    return (
      <SafeAreaView
        className="flex-1 bg-binder"
        edges={['top']}
        style={{ flex: 1, backgroundColor: TOKENS.bgBinder }}
      >
        {/* Cabecera contextual del set seleccionado */}
        <View
          className="px-3 pt-2 pb-3 bg-page border-b border-stitch"
          style={{
            paddingHorizontal: 12,
            paddingTop: 8,
            paddingBottom: 12,
            backgroundColor: TOKENS.bgPage,
            borderBottomColor: TOKENS.borderSubtle,
            borderBottomWidth: 1,
          }}
        >
          <View
            className="flex-row items-center justify-between"
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <AnimatedPressable
              onPress={() => {
                setSelectedSet(null);
                setSetCardFilter('');
              }}
              className="min-h-[44px] px-2.5 py-1.5 rounded-pocket bg-pocket border border-stitch flex-row items-center gap-1.5 active:border-foil"
              style={{
                minHeight: 44,
                paddingHorizontal: 10,
                borderRadius: 6,
                backgroundColor: TOKENS.bgPocket,
                borderColor: TOKENS.borderSubtle,
                borderWidth: 1,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <ArrowLeft size={16} color={TOKENS.accentPrimary} />
              <Text
                className="font-sans-semi text-xs uppercase text-foil"
                style={{
                  fontFamily: 'PlusJakartaSans_600SemiBold',
                  fontSize: 12,
                  color: TOKENS.accentPrimary,
                  fontWeight: '600',
                  textTransform: 'uppercase',
                }}
              >
                Volver a Sets
              </Text>
            </AnimatedPressable>

            <AnimatedPressable
              onPress={toggleLanguage}
              className="min-h-[44px] bg-pocket border border-foil/50 rounded-pocket px-3 flex-row items-center gap-1.5 active:opacity-80"
              style={{
                minHeight: 44,
                backgroundColor: TOKENS.bgPocket,
                borderColor: 'rgba(229, 169, 60, 0.5)',
                borderWidth: 1,
                borderRadius: 6,
                paddingHorizontal: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Globe size={14} color={TOKENS.accentPrimary} />
              <Text
                className="font-mono-semi text-xs uppercase text-foil"
                style={{
                  fontFamily: 'JetBrainsMono_600SemiBold',
                  fontSize: 12,
                  color: TOKENS.accentPrimary,
                  fontWeight: '700',
                  textTransform: 'uppercase',
                }}
              >
                {language}
              </Text>
            </AnimatedPressable>
          </View>

          <View
            className="flex-row items-center gap-3 mt-2"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 }}
          >
            {setLogoUrl ? (
              <View
                className="w-20 h-12 bg-pocket border border-stitch rounded-pocket p-1.5 items-center justify-center"
                style={{
                  width: 80,
                  height: 48,
                  backgroundColor: TOKENS.bgPocket,
                  borderColor: TOKENS.borderSubtle,
                  borderWidth: 1,
                  borderRadius: 6,
                  padding: 6,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Image
                  source={{ uri: setLogoUrl }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="contain"
                />
              </View>
            ) : null}

            <View className="flex-1" style={{ flex: 1 }}>
              <View
                className="flex-row items-center gap-2"
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <Text
                  className="font-mono text-[11px] uppercase text-foil"
                  style={{ fontFamily: 'JetBrainsMono_600SemiBold', fontSize: 11, color: TOKENS.accentPrimary }}
                >
                  SET {selectedSet.id.toUpperCase()}
                </Text>
                {detail?.releaseDate ? (
                  <View
                    className="flex-row items-center gap-1"
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  >
                    <Calendar size={11} color={TOKENS.textMuted} />
                    <Text
                      className="font-mono text-[11px] text-muted tabular-nums"
                      style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 11, color: TOKENS.textMuted }}
                    >
                      {detail.releaseDate}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text
                className="font-display text-xl text-ink mt-0.5"
                style={{
                  fontFamily: 'SpaceGrotesk_700Bold',
                  fontSize: 18,
                  color: TOKENS.textPrimary,
                  marginTop: 2,
                }}
                numberOfLines={1}
              >
                {detail?.name ?? selectedSet.name}
              </Text>
              <Text
                className="font-mono text-xs text-muted tabular-nums mt-0.5"
                style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 11, color: TOKENS.textMuted, marginTop: 2 }}
              >
                EN INVENTARIO: {ownedUniqueCount}/{selectedSet.cardCount.official}{' '}
                • TOTAL SET: {selectedSet.cardCount.total}
              </Text>
            </View>
          </View>

          {/* Filtro rápido dentro de la expansión */}
          <View
            className="mt-3 min-h-[44px] flex-row items-center bg-pocket border border-stitch rounded-pocket px-3"
            style={{
              marginTop: 12,
              minHeight: 44,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: TOKENS.bgPocket,
              borderColor: TOKENS.borderSubtle,
              borderWidth: 1,
              borderRadius: 6,
              paddingHorizontal: 12,
            }}
          >
            <Search size={15} color={TOKENS.textMuted} />
            <TextInput
              value={setCardFilter}
              onChangeText={setSetCardFilter}
              placeholder="Filtrar carta o número en esta expansión..."
              placeholderTextColor={TOKENS.textMuted}
              className="flex-1 font-sans text-sm text-ink ml-2 py-2"
              style={{
                flex: 1,
                fontFamily: 'PlusJakartaSans_400Regular',
                fontSize: 13,
                color: TOKENS.textPrimary,
                marginLeft: 8,
              }}
            />
            {setCardFilter.length > 0 ? (
              <Pressable
                onPress={() => setSetCardFilter('')}
                className="min-h-[44px] min-w-[44px] items-center justify-center -mr-2"
                style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} color={TOKENS.textMuted} />
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Contenido de la expansión */}
        <View className="flex-1 px-2 pt-2" style={{ flex: 1, paddingHorizontal: 8, paddingTop: 8 }}>
          {setDetailQuery.isLoading ? (
            <View className="p-1">
              <BinderGridSkeleton
                pageLabel={`CARGANDO ${selectedSet.id.toUpperCase()} // BOLSILLOS 3×3`}
              />
            </View>
          ) : setDetailQuery.isError ? (
            <View className="p-1">
              <ErrorCard
                title="No se pudo cargar la expansión"
                description="Falló la descarga de las cartas de este set desde TCGdex API."
                retryLabel="Reintentar descarga"
                onRetry={() => setDetailQuery.refetch()}
              />
            </View>
          ) : (
            <FlatList
              data={filteredSetCards}
              keyExtractor={(item) => item.id}
              numColumns={3}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24 }}
              initialNumToRender={12}
              maxToRenderPerBatch={12}
              windowSize={7}
              renderItem={({ item, index }) => (
                <CardPocketItem
                  card={item}
                  index={index}
                  officialTotal={selectedSet.cardCount.official}
                  variantCounts={ownedMap[item.id]}
                  dimIfMissing={false}
                  onPress={(card) => setActiveCard(card)}
                />
              )}
              ListEmptyComponent={
                <View className="p-2">
                  <EmptyState
                    icon={Search}
                    badge="FILTRO"
                    title="No hay cartas que coincidan"
                    description={`No se encontraron cartas en ${selectedSet.name} con "${setCardFilter.trim()}".`}
                    actionLabel="Limpiar filtro"
                    onAction={() => setSetCardFilter('')}
                  />
                </View>
              }
            />
          )}
        </View>

        <CardDetailModal
          cardId={activeCard?.id ?? null}
          fallbackCard={activeCard}
          fallbackSet={{
            id: selectedSet.id,
            name: detail?.name ?? selectedSet.name,
            logo: detail?.logo ?? selectedSet.logo,
            officialCount: selectedSet.cardCount.official,
            totalCount: selectedSet.cardCount.total,
          }}
          onClose={() => setActiveCard(null)}
        />
      </SafeAreaView>
    );
  }

  // Vista 2: Explorador principal (Pestañas: Expansiones | Buscar Cartas)
  const totalSetsCount = setsQuery.data?.length ?? 0;

  return (
    <SafeAreaView
      className="flex-1 bg-binder"
      edges={['top']}
      style={{ flex: 1, backgroundColor: TOKENS.bgBinder }}
    >
      <ScreenHeader
        sectionCode="CATÁLOGO OFICIAL // TCGDEX API"
        title="Explorar Sets"
        subtitle="Expansiones oficiales y buscador global de cartas Pokémon TCG"
        counterText={
          mode === 'sets'
            ? `${String(totalSetsCount).padStart(3, '0')} SETS (${language.toUpperCase()})`
            : `IDIOMA: ${language.toUpperCase()}`
        }
      />

      {/* Panel de control: Selector de modo + Buscador + Idioma ES/EN */}
      <View
        className="px-3 pt-3 pb-2 gap-2.5"
        style={{ paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8, gap: 10 }}
      >
        <View
          className="bg-page border border-stitch rounded-card p-2.5 gap-2.5"
          style={{
            backgroundColor: TOKENS.bgPage,
            borderColor: TOKENS.borderSubtle,
            borderWidth: 1,
            borderRadius: 12,
            padding: 10,
            gap: 10,
          }}
        >
          {/* Conmutador Expansiones vs Buscar Cartas */}
          <View className="flex-row gap-2" style={{ flexDirection: 'row', gap: 8 }}>
            <AnimatedPressable
              onPress={() => setMode('sets')}
              className={`flex-1 min-h-[44px] rounded-pocket border flex-row items-center justify-center gap-2 ${
                mode === 'sets'
                  ? 'bg-pocket border-foil'
                  : 'bg-binder border-stitch'
              }`}
              style={{
                flex: 1,
                minHeight: 44,
                borderRadius: 6,
                borderWidth: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                backgroundColor: mode === 'sets' ? TOKENS.bgPocket : TOKENS.bgBinder,
                borderColor: mode === 'sets' ? TOKENS.accentPrimary : TOKENS.borderSubtle,
              }}
            >
              <Layers
                size={15}
                color={
                  mode === 'sets' ? TOKENS.accentPrimary : TOKENS.textMuted
                }
              />
              <Text
                className={`font-sans-semi text-xs uppercase tracking-wider ${
                  mode === 'sets' ? 'text-foil' : 'text-muted'
                }`}
                style={{
                  fontFamily: 'PlusJakartaSans_600SemiBold',
                  fontSize: 12,
                  fontWeight: '700',
                  letterSpacing: 0.6,
                  color: mode === 'sets' ? TOKENS.accentPrimary : TOKENS.textMuted,
                  textTransform: 'uppercase',
                }}
              >
                Expansiones
              </Text>
            </AnimatedPressable>

            <AnimatedPressable
              onPress={() => setMode('cards')}
              className={`flex-1 min-h-[44px] rounded-pocket border flex-row items-center justify-center gap-2 ${
                mode === 'cards'
                  ? 'bg-pocket border-foil'
                  : 'bg-binder border-stitch'
              }`}
              style={{
                flex: 1,
                minHeight: 44,
                borderRadius: 6,
                borderWidth: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                backgroundColor: mode === 'cards' ? TOKENS.bgPocket : TOKENS.bgBinder,
                borderColor: mode === 'cards' ? TOKENS.accentPrimary : TOKENS.borderSubtle,
              }}
            >
              <Sparkles
                size={15}
                color={
                  mode === 'cards' ? TOKENS.accentPrimary : TOKENS.textMuted
                }
              />
              <Text
                className={`font-sans-semi text-xs uppercase tracking-wider ${
                  mode === 'cards' ? 'text-foil' : 'text-muted'
                }`}
                style={{
                  fontFamily: 'PlusJakartaSans_600SemiBold',
                  fontSize: 12,
                  fontWeight: '700',
                  letterSpacing: 0.6,
                  color: mode === 'cards' ? TOKENS.accentPrimary : TOKENS.textMuted,
                  textTransform: 'uppercase',
                }}
              >
                Buscar Cartas
              </Text>
            </AnimatedPressable>
          </View>

          {/* Input de búsqueda + Botón de idioma ES/EN */}
          <View
            className="flex-row items-center gap-2"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
          >
            <View
              className="flex-1 min-h-[44px] flex-row items-center bg-pocket border border-stitch rounded-pocket px-3"
              style={{
                flex: 1,
                minHeight: 44,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: TOKENS.bgPocket,
                borderColor: TOKENS.borderSubtle,
                borderWidth: 1,
                borderRadius: 6,
                paddingHorizontal: 12,
              }}
            >
              <Search size={16} color={TOKENS.textMuted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={
                  mode === 'sets'
                    ? 'Filtrar expansión (ej. 151, Paldea, sv03.5)...'
                    : 'Pokémon o fracción (ej. Charizard, 025/165)...'
                }
                placeholderTextColor={TOKENS.textMuted}
                className="flex-1 font-sans text-sm text-ink ml-2 py-2"
                style={{
                  flex: 1,
                  fontFamily: 'PlusJakartaSans_400Regular',
                  fontSize: 13,
                  color: TOKENS.textPrimary,
                  marginLeft: 8,
                }}
                returnKeyType="search"
              />
              {query.length > 0 ? (
                <Pressable
                  onPress={() => {
                    setQuery('');
                    setDebouncedQuery('');
                  }}
                  className="min-h-[44px] min-w-[44px] items-center justify-center -mr-2"
                  style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={16} color={TOKENS.textMuted} />
                </Pressable>
              ) : null}
            </View>

            <AnimatedPressable
              onPress={toggleLanguage}
              className="min-h-[44px] bg-pocket border border-foil/50 rounded-pocket px-3.5 flex-row items-center justify-center gap-1.5 active:opacity-80"
              style={{
                minHeight: 44,
                backgroundColor: TOKENS.bgPocket,
                borderColor: 'rgba(229, 169, 60, 0.5)',
                borderWidth: 1,
                borderRadius: 6,
                paddingHorizontal: 14,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Globe size={14} color={TOKENS.accentPrimary} />
              <Text
                className="font-mono-semi text-xs uppercase text-foil"
                style={{
                  fontFamily: 'JetBrainsMono_600SemiBold',
                  fontSize: 12,
                  color: TOKENS.accentPrimary,
                  fontWeight: '700',
                  textTransform: 'uppercase',
                }}
              >
                {language}
              </Text>
            </AnimatedPressable>
          </View>
        </View>
      </View>

      {/* Cuerpo dinámico según el modo activo */}
      {mode === 'sets' ? (
        <View className="flex-1 px-3" style={{ flex: 1, paddingHorizontal: 12 }}>
          {setsQuery.isLoading ? (
            <BinderGridSkeleton pageLabel="TCGDEX // CARGANDO EXPANSIONES OFICIALES" />
          ) : setsQuery.isError ? (
            <ErrorCard
              title="Sin conexión con TCGdex API"
              description="No fue posible descargar el catálogo de expansiones oficiales. Verifica tu conexión a internet e inténtalo de nuevo."
              retryLabel="Reintentar conexión"
              onRetry={() => setsQuery.refetch()}
            />
          ) : (
            <FlatList
              data={filteredSets}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 24 }}
              initialNumToRender={12}
              maxToRenderPerBatch={15}
              windowSize={7}
              renderItem={({ item, index }) => (
                <SetListItem
                  setItem={item}
                  index={index}
                  onSelect={(setItem) => setSelectedSet(setItem)}
                />
              )}
              ListEmptyComponent={
                <EmptyState
                  icon={Compass}
                  badge="BÚSQUEDA"
                  title={`No hay sets llamados "${query.trim()}"`}
                  description="¿Buscabas un Pokémon específico en lugar de una expansión? Cambia al buscador global de cartas con el mismo término."
                  actionLabel={`Buscar cartas de "${query.trim()}"`}
                  onAction={() => setMode('cards')}
                  secondaryActionLabel="Limpiar filtro"
                  onSecondaryAction={() => setQuery('')}
                />
              }
            />
          )}
        </View>
      ) : (
        <View className="flex-1 px-2" style={{ flex: 1, paddingHorizontal: 8 }}>
          {debouncedQuery.length < 2 ? (
            <View className="px-1 gap-3" style={{ paddingHorizontal: 4, gap: 12 }}>
              <EmptyState
                icon={Sparkles}
                badge={`TCGDEX ${language.toUpperCase()}`}
                title="Busca cualquier Pokémon o número de carta"
                description="Escribe al menos 2 caracteres (ej. Pikachu, Charizard, 199/165) o toca una búsqueda rápida para ver la grilla 3×3 en tiempo real."
                actionLabel="Buscar Charizard"
                onAction={() => {
                  setQuery('Charizard');
                  setDebouncedQuery('Charizard');
                }}
              />

              {/* Atajos de búsqueda rápida */}
              <View
                className="bg-page border border-stitch rounded-card p-3"
                style={{
                  backgroundColor: TOKENS.bgPage,
                  borderColor: TOKENS.borderSubtle,
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                <Text
                  className="font-mono text-[10px] text-muted uppercase tracking-wider mb-2"
                  style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 10, color: TOKENS.textMuted, marginBottom: 8 }}
                >
                  EJEMPLOS RÁPIDOS // 1 TOQUE
                </Text>
                <View
                  className="flex-row flex-wrap gap-1.5"
                  style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}
                >
                  {QUICK_POKEMON_CHIPS.map((chip) => (
                    <AnimatedPressable
                      key={chip}
                      onPress={() => {
                        setQuery(chip);
                        setDebouncedQuery(chip);
                      }}
                      className="min-h-[44px] bg-pocket border border-stitch rounded-pocket px-3 flex-row items-center justify-center active:border-foil"
                      style={{
                        minHeight: 44,
                        backgroundColor: TOKENS.bgPocket,
                        borderColor: TOKENS.borderSubtle,
                        borderWidth: 1,
                        borderRadius: 6,
                        paddingHorizontal: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        className="font-sans-medium text-xs text-ink"
                        style={{ fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, color: TOKENS.textPrimary }}
                      >
                        {chip}
                      </Text>
                    </AnimatedPressable>
                  ))}
                </View>
              </View>
            </View>
          ) : cardSearchQuery.isLoading ? (
            <View className="p-1">
              <BinderGridSkeleton
                pageLabel={`BUSCANDO "${debouncedQuery.toUpperCase()}" // TCGDEX`}
              />
            </View>
          ) : cardSearchQuery.isError ? (
            <View className="p-1">
              <ErrorCard
                title="Fallo al buscar en TCGdex"
                description="Hubo un problema al consultar la API remota. Comprueba tu conexión a internet."
                retryLabel="Reintentar búsqueda"
                onRetry={() => cardSearchQuery.refetch()}
              />
            </View>
          ) : (
            <FlatList
              data={cardSearchQuery.data ?? []}
              keyExtractor={(item) => item.id}
              numColumns={3}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24 }}
              initialNumToRender={12}
              maxToRenderPerBatch={12}
              windowSize={7}
              renderItem={({ item, index }) => (
                <CardPocketItem
                  card={item}
                  index={index}
                  variantCounts={globalOwnedMap[item.id]}
                  dimIfMissing={false}
                  onPress={(card) => setActiveCard(card)}
                />
              )}
              ListEmptyComponent={
                <View className="p-1">
                  <EmptyState
                    icon={Search}
                    badge="SIN RESULTADOS"
                    title={`Sin cartas para "${debouncedQuery}"`}
                    description="Verifica que el nombre o numeración esté bien escrito en el idioma seleccionado."
                    actionLabel="Limpiar búsqueda"
                    onAction={() => {
                      setQuery('');
                      setDebouncedQuery('');
                    }}
                  />
                </View>
              }
            />
          )}
        </View>
      )}

      {/* Modal de detalle de carta para modificar inventario físico */}
      <CardDetailModal
        cardId={activeCard?.id ?? null}
        fallbackCard={activeCard}
        onClose={() => setActiveCard(null)}
      />
    </SafeAreaView>
  );
}
