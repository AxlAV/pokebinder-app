import React, { useState } from 'react';
import { View, Text, Image } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronRight, Layers } from 'lucide-react-native';
import { getSetLogoUrl, getSetSymbolUrl, type TcgdexSetBrief } from '@/services/tcgdex';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { TOKENS } from '@/theme/tokens';

interface SetListItemProps {
  setItem: TcgdexSetBrief;
  index?: number;
  onSelect: (setItem: TcgdexSetBrief) => void;
}

/**
 * Tarjeta de expansión oficial con logo de TCGdex, código de set y conteo tabular.
 * Con microinteracciones táctiles y animación de entrada suave.
 */
export function SetListItem({ setItem, index = 0, onSelect }: SetListItemProps) {
  const [logoError, setLogoError] = useState(false);
  const [symbolError, setSymbolError] = useState(false);

  const logoUrl = getSetLogoUrl(setItem.logo);
  const symbolUrl = getSetSymbolUrl(setItem.symbol);

  return (
    <Animated.View
      entering={FadeInDown.duration(220).delay(Math.min(index * 25, 300)).springify()}
      style={{ marginBottom: 8 }}
    >
      <AnimatedPressable
        onPress={() => onSelect(setItem)}
        className="min-h-[44px] bg-page border border-stitch rounded-card p-3 flex-row items-center gap-3 active:border-foil"
        style={{
          minHeight: 44,
          backgroundColor: TOKENS.bgPage,
          borderColor: TOKENS.borderSubtle,
          borderWidth: 1,
          borderRadius: 12,
          padding: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {/* Bolsillo izquierdo con el logo de la expansión */}
        <View
          className="w-20 h-14 bg-pocket border border-stitch rounded-pocket p-1.5 items-center justify-center"
          style={{
            width: 80,
            height: 56,
            backgroundColor: TOKENS.bgPocket,
            borderColor: TOKENS.borderSubtle,
            borderWidth: 1,
            borderRadius: 6,
            padding: 6,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {logoUrl && !logoError ? (
            <Image
              source={{ uri: logoUrl }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
              onError={() => setLogoError(true)}
            />
          ) : (
            <Text
              className="font-mono-semi text-xs text-foil uppercase text-center"
              style={{ color: TOKENS.accentPrimary, fontSize: 11, fontWeight: '700', textAlign: 'center' }}
              numberOfLines={1}
            >
              {setItem.id}
            </Text>
          )}
        </View>

        {/* Información central del set */}
        <View className="flex-1" style={{ flex: 1 }}>
          <View
            className="flex-row items-center gap-1.5"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            <View
              className="bg-pocket border border-stitch rounded-pocket px-1.5 py-0.5 flex-row items-center gap-1"
              style={{
                backgroundColor: TOKENS.bgPocket,
                borderColor: TOKENS.borderSubtle,
                borderWidth: 1,
                borderRadius: 4,
                paddingHorizontal: 6,
                paddingVertical: 2,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {symbolUrl && !symbolError ? (
                <Image
                  source={{ uri: symbolUrl }}
                  style={{ width: 11, height: 11 }}
                  resizeMode="contain"
                  onError={() => setSymbolError(true)}
                />
              ) : (
                <Layers size={10} color={TOKENS.accentPrimary} />
              )}
              <Text
                className="font-mono text-[10px] text-foil uppercase"
                style={{ color: TOKENS.accentPrimary, fontSize: 10 }}
              >
                {setItem.id}
              </Text>
            </View>

            <Text
              className="font-mono text-[10px] text-muted tabular-nums"
              style={{ color: TOKENS.textMuted, fontSize: 10 }}
            >
              {setItem.cardCount.official ?? setItem.cardCount.total ?? 0} CARTAS
            </Text>
          </View>

          <Text
            className="font-display text-sm text-ink mt-1"
            style={{ color: TOKENS.textPrimary, fontSize: 14, fontWeight: '700', marginTop: 4 }}
            numberOfLines={1}
          >
            {setItem.name}
          </Text>
        </View>

        <View
          className="w-8 h-8 rounded-pocket bg-pocket border border-stitch items-center justify-center"
          style={{
            width: 32,
            height: 32,
            borderRadius: 6,
            backgroundColor: TOKENS.bgPocket,
            borderColor: TOKENS.borderSubtle,
            borderWidth: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ChevronRight size={16} color={TOKENS.accentPrimary} />
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}
