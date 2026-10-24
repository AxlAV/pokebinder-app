import React, { useState } from 'react';
import { View, Text, Image, Pressable } from 'react-native';
import { ImageOff } from 'lucide-react-native';
import { getCardImageUrl, type TcgdexCardBrief } from '@/services/tcgdex';
import type { CardVariantCounts } from '@/db/repository';
import { TOKENS } from '@/theme/tokens';

interface CardPocketItemProps {
  card: TcgdexCardBrief;
  officialTotal?: number;
  variantCounts?: CardVariantCounts;
  /** Si es true, las cartas con 0 copias se muestran atenuadas (modo carpeta 3x3) */
  dimIfMissing?: boolean;
  onPress?: (card: TcgdexCardBrief) => void;
}

/**
 * Bolsillo individual de carpeta (proporción 5:7, radio 6px) para grillas de 3 columnas.
 */
export function CardPocketItem({
  card,
  officialTotal,
  variantCounts,
  dimIfMissing = false,
  onPress,
}: CardPocketItemProps) {
  const [imageError, setImageError] = useState(false);
  const imageUrl = getCardImageUrl(card.image, 'low');

  const totalOwned = variantCounts?.total ?? 0;
  const isOwned = totalOwned > 0;

  const formattedNumber = officialTotal
    ? `${card.localId.padStart(3, '0')}/${String(officialTotal).padStart(3, '0')}`
    : `#${card.localId}`;

  return (
    <View className="w-1/3 p-1">
      <Pressable
        onPress={() => onPress?.(card)}
        disabled={!onPress}
        className={`bg-pocket border rounded-pocket p-1.5 active:border-foil ${
          isOwned ? 'border-foil/80' : 'border-stitch'
        }`}
      >
        <View
          style={{ aspectRatio: 5 / 7 }}
          className={`w-full rounded-pocket overflow-hidden bg-binder items-center justify-center ${
            dimIfMissing && !isOwned ? 'opacity-40' : 'opacity-100'
          }`}
        >
          {imageUrl && !imageError ? (
            <Image
              source={{ uri: imageUrl }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
              onError={() => setImageError(true)}
            />
          ) : (
            <View className="flex-1 w-full p-2 justify-between border border-dashed border-stitch rounded-pocket">
              <Text
                className="font-mono text-[10px] text-muted tabular-nums"
                numberOfLines={1}
              >
                {formattedNumber}
              </Text>
              <View className="items-center justify-center my-auto">
                <ImageOff size={18} color={TOKENS.textMuted} />
                <Text
                  className="font-display text-xs text-ink text-center mt-1.5"
                  numberOfLines={2}
                >
                  {card.name}
                </Text>
              </View>
              <Text
                className="font-mono text-[9px] text-muted/70 uppercase text-right"
                numberOfLines={1}
              >
                {card.id}
              </Text>
            </View>
          )}

          {/* Insignia de copias en inventario físico */}
          {isOwned ? (
            <View className="absolute top-1 right-1 bg-binder/90 border border-foil rounded-pocket px-1.5 py-0.5">
              <Text className="font-mono-semi text-[10px] text-foil tabular-nums">
                ×{totalOwned}
              </Text>
            </View>
          ) : null}
        </View>

        <View className="mt-1.5 px-0.5">
          <View className="flex-row items-center justify-between">
            <Text
              className="font-mono text-[10px] text-foil tabular-nums"
              numberOfLines={1}
            >
              {formattedNumber}
            </Text>

            {isOwned && variantCounts ? (
              <View className="flex-row items-center gap-0.5">
                {variantCounts.normal > 0 ? (
                  <Text className="font-mono text-[8px] text-ink">N</Text>
                ) : null}
                {variantCounts.reverse > 0 ? (
                  <Text className="font-mono text-[8px] text-foil">R</Text>
                ) : null}
                {variantCounts.holo > 0 ? (
                  <Text className="font-mono text-[8px] text-lacquer">H</Text>
                ) : null}
              </View>
            ) : null}
          </View>
          <Text
            className="font-sans-medium text-xs text-ink mt-0.5"
            numberOfLines={1}
          >
            {card.name}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}
