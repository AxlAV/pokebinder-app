import React, { useState } from 'react';
import { View, Text, Image, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ImageOff, Check } from 'lucide-react-native';
import { getCardImageUrl, type TcgdexCardBrief } from '@/services/tcgdex';
import type { CardVariantCounts } from '@/db/repository';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { HoloShimmer } from '@/components/ui/HoloShimmer';
import { TOKENS } from '@/theme/tokens';

interface CardPocketItemProps {
  card: TcgdexCardBrief;
  officialTotal?: number;
  variantCounts?: CardVariantCounts;
  dimIfMissing?: boolean;
  index?: number;
  onPress?: (card: TcgdexCardBrief) => void;
  onQuickToggleOwned?: (card: TcgdexCardBrief, currentlyOwned: boolean) => void;
}

/**
 * Bolsillo individual de carpeta (proporción 5:7, radio 6px) para grillas de 3 columnas.
 * Contrasta cartas obtenidas (a todo color y borde foil) contra faltantes (atenuadas en gris).
 * Integra microinteracción táctil Reanimated y destello holográfico para variantes Holo.
 */
export function CardPocketItem({
  card,
  officialTotal,
  variantCounts,
  dimIfMissing = false,
  index = 0,
  onPress,
  onQuickToggleOwned,
}: CardPocketItemProps) {
  const [imageError, setImageError] = useState(false);
  const imageUrl = getCardImageUrl(card.image, 'low');

  const totalOwned = variantCounts?.total ?? 0;
  const isOwned = totalOwned > 0;
  const isMissingInBinder = dimIfMissing && !isOwned;
  const isHoloFoil = (variantCounts?.holo ?? 0) > 0;

  const formattedNumber = officialTotal
    ? `${card.localId.padStart(3, '0')}/${String(officialTotal).padStart(3, '0')}`
    : `#${card.localId}`;

  return (
    <Animated.View
      entering={FadeInDown.duration(220).delay(Math.min(index * 25, 300)).springify()}
      className="w-1/3 p-1"
      style={{ width: '33.3333%', padding: 4 }}
    >
      <AnimatedPressable
        onPress={() => onPress?.(card)}
        disabled={!onPress}
        className={`bg-pocket border rounded-pocket p-1.5 ${
          isOwned ? 'border-foil/80' : 'border-stitch'
        }`}
        style={{
          backgroundColor: TOKENS.bgPocket,
          borderColor: isOwned ? TOKENS.accentPrimary : TOKENS.borderSubtle,
          borderWidth: 1,
          borderRadius: 6,
          padding: 6,
        }}
      >
        <View
          style={{ aspectRatio: 5 / 7, backgroundColor: TOKENS.bgBinder, borderRadius: 6 }}
          className="w-full rounded-pocket overflow-hidden bg-binder items-center justify-center relative"
        >
          {imageUrl && !imageError ? (
            <>
              {/* Capa base en escala de grises cuando falta en el álbum */}
              <Image
                source={{ uri: imageUrl }}
                style={[
                  { width: '100%', height: '100%' },
                  isMissingInBinder
                    ? { opacity: 0.28, tintColor: TOKENS.textMuted }
                    : null,
                ]}
                resizeMode="contain"
                onError={() => setImageError(true)}
              />
              {isMissingInBinder ? (
                <Image
                  source={{ uri: imageUrl }}
                  style={{
                    width: '100%',
                    height: '100%',
                    position: 'absolute',
                    opacity: 0.22,
                  }}
                  resizeMode="contain"
                />
              ) : null}
            </>
          ) : (
            <View
              className={`flex-1 w-full p-2 justify-between border border-dashed border-stitch rounded-pocket ${
                isMissingInBinder ? 'opacity-40' : 'opacity-100'
              }`}
              style={{
                flex: 1,
                width: '100%',
                padding: 8,
                justifyContent: 'space-between',
                borderColor: TOKENS.borderSubtle,
                borderWidth: 1,
                borderRadius: 6,
                opacity: isMissingInBinder ? 0.4 : 1,
              }}
            >
              <Text
                className="font-mono text-[10px] text-muted tabular-nums"
                style={{ color: TOKENS.textMuted, fontSize: 10 }}
                numberOfLines={1}
              >
                {formattedNumber}
              </Text>
              <View className="items-center justify-center my-auto">
                <ImageOff size={18} color={TOKENS.textMuted} />
                <Text
                  className="font-display text-xs text-ink text-center mt-1.5"
                  style={{ color: TOKENS.textPrimary, fontSize: 11, textAlign: 'center', marginTop: 4 }}
                  numberOfLines={2}
                >
                  {card.name}
                </Text>
              </View>
              <Text
                className="font-mono text-[9px] text-muted/70 uppercase text-right"
                style={{ color: TOKENS.textMuted, fontSize: 9, textAlign: 'right' }}
                numberOfLines={1}
              >
                {card.id}
              </Text>
            </View>
          )}

          {/* Destello holográfico sutil si la carta en inventario tiene variante Holo */}
          {isHoloFoil ? <HoloShimmer /> : null}

          {/* Insignia de copias en inventario físico */}
          {isOwned ? (
            <View
              className="absolute top-1 right-1 bg-binder/90 border border-foil rounded-pocket px-1.5 py-0.5"
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                backgroundColor: 'rgba(17, 16, 21, 0.92)',
                borderColor: TOKENS.accentPrimary,
                borderWidth: 1,
                borderRadius: 4,
                paddingHorizontal: 6,
                paddingVertical: 2,
              }}
            >
              <Text
                className="font-mono-semi text-[10px] text-foil tabular-nums"
                style={{ color: TOKENS.accentPrimary, fontSize: 10, fontWeight: '700' }}
              >
                ×{totalOwned}
              </Text>
            </View>
          ) : isMissingInBinder ? (
            <View
              className="absolute top-1 left-1 bg-binder/85 border border-stitch rounded-pocket px-1.5 py-0.5"
              style={{
                position: 'absolute',
                top: 4,
                left: 4,
                backgroundColor: 'rgba(17, 16, 21, 0.85)',
                borderColor: TOKENS.borderSubtle,
                borderWidth: 1,
                borderRadius: 4,
                paddingHorizontal: 5,
                paddingVertical: 1,
              }}
            >
              <Text
                className="font-mono text-[8px] text-muted uppercase"
                style={{ color: TOKENS.textMuted, fontSize: 8 }}
              >
                FALTA
              </Text>
            </View>
          ) : null}

          {/* Botón rápido de check en esquina inferior derecha */}
          {onQuickToggleOwned ? (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onQuickToggleOwned(card, isOwned);
              }}
              hitSlop={8}
              className={`absolute bottom-1 right-1 w-7 h-7 rounded-pocket border items-center justify-center ${
                isOwned
                  ? 'bg-foil border-foil'
                  : 'bg-binder/90 border-stitch'
              }`}
              style={{
                position: 'absolute',
                bottom: 4,
                right: 4,
                width: 26,
                height: 26,
                borderRadius: 5,
                borderWidth: 1,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isOwned ? TOKENS.accentPrimary : 'rgba(17, 16, 21, 0.9)',
                borderColor: isOwned ? TOKENS.accentPrimary : TOKENS.borderSubtle,
              }}
            >
              <Check
                size={13}
                color={isOwned ? TOKENS.bgBinder : TOKENS.textMuted}
              />
            </Pressable>
          ) : null}
        </View>

        <View className="mt-1.5 px-0.5" style={{ marginTop: 6, paddingHorizontal: 2 }}>
          <View className="flex-row items-center justify-between" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text
              className={`font-mono text-[10px] tabular-nums ${
                isMissingInBinder ? 'text-muted' : 'text-foil'
              }`}
              style={{ color: isMissingInBinder ? TOKENS.textMuted : TOKENS.accentPrimary, fontSize: 10 }}
              numberOfLines={1}
            >
              {formattedNumber}
            </Text>

            {isOwned && variantCounts ? (
              <View className="flex-row items-center gap-0.5" style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                {variantCounts.normal > 0 ? (
                  <Text className="font-mono text-[8px] text-ink" style={{ color: TOKENS.textPrimary, fontSize: 8 }}>N</Text>
                ) : null}
                {variantCounts.reverse > 0 ? (
                  <Text className="font-mono text-[8px] text-foil" style={{ color: TOKENS.accentPrimary, fontSize: 8 }}>R</Text>
                ) : null}
                {variantCounts.holo > 0 ? (
                  <Text className="font-mono text-[8px] text-lacquer" style={{ color: TOKENS.accentSecondary, fontSize: 8 }}>H</Text>
                ) : null}
              </View>
            ) : null}
          </View>
          <Text
            className={`font-sans-medium text-xs mt-0.5 ${
              isMissingInBinder ? 'text-muted' : 'text-ink'
            }`}
            style={{ color: isMissingInBinder ? TOKENS.textMuted : TOKENS.textPrimary, fontSize: 11, marginTop: 2 }}
            numberOfLines={1}
          >
            {card.name}
          </Text>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}
