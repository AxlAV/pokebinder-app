import React, { useState } from 'react';
import { View, Text, Image, Pressable } from 'react-native';
import { ChevronRight, Layers } from 'lucide-react-native';
import { getSetLogoUrl, getSetSymbolUrl, type TcgdexSetBrief } from '@/services/tcgdex';
import { TOKENS } from '@/theme/tokens';

interface SetListItemProps {
  setItem: TcgdexSetBrief;
  onSelect: (setItem: TcgdexSetBrief) => void;
}

/**
 * Tarjeta de expansión oficial con logo de TCGdex, código de set y conteo tabular.
 */
export function SetListItem({ setItem, onSelect }: SetListItemProps) {
  const [logoError, setLogoError] = useState(false);
  const [symbolError, setSymbolError] = useState(false);

  const logoUrl = getSetLogoUrl(setItem.logo);
  const symbolUrl = getSetSymbolUrl(setItem.symbol);

  return (
    <Pressable
      onPress={() => onSelect(setItem)}
      className="min-h-[44px] bg-page border border-stitch rounded-card p-3 flex-row items-center gap-3 active:border-foil"
    >
      {/* Bolsillo izquierdo con el logo de la expansión */}
      <View className="w-20 h-14 bg-pocket border border-stitch rounded-pocket p-1.5 items-center justify-center">
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
            numberOfLines={1}
          >
            {setItem.id}
          </Text>
        )}
      </View>

      {/* Información central del set */}
      <View className="flex-1">
        <View className="flex-row items-center gap-1.5">
          <View className="bg-pocket border border-stitch rounded-pocket px-1.5 py-0.5 flex-row items-center gap-1">
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
            <Text className="font-mono text-[10px] text-foil uppercase">
              {setItem.id}
            </Text>
          </View>
          <Text className="font-mono text-[11px] text-muted tabular-nums">
            {setItem.cardCount.official}/{setItem.cardCount.total} CARTAS
          </Text>
        </View>

        <Text
          className="font-display text-base text-ink mt-1"
          numberOfLines={1}
        >
          {setItem.name}
        </Text>
      </View>

      <View className="w-8 h-8 rounded-pocket bg-pocket border border-stitch items-center justify-center">
        <ChevronRight size={16} color={TOKENS.textMuted} />
      </View>
    </Pressable>
  );
}
