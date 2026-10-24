import React, { useState } from 'react';
import { View, Text, Image, Pressable } from 'react-native';
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
    <View className="bg-page border-2 border-foil rounded-card p-3 gap-2.5">
      {/* Cabecera de identificación instantánea */}
      <View className="flex-row items-center justify-between pb-2 border-b border-stitch">
        <View className="flex-row items-center gap-1.5">
          <Sparkles size={14} color={TOKENS.accentPrimary} />
          <Text className="font-mono text-[10px] uppercase text-foil">
            CARTA IDENTIFICADA // 1 TOQUE
          </Text>
        </View>

        <View className="flex-row items-center gap-1.5">
          {justAddedCount > 0 ? (
            <View className="bg-foil/20 border border-foil rounded-pocket px-2 py-0.5 flex-row items-center gap-1">
              <CheckCircle2 size={11} color={TOKENS.accentPrimary} />
              <Text className="font-mono-semi text-[10px] text-foil tabular-nums">
                +{justAddedCount} GUARDADA
              </Text>
            </View>
          ) : null}
          <Text className="font-mono text-[11px] text-ink tabular-nums">
            EN BÓVEDA: {totalOwned}
          </Text>
        </View>
      </View>

      {/* Ficha compacta de la carta + botón de 1 toque */}
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={onOpenFullDetail}
          style={{ aspectRatio: 5 / 7, width: 68 }}
          className="bg-pocket border border-stitch rounded-pocket p-1 items-center justify-center overflow-hidden"
        >
          {imageUrl && !imgError ? (
            <Image
              source={{ uri: imageUrl }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
              onError={() => setImgError(true)}
            />
          ) : (
            <Text className="font-mono text-[9px] text-muted text-center">
              #{card.localId}
            </Text>
          )}
        </Pressable>

        <View className="flex-1 gap-1">
          <View className="flex-row items-center gap-1.5">
            <View className="bg-pocket border border-stitch rounded-pocket px-1.5 py-0.5">
              <Text className="font-mono text-[10px] text-foil uppercase">
                {inferredSet}
              </Text>
            </View>
            <Text className="font-mono text-xs text-muted tabular-nums">
              #{card.localId.padStart(3, '0')}
            </Text>
          </View>

          <Pressable
            onPress={onOpenFullDetail}
            className="flex-row items-center gap-1"
          >
            <Text
              className="font-display text-base text-ink flex-1"
              numberOfLines={1}
            >
              {card.name}
            </Text>
            <ChevronRight size={14} color={TOKENS.textMuted} />
          </Pressable>

          {/* Selector de variante física en 1 toque */}
          <View className="flex-row gap-1.5 mt-1">
            {VARIANT_PILLS.map((pill) => {
              const active = selectedVariant === pill.id;
              const qty = variantCounts?.[pill.id] ?? 0;
              return (
                <Pressable
                  key={pill.id}
                  onPress={() => onSelectVariant(pill.id)}
                  className={`flex-1 min-h-[44px] rounded-pocket border px-1.5 items-center justify-center ${
                    active
                      ? 'bg-pocket border-foil'
                      : 'bg-binder border-stitch'
                  }`}
                >
                  <Text
                    className={`font-mono text-[10px] tabular-nums ${
                      active ? 'text-foil' : 'text-muted'
                    }`}
                  >
                    {pill.code} ({qty})
                  </Text>
                  <Text
                    className={`font-sans-semi text-[10px] ${
                      active ? 'text-ink' : 'text-muted'
                    }`}
                  >
                    {pill.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      {/* Selector de álbum destino opcional + Botón de agregado rápido en 1 toque */}
      <View className="flex-row items-center gap-2 pt-1">
        <Pressable
          onPress={onCycleTargetBinder}
          className="min-h-[44px] flex-1 bg-pocket border border-stitch rounded-pocket px-2.5 flex-row items-center gap-1.5 active:border-foil"
        >
          <BookOpen size={14} color={TOKENS.accentPrimary} />
          <View className="flex-1">
            <Text className="font-mono text-[9px] text-muted uppercase">
              DESTINO
            </Text>
            <Text
              className="font-sans-medium text-xs text-ink"
              numberOfLines={1}
            >
              {targetBinder
                ? `Álbum: ${targetBinder.name}`
                : 'Inventario Global (+ Sets)'}
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={onQuickAdd}
          className="min-h-[44px] bg-foil rounded-pocket px-4 flex-row items-center justify-center gap-1.5 active:opacity-85"
        >
          <Plus size={16} color={TOKENS.bgBinder} />
          <Text className="font-sans-semi text-xs uppercase tracking-wider text-binder">
            +1 {selectedVariant === 'normal' ? 'NRM' : selectedVariant === 'reverse' ? 'REV' : 'HLO'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
