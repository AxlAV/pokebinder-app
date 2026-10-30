import React, { useState } from 'react';
import { View, Text, Image, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  BookOpen,
  Layers,
  Sparkles,
  Trash2,
  ChevronRight,
  Check,
  X,
} from 'lucide-react-native';
import { getSetLogoUrl } from '@/services/tcgdex';
import type { BinderRow } from '@/db/schema';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { TOKENS } from '@/theme/tokens';

interface BinderListItemProps {
  binder: BinderRow;
  index?: number;
  /** Cartas únicas obtenidas (para álbumes de set) o cartas asignadas (para manuales) */
  cardCount: number;
  onSelect: (binder: BinderRow) => void;
  onDelete: (binderId: string) => void;
}

/**
 * Tarjeta estilo lomo de carpeta Ultra PRO para el listado de "Mis Álbumes".
 * Incluye confirmación en 2 pasos para la acción destructiva de eliminar y animación de entrada.
 */
export function BinderListItem({
  binder,
  index = 0,
  cardCount,
  onSelect,
  onDelete,
}: BinderListItemProps) {
  const [logoError, setLogoError] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const isSetBinder = binder.type === 'set';
  const isManualBinder = binder.type === 'manual';
  const logoUrl = isSetBinder ? getSetLogoUrl(binder.setLogo ?? undefined) : null;

  const targetTotal = isSetBinder
    ? binder.setOfficialCount || binder.setTotalCount || 0
    : 0;

  const progressPct =
    isSetBinder && targetTotal > 0
      ? Math.min(100, (cardCount / targetTotal) * 100)
      : 0;

  const typeBadgeLabel = isSetBinder
    ? `SET OFICIAL • ${(binder.setId ?? '').toUpperCase()}`
    : isManualBinder
      ? 'CARPETA MANUAL'
      : `REGLA DINÁMICA • ${(binder.ruleValue ?? '').toUpperCase()}`;

  const counterLabel = isSetBinder
    ? `${String(cardCount).padStart(3, '0')}/${String(targetTotal).padStart(3, '0')} (${progressPct.toFixed(0)}%)`
    : `${String(cardCount).padStart(2, '0')} CARTAS`;

  return (
    <Animated.View
      entering={FadeInDown.duration(240).delay(Math.min(index * 35, 300)).springify()}
      className="bg-page border border-stitch rounded-card overflow-hidden"
      style={{
        backgroundColor: TOKENS.bgPage,
        borderColor: TOKENS.borderSubtle,
        borderWidth: 1,
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <AnimatedPressable
        onPress={() => onSelect(binder)}
        className="p-3 flex-row items-center gap-3 active:bg-pocket/50"
        style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}
      >
        {/* Lomo / emblema izquierdo */}
        <View
          className="w-16 h-14 bg-pocket border border-stitch rounded-pocket p-1.5 items-center justify-center"
          style={{
            width: 64,
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
          ) : isSetBinder ? (
            <Layers size={22} color={TOKENS.accentPrimary} />
          ) : isManualBinder ? (
            <BookOpen size={22} color={TOKENS.accentPrimary} />
          ) : (
            <Sparkles size={22} color={TOKENS.accentPrimary} />
          )}
        </View>

        {/* Información central del álbum */}
        <View className="flex-1" style={{ flex: 1 }}>
          <View
            className="flex-row items-center justify-between gap-2"
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
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
                style={{ color: TOKENS.accentPrimary, fontSize: 10 }}
                numberOfLines={1}
              >
                {typeBadgeLabel}
              </Text>
            </View>

            <Text
              className="font-mono-semi text-[11px] text-ink tabular-nums"
              style={{ color: TOKENS.textPrimary, fontSize: 11, fontWeight: '600' }}
            >
              {counterLabel}
            </Text>
          </View>

          <Text
            className="font-display text-base text-ink mt-1"
            style={{ color: TOKENS.textPrimary, fontSize: 15, fontWeight: '700', marginTop: 4 }}
            numberOfLines={1}
          >
            {binder.name}
          </Text>

          {binder.description ? (
            <Text
              className="font-sans text-xs text-muted mt-0.5"
              style={{ color: TOKENS.textMuted, fontSize: 11, marginTop: 2 }}
              numberOfLines={1}
            >
              {binder.description}
            </Text>
          ) : null}

          {/* Barra de progreso para álbumes de set oficial */}
          {isSetBinder && targetTotal > 0 ? (
            <View
              className="mt-2 h-1.5 w-full bg-binder rounded-pocket overflow-hidden border border-stitch"
              style={{
                marginTop: 8,
                height: 6,
                width: '100%',
                backgroundColor: TOKENS.bgBinder,
                borderColor: TOKENS.borderSubtle,
                borderWidth: 1,
                borderRadius: 4,
                overflow: 'hidden',
              }}
            >
              <View
                style={{ width: `${progressPct}%`, height: '100%', backgroundColor: TOKENS.accentPrimary }}
                className="h-full bg-foil"
              />
            </View>
          ) : null}
        </View>

        {/* Acciones derechas: abrir o solicitar borrado */}
        <View className="flex-row items-center gap-1.5" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {!confirmingDelete ? (
            <Pressable
              onPress={() => setConfirmingDelete(true)}
              hitSlop={8}
              className="min-h-[44px] min-w-[44px] rounded-pocket bg-pocket border border-stitch items-center justify-center active:border-lacquer"
              style={{
                minWidth: 44,
                minHeight: 44,
                borderRadius: 6,
                backgroundColor: TOKENS.bgPocket,
                borderColor: TOKENS.borderSubtle,
                borderWidth: 1,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Trash2 size={15} color={TOKENS.textMuted} />
            </Pressable>
          ) : null}

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
        </View>
      </AnimatedPressable>

      {/* Franja de confirmación de borrado */}
      {confirmingDelete ? (
        <View
          className="px-3 py-2 bg-pocket border-t border-lacquer/50 flex-row items-center justify-between"
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            backgroundColor: TOKENS.bgPocket,
            borderTopColor: TOKENS.accentSecondary,
            borderTopWidth: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text
            className="font-sans-medium text-xs text-ink flex-1 pr-2"
            style={{ color: TOKENS.textPrimary, fontSize: 11, flex: 1, paddingRight: 8 }}
          >
            ¿Eliminar el álbum &quot;{binder.name}&quot;? (Tus cartas en inventario no se borran)
          </Text>
          <View className="flex-row items-center gap-2" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Pressable
              onPress={() => setConfirmingDelete(false)}
              className="min-h-[44px] px-3 rounded-pocket bg-page border border-stitch flex-row items-center justify-center gap-1"
              style={{
                minHeight: 44,
                paddingHorizontal: 12,
                borderRadius: 6,
                backgroundColor: TOKENS.bgPage,
                borderColor: TOKENS.borderSubtle,
                borderWidth: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
              }}
            >
              <X size={14} color={TOKENS.textMuted} />
              <Text
                className="font-mono text-[11px] text-muted uppercase"
                style={{ color: TOKENS.textMuted, fontSize: 11 }}
              >
                Cancelar
              </Text>
            </Pressable>

            <Pressable
              onPress={() => onDelete(binder.id)}
              className="min-h-[44px] px-3 rounded-pocket bg-lacquer flex-row items-center justify-center gap-1 active:opacity-85"
              style={{
                minHeight: 44,
                paddingHorizontal: 12,
                borderRadius: 6,
                backgroundColor: TOKENS.accentSecondary,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
              }}
            >
              <Check size={14} color={TOKENS.textPrimary} />
              <Text
                className="font-mono-semi text-[11px] text-ink uppercase"
                style={{ color: TOKENS.textPrimary, fontSize: 11, fontWeight: '700' }}
              >
                Eliminar
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </Animated.View>
  );
}
