import React, { useState } from 'react';
import { View, Text, Image, Pressable } from 'react-native';
import { ImageOff, Check } from 'lucide-react-native';
import { getCardImageUrl, type TcgdexCardBrief } from '@/services/tcgdex';
import type { CardVariantCounts } from '@/db/repository';
import { TOKENS } from '@/theme/tokens';

interface CardPocketItemProps {
  card: TcgdexCardBrief;
  officialTotal?: number;
  variantCounts?: CardVariantCounts;
  /** Si es true, las cartas con 0 copias se muestran en escala de grises / opacidad reducida */
  dimIfMissing?: boolean;
  onPress?: (card: TcgdexCardBrief) => void;
  /** Acción rápida opcional para marcar/sumar 1 copia directo desde el bolsillo */
  onQuickToggleOwned?: (card: TcgdexCardBrief, currentlyOwned: boolean) => void;
}

/**
 * Bolsillo individual de carpeta (proporción 5:7, radio 6px) para grillas de 3 columnas.
 * Contrasta cartas obtenidas (a todo color y borde foil) contra faltantes (atenuadas en gris).
 */
export function CardPocketItem({
  card,
  officialTotal,
  variantCounts,
  dimIfMissing = false,
  onPress,
  onQuickToggleOwned,
}: CardPocketItemProps) {
  const [imageError, setImageError] = useState(false);
  const imageUrl = getCardImageUrl(card.image, 'low');

  const totalOwned = variantCounts?.total ?? 0;
  const isOwned = totalOwned > 0;
  const isMissingInBinder = dimIfMissing && !isOwned;

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
            >
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
          ) : isMissingInBinder ? (
            <View className="absolute top-1 left-1 bg-binder/85 border border-stitch rounded-pocket px-1.5 py-0.5">
              <Text className="font-mono text-[8px] text-muted uppercase">
                FALTA
              </Text>
            </View>
          ) : null}

          {/* Botón rápido de check en esquina inferior derecha cuando está en modo carpeta */}
          {onQuickToggleOwned ? (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onQuickToggleOwned(card, isOwned);
              }}
              hitSlop={6}
              className={`absolute bottom-1 right-1 w-7 h-7 rounded-pocket border items-center justify-center ${
                isOwned
                  ? 'bg-foil border-foil'
                  : 'bg-binder/90 border-stitch'
              }`}
            >
              <Check
                size={13}
                color={isOwned ? TOKENS.bgBinder : TOKENS.textMuted}
              />
            </Pressable>
          ) : null}
        </View>

        <View className="mt-1.5 px-0.5">
          <View className="flex-row items-center justify-between">
            <Text
              className={`font-mono text-[10px] tabular-nums ${
                isMissingInBinder ? 'text-muted' : 'text-foil'
              }`}
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
            className={`font-sans-medium text-xs mt-0.5 ${
              isMissingInBinder ? 'text-muted' : 'text-ink'
            }`}
            numberOfLines={1}
          >
            {card.name}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}
