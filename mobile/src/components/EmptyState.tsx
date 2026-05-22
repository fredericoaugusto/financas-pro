import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon, title, subtitle, actionLabel, onAction }: Props) {
  return (
    <View style={s.root}>
      <View style={s.iconBg}>
        <Ionicons name={icon} size={48} color="#cbd5e1" />
      </View>
      <Text style={s.title}>{title}</Text>
      {subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
      {actionLabel && onAction && (
        <TouchableOpacity style={s.btn} onPress={onAction} activeOpacity={0.85}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={s.btnTxt}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32, gap: 8 },
  iconBg: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 8,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#64748b', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#94a3b8', textAlign: 'center', lineHeight: 20 },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#10b981',
    paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 12, marginTop: 16,
  },
  btnTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
