import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import api from '../services/api';
import { toast } from '../components/Toast';
import EmptyState from '../components/EmptyState';

export default function RecurringScreen() {
  const router = useRouter();
  const [recurrences, setRecurrences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<'despesa'|'receita'>('despesa');
  const [description, setDescription] = useState('');
  const [value, setValue] = useState('');
  const [originType, setOriginType] = useState<'account'|'card'>('account');
  const [originId, setOriginId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [frequency, setFrequency] = useState('monthly');
  const [interval, setIntervalVal] = useState('1');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);

  // Data
  const [accounts, setAccounts] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  useFocusEffect(useCallback(() => { 
    load(); 
    api.get('/accounts').then(r => setAccounts(r.data.data||r.data)).catch(()=>{});
    api.get('/cards').then(r => setCards(r.data.data||r.data)).catch(()=>{});
    api.get('/categories').then(r => setCategories(r.data.data||r.data)).catch(()=>{});
  }, []));

  const load = async () => {
    try { const res = await api.get('/recurring-transactions'); setRecurrences(res.data.data || res.data); }
    catch { toast({ type: 'error', title: 'Erro' }); }
    finally { setLoading(false); }
  };

  const toggleStatus = async (item: any) => {
    const action = item.status === 'active' ? 'pause' : 'resume';
    try {
      await api.post(`/recurring-transactions/${item.id}/${action}`);
      toast({ type: 'success', title: action === 'pause' ? 'Pausado' : 'Reativado' });
      load();
    } catch { toast({ type: 'error', title: 'Erro' }); }
  };

  const handleSave = async () => {
    if (!description || !value || !originId || !categoryId) {
      toast({ type: 'warning', title: 'Preencha os campos obrigatórios' }); return;
    }
    setSaving(true);
    try {
      await api.post('/recurring-transactions', {
        type,
        description,
        value: parseFloat(value.replace(',', '.')) || 0,
        account_id: originType === 'account' ? originId : null,
        card_id: originType === 'card' ? originId : null,
        category_id: categoryId,
        frequency,
        interval: parseInt(interval, 10),
        start_date: startDate,
        end_date: endDate || null
      });
      toast({ type: 'success', title: 'Recorrência criada!' });
      setShowForm(false);
      load();
    } catch (e: any) {
      toast({ type: 'error', title: 'Erro', message: e.response?.data?.message || 'Erro ao salvar' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#10b981" /></View>;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Ionicons name="arrow-back" size={22} color="#0f172a" /></TouchableOpacity>
        <View style={{ flex: 1 }}><Text style={s.title}>Recorrências</Text><Text style={s.sub}>Assinaturas e despesas fixas</Text></View>
        {!showForm && (
          <TouchableOpacity style={s.addBtn} onPress={() => setShowForm(true)}>
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {showForm && (
        <ScrollView style={s.formCard} contentContainerStyle={{ gap: 12, paddingBottom: 20 }}>
          <Text style={s.formTitle}>Nova Recorrência</Text>
          
          <View style={s.typeRow}>
            {['despesa', 'receita'].map(t => (
              <TouchableOpacity key={t} style={[s.typeBtn, type === t && { backgroundColor: t==='despesa'?'#fee2e2':'#dcfce7', borderColor: t==='despesa'?'#ef4444':'#10b981' }]} onPress={() => setType(t as any)}>
                <Ionicons name={t==='despesa'?'arrow-down':'arrow-up'} size={18} color={type===t ? (t==='despesa'?'#ef4444':'#10b981') : '#94a3b8'} />
                <Text style={[s.typeTxt, type === t && { color: t==='despesa'?'#ef4444':'#10b981' }]}>{t==='despesa'?'Despesa':'Receita'}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput style={s.input} placeholder="Descrição *" value={description} onChangeText={setDescription} />
          <TextInput style={s.input} placeholder="Valor *" value={value} onChangeText={setValue} keyboardType="numeric" />

          <Text style={s.label}>Origem do pagamento *</Text>
          <View style={s.originRow}>
            <TouchableOpacity style={[s.originBtn, originType==='account' && s.originBtnActive]} onPress={()=>{setOriginType('account');setOriginId(null);}}>
              <Ionicons name="wallet-outline" size={16} color={originType==='account'?'#10b981':'#64748b'} />
              <Text style={[s.originTxt, originType==='account' && s.originTxtActive]}>Conta</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.originBtn, originType==='card' && s.originBtnActive]} onPress={()=>{setOriginType('card');setOriginId(null);}}>
              <Ionicons name="card-outline" size={16} color={originType==='card'?'#10b981':'#64748b'} />
              <Text style={[s.originTxt, originType==='card' && s.originTxtActive]}>Cartão</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
            {(originType === 'account' ? accounts : cards).map((item:any) => (
              <TouchableOpacity key={item.id} style={[s.pill, originId === item.id && s.pillActive]} onPress={() => setOriginId(item.id)}>
                <Text style={[s.pillTxt, originId === item.id && s.pillTxtActive]}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={s.label}>Categoria *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
            {categories.map((item:any) => (
              <TouchableOpacity key={item.id} style={[s.pill, categoryId === item.id && s.pillActive]} onPress={() => setCategoryId(item.id)}>
                <Text style={[s.pillTxt, categoryId === item.id && s.pillTxtActive]}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Frequência *</Text>
              <TextInput style={s.input} placeholder="Ex: monthly" value={frequency} onChangeText={setFrequency} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>A cada *</Text>
              <View style={s.inputSuffix}>
                <TextInput style={s.inputClean} placeholder="1" value={interval} onChangeText={setIntervalVal} keyboardType="numeric" />
                <Text style={s.suffixTxt}>mês(es)</Text>
              </View>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Data de início *</Text>
              <TextInput style={s.input} placeholder="AAAA-MM-DD" value={startDate} onChangeText={setStartDate} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Término (opcional)</Text>
              <TextInput style={s.input} placeholder="AAAA-MM-DD" value={endDate} onChangeText={setEndDate} />
            </View>
          </View>

          <View style={s.formActions}>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setShowForm(false)}><Text style={s.cancelTxt}>Cancelar</Text></TouchableOpacity>
            <TouchableOpacity style={s.saveBtn} onPress={handleSave}><Text style={s.saveTxt}>{saving ? 'Salvando...' : 'Criar Recorrência'}</Text></TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {!showForm && (
        <FlatList
        data={recurrences}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={s.list}
        renderItem={({ item }) => {
          const isExp = item.type === 'despesa';
          const isActive = item.status === 'active';
          return (
            <View style={[s.card, !isActive && { opacity: 0.6 }]}>
              <View style={s.cardTop}>
                <View style={[s.iconBox, { backgroundColor: isExp ? '#fee2e2' : '#dcfce7' }]}><Ionicons name="repeat" size={18} color={isExp ? '#ef4444' : '#10b981'} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardDesc}>{item.description}</Text>
                  <Text style={s.cardFreq}>A cada {item.frequency} meses (Dia {item.day_of_month})</Text>
                </View>
                <Text style={[s.cardVal, { color: isExp ? '#ef4444' : '#10b981' }]}>R$ {parseFloat(item.value).toFixed(2)}</Text>
              </View>
              <View style={s.cardBot}>
                <View style={[s.statusBadge, { backgroundColor: isActive ? '#dcfce7' : '#f1f5f9' }]}>
                  <Text style={[s.statusTxt, { color: isActive ? '#10b981' : '#64748b' }]}>{isActive ? 'Ativa' : 'Pausada'}</Text>
                </View>
                <TouchableOpacity style={s.actBtn} onPress={() => toggleStatus(item)}>
                  <Ionicons name={isActive ? "pause" : "play"} size={14} color="#64748b" />
                  <Text style={s.actTxt}>{isActive ? 'Pausar' : 'Retomar'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<EmptyState icon="repeat-outline" title="Nenhuma recorrência" subtitle="Lançamentos fixos aparecerão aqui." />}
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
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center' },
  formCard: { backgroundColor: '#fff', margin: 20, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#f1f5f9', maxHeight: '80%' },
  formTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  label: { fontSize: 12, fontWeight: '600', color: '#64748b', marginLeft: 4, marginBottom: -6, zIndex: 1 },
  input: { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, backgroundColor: '#f8fafc', paddingHorizontal: 16, height: 48, fontSize: 15, color: '#0f172a' },
  inputSuffix: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, backgroundColor: '#f8fafc', paddingHorizontal: 14, height: 48 },
  inputClean: { flex: 1, fontSize: 15, color: '#0f172a' },
  suffixTxt: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  typeRow: { flexDirection: 'row', gap: 12 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  typeTxt: { fontSize: 14, fontWeight: '700', color: '#94a3b8' },
  originRow: { flexDirection: 'row', gap: 12, marginTop: 6 },
  originBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#fff' },
  originBtnActive: { borderColor: '#10b981', backgroundColor: '#f0fdf4' },
  originTxt: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  originTxtActive: { color: '#10b981' },
  pill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: '#f1f5f9', marginRight: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  pillActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  pillTxt: { fontSize: 13, fontWeight: '600', color: '#64748b' }, pillTxtActive: { color: '#fff' },
  formActions: { flexDirection: 'row', gap: 12, marginTop: 12 },
  cancelBtn: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' }, cancelTxt: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  saveBtn: { flex: 1, height: 44, borderRadius: 12, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center' }, saveTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
  list: { padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cardDesc: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 2 }, cardFreq: { fontSize: 13, color: '#64748b' },
  cardVal: { fontSize: 16, fontWeight: '800' },
  cardBot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f8fafc', paddingTop: 16 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }, statusTxt: { fontSize: 12, fontWeight: '700' },
  actBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8, backgroundColor: '#f8fafc', borderRadius: 8 }, actTxt: { fontSize: 13, fontWeight: '600', color: '#64748b' }
});
