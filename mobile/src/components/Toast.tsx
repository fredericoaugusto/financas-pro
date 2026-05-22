import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastConfig {
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

const COLORS: Record<ToastType, { bg: string; border: string; icon: string; iconName: string }> = {
  success: { bg: '#f0fdf4', border: '#86efac', icon: '#16a34a', iconName: 'checkmark-circle' },
  error:   { bg: '#fef2f2', border: '#fca5a5', icon: '#dc2626', iconName: 'close-circle' },
  info:    { bg: '#eff6ff', border: '#93c5fd', icon: '#2563eb', iconName: 'information-circle' },
  warning: { bg: '#fffbeb', border: '#fcd34d', icon: '#d97706', iconName: 'warning' },
};

// Singleton para controlar toasts globalmente
let showToastFn: ((config: ToastConfig) => void) | null = null;

export function toast(config: ToastConfig) {
  if (showToastFn) showToastFn(config);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [current, setCurrent] = React.useState<ToastConfig | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    showToastFn = (config) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setCurrent(config);

      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();

      timerRef.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, { toValue: -120, duration: 300, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start(() => setCurrent(null));
      }, config.duration || 3000);
    };
    return () => { showToastFn = null; };
  }, []);

  if (!current) return <>{children}</>;

  const colors = COLORS[current.type];

  return (
    <>
      {children}
      <Animated.View
        style={[
          s.container,
          { transform: [{ translateY }], opacity, backgroundColor: colors.bg, borderColor: colors.border },
        ]}
        pointerEvents="none"
      >
        <Ionicons name={colors.iconName as any} size={22} color={colors.icon} />
        <View style={s.textArea}>
          <Text style={[s.title, { color: colors.icon }]}>{current.title}</Text>
          {current.message && <Text style={s.message}>{current.message}</Text>}
        </View>
      </Animated.View>
    </>
  );
}

const s = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 54,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 9999,
  },
  textArea: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700' },
  message: { fontSize: 13, color: '#64748b', marginTop: 2 },
});
