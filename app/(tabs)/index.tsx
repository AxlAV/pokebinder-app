import React, { useState } from 'react';
import { ScrollView, View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BookOpen, Layers, Plus } from 'lucide-react-native';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { BinderGridSkeleton } from '@/components/ui/BinderGridSkeleton';
import { ErrorCard } from '@/components/ui/ErrorCard';
import { TOKENS } from '@/theme/tokens';

type ViewState = 'empty' | 'loading' | 'error';

const PREVIEW_POCKETS = [
  '001/165',
  '002/165',
  '003/165',
  '004/165',
  '005/165',
  '006/165',
  '007/165',
  '008/165',
  '009/165',
] as const;

export default function BindersScreen() {
  const router = useRouter();
  const [viewState, setViewState] = useState<ViewState>('empty');

  return (
    <SafeAreaView className="flex-1 bg-binder" edges={['top']}>
      <ScreenHeader
        sectionCode="BÓVEDA LOCAL // SQLITE"
        title="Mis Álbumes"
        subtitle="Carpetas por expansión oficial, Pokémon o reglas dinámicas"
        counterText="00 ÁLBUMES"
      />

      <ScrollView
        className="flex-1"
        contentContainerClassName="p-3 gap-3"
        showsVerticalScrollIndicator={false}
      >
        {/* Barra superior de filtro / estado de vista */}
        <View className="flex-row items-center justify-between bg-page border border-stitch rounded-card px-3 py-2">
          <View className="flex-row items-center gap-2">
            <Layers size={15} color={TOKENS.accentPrimary} />
            <Text className="font-mono text-xs text-muted">FORMATO HOJA 3×3</Text>
          </View>

          <View className="flex-row items-center gap-1.5">
            {(['empty', 'loading', 'error'] as const).map((mode) => {
              const active = viewState === mode;
              const label =
                mode === 'empty' ? 'Vacío' : mode === 'loading' ? 'Carga' : 'Error';
              return (
                <Pressable
                  key={mode}
                  onPress={() => setViewState(mode)}
                  className={`min-h-[44px] px-3 rounded-pocket border items-center justify-center ${
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
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {viewState === 'loading' ? (
          <BinderGridSkeleton pageLabel="HOJA 01 // CARGANDO BOLSILLOS 3×3" />
        ) : null}

        {viewState === 'error' ? (
          <ErrorCard
            title="No se pudo abrir el índice de álbumes"
            description="El archivo local de base de datos no respondió a la lectura inicial. Tus cartas guardadas no se han modificado."
            retryLabel="Reintentar apertura"
            onRetry={() => setViewState('empty')}
          />
        ) : null}

        {viewState === 'empty' ? (
          <>
            <EmptyState
              icon={BookOpen}
              badge="SIN LÍMITES"
              title="Tu estantería de carpetas está vacía"
              description="Crea un álbum completo vinculado a un set oficial de TCGdex o arma una carpeta personalizada con hojas de 9 bolsillos."
              actionLabel="Explorar Sets Oficiales"
              onAction={() => router.push('/(tabs)/explore')}
              secondaryActionLabel="Ir al Escáner"
              onSecondaryAction={() => router.push('/(tabs)/scanner')}
            />

            {/* Previsualización táctil de hoja Ultra PRO 3x3 vacía */}
            <View className="bg-page border border-stitch rounded-card p-3">
              <View className="flex-row items-center justify-between mb-2.5 pb-2 border-b border-stitch">
                <View>
                  <Text className="font-display-semi text-sm text-ink">
                    Vista previa de hoja de 9 bolsillos
                  </Text>
                  <Text className="font-sans text-xs text-muted">
                    Proporción estándar 2.5&quot; × 3.5&quot; con costura lateral
                  </Text>
                </View>
                <Text className="font-mono text-xs text-foil">000/165</Text>
              </View>

              <View className="flex-row flex-wrap -mx-1">
                {PREVIEW_POCKETS.map((code) => (
                  <View key={code} className="w-1/3 p-1">
                    <Pressable
                      onPress={() => router.push('/(tabs)/explore')}
                      style={{ aspectRatio: 5 / 7 }}
                      className="bg-pocket border border-stitch rounded-pocket p-2 justify-between active:border-foil"
                    >
                      <View className="flex-row items-center justify-between">
                        <Text className="font-mono text-[10px] text-muted">VACÍO</Text>
                        <Plus size={12} color={TOKENS.textMuted} />
                      </View>

                      <View className="items-center justify-center my-auto py-2 border border-dashed border-stitch rounded-pocket">
                        <Text className="font-mono text-[10px] text-muted/70">5:7</Text>
                      </View>

                      <Text className="font-mono text-[10px] text-muted text-right">
                        {code}
                      </Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
