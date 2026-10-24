import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  FlatList,
  Image,
  ScrollView,
} from 'react-native';
import {
  X,
  Layers,
  BookOpen,
  Sparkles,
  Search,
  Check,
  Plus,
} from 'lucide-react-native';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { useSetsQuery } from '@/hooks/useTcgdex';
import {
  useCreateSetBinderMutation,
  useCreateManualBinderMutation,
  useCreateDynamicBinderMutation,
} from '@/hooks/useDatabase';
import { getSetLogoUrl, type TcgdexSetBrief } from '@/services/tcgdex';
import type { DynamicRuleType } from '@/db/schema';
import { ELEMENTAL_TYPES } from '@/utils/elementalTypes';
import { BinderGridSkeleton } from '@/components/ui/BinderGridSkeleton';
import { ErrorCard } from '@/components/ui/ErrorCard';
import { TOKENS } from '@/theme/tokens';

export type CreationMode = 'set' | 'manual' | 'dynamic';

interface CreateBinderModalProps {
  visible: boolean;
  initialMode?: CreationMode;
  onClose: () => void;
}

/**
 * Modal para crear álbumes por Set Oficial, Carpetas Manuales o Álbumes Dinámicos por regla.
 */
export function CreateBinderModal({
  visible,
  initialMode = 'set',
  onClose,
}: CreateBinderModalProps) {
  const { language } = usePreferencesStore();
  const [mode, setMode] = useState<CreationMode>(initialMode);

  useEffect(() => {
    if (visible) {
      setMode(initialMode);
    }
  }, [visible, initialMode]);

  // Estado para modo Set Oficial
  const [setSearch, setSetSearch] = useState('');
  const [selectedSet, setSelectedSet] = useState<TcgdexSetBrief | null>(null);
  const [customSetName, setCustomSetName] = useState('');

  // Estado para modo Carpeta Manual
  const [manualName, setManualName] = useState('');
  const [manualDesc, setManualDesc] = useState('');

  // Estado para modo Álbum Dinámico (Paso 8)
  const [ruleType, setRuleType] = useState<DynamicRuleType>('pokemon');
  const [pokemonRuleValue, setPokemonRuleValue] = useState('');
  const [elementRuleValue, setElementRuleValue] = useState<string>(
    ELEMENTAL_TYPES[0].labelEs
  );
  const [dynamicCustomName, setDynamicCustomName] = useState('');

  const setsQuery = useSetsQuery(language);
  const createSetBinderMutation = useCreateSetBinderMutation();
  const createManualBinderMutation = useCreateManualBinderMutation();
  const createDynamicBinderMutation = useCreateDynamicBinderMutation();

  const filteredSets = useMemo(() => {
    const all = setsQuery.data ?? [];
    const term = setSearch.trim().toLowerCase();
    if (!term) return all;
    return all.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.id.toLowerCase().includes(term)
    );
  }, [setsQuery.data, setSearch]);

  const resetAndClose = () => {
    setSetSearch('');
    setSelectedSet(null);
    setCustomSetName('');
    setManualName('');
    setManualDesc('');
    setPokemonRuleValue('');
    setDynamicCustomName('');
    onClose();
  };

  const handleCreateSetBinder = async () => {
    if (!selectedSet) return;
    await createSetBinderMutation.mutateAsync({
      setId: selectedSet.id,
      setName: selectedSet.name,
      setLogo: selectedSet.logo ?? null,
      setOfficialCount: selectedSet.cardCount.official,
      setTotalCount: selectedSet.cardCount.total,
      customName: customSetName.trim() || undefined,
    });
    resetAndClose();
  };

  const handleCreateManualBinder = async () => {
    const trimmed = manualName.trim();
    if (!trimmed) return;
    await createManualBinderMutation.mutateAsync({
      name: trimmed,
      description: manualDesc.trim() || undefined,
    });
    resetAndClose();
  };

  const handleCreateDynamicBinder = async () => {
    const activeRuleValue =
      ruleType === 'pokemon' ? pokemonRuleValue.trim() : elementRuleValue.trim();
    if (!activeRuleValue) return;

    const autoName =
      ruleType === 'pokemon'
        ? `Colección ${activeRuleValue}`
        : `Dominio ${activeRuleValue}`;

    await createDynamicBinderMutation.mutateAsync({
      name: dynamicCustomName.trim() || autoName,
      ruleType,
      ruleValue: activeRuleValue,
    });
    resetAndClose();
  };

  const isSubmitting =
    createSetBinderMutation.isPending ||
    createManualBinderMutation.isPending ||
    createDynamicBinderMutation.isPending;

  const canSubmitDynamic =
    ruleType === 'pokemon'
      ? pokemonRuleValue.trim().length >= 2
      : elementRuleValue.trim().length > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={resetAndClose}
    >
      <View className="flex-1 bg-binder/90 justify-center p-3">
        <View className="bg-page border border-stitch rounded-card max-h-[92%] overflow-hidden">
          {/* Cabecera del modal */}
          <View className="flex-row items-center justify-between px-4 pt-3.5 pb-3 border-b border-stitch">
            <View>
              <Text className="font-mono text-[11px] uppercase text-foil">
                NUEVA CARPETA // SIN LÍMITES
              </Text>
              <Text className="font-display text-lg text-ink mt-0.5">
                Crear Álbum de Colección
              </Text>
            </View>

            <Pressable
              onPress={resetAndClose}
              className="min-h-[44px] min-w-[44px] rounded-pocket bg-pocket border border-stitch items-center justify-center active:border-foil"
            >
              <X size={18} color={TOKENS.textPrimary} />
            </Pressable>
          </View>

          {/* Selector de tipo de álbum (Set Oficial | Manual | Dinámico) */}
          <View className="px-4 pt-3 pb-2 flex-row gap-1.5">
            <Pressable
              onPress={() => setMode('set')}
              className={`flex-1 min-h-[44px] rounded-pocket border flex-row items-center justify-center gap-1.5 ${
                mode === 'set'
                  ? 'bg-pocket border-foil'
                  : 'bg-binder border-stitch'
              }`}
            >
              <Layers
                size={14}
                color={mode === 'set' ? TOKENS.accentPrimary : TOKENS.textMuted}
              />
              <Text
                className={`font-sans-semi text-[11px] uppercase ${
                  mode === 'set' ? 'text-foil' : 'text-muted'
                }`}
              >
                Set Oficial
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setMode('manual')}
              className={`flex-1 min-h-[44px] rounded-pocket border flex-row items-center justify-center gap-1.5 ${
                mode === 'manual'
                  ? 'bg-pocket border-foil'
                  : 'bg-binder border-stitch'
              }`}
            >
              <BookOpen
                size={14}
                color={
                  mode === 'manual' ? TOKENS.accentPrimary : TOKENS.textMuted
                }
              />
              <Text
                className={`font-sans-semi text-[11px] uppercase ${
                  mode === 'manual' ? 'text-foil' : 'text-muted'
                }`}
              >
                Manual
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setMode('dynamic')}
              className={`flex-1 min-h-[44px] rounded-pocket border flex-row items-center justify-center gap-1.5 ${
                mode === 'dynamic'
                  ? 'bg-pocket border-foil'
                  : 'bg-binder border-stitch'
              }`}
            >
              <Sparkles
                size={14}
                color={
                  mode === 'dynamic' ? TOKENS.accentPrimary : TOKENS.textMuted
                }
              />
              <Text
                className={`font-sans-semi text-[11px] uppercase ${
                  mode === 'dynamic' ? 'text-foil' : 'text-muted'
                }`}
              >
                Dinámico
              </Text>
            </Pressable>
          </View>

          {mode === 'set' ? (
            <View className="px-4 pb-4 gap-3">
              {/* Buscador de expansión */}
              <View className="min-h-[44px] flex-row items-center bg-pocket border border-stitch rounded-pocket px-3">
                <Search size={15} color={TOKENS.textMuted} />
                <TextInput
                  value={setSearch}
                  onChangeText={setSetSearch}
                  placeholder="Buscar expansión oficial (ej. 151, Paldea, Base)..."
                  placeholderTextColor={TOKENS.textMuted}
                  className="flex-1 font-sans text-sm text-ink ml-2 py-2"
                />
                {setSearch.length > 0 ? (
                  <Pressable
                    onPress={() => setSetSearch('')}
                    className="min-h-[44px] min-w-[44px] items-center justify-center -mr-2"
                  >
                    <X size={15} color={TOKENS.textMuted} />
                  </Pressable>
                ) : null}
              </View>

              {/* Lista compacta de sets */}
              <View className="h-60 bg-binder border border-stitch rounded-card p-2">
                {setsQuery.isLoading ? (
                  <BinderGridSkeleton pageLabel="CARGANDO SETS OFICIALES..." />
                ) : setsQuery.isError ? (
                  <ErrorCard
                    title="No se pudo cargar la lista de sets"
                    description="Verifica tu conexión para consultar el catálogo de TCGdex."
                    onRetry={() => setsQuery.refetch()}
                  />
                ) : (
                  <FlatList
                    data={filteredSets}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ gap: 6 }}
                    initialNumToRender={10}
                    renderItem={({ item }) => {
                      const isSelected = selectedSet?.id === item.id;
                      const logoUrl = getSetLogoUrl(item.logo);
                      return (
                        <Pressable
                          onPress={() => setSelectedSet(item)}
                          className={`min-h-[44px] rounded-pocket border px-3 py-2 flex-row items-center justify-between ${
                            isSelected
                              ? 'bg-pocket border-foil'
                              : 'bg-page border-stitch'
                          }`}
                        >
                          <View className="flex-row items-center gap-2.5 flex-1 pr-2">
                            <View className="w-12 h-8 bg-binder border border-stitch rounded-pocket p-1 items-center justify-center">
                              {logoUrl ? (
                                <Image
                                  source={{ uri: logoUrl }}
                                  style={{ width: '100%', height: '100%' }}
                                  resizeMode="contain"
                                />
                              ) : (
                                <Text className="font-mono text-[9px] text-foil uppercase">
                                  {item.id}
                                </Text>
                              )}
                            </View>
                            <View className="flex-1">
                              <Text
                                className="font-display text-sm text-ink"
                                numberOfLines={1}
                              >
                                {item.name}
                              </Text>
                              <Text className="font-mono text-[10px] text-muted tabular-nums">
                                {item.id.toUpperCase()} •{' '}
                                {item.cardCount.official}/
                                {item.cardCount.total} CARTAS
                              </Text>
                            </View>
                          </View>

                          <View
                            className={`w-6 h-6 rounded-pocket border items-center justify-center ${
                              isSelected
                                ? 'bg-foil border-foil'
                                : 'bg-pocket border-stitch'
                            }`}
                          >
                            {isSelected ? (
                              <Check size={14} color={TOKENS.bgBinder} />
                            ) : null}
                          </View>
                        </Pressable>
                      );
                    }}
                  />
                )}
              </View>

              {/* Nombre personalizado opcional */}
              <View>
                <Text className="font-mono text-[10px] uppercase text-muted mb-1">
                  TÍTULO EN EL LOMO (OPCIONAL)
                </Text>
                <TextInput
                  value={customSetName}
                  onChangeText={setCustomSetName}
                  placeholder={
                    selectedSet
                      ? `Por defecto: ${selectedSet.name}`
                      : 'Selecciona un set arriba...'
                  }
                  placeholderTextColor={TOKENS.textMuted}
                  className="min-h-[44px] bg-pocket border border-stitch rounded-pocket px-3 font-sans text-sm text-ink"
                />
              </View>

              <Pressable
                onPress={handleCreateSetBinder}
                disabled={!selectedSet || isSubmitting}
                className={`min-h-[44px] rounded-pocket flex-row items-center justify-center gap-2 ${
                  selectedSet && !isSubmitting
                    ? 'bg-foil active:opacity-85'
                    : 'bg-pocket border border-stitch opacity-50'
                }`}
              >
                <Plus
                  size={16}
                  color={selectedSet ? TOKENS.bgBinder : TOKENS.textMuted}
                />
                <Text
                  className={`font-sans-semi text-xs uppercase tracking-wider ${
                    selectedSet ? 'text-binder' : 'text-muted'
                  }`}
                >
                  {selectedSet
                    ? `Crear Álbum de ${selectedSet.name}`
                    : 'Selecciona un Set Oficial'}
                </Text>
              </Pressable>
            </View>
          ) : mode === 'manual' ? (
            <View className="px-4 pb-4 gap-3">
              <View>
                <Text className="font-mono text-[10px] uppercase text-foil mb-1">
                  NOMBRE DE LA CARPETA MANUAL *
                </Text>
                <TextInput
                  value={manualName}
                  onChangeText={setManualName}
                  placeholder="Ej. Favoritas de Kanto, Repetidas para Cambio..."
                  placeholderTextColor={TOKENS.textMuted}
                  className="min-h-[44px] bg-pocket border border-stitch rounded-pocket px-3 font-sans text-sm text-ink"
                />
              </View>

              <View>
                <Text className="font-mono text-[10px] uppercase text-muted mb-1">
                  DESCRIPCIÓN / NOTA DE COLECCIONISTA
                </Text>
                <TextInput
                  value={manualDesc}
                  onChangeText={setManualDesc}
                  placeholder="Ej. Cartas holográficas y promocionales seleccionadas"
                  placeholderTextColor={TOKENS.textMuted}
                  className="min-h-[44px] bg-pocket border border-stitch rounded-pocket px-3 font-sans text-sm text-ink"
                />
              </View>

              <View className="bg-pocket border border-stitch rounded-pocket p-3">
                <Text className="font-mono text-[10px] text-foil uppercase">
                  HOJAS DE 9 BOLSILLOS PERSONALIZABLES
                </Text>
                <Text className="font-sans text-xs text-muted mt-1 leading-4">
                  En una carpeta manual puedes insertar cualquier carta de cualquier expansión sin límite de páginas.
                </Text>
              </View>

              <Pressable
                onPress={handleCreateManualBinder}
                disabled={manualName.trim().length === 0 || isSubmitting}
                className={`min-h-[44px] rounded-pocket flex-row items-center justify-center gap-2 ${
                  manualName.trim().length > 0 && !isSubmitting
                    ? 'bg-foil active:opacity-85'
                    : 'bg-pocket border border-stitch opacity-50'
                }`}
              >
                <Plus
                  size={16}
                  color={
                    manualName.trim().length > 0
                      ? TOKENS.bgBinder
                      : TOKENS.textMuted
                  }
                />
                <Text
                  className={`font-sans-semi text-xs uppercase tracking-wider ${
                    manualName.trim().length > 0 ? 'text-binder' : 'text-muted'
                  }`}
                >
                  Crear Carpeta Manual
                </Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView
              contentContainerClassName="px-4 pb-4 gap-3"
              showsVerticalScrollIndicator={false}
            >
              {/* Selector de regla dinámica: por Pokémon vs por Tipo Elemental */}
              <View>
                <Text className="font-mono text-[10px] uppercase text-foil mb-1.5">
                  CRITERIO AUTOMÁTICO DE AGRUPACIÓN
                </Text>
                <View className="flex-row gap-2">
                  <Pressable
                    onPress={() => setRuleType('pokemon')}
                    className={`flex-1 min-h-[44px] rounded-pocket border items-center justify-center ${
                      ruleType === 'pokemon'
                        ? 'bg-pocket border-foil'
                        : 'bg-binder border-stitch'
                    }`}
                  >
                    <Text
                      className={`font-sans-semi text-xs uppercase ${
                        ruleType === 'pokemon' ? 'text-foil' : 'text-muted'
                      }`}
                    >
                      Por Pokémon
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setRuleType('element')}
                    className={`flex-1 min-h-[44px] rounded-pocket border items-center justify-center ${
                      ruleType === 'element'
                        ? 'bg-pocket border-foil'
                        : 'bg-binder border-stitch'
                    }`}
                  >
                    <Text
                      className={`font-sans-semi text-xs uppercase ${
                        ruleType === 'element' ? 'text-foil' : 'text-muted'
                      }`}
                    >
                      Por Tipo Elemental
                    </Text>
                  </Pressable>
                </View>
              </View>

              {ruleType === 'pokemon' ? (
                <View className="gap-2">
                  <Text className="font-mono text-[10px] uppercase text-muted">
                    NOMBRE DEL POKÉMON *
                  </Text>
                  <TextInput
                    value={pokemonRuleValue}
                    onChangeText={setPokemonRuleValue}
                    placeholder="Ej. Charizard, Pikachu, Eevee, Gengar..."
                    placeholderTextColor={TOKENS.textMuted}
                    className="min-h-[44px] bg-pocket border border-stitch rounded-pocket px-3 font-sans text-sm text-ink"
                  />
                  <View className="flex-row flex-wrap gap-1.5">
                    {(['Charizard', 'Pikachu', 'Eevee', 'Mew', 'Gengar'] as const).map(
                      (preset) => (
                        <Pressable
                          key={preset}
                          onPress={() => setPokemonRuleValue(preset)}
                          className={`min-h-[36px] px-2.5 rounded-pocket border items-center justify-center ${
                            pokemonRuleValue.toLowerCase() ===
                            preset.toLowerCase()
                              ? 'bg-pocket border-foil'
                              : 'bg-binder border-stitch'
                          }`}
                        >
                          <Text className="font-mono text-[10px] text-ink">
                            {preset}
                          </Text>
                        </Pressable>
                      )
                    )}
                  </View>
                </View>
              ) : (
                <View className="gap-2">
                  <Text className="font-mono text-[10px] uppercase text-muted">
                    SELECCIONA EL TIPO ELEMENTAL *
                  </Text>
                  <View className="flex-row flex-wrap gap-1.5">
                    {ELEMENTAL_TYPES.map((typeOpt) => {
                      const active = elementRuleValue === typeOpt.labelEs;
                      return (
                        <Pressable
                          key={typeOpt.id}
                          onPress={() => setElementRuleValue(typeOpt.labelEs)}
                          className={`min-h-[44px] px-3 rounded-pocket border flex-row items-center gap-1.5 ${
                            active
                              ? 'bg-pocket border-foil'
                              : 'bg-binder border-stitch'
                          }`}
                        >
                          <Text
                            className={`font-mono text-[10px] ${
                              active ? 'text-foil' : 'text-muted'
                            }`}
                          >
                            {typeOpt.code}
                          </Text>
                          <Text
                            className={`font-sans-semi text-xs ${
                              active ? 'text-ink' : 'text-muted'
                            }`}
                          >
                            {typeOpt.labelEs}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}

              <View>
                <Text className="font-mono text-[10px] uppercase text-muted mb-1">
                  TÍTULO DEL ÁLBUM DINÁMICO (OPCIONAL)
                </Text>
                <TextInput
                  value={dynamicCustomName}
                  onChangeText={setDynamicCustomName}
                  placeholder={
                    ruleType === 'pokemon'
                      ? `Por defecto: Colección ${pokemonRuleValue.trim() || 'Pokémon'}`
                      : `Por defecto: Dominio ${elementRuleValue}`
                  }
                  placeholderTextColor={TOKENS.textMuted}
                  className="min-h-[44px] bg-pocket border border-stitch rounded-pocket px-3 font-sans text-sm text-ink"
                />
              </View>

              <View className="bg-pocket border border-stitch rounded-pocket p-3">
                <Text className="font-mono text-[10px] text-foil uppercase">
                  SINCRONIZACIÓN AUTOMÁTICA CON TU INVENTARIO
                </Text>
                <Text className="font-sans text-xs text-muted mt-1 leading-4">
                  Reúne automáticamente todas las cartas de tu inventario que coincidan con la regla elegida sin tener que agregarlas una por una.
                </Text>
              </View>

              <Pressable
                onPress={handleCreateDynamicBinder}
                disabled={!canSubmitDynamic || isSubmitting}
                className={`min-h-[44px] rounded-pocket flex-row items-center justify-center gap-2 ${
                  canSubmitDynamic && !isSubmitting
                    ? 'bg-foil active:opacity-85'
                    : 'bg-pocket border border-stitch opacity-50'
                }`}
              >
                <Plus
                  size={16}
                  color={
                    canSubmitDynamic ? TOKENS.bgBinder : TOKENS.textMuted
                  }
                />
                <Text
                  className={`font-sans-semi text-xs uppercase tracking-wider ${
                    canSubmitDynamic ? 'text-binder' : 'text-muted'
                  }`}
                >
                  Crear Álbum Dinámico
                </Text>
              </Pressable>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
