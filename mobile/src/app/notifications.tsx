import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import api from '../services/api';
import { toast } from '../components/Toast';

export default function NotificationsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);

  useFocusEffect(useCallback(() => { load(); }, []));

  const load = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.data || res.data);
    } catch {
      toast({ type: 'error', title: 'Erro ao carregar notificações' });
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await api.post(`/notifications/${id}/read`);
      // Update local state instead of full reload for speed
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
    } catch {}
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
      toast({ type: 'success', title: 'Todas lidas' });
    } catch {}
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#10b981" /></View>;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Notificações</Text>
        </View>
        <TouchableOpacity onPress={markAllAsRead} style={s.readAllBtn}>
          <Ionicons name="checkmark-done" size={20} color="#10b981" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={s.list}
        renderItem={({ item }) => {
          const isUnread = !item.read_at;
          return (
            <TouchableOpacity 
              style={[s.card, isUnread && s.cardUnread]} 
              onPress={() => isUnread && markAsRead(item.id)}
              activeOpacity={isUnread ? 0.7 : 1}
            >
              <View style={[s.iconBox, { backgroundColor: isUnread ? '#d1fae5' : '#f1f5f9' }]}>
                <Ionicons name="notifications" size={18} color={isUnread ? '#10b981' : '#94a3b8'} />
              </View>
              <View style={s.info}>
                <Text style={[s.cardTitle, isUnread && { color: '#0f172a', fontWeight: '700' }]}>{item.data?.title || 'Notificação'}</Text>
                <Text style={s.cardMsg}>{item.data?.message || ''}</Text>
                <Text style={s.cardDate}>{new Date(item.created_at).toLocaleString('pt-BR')}</Text>
              </View>
              {isUnread && <View style={s.dot} />}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={s.emptyBox}>
            <Ionicons name="notifications-off-outline" size={48} color="#cbd5e1" />
            <Text style={s.emptyTxt}>Você não tem notificações.</Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  readAllBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  list: { padding: 20, paddingBottom: 100 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9', gap: 14 },
  cardUnread: { borderColor: '#d1fae5', backgroundColor: '#f0fdf4' },
  iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#64748b', marginBottom: 2 },
  cardMsg: { fontSize: 13, color: '#64748b', lineHeight: 18, marginBottom: 6 },
  cardDate: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10b981' },
  emptyBox: { alignItems: 'center', padding: 60, gap: 16 },
  emptyTxt: { fontSize: 15, color: '#94a3b8', fontWeight: '500' },
});
