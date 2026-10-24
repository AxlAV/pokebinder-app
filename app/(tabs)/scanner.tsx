import React, { useState } from 'react';
import { ScrollView, View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ScanLine, Focus, Sparkles } from 'lucide-react-native';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorCard } from '@/components/ui/ErrorCard';
import { TOKENS } from '@/theme/tokens';

const VARIANT_OPTIONS = [
  { id: 'normal', label: 'Normal', code: 'NRM' },
  { id: 'reverse', label: 'Reverse Holo', code: 'REV' },
  { id: 'holo', label: 'Holo Foil', code: 'HLO' },
] as const;

export default function ScannerScreen() {
  const router = useRouter();
  const [selectedVariant, setSelectedVariant] =
    useState<(typeof VARIANT_OPTIONS)[number]['id']>('normal');
  const [cameraError, setCameraError] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-binder" edges={['top']}>
      <ScreenHeader
        sectionCode="OCR ÓPTICO // ML KIT"
        title="Escáner de Cartas"
        subtitle="Lectura simultánea de nombre superior y numeración XXX/YYY"
        counterText="MODO ESPERA"
      />

      <ScrollView
        className="flex-1"
        contentContainerClassName="p-3 gap-3"
        showsVerticalScrollIndicator={false}
      >
        {/* Marco guía de escaneo en proporción real 5:7 */}
        <View className="bg-page border border-stitch rounded-card p-3 items-center">
          <View className="w-full flex-row items-center justify-between mb-2.5">
            <View className="flex-row items-center gap-1.5">
              <Focus size={14} color={TOKENS.accentPrimary} />
              <Text className="font-mono text-xs text-ink">RETÍCULA 2.5&quot; × 3.5&quot;</Text>
            </View>
            <Text className="font-mono text-[11px] text-foil">ES / EN AUTO</Text>
          </View>

          <View
            style={{ aspectRatio: 5 / 7, width: '74%' }}
            className="bg-pocket border-2 border-foil/70 rounded-pocket p-3 justify-between"
          >
            {/* Zona OCR superior: Nombre del Pokémon / Carta */}
            <View className="bg-page/90 border border-stitch rounded-pocket p-2">
              <Text className="font-mono text-[10px] text-foil uppercase">
                ZONA OCR 01 // NOMBRE SUPERIOR
              </Text>
              <Text className="font-display text-sm text-ink mt-0.5">
                Ej. Charizard ex
              </Text>
            </View>

            {/* Centro del visor */}
            <View className="items-center justify-center py-4">
              <View className="w-12 h-12 rounded-card bg-page border border-stitch items-center justify-center mb-2">
                <ScanLine size={22} color={TOKENS.accentPrimary} />
              </View>
              <Text className="font-sans text-xs text-muted text-center px-3">
                Alinea los bordes de la carta física dentro del bolsillo guía
              </Text>
            </View>

            {/* Zona OCR inferior: Numeración XXX/YYY */}
            <View className="flex-row items-center justify-between bg-page/90 border border-stitch rounded-pocket p-2">
              <View>
                <Text className="font-mono text-[10px] text-muted uppercase">
                  ZONA OCR 02 // FRACCIÓN
                </Text>
                <Text className="font-mono-semi text-xs text-ink">199/165</Text>
              </View>
              <View className="bg-pocket border border-foil/40 rounded-pocket px-2 py-0.5">
                <Text className="font-mono text-[10px] text-foil">MEW • EN/ES</Text>
              </View>
            </View>
          </View>

          {/* Selector anticipado de variante para agregado en 1 toque */}
          <View className="w-full mt-3 pt-2.5 border-t border-stitch">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center gap-1.5">
                <Sparkles size={13} color={TOKENS.accentPrimary} />
                <Text className="font-sans-medium text-xs text-ink">
                  Variante predeterminada al escanear
                </Text>
              </View>
              <Text className="font-mono text-[11px] text-muted">1 TOQUE</Text>
            </View>

            <View className="flex-row gap-2">
              {VARIANT_OPTIONS.map((variant) => {
                const isSelected = selectedVariant === variant.id;
                return (
                  <Pressable
                    key={variant.id}
                    onPress={() => setSelectedVariant(variant.id)}
                    className={`flex-1 min-h-[44px] py-2 px-2.5 rounded-pocket border items-center justify-center ${
                      isSelected
                        ? 'bg-pocket border-foil'
                        : 'bg-binder border-stitch'
                    }`}
                  >
                    <Text
                      className={`font-mono text-[10px] ${
                        isSelected ? 'text-foil' : 'text-muted'
                      }`}
                    >
                      {variant.code}
                    </Text>
                    <Text
                      className={`font-sans-semi text-xs mt-0.5 ${
                        isSelected ? 'text-ink' : 'text-muted'
                      }`}
                    >
                      {variant.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {cameraError ? (
          <ErrorCard
            title="Permiso de cámara pendiente"
            description="Activa el acceso a la cámara del dispositivo para iniciar el flujo de reconocimiento con Vision Camera."
            retryLabel="Restablecer visor"
            onRetry={() => setCameraError(false)}
          />
        ) : (
          <EmptyState
            icon={ScanLine}
            badge="PASO 9 PLAN"
            title="Visor listo para cámara nativa"
            description="Mientras tanto puedes buscar cartas manualmente por nombre o expansión en el catálogo oficial de TCGdex."
            actionLabel="Buscar en Explorar Sets"
            onAction={() => router.push('/(tabs)/explore')}
            secondaryActionLabel="Simular aviso de cámara"
            onSecondaryAction={() => setCameraError(true)}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
