import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import api from '../services/api';

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

export default function CalendarScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());

  useFocusEffect(useCallback(() => { loadData(); }, [month, year]));

  const loadData = async () => {
    setLoading(true);
    try {
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`;

      const res = await api.get('/calendar', { params: { start: startDate, end: endDate } });
      setEvents(res.data.events || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const changeMonth = (d: 1 | -1) => {
    let m = month + d, y = year;
    if (m > 11) { m = 0; y++; }
    if (m < 0)  { m = 11; y--; }
    setMonth(m); setYear(y);
  };

  // Group events by day
  const grouped = events.reduce((acc: any, curr: any) => {
    const day = curr.date.split('-')[2];
    if (!acc[day]) acc[day] = [];
    acc[day].push(curr);
    return acc;
  }, {});

  const daysList = Object.keys(grouped).sort((a,b) => parseInt(a) - parseInt(b)).map(day => ({
    day,
    data: grouped[day]
  }));

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Ionicons name="arrow-back" size={22} color="#0f172a" /></TouchableOpacity>
        <View style={{ flex: 1 }}><Text style={s.title}>Calendário</Text><Text style={s.sub}>Seus compromissos financeiros</Text></View>
      </View>

      <View style={s.monthRow}>
        <TouchableOpacity onPress={() => changeMonth(-1)} style={s.monthArrow}><Ionicons name="chevron-back" size={20} color="#64748b" /></TouchableOpacity>
        <Text style={s.monthLabel}>{MONTHS[month]} / {year}</Text>
        <TouchableOpacity onPress={() => changeMonth(1)} style={s.monthArrow}><Ionicons name="chevron-forward" size={20} color="#64748b" /></TouchableOpacity>
      </View>

      {loading ? <View style={s.center}><ActivityIndicator size="large" color="#10b981" /></View> : (
        <FlatList
          data={daysList}
          keyExtractor={item => item.day}
          contentContainerStyle={s.list}
          renderItem={({ item }) => (
            <View style={s.dayGroup}>
              <View style={s.dayCircle}><Text style={s.dayTxt}>{item.day}</Text></View>
              <View style={s.eventsCol}>
                {item.data.map((ev: any, i: number) => {
                  const isExp = ev.type === 'despesa';
                  return (
                    <View key={i} style={s.evCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.evTitle}>{ev.title}</Text>
                        <Text style={s.evType}>{ev.item_type === 'transaction' ? 'Lançamento' : 'Recorrência'}</Text>
                      </View>
                      <Text style={[s.evVal, { color: isExp ? '#ef4444' : '#10b981' }]}>
                        {isExp ? '-' : '+'}R$ {parseFloat(ev.value).toFixed(2)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={s.emptyBox}>
              <Ionicons name="calendar-outline" size={48} color="#cbd5e1" />
              <Text style={s.emptyTxt}>Nenhum lançamento neste mês.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' }, center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: '#0f172a' }, sub: { fontSize: 13, color: '#64748b', marginTop: 2 },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  monthArrow: { padding: 12 }, monthLabel: { fontSize: 16, fontWeight: '700', color: '#0f172a', width: 100, textAlign: 'center' },
  list: { padding: 20, paddingBottom: 100 },
  dayGroup: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  dayCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  dayTxt: { fontSize: 16, fontWeight: '800', color: '#fff' },
  eventsCol: { flex: 1, gap: 10 },
  evCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9' },
  evTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  evType: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  evVal: { fontSize: 15, fontWeight: '800' },
  emptyBox: { alignItems: 'center', padding: 40, gap: 12 },
  emptyTxt: { fontSize: 15, color: '#94a3b8', fontWeight: '500' }
});
