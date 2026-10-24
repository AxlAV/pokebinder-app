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

  // Filtrado local de cartas dentro de una expansión abierta
  const filteredSetCards = useMemo(() => {
    const cards = setDetailQuery.data?.cards ?? [];
    const term = setCardFilter.trim().toLowerCase();
    if (!term) return cards;
    return cards.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.localId.toLowerCase().includes(term)
    );
  }, [setDetailQuery.data?.cards, setCardFilter]);

  const handleSelectQuickPokemon = (pokemonName: string) => {
    setMode('cards');
    setQuery(pokemonName);
    setDebouncedQuery(pokemonName);
  };

  // Vista 1: Detalle de una expansión seleccionada (grilla 3x3 de sus cartas)
  if (selectedSet) {
    const detail = setDetailQuery.data;
    const setLogoUrl = getSetLogoUrl(detail?.logo ?? selectedSet.logo);
    const ownedInSetMap = setOwnedMapQuery.data ?? globalOwnedMap;
    const ownedUniqueCount = Object.keys(ownedInSetMap).length;

    return (
      <SafeAreaView className="flex-1 bg-binder" edges={['top']}>
        {/* Cabecera de expansión */}
        <View className="px-3 pt-2.5 pb-3 border-b border-stitch bg-page">
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={() => {
                setSelectedSet(null);
                setSetCardFilter('');
              }}
              className="min-h-[44px] flex-row items-center gap-2 pr-3 active:opacity-80"
            >
              <View className="w-8 h-8 rounded-pocket bg-pocket border border-stitch items-center justify-center">
                <ArrowLeft size={16} color={TOKENS.accentPrimary} />
              </View>
              <Text className="font-mono text-xs uppercase text-foil">
                Expansiones
              </Text>
            </Pressable>

            <Pressable
              onPress={toggleLanguage}
              className="min-h-[44px] bg-pocket border border-foil/50 rounded-pocket px-3 flex-row items-center gap-1.5 active:opacity-80"
            >
              <Globe size={14} color={TOKENS.accentPrimary} />
              <Text className="font-mono-semi text-xs uppercase text-foil">
                {language}
              </Text>
            </Pressable>
          </View>

          <View className="flex-row items-center gap-3 mt-2">
            {setLogoUrl ? (
              <View className="w-20 h-12 bg-pocket border border-stitch rounded-pocket p-1.5 items-center justify-center">
                <Image
                  source={{ uri: setLogoUrl }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="contain"
                />
              </View>
            ) : null}

            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <Text className="font-mono text-[11px] uppercase text-foil">
                  SET {selectedSet.id.toUpperCase()}
                </Text>
                {detail?.releaseDate ? (
                  <View className="flex-row items-center gap-1">
                    <Calendar size={11} color={TOKENS.textMuted} />
                    <Text className="font-mono text-[11px] text-muted tabular-nums">
                      {detail.releaseDate}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text
                className="font-display text-xl text-ink mt-0.5"
                numberOfLines={1}
              >
                {detail?.name ?? selectedSet.name}
              </Text>
              <Text className="font-mono text-xs text-muted tabular-nums mt-0.5">
                EN INVENTARIO: {ownedUniqueCount}/{selectedSet.cardCount.official}{' '}
                • TOTAL SET: {selectedSet.cardCount.total}
              </Text>
            </View>
          </View>

          {/* Filtro rápido dentro de la expansión */}
          <View className="mt-3 min-h-[44px] flex-row items-center bg-pocket border border-stitch rounded-pocket px-3">
            <Search size={15} color={TOKENS.textMuted} />
            <TextInput
              value={setCardFilter}
              onChangeText={setSetCardFilter}
              placeholder="Filtrar carta o número en esta expansión..."
              placeholderTextColor={TOKENS.textMuted}
              className="flex-1 font-sans text-sm text-ink ml-2 py-2"
            />
            {setCardFilter.length > 0 ? (
              <Pressable
                onPress={() => setSetCardFilter('')}
                className="min-h-[44px] min-w-[44px] items-center justify-center -mr-2"
              >
                <X size={16} color={TOKENS.textMuted} />
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Contenido de la expansión */}
        <View className="flex-1 px-2 pt-2">
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
              renderItem={({ item }) => (
                <CardPocketItem
                  card={item}
                  officialTotal={selectedSet.cardCount.official}
                  variantCounts={
                    ownedInSetMap[item.id] ?? globalOwnedMap[item.id]
                  }
                  onPress={(card) => setActiveCard(card)}
                />
              )}
              ListEmptyComponent={
                <View className="p-1 mt-2">
                  <EmptyState
                    icon={Compass}
                    badge={selectedSet.id.toUpperCase()}
                    title="Sin cartas coincidentes en este set"
                    description="Prueba con otro nombre o limpia el filtro numérico de la expansión."
                    actionLabel="Mostrar todas las cartas"
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
    <SafeAreaView className="flex-1 bg-binder" edges={['top']}>
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
      <View className="px-3 pt-3 pb-2 gap-2.5">
        <View className="bg-page border border-stitch rounded-card p-2.5 gap-2.5">
          {/* Conmutador Expansiones vs Buscar Cartas */}
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => setMode('sets')}
              className={`flex-1 min-h-[44px] rounded-pocket border flex-row items-center justify-center gap-2 ${
                mode === 'sets'
                  ? 'bg-pocket border-foil'
                  : 'bg-binder border-stitch'
              }`}
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
              >
                Expansiones
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setMode('cards')}
              className={`flex-1 min-h-[44px] rounded-pocket border flex-row items-center justify-center gap-2 ${
                mode === 'cards'
                  ? 'bg-pocket border-foil'
                  : 'bg-binder border-stitch'
              }`}
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
              >
                Buscar Cartas
              </Text>
            </Pressable>
          </View>

          {/* Input de búsqueda + Botón de idioma ES/EN */}
          <View className="flex-row items-center gap-2">
            <View className="flex-1 min-h-[44px] flex-row items-center bg-pocket border border-stitch rounded-pocket px-3">
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
                returnKeyType="search"
              />
              {query.length > 0 ? (
                <Pressable
                  onPress={() => {
                    setQuery('');
                    setDebouncedQuery('');
                  }}
                  className="min-h-[44px] min-w-[44px] items-center justify-center -mr-2"
                >
                  <X size={16} color={TOKENS.textMuted} />
                </Pressable>
              ) : null}
            </View>

            <Pressable
              onPress={toggleLanguage}
              className="min-h-[44px] bg-pocket border border-foil/50 rounded-pocket px-3.5 flex-row items-center justify-center gap-1.5 active:opacity-80"
            >
              <Globe size={14} color={TOKENS.accentPrimary} />
              <Text className="font-mono-semi text-xs uppercase text-foil">
                {language}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Cuerpo dinámico según el modo activo */}
      {mode === 'sets' ? (
        <View className="flex-1 px-3">
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
              renderItem={({ item }) => (
                <SetListItem
                  setItem={item}
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
        <View className="flex-1 px-2">
          {debouncedQuery.length < 2 ? (
            <View className="px-1 gap-3">
              <EmptyState
                icon={Sparkles}
                badge={`TCGDEX ${language.toUpperCase()}`}
                title="Busca cualquier Pokémon o número de carta"
                description="Escribe al menos 2 caracteres (ej. Pikachu, Charizard, 199/165) o toca una búsqueda rápida para ver la grilla 3×3 en tiempo real."
                actionLabel="Buscar Charizard"
                onAction={() => handleSelectQuickPokemon('Charizard')}
                secondaryActionLabel="Ver Expansiones"
                onSecondaryAction={() => setMode('sets')}
              />

              {/* Accesos rápidos de prueba para coleccionista */}
              <View className="bg-page border border-stitch rounded-card p-3">
                <Text className="font-mono text-[11px] uppercase text-muted mb-2">
                  BÚSQUEDAS FRECUENTES // 1 TOQUE
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {QUICK_POKEMON_CHIPS.map((poke) => (
                    <Pressable
                      key={poke}
                      onPress={() => handleSelectQuickPokemon(poke)}
                      className="min-h-[44px] bg-pocket border border-stitch rounded-pocket px-3.5 items-center justify-center active:border-foil"
                    >
                      <Text className="font-sans-semi text-xs text-ink">
                        {poke}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          ) : cardSearchQuery.isLoading ? (
            <View className="px-1">
              <BinderGridSkeleton
                pageLabel={`BUSCANDO "${debouncedQuery.toUpperCase()}" // 3×3`}
              />
            </View>
          ) : cardSearchQuery.isError ? (
            <View className="px-1">
              <ErrorCard
                title="Error al buscar cartas en TCGdex"
                description="La consulta tardó demasiado o no hubo respuesta del servidor."
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
              ListHeaderComponent={
                <View className="px-1 pb-2 flex-row items-center justify-between">
                  <Text className="font-mono text-xs text-muted uppercase">
                    RESULTADOS PARA &quot;{debouncedQuery}&quot;
                  </Text>
                  <Text className="font-mono-semi text-xs text-foil tabular-nums">
                    {(cardSearchQuery.data ?? []).length} CARTAS
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <CardPocketItem
                  card={item}
                  variantCounts={globalOwnedMap[item.id]}
                  onPress={(card) => setActiveCard(card)}
                />
              )}
              ListEmptyComponent={
                <View className="px-1 mt-1">
                  <EmptyState
                    icon={Search}
                    badge={language.toUpperCase()}
                    title={`Sin resultados para "${debouncedQuery}"`}
                    description="Verifica el nombre del Pokémon o prueba cambiando el idioma del catálogo entre Español (ES) e Inglés (EN)."
                    actionLabel={
                      language === 'es'
                        ? 'Probar en Inglés (EN)'
                        : 'Probar en Español (ES)'
                    }
                    onAction={toggleLanguage}
                    secondaryActionLabel="Limpiar búsqueda"
                    onSecondaryAction={() => {
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

      <CardDetailModal
        cardId={activeCard?.id ?? null}
        fallbackCard={activeCard}
        onClose={() => setActiveCard(null)}
      />
    </SafeAreaView>
  );
}
