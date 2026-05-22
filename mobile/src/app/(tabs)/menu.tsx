import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';

const MENU_ITEMS = [
  {
    group: 'Financeiro',
    color: '#10b981',
    items: [
      { label: 'Contas',       icon: 'wallet-outline'       as const, route: '/accounts',  color: '#10b981', bg: '#dcfce7' },
      { label: 'Cartões',      icon: 'card-outline'         as const, route: '/cards',     color: '#3b82f6', bg: '#dbeafe' },
      { label: 'Recorrências', icon: 'repeat-outline'       as const, route: '/recurring', color: '#8b5cf6', bg: '#ede9fe' },
      { label: 'Orçamentos',   icon: 'pie-chart-outline'    as const, route: '/budgets',   color: '#f59e0b', bg: '#fef3c7' },
      { label: 'Objetivos',    icon: 'flag-outline'         as const, route: '/goals',     color: '#ef4444', bg: '#fee2e2' },
      { label: 'Importar OFX', icon: 'document-attach-outline' as const, route: '/import', color: '#0ea5e9', bg: '#e0f2fe' },
    ],
  },
  {
    group: 'Análise',
    color: '#3b82f6',
    items: [
      { label: 'Insights',    icon: 'bulb-outline'      as const, route: '/insights',  color: '#06b6d4', bg: '#e0f7fa' },
      { label: 'Calendário',  icon: 'calendar-outline'  as const, route: '/calendar',  color: '#8b5cf6', bg: '#ede9fe' },
      { label: 'Gráficos',    icon: 'bar-chart-outline' as const, route: '/charts',    color: '#10b981', bg: '#dcfce7' },
    ],
  },
  {
    group: 'Configurações',
    color: '#64748b',
    items: [
      { label: 'Categorias',    icon: 'pricetag-outline'  as const, route: '/categories', color: '#f97316', bg: '#ffedd5' },
      { label: 'Configurações', icon: 'settings-outline'  as const, route: '/settings',   color: '#64748b', bg: '#f1f5f9' },
      { label: 'Notificações',  icon: 'notifications-outline' as const, route: '/notifications', color: '#a855f7', bg: '#f3e8ff' },
    ],
  },
];

export default function MenuScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    router.replace('/login');
  };

  const initials = user?.name
    ?.split(' ')
    .slice(0, 2)
    .map((n: string) => n[0]?.toUpperCase())
    .join('') || 'U';

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.title}>Menu</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Card do usuário */}
        <View style={s.userCard}>
          <View style={s.avatarCircle}>
            <Text style={s.avatarTxt}>{initials}</Text>
          </View>
          <View style={s.userInfo}>
            <Text style={s.userName}>{user?.name || 'Usuário'}</Text>
            <Text style={s.userEmail}>{user?.email || ''}</Text>
          </View>
          <TouchableOpacity
            style={s.editBtn}
            onPress={() => router.push('/settings' as any)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="create-outline" size={18} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Grupos de menu */}
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
                  <View style={[s.menuIconBg, { backgroundColor: item.bg }]}>
                    <Ionicons name={item.icon} size={20} color={item.color} />
                  </View>
                  <Text style={s.menuLabel}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Logout */}
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <View style={s.logoutIcon}>
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          </View>
          <Text style={s.logoutTxt}>Sair da conta</Text>
          <Ionicons name="chevron-forward" size={16} color="#fca5a5" />
        </TouchableOpacity>

        <Text style={s.versionTxt}>FinançasPro v1.0.0</Text>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    backgroundColor: '#fff', paddingTop: 56, paddingHorizontal: 24, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  scroll: { padding: 20 },
  // User card
  userCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 24,
    gap: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  avatarCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center',
  },
  avatarTxt: { fontSize: 20, fontWeight: '800', color: '#fff' },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  userEmail: { fontSize: 13, color: '#64748b', marginTop: 2 },
  editBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  // Grupos
  group: { marginBottom: 20 },
  groupTitle: {
    fontSize: 11, fontWeight: '700', color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: 8, marginLeft: 4,
  },
  groupCard: {
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1, borderColor: '#f1f5f9', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  menuRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, gap: 14,
  },
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  menuIconBg: { width: 38, height: 38, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1e293b' },
  // Logout
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1, borderColor: '#fee2e2', padding: 16,
    marginTop: 4, gap: 14,
  },
  logoutIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: '#fee2e2', justifyContent: 'center', alignItems: 'center' },
  logoutTxt: { flex: 1, fontSize: 15, fontWeight: '700', color: '#ef4444' },
  versionTxt: { textAlign: 'center', fontSize: 12, color: '#cbd5e1', marginTop: 20, fontWeight: '500' },
});
