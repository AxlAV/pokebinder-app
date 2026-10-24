import React, { useState } from 'react';
import { View, Text, Image, Pressable } from 'react-native';
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
import { TOKENS } from '@/theme/tokens';

interface BinderListItemProps {
  binder: BinderRow;
  /** Cartas únicas obtenidas (para álbumes de set) o cartas asignadas (para manuales) */
  cardCount: number;
  onSelect: (binder: BinderRow) => void;
  onDelete: (binderId: string) => void;
}

/**
 * Tarjeta estilo lomo de carpeta Ultra PRO para el listado de "Mis Álbumes".
 * Incluye confirmación en 2 pasos para la acción destructiva de eliminar.
 */
export function BinderListItem({
  binder,
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
    <View className="bg-page border border-stitch rounded-card overflow-hidden">
      <Pressable
        onPress={() => onSelect(binder)}
        className="p-3 flex-row items-center gap-3 active:bg-pocket/50"
      >
        {/* Lomo / emblema izquierdo */}
        <View className="w-16 h-14 bg-pocket border border-stitch rounded-pocket p-1.5 items-center justify-center">
          {logoUrl && !logoError ? (
            <Image
              source={{ uri: logoUrl }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
              onError={() => setLogoError(true)}
            />
          ) : isSetBinder ? (
            <Layers size={20} color={TOKENS.accentPrimary} />
          ) : isManualBinder ? (
            <BookOpen size={20} color={TOKENS.accentPrimary} />
          ) : (
            <Sparkles size={20} color={TOKENS.accentPrimary} />
          )}
        </View>

        {/* Información central del álbum */}
        <View className="flex-1">
          <View className="flex-row items-center justify-between gap-2">
            <View className="bg-pocket border border-stitch rounded-pocket px-1.5 py-0.5">
              <Text
                className="font-mono text-[10px] text-foil uppercase"
                numberOfLines={1}
              >
                {typeBadgeLabel}
              </Text>
            </View>

            <Text className="font-mono-semi text-[11px] text-ink tabular-nums">
              {counterLabel}
            </Text>
          </View>

          <Text
            className="font-display text-base text-ink mt-1"
            numberOfLines={1}
          >
            {binder.name}
          </Text>

          {binder.description ? (
            <Text
              className="font-sans text-xs text-muted mt-0.5"
              numberOfLines={1}
            >
              {binder.description}
            </Text>
          ) : null}

          {/* Barra de progreso para álbumes de set oficial */}
          {isSetBinder && targetTotal > 0 ? (
            <View className="mt-2 h-1.5 w-full bg-binder rounded-pocket overflow-hidden border border-stitch">
              <View
                style={{ width: `${progressPct}%` }}
                className="h-full bg-foil"
              />
            </View>
          ) : null}
        </View>

        {/* Acciones derechas: abrir o solicitar borrado */}
        <View className="flex-row items-center gap-1.5">
          {!confirmingDelete ? (
            <Pressable
              onPress={() => setConfirmingDelete(true)}
              hitSlop={6}
              className="min-h-[44px] min-w-[44px] rounded-pocket bg-pocket border border-stitch items-center justify-center active:border-lacquer"
            >
              <Trash2 size={15} color={TOKENS.textMuted} />
            </Pressable>
          ) : null}

          <View className="w-8 h-8 rounded-pocket bg-pocket border border-stitch items-center justify-center">
            <ChevronRight size={16} color={TOKENS.accentPrimary} />
          </View>
        </View>
      </Pressable>

      {/* Franja de confirmación de borrado (cumple regla de acción destructiva segura) */}
      {confirmingDelete ? (
        <View className="px-3 py-2 bg-pocket border-t border-lacquer/50 flex-row items-center justify-between">
          <Text className="font-sans-medium text-xs text-ink flex-1 pr-2">
            ¿Eliminar el álbum &quot;{binder.name}&quot;? (Tus cartas en inventario no se borran)
          </Text>
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => setConfirmingDelete(false)}
              className="min-h-[44px] px-3 rounded-pocket bg-page border border-stitch flex-row items-center justify-center gap-1"
            >
              <X size={14} color={TOKENS.textMuted} />
              <Text className="font-mono text-[11px] text-muted uppercase">
                Cancelar
              </Text>
            </Pressable>

            <Pressable
              onPress={() => onDelete(binder.id)}
              className="min-h-[44px] px-3 rounded-pocket bg-lacquer flex-row items-center justify-center gap-1 active:opacity-85"
            >
              <Check size={14} color={TOKENS.textPrimary} />
              <Text className="font-mono-semi text-[11px] text-ink uppercase">
                Eliminar
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}
