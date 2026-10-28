import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { AlertTriangle, RotateCcw } from 'lucide-react-native';
import { TOKENS } from '@/theme/tokens';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught an error]:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View
          style={{
            flex: 1,
            backgroundColor: TOKENS.bgBinder,
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <View
            style={{
              backgroundColor: TOKENS.bgPage,
              borderColor: TOKENS.accentSecondary,
              borderWidth: 1,
              borderRadius: 12,
              padding: 16,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 6,
                  backgroundColor: TOKENS.bgPocket,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertTriangle size={20} color={TOKENS.accentSecondary} />
              </View>
              <Text
                style={{
                  color: TOKENS.textPrimary,
                  fontSize: 16,
                  fontWeight: 'bold',
                  flex: 1,
                }}
              >
                Error en la aplicación
              </Text>
            </View>

            <ScrollView style={{ maxHeight: 180, marginTop: 12 }}>
              <Text
                style={{
                  color: TOKENS.textMuted,
                  fontSize: 12,
                  fontFamily: 'monospace',
                }}
              >
                {this.state.error?.message || 'Error inesperado durante la ejecución'}
              </Text>
            </ScrollView>

            <Pressable
              onPress={this.handleReset}
              style={{
                marginTop: 16,
                minHeight: 44,
                backgroundColor: TOKENS.bgPocket,
                borderColor: TOKENS.borderSubtle,
                borderWidth: 1,
                borderRadius: 6,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <RotateCcw size={16} color={TOKENS.accentPrimary} />
              <Text
                style={{
                  color: TOKENS.accentPrimary,
                  fontSize: 12,
                  fontWeight: '600',
                  textTransform: 'uppercase',
                }}
              >
                Reintentar
              </Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}
