import React, { useState } from 'react';
import { ScrollView, View, Text, TextInput, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Compass, Search, Globe } from 'lucide-react-native';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { BinderGridSkeleton } from '@/components/ui/BinderGridSkeleton';
import { ErrorCard } from '@/components/ui/ErrorCard';
import { TOKENS } from '@/theme/tokens';

type CatalogLanguage = 'es' | 'en';
type PreviewState = 'empty' | 'loading' | 'error';

export default function ExploreScreen() {
  const [query, setQuery] = useState('');
  const [language, setLanguage] = useState<CatalogLanguage>('es');
  const [previewState, setPreviewState] = useState<PreviewState>('empty');

  return (
    <SafeAreaView className="flex-1 bg-binder" edges={['top']}>
      <ScreenHeader
        sectionCode="CATÁLOGO OFICIAL // TCGDEX API"
        title="Explorar Sets"
        subtitle="Búsqueda bilingüe por Pokémon, número de colección o expansión"
        counterText={language === 'es' ? 'IDIOMA: ES' : 'IDIOMA: EN'}
      />

      <ScrollView
        className="flex-1"
        contentContainerClassName="p-3 gap-3"
        showsVerticalScrollIndicator={false}
      >
        {/* Barra de búsqueda y selector ES/EN */}
        <View className="bg-page border border-stitch rounded-card p-3 gap-2.5">
          <View className="flex-row items-center gap-2">
            <View className="flex-1 min-h-[44px] flex-row items-center bg-pocket border border-stitch rounded-pocket px-3">
              <Search size={16} color={TOKENS.textMuted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Buscar Pokémon o número (ej. Pikachu, 025/165)..."
                placeholderTextColor={TOKENS.textMuted}
                className="flex-1 font-sans text-sm text-ink ml-2 py-2"
              />
            </View>

            <Pressable
              onPress={() => setLanguage((prev) => (prev === 'es' ? 'en' : 'es'))}
              className="min-h-[44px] bg-pocket border border-foil/50 rounded-pocket px-3.5 flex-row items-center justify-center gap-1.5 active:opacity-80"
            >
              <Globe size={14} color={TOKENS.accentPrimary} />
              <Text className="font-mono-semi text-xs uppercase text-foil">
                {language}
              </Text>
            </Pressable>
          </View>

          <View className="flex-row items-center justify-between pt-2 border-t border-stitch">
            <Text className="font-mono text-[11px] text-muted">
              FILTRO: TODAS LAS SERIES
            </Text>
            <View className="flex-row gap-1.5">
              {(['empty', 'loading', 'error'] as const).map((state) => {
                const active = previewState === state;
                return (
                  <Pressable
                    key={state}
                    onPress={() => setPreviewState(state)}
                    className={`min-h-[44px] px-3 rounded-pocket border items-center justify-center ${
                      active ? 'bg-pocket border-foil' : 'bg-binder border-stitch'
                    }`}
                  >
                    <Text
                      className={`font-mono text-[10px] uppercase ${
                        active ? 'text-foil' : 'text-muted'
                      }`}
                    >
                      {state === 'empty'
                        ? 'Inicial'
                        : state === 'loading'
                          ? 'Carga'
                          : 'Error'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {previewState === 'loading' ? (
          <BinderGridSkeleton pageLabel="TCGDEX // DESCARGANDO SET 3×3" />
        ) : null}

        {previewState === 'error' ? (
          <ErrorCard
            title="Sin respuesta de TCGdex API"
            description="No fue posible descargar el listado de expansiones. Verifica tu conexión o consulta las cartas ya guardadas en caché local."
            retryLabel="Reintentar conexión"
            onRetry={() => setPreviewState('empty')}
          />
        ) : null}

        {previewState === 'empty' ? (
          <EmptyState
            icon={Compass}
            badge="ES / EN"
            title={
              query.trim().length > 0
                ? `Preparado para buscar "${query.trim()}"`
                : 'Explora todas las expansiones de Pokémon TCG'
            }
            description="En el Paso 3 conectaremos este buscador con TCGdex API para listar series, logos oficiales y grillas completas de cartas."
            actionLabel="Probar esqueleto de carga 3×3"
            onAction={() => setPreviewState('loading')}
            secondaryActionLabel={
              language === 'es' ? 'Cambiar a Inglés (EN)' : 'Cambiar a Español (ES)'
            }
            onSecondaryAction={() =>
              setLanguage((prev) => (prev === 'es' ? 'en' : 'es'))
            }
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
