import React, { useState } from 'react';
import { View, Text, Image, Pressable } from 'react-native';
import Animated, { SlideInUp } from 'react-native-reanimated';
import {
  Plus,
  CheckCircle2,
  Sparkles,
  BookOpen,
  ChevronRight,
} from 'lucide-react-native';
import { getCardImageUrl, type TcgdexCardBrief } from '@/services/tcgdex';
import type { CardVariant, BinderRow } from '@/db/schema';
import type { CardVariantCounts } from '@/db/repository';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { TOKENS } from '@/theme/tokens';

interface FloatingScannedCardProps {
  card: TcgdexCardBrief;
  selectedVariant: CardVariant;
  onSelectVariant: (variant: CardVariant) => void;
  variantCounts?: CardVariantCounts;
  targetBinder: BinderRow | null;
  onCycleTargetBinder: () => void;
  onQuickAdd: () => void;
  onOpenFullDetail: () => void;
  justAddedCount: number;
}

const VARIANT_PILLS: ReadonlyArray<{
  id: CardVariant;
  code: 'NRM' | 'REV' | 'HLO';
  label: string;
}> = [
  { id: 'normal', code: 'NRM', label: 'Normal' },
  { id: 'reverse', code: 'REV', label: 'Reverse' },
  { id: 'holo', code: 'HLO', label: 'Holo' },
];

/**
 * Tarjeta flotante de agregado rápido en 1 toque cuando el OCR + TCGdex identifican una carta.
 */
export function FloatingScannedCard({
  card,
  selectedVariant,
  onSelectVariant,
  variantCounts,
  targetBinder,
  onCycleTargetBinder,
  onQuickAdd,
  onOpenFullDetail,
  justAddedCount,
}: FloatingScannedCardProps) {
  const [imgError, setImgError] = useState(false);
  const imageUrl = getCardImageUrl(card.image, 'low');
  const inferredSet = card.id.split('-')[0]?.toUpperCase() ?? 'SET';
  const totalOwned = variantCounts?.total ?? 0;

  return (
    <Animated.View
      entering={SlideInUp.duration(280).springify()}
      className="bg-page border-2 border-foil rounded-card p-3 gap-2.5"
      style={{
        backgroundColor: TOKENS.bgPage,
        borderColor: TOKENS.accentPrimary,
        borderWidth: 2,
        borderRadius: 12,
        padding: 12,
        gap: 10,
      }}
    >
      {/* Cabecera de identificación instantánea */}
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
          <Sparkles size={14} color={TOKENS.accentPrimary} />
          <Text
            className="font-mono text-xs uppercase tracking-wider text-foil"
            style={{ fontFamily: 'JetBrainsMono_600SemiBold', fontSize: 11, color: TOKENS.accentPrimary }}
          >
            CARTA DETECTADA // 1 TOQUE
          </Text>
        </View>

        <Pressable
          onPress={onOpenFullDetail}
          className="flex-row items-center gap-0.5"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
        >
          <Text
            className="font-mono text-[11px] text-muted underline uppercase"
            style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 11, color: TOKENS.textMuted, textDecorationLine: 'underline' }}
          >
            Ficha completa
          </Text>
          <ChevronRight size={13} color={TOKENS.textMuted} />
        </Pressable>
      </View>

      {/* Cuerpo principal: Miniatura de carta + datos */}
      <View
        className="flex-row gap-3 items-center"
        style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}
      >
        <View
          style={{
            aspectRatio: 5 / 7,
            width: 68,
            backgroundColor: TOKENS.bgPocket,
            borderColor: TOKENS.borderSubtle,
            borderWidth: 1,
            borderRadius: 6,
            overflow: 'hidden',
          }}
          className="bg-pocket border border-stitch rounded-pocket overflow-hidden items-center justify-center"
        >
          {imageUrl && !imgError ? (
            <Image
              source={{ uri: imageUrl }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
              onError={() => setImgError(true)}
            />
          ) : (
            <Text
              className="font-mono text-xs text-muted"
              style={{ color: TOKENS.textMuted, fontSize: 11 }}
            >
              #{card.localId}
            </Text>
          )}
        </View>

        <View className="flex-1" style={{ flex: 1 }}>
          <View
            className="flex-row items-center gap-2"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
          >
            <View
              className="bg-pocket border border-stitch rounded-pocket px-1.5 py-0.5"
              style={{
                backgroundColor: TOKENS.bgPocket,
                borderColor: TOKENS.borderSubtle,
                borderWidth: 1,
                borderRadius: 4,
                paddingHorizontal: 6,
                paddingVertical: 2,
              }}
            >
              <Text
                className="font-mono text-[10px] text-foil uppercase"
                style={{ fontFamily: 'JetBrainsMono_600SemiBold', fontSize: 10, color: TOKENS.accentPrimary }}
              >
                {inferredSet} • #{card.localId}
              </Text>
            </View>

            <Text
              className="font-mono text-[11px] text-muted tabular-nums"
              style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 11, color: TOKENS.textMuted }}
            >
              En bóveda: {totalOwned}
            </Text>
          </View>

          <Text
            className="font-display text-base text-ink mt-1"
            style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 15, color: TOKENS.textPrimary, marginTop: 4 }}
            numberOfLines={1}
          >
            {card.name}
          </Text>

          {/* Selector de variante física (Normal, Reverse, Holo) */}
          <View
            className="flex-row gap-1.5 mt-2"
            style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}
          >
            {VARIANT_PILLS.map((pill) => {
              const active = selectedVariant === pill.id;
              const currentVariantCount = variantCounts
                ? variantCounts[pill.id]
                : 0;
              return (
                <AnimatedPressable
                  key={pill.id}
                  onPress={() => onSelectVariant(pill.id)}
                  className={`flex-1 py-1 px-1.5 rounded-pocket border items-center justify-center ${
                    active
                      ? 'bg-foil border-foil'
                      : 'bg-pocket border-stitch'
                  }`}
                  style={{
                    flex: 1,
                    paddingVertical: 4,
                    paddingHorizontal: 6,
                    borderRadius: 6,
                    borderWidth: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: active ? TOKENS.accentPrimary : TOKENS.bgPocket,
                    borderColor: active ? TOKENS.accentPrimary : TOKENS.borderSubtle,
                  }}
                >
                  <Text
                    className={`font-mono-semi text-[10px] uppercase ${
                      active ? 'text-binder' : 'text-muted'
                    }`}
                    style={{
                      fontFamily: 'JetBrainsMono_600SemiBold',
                      fontSize: 10,
                      fontWeight: '700',
                      color: active ? TOKENS.bgBinder : TOKENS.textMuted,
                    }}
                  >
                    {pill.code} ({currentVariantCount})
                  </Text>
                </AnimatedPressable>
              );
            })}
          </View>
        </View>
      </View>

      {/* Asignación a carpeta manual opcional */}
      <View
        className="pt-2 border-t border-stitch flex-row items-center justify-between"
        style={{
          paddingTop: 8,
          borderTopColor: TOKENS.borderSubtle,
          borderTopWidth: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View
          className="flex-row items-center gap-1.5 flex-1 pr-2"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, paddingRight: 8 }}
        >
          <BookOpen size={13} color={TOKENS.accentPrimary} />
          <Text
            className="font-sans text-xs text-muted"
            style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: 11, color: TOKENS.textMuted }}
            numberOfLines={1}
          >
            Carpeta:{' '}
            <Text
              className="font-sans-semi text-ink"
              style={{ color: TOKENS.textPrimary, fontWeight: '600' }}
            >
              {targetBinder ? targetBinder.name : 'Solo Inventario'}
            </Text>
          </Text>
        </View>

        <AnimatedPressable
          onPress={onCycleTargetBinder}
          className="min-h-[44px] bg-pocket border border-stitch rounded-pocket px-2.5 items-center justify-center active:border-foil"
          style={{
            minHeight: 44,
            backgroundColor: TOKENS.bgPocket,
            borderColor: TOKENS.borderSubtle,
            borderWidth: 1,
            borderRadius: 6,
            paddingHorizontal: 10,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            className="font-mono text-[10px] text-foil uppercase"
            style={{ fontFamily: 'JetBrainsMono_600SemiBold', fontSize: 10, color: TOKENS.accentPrimary }}
          >
            Cambiar
          </Text>
        </AnimatedPressable>
      </View>

      {/* Botón de acción principal: Agregar en 1 toque */}
      <AnimatedPressable
        onPress={onQuickAdd}
        className="min-h-[48px] bg-foil rounded-pocket py-3 px-4 flex-row items-center justify-center gap-2 active:opacity-90"
        style={{
          minHeight: 48,
          backgroundColor: TOKENS.accentPrimary,
          borderRadius: 6,
          paddingVertical: 12,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        {justAddedCount > 0 ? (
          <>
            <CheckCircle2 size={18} color={TOKENS.bgBinder} />
            <Text
              className="font-sans-semi text-xs uppercase tracking-wider text-binder"
              style={{
                fontFamily: 'PlusJakartaSans_600SemiBold',
                fontSize: 12,
                fontWeight: '700',
                color: TOKENS.bgBinder,
                letterSpacing: 0.5,
              }}
            >
              +1 Agregada (Total en sesión: {justAddedCount})
            </Text>
          </>
        ) : (
          <>
            <Plus size={18} color={TOKENS.bgBinder} />
            <Text
              className="font-sans-semi text-xs uppercase tracking-wider text-binder"
              style={{
                fontFamily: 'PlusJakartaSans_600SemiBold',
                fontSize: 12,
                fontWeight: '700',
                color: TOKENS.bgBinder,
                letterSpacing: 0.5,
              }}
            >
              Agregar a la Bóveda (1 Toque)
            </Text>
          </>
        )}
      </AnimatedPressable>
    </Animated.View>
  );
}
