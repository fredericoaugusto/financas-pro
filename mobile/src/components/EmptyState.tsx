import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

export default function EmptyState({ icon, title, subtitle, actionLabel, onAction, compact }: Props) {
  return (
    <View style={[s.root, compact && s.rootCompact]}>
      <View style={[s.iconBg, compact && s.iconBgCompact]}>
        <Ionicons name={icon} size={compact ? 32 : 44} color="#cbd5e1" />
      </View>
      <Text style={[s.title, compact && s.titleCompact]}>{title}</Text>
      {subtitle && <Text style={[s.subtitle, compact && s.subtitleCompact]}>{subtitle}</Text>}
      {actionLabel && onAction && (
        <TouchableOpacity style={s.btn} onPress={onAction} activeOpacity={0.85}>
          <Ionicons name="add-circle-outline" size={18} color="#fff" />
          <Text style={s.btnTxt}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { alignItems: 'center', paddingVertical: 52, paddingHorizontal: 32, gap: 10 },
  rootCompact: { paddingVertical: 28 },
  iconBg: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#f8fafc',
    borderWidth: 2, borderColor: '#f1f5f9',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 8,
  },
  iconBgCompact: { width: 64, height: 64, borderRadius: 32, marginBottom: 4 },
  title: { fontSize: 18, fontWeight: '700', color: '#475569', textAlign: 'center' },
  titleCompact: { fontSize: 15 },
  subtitle: { fontSize: 14, color: '#94a3b8', textAlign: 'center', lineHeight: 22, maxWidth: 260 },
  subtitleCompact: { fontSize: 13, lineHeight: 18 },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#10b981',
    paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 14, marginTop: 20,
    shadowColor: '#10b981', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  btnTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
