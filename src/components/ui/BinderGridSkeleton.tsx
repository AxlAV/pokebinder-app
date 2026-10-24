import React from 'react';
import { View, Text } from 'react-native';

interface BinderGridSkeletonProps {
  /** Etiqueta de página mostrada en el encabezado de la hoja (ej. "PÁGINA 01 // CARGANDO") */
  pageLabel?: string;
}

const POCKET_SLOTS = ['001', '002', '003', '004', '005', '006', '007', '008', '009'] as const;

/**
 * Esqueleto de carga con la forma real de una hoja de carpeta Ultra PRO (3x3 bolsillos 5:7).
 */
export function BinderGridSkeleton({
  pageLabel = 'HOJA 3×3 // SINCRONIZANDO',
}: BinderGridSkeletonProps) {
  return (
    <View className="bg-page border border-stitch rounded-card p-3">
      <View className="flex-row items-center justify-between mb-2.5 pb-2 border-b border-stitch">
        <Text className="font-mono text-xs text-muted tracking-wider">{pageLabel}</Text>
        <View className="h-3 w-16 rounded-pocket bg-pocket border border-stitch" />
      </View>

      <View className="flex-row flex-wrap -mx-1">
        {POCKET_SLOTS.map((slot) => (
          <View key={slot} className="w-1/3 p-1">
            <View
              style={{ aspectRatio: 5 / 7 }}
              className="bg-pocket border border-stitch rounded-pocket p-2 justify-between opacity-75"
            >
              <View className="flex-row justify-between items-center">
                <View className="h-2 w-10 rounded-pocket bg-page" />
                <View className="h-2 w-2 rounded-full bg-page" />
              </View>
              <View className="my-auto h-10 rounded-pocket bg-page/60 border border-stitch/50" />
              <View className="flex-row justify-between items-end">
                <Text className="font-mono text-[10px] text-muted/60">{slot}/---</Text>
                <View className="h-2 w-6 rounded-pocket bg-page" />
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
