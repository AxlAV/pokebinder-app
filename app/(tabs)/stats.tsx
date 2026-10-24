import React, { useState } from 'react';
import { ScrollView, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BarChart3, Award, Layers, Sparkles } from 'lucide-react-native';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorCard } from '@/components/ui/ErrorCard';
import { TOKENS } from '@/theme/tokens';

const VARIANT_BREAKDOWN = [
  { code: 'NRM', label: 'Normal', count: '0000', share: '0%' },
  { code: 'REV', label: 'Reverse Holo', count: '0000', share: '0%' },
  { code: 'HLO', label: 'Holo Foil', count: '0000', share: '0%' },
] as const;

export default function StatsScreen() {
  const router = useRouter();
  const [hasError, setHasError] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-binder" edges={['top']}>
      <ScreenHeader
        sectionCode="REGISTRO DE INVENTARIO // OFFLINE"
        title="Estadísticas"
        subtitle="Conteo físico por variante, rareza y porcentaje de sets"
        counterText="0000 CARTAS"
      />

      <ScrollView
        className="flex-1"
        contentContainerClassName="p-3 gap-3"
        showsVerticalScrollIndicator={false}
      >
        {/* Panel de métricas principales asimétrico (registro técnico de carpeta) */}
        <View className="bg-page border border-stitch rounded-card p-3">
          <View className="flex-row items-center justify-between pb-2.5 mb-2.5 border-b border-stitch">
            <View className="flex-row items-center gap-2">
              <Award size={16} color={TOKENS.accentPrimary} />
              <Text className="font-display-semi text-sm text-ink">
                Balance de Colección
              </Text>
            </View>
            <Text className="font-mono text-xs text-foil">PROGRESO 0.0%</Text>
          </View>

          <View className="flex-row gap-2">
            <View className="flex-1 bg-pocket border border-stitch rounded-pocket p-3">
              <Text className="font-mono text-[10px] text-muted uppercase">
                TOTAL FÍSICO
              </Text>
              <Text className="font-mono-semi text-2xl text-ink tabular-nums mt-1">
                0000
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
                000/000
              </Text>
              <Text className="font-sans text-xs text-muted mt-0.5">
                En álbumes activos
              </Text>
            </View>
          </View>

          {/* Desglose por variante física */}
          <View className="mt-3 pt-2.5 border-t border-stitch gap-2">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-1.5">
                <Sparkles size={13} color={TOKENS.accentPrimary} />
                <Text className="font-sans-medium text-xs text-ink">
                  Desglose por Acabado
                </Text>
              </View>
              <Layers size={13} color={TOKENS.textMuted} />
            </View>

            {VARIANT_BREAKDOWN.map((item) => (
              <View
                key={item.code}
                className="flex-row items-center justify-between bg-pocket border border-stitch rounded-pocket px-3 py-2"
              >
                <View className="flex-row items-center gap-2">
                  <View className="bg-page border border-stitch rounded-pocket px-1.5 py-0.5">
                    <Text className="font-mono text-[10px] text-foil">{item.code}</Text>
                  </View>
                  <Text className="font-sans text-xs text-ink">{item.label}</Text>
                </View>

                <View className="flex-row items-center gap-3">
                  <Text className="font-mono text-xs text-muted">{item.share}</Text>
                  <Text className="font-mono-semi text-xs text-ink">{item.count}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {hasError ? (
          <ErrorCard
            title="Error al calcular métricas del inventario"
            description="No se pudo agregar el conteo de variantes desde SQLite local."
            retryLabel="Recalcular inventario"
            onRetry={() => setHasError(false)}
          />
        ) : (
          <EmptyState
            icon={BarChart3}
            badge="SIN REGISTROS"
            title="Aún no hay cartas contabilizadas"
            description="Cuando agregues cartas desde el escáner óptico o desde el explorador de sets, verás aquí tu distribución por rareza, variante y expansión."
            actionLabel="Escanear Primera Carta"
            onAction={() => router.push('/(tabs)/scanner')}
            secondaryActionLabel="Explorar Catálogo"
            onSecondaryAction={() => router.push('/(tabs)/explore')}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
