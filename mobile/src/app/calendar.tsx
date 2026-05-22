import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import api from '../services/api';

const { width: SW } = Dimensions.get('window');
const CELL_SIZE = Math.floor((SW - 40 - 32) / 7); // 7 colunas, padding 20 cada lado, gap 16 internos
const MONTHS_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const WEEK_DAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

export default function CalendarScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());

  useFocusEffect(useCallback(() => { loadData(); }, [month, year]));

  const loadData = async () => {
    setLoading(true);
    setSelectedDay(null);
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

  // Build calendar grid
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7;

  const eventsByDay: Record<number, any[]> = {};
  events.forEach(ev => {
    const d = parseInt(ev.date.split('-')[2], 10);
    if (!eventsByDay[d]) eventsByDay[d] = [];
    eventsByDay[d].push(ev);
  });

  const isToday = (day: number) =>
    day === now.getDate() && month === now.getMonth() && year === now.getFullYear();

  const selectedDayEvents = selectedDay ? (eventsByDay[selectedDay] || []) : [];

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Calendário</Text>
          <Text style={s.sub}>Seus compromissos financeiros</Text>
        </View>
      </View>

      {/* Month Navigator */}
      <View style={s.monthRow}>
        <TouchableOpacity onPress={() => changeMonth(-1)} style={s.monthArrow} hitSlop={{ top: 12, bottom: 12, left: 12, right: 4 }}>
          <Ionicons name="chevron-back" size={22} color="#64748b" />
        </TouchableOpacity>
        <Text style={s.monthLabel}>{MONTHS_FULL[month]} {year}</Text>
        <TouchableOpacity onPress={() => changeMonth(1)} style={s.monthArrow} hitSlop={{ top: 12, bottom: 12, left: 4, right: 12 }}>
          <Ionicons name="chevron-forward" size={22} color="#64748b" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color="#10b981" /></View>
      ) : (
        <FlatList
          data={[0]} // single item to render everything in a scroll
          keyExtractor={() => 'calendar'}
          showsVerticalScrollIndicator={false}
          renderItem={() => (
            <View>
              {/* Calendar Grid */}
              <View style={s.gridCard}>
                {/* Week day headers */}
                <View style={s.weekRow}>
                  {WEEK_DAYS.map(d => (
                    <Text key={d} style={s.weekDay}>{d}</Text>
                  ))}
                </View>

                {/* Day cells */}
                <View style={s.calGrid}>
                  {Array.from({ length: totalCells }).map((_, idx) => {
                    const day = idx - firstDayOfWeek + 1;
                    const isValid = day >= 1 && day <= daysInMonth;
                    const hasEvents = isValid && !!eventsByDay[day];
                    const isSelected = isValid && selectedDay === day;
                    const todayCell = isValid && isToday(day);

                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          s.dayCell,
                          isSelected && s.dayCellSelected,
                          todayCell && !isSelected && s.dayCellToday,
                        ]}
                        onPress={() => isValid && setSelectedDay(isSelected ? null : day)}
                        disabled={!isValid}
                        activeOpacity={isValid ? 0.7 : 1}
                      >
                        {isValid && (
                          <>
                            <Text style={[
                              s.dayNum,
                              isSelected && s.dayNumSelected,
                              todayCell && !isSelected && s.dayNumToday,
                              !isValid && s.dayNumEmpty,
                            ]}>{day}</Text>
                            {hasEvents && (
                              <View style={s.dotsRow}>
                                {eventsByDay[day].slice(0, 3).map((ev: any, i: number) => (
                                  <View
                                    key={i}
                                    style={[s.dot, { backgroundColor: ev.type === 'despesa' ? '#ef4444' : '#10b981' }]}
                                  />
                                ))}
                              </View>
                            )}
                          </>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Selected day events */}
              {selectedDay && (
                <View style={s.eventsList}>
                  <View style={s.eventsHeader}>
                    <Text style={s.eventsTitle}>
                      {selectedDay} de {MONTHS_FULL[month]}
                    </Text>
                    <Text style={s.eventsCount}>{selectedDayEvents.length} evento{selectedDayEvents.length !== 1 ? 's' : ''}</Text>
                  </View>
                  {selectedDayEvents.length === 0 ? (
                    <View style={s.emptyDay}>
                      <Ionicons name="calendar-outline" size={32} color="#cbd5e1" />
                      <Text style={s.emptyDayTxt}>Nenhum evento neste dia</Text>
                    </View>
                  ) : (
                    selectedDayEvents.map((ev: any, i: number) => {
                      const isExp = ev.type === 'despesa';
                      return (
                        <View key={i} style={s.evCard}>
                          <View style={[s.evLine, { backgroundColor: isExp ? '#ef4444' : '#10b981' }]} />
                          <View style={[s.evIcon, { backgroundColor: isExp ? '#fee2e2' : '#dcfce7' }]}>
                            <Ionicons name={ev.item_type === 'transaction' ? (isExp ? 'arrow-down' : 'arrow-up') : 'repeat'} size={16} color={isExp ? '#ef4444' : '#10b981'} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={s.evTitle}>{ev.title}</Text>
                            <Text style={s.evType}>{ev.item_type === 'transaction' ? 'Lançamento' : 'Recorrência'}</Text>
                          </View>
                          <Text style={[s.evVal, { color: isExp ? '#ef4444' : '#10b981' }]}>
                            {isExp ? '-' : '+'}R$ {parseFloat(ev.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </Text>
                        </View>
                      );
                    })
                  )}
                </View>
              )}

              {/* All events if nothing selected */}
              {!selectedDay && events.length === 0 && (
                <View style={s.emptyBox}>
                  <Ionicons name="calendar-outline" size={48} color="#cbd5e1" />
                  <Text style={s.emptyTxt}>Nenhum evento neste mês.</Text>
                  <Text style={s.emptySub}>Adicione lançamentos para ver aqui.</Text>
                </View>
              )}

              {!selectedDay && events.length > 0 && (
                <View style={s.eventsList}>
                  <Text style={s.eventsTitle}>Todos os eventos ({events.length})</Text>
                  {events.slice(0, 10).map((ev: any, i: number) => {
                    const isExp = ev.type === 'despesa';
                    const day = parseInt(ev.date.split('-')[2], 10);
                    return (
                      <View key={i} style={s.evCard}>
                        <View style={[s.evLine, { backgroundColor: isExp ? '#ef4444' : '#10b981' }]} />
                        <View style={[s.evIcon, { backgroundColor: isExp ? '#fee2e2' : '#dcfce7' }]}>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: isExp ? '#ef4444' : '#10b981' }}>{day}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.evTitle}>{ev.title}</Text>
                          <Text style={s.evType}>{ev.item_type === 'transaction' ? 'Lançamento' : 'Recorrência'}</Text>
                        </View>
                        <Text style={[s.evVal, { color: isExp ? '#ef4444' : '#10b981' }]}>
                          {isExp ? '-' : '+'}R$ {parseFloat(ev.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}

              <View style={{ height: 100 }} />
            </View>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: '#0f172a' }, sub: { fontSize: 13, color: '#64748b', marginTop: 2 },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  monthArrow: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  monthLabel: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  gridCard: { backgroundColor: '#fff', margin: 20, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  weekRow: { flexDirection: 'row', marginBottom: 8 },
  weekDay: { width: CELL_SIZE, textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#94a3b8', paddingVertical: 4 },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: CELL_SIZE, height: CELL_SIZE, justifyContent: 'center', alignItems: 'center', borderRadius: 10, marginBottom: 2 },
  dayCellSelected: { backgroundColor: '#10b981' },
  dayCellToday: { backgroundColor: '#f0fdf4', borderWidth: 1.5, borderColor: '#10b981' },
  dayNum: { fontSize: 13, fontWeight: '600', color: '#1e293b', lineHeight: 16 },
  dayNumSelected: { color: '#fff', fontWeight: '800' },
  dayNumToday: { color: '#10b981', fontWeight: '800' },
  dayNumEmpty: { color: 'transparent' },
  dotsRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  eventsList: { marginHorizontal: 20, marginBottom: 16 },
  eventsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  eventsTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  eventsCount: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  evCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#f1f5f9', gap: 12, overflow: 'hidden' },
  evLine: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  evIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  evTitle: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  evType: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  evVal: { fontSize: 14, fontWeight: '800', flexShrink: 0 },
  emptyDay: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  emptyDayTxt: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },
  emptyBox: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyTxt: { fontSize: 15, color: '#94a3b8', fontWeight: '600' },
  emptySub: { fontSize: 13, color: '#cbd5e1' },
});
