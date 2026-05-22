import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';

const MENU_ITEMS = [
  {
    group: 'Financeiro',
    items: [
      { label: 'Contas',       icon: 'wallet-outline'       as const, route: '/accounts' },
      { label: 'Cartões',      icon: 'card-outline'         as const, route: '/cards' },
      { label: 'Recorrências', icon: 'repeat-outline'       as const, route: '/recurring' },
      { label: 'Orçamentos',   icon: 'pie-chart-outline'    as const, route: '/budgets' },
      { label: 'Objetivos',    icon: 'flag-outline'         as const, route: '/goals' },
    ],
  },
  {
    group: 'Análise',
    items: [
      { label: 'Insights',    icon: 'bulb-outline'      as const, route: '/insights' },
      { label: 'Calendário',  icon: 'calendar-outline'  as const, route: '/calendar' },
      { label: 'Gráficos',    icon: 'bar-chart-outline' as const, route: '/charts' },
    ],
  },
  {
    group: 'Configurações',
    items: [
      { label: 'Categorias',    icon: 'pricetag-outline'  as const, route: '/categories' },
      { label: 'Configurações', icon: 'settings-outline'  as const, route: '/settings' },
    ],
  },
];

export default function MenuScreen() {
  const router = useRouter();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.title}>Menu</Text>
        <Text style={s.sub}>Acesso rápido às funcionalidades</Text>
      </View>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {MENU_ITEMS.map(group => (
          <View key={group.group} style={s.group}>
            <Text style={s.groupTitle}>{group.group}</Text>
            <View style={s.groupCard}>
              {group.items.map((item, i) => (
                <TouchableOpacity
                  key={item.label}
                  style={[s.menuRow, i < group.items.length - 1 && s.menuRowBorder]}
                  onPress={() => item.route ? router.push(item.route as any) : {}}
                  activeOpacity={0.7}
                >
                  <View style={s.menuIconBg}>
                    <Ionicons name={item.icon} size={20} color="#10b981" />
                  </View>
                  <Text style={s.menuLabel}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Logout */}
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={s.logoutTxt}>Sair da conta</Text>
        </TouchableOpacity>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  header: { backgroundColor: '#fff', paddingTop: 56, paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  sub: { fontSize: 14, color: '#64748b', marginTop: 2 },
  scroll: { padding: 20 },
  group: { marginBottom: 20 },
  groupTitle: { fontSize: 12, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 },
  groupCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, gap: 14 },
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  menuIconBg: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#d1fae5', justifyContent: 'center', alignItems: 'center' },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1e293b' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#fee2e2', padding: 16, marginTop: 4 },
  logoutTxt: { fontSize: 15, fontWeight: '700', color: '#ef4444' },
});
