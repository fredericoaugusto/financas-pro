import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, ScrollView, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import api from '../services/api';
import { toast } from '../components/Toast';
import EmptyState from '../components/EmptyState';

const FREQ_OPTIONS = [
  { label: 'Diário', value: 'daily' },
  { label: 'Semanal', value: 'weekly' },
  { label: 'Mensal', value: 'monthly' },
  { label: 'Anual', value: 'yearly' },
];

const FREQ_LABELS: Record<string, string> = {
  daily: 'Diário', weekly: 'Semanal', monthly: 'Mensal', yearly: 'Anual',
};

export default function RecurringScreen() {
  const router = useRouter();
  const [recurrences, setRecurrences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [type, setType] = useState<'despesa' | 'receita'>('despesa');
  const [description, setDescription] = useState('');
  const [value, setValue] = useState('');
  const [originType, setOriginType] = useState<'account' | 'card'>('account');
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
    api.get('/accounts').then(r => setAccounts(r.data.data || r.data)).catch(() => {});
    api.get('/cards').then(r => setCards(r.data.data || r.data)).catch(() => {});
    api.get('/categories').then(r => setCategories(r.data.data || r.data)).catch(() => {});
  }, []));

  const load = async () => {
    try { const res = await api.get('/recurring-transactions'); setRecurrences(res.data.data || res.data); }
    catch { toast({ type: 'error', title: 'Erro' }); }
    finally { setLoading(false); }
  };

  const handleValueChange = (text: string) => {
    const digits = text.replace(/\D/g, '');
    if (!digits) { setValue(''); return; }
    const v = (parseInt(digits, 10) / 100).toFixed(2);
    setValue(v.replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
  };

  const openCreate = () => {
    setEditingId(null);
    setType('despesa');
    setDescription('');
    setValue('');
    setOriginType('account');
    setOriginId(null);
    setCategoryId(null);
    setFrequency('monthly');
    setIntervalVal('1');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate('');
    setShowForm(true);
  };

  const openEdit = (item: any) => {
    setEditingId(item.id);
    setType(item.type || 'despesa');
    setDescription(item.description || '');
    const v = parseFloat(item.value || 0);
    setValue(v.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
    setOriginType(item.card_id ? 'card' : 'account');
    setOriginId(item.card_id || item.account_id || null);
    setCategoryId(item.category_id || null);
    setFrequency(item.frequency || 'monthly');
    setIntervalVal(String(item.interval || 1));
    setStartDate(item.start_date || new Date().toISOString().split('T')[0]);
    setEndDate(item.end_date || '');
    setShowForm(true);
  };

  const toggleStatus = async (item: any) => {
    const action = item.status === 'active' ? 'pause' : 'resume';
    try {
      await api.post(`/recurring-transactions/${item.id}/${action}`);
      toast({ type: 'success', title: action === 'pause' ? 'Pausado' : 'Reativado' });
      load();
    } catch { toast({ type: 'error', title: 'Erro' }); }
  };

  const handleDelete = (id: number) => {
    Alert.alert('Excluir Recorrência', 'Tem certeza? Esta ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/recurring-transactions/${id}`);
            toast({ type: 'success', title: 'Recorrência excluída!' });
            load();
          } catch { toast({ type: 'error', title: 'Erro ao excluir' }); }
        }
      }
    ]);
  };

  const handleSave = async () => {
    if (!description || !value || !originId || !categoryId) {
      toast({ type: 'warning', title: 'Preencha os campos obrigatórios' }); return;
    }
    setSaving(true);
    const payload = {
      type,
      description,
      value: parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0,
      account_id: originType === 'account' ? originId : null,
      card_id: originType === 'card' ? originId : null,
      category_id: categoryId,
      frequency,
      interval: parseInt(interval, 10),
      start_date: startDate,
      end_date: endDate || null,
    };
    try {
      if (editingId) {
        await api.put(`/recurring-transactions/${editingId}`, payload);
        toast({ type: 'success', title: 'Recorrência atualizada!' });
      } else {
        await api.post('/recurring-transactions', payload);
        toast({ type: 'success', title: 'Recorrência criada!' });
      }
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
          <TouchableOpacity style={s.addBtn} onPress={openCreate}>
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {showForm && (
        <ScrollView style={s.formCard} contentContainerStyle={{ gap: 12, paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
          <View style={s.formHeaderRow}>
            <Text style={s.formTitle}>{editingId ? 'Editar Recorrência' : 'Nova Recorrência'}</Text>
            <TouchableOpacity onPress={() => setShowForm(false)} style={s.closeForm}>
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={s.typeRow}>
            {['despesa', 'receita'].map(t => (
              <TouchableOpacity key={t} style={[s.typeBtn, type === t && { backgroundColor: t === 'despesa' ? '#fee2e2' : '#dcfce7', borderColor: t === 'despesa' ? '#ef4444' : '#10b981' }]} onPress={() => setType(t as any)}>
                <Ionicons name={t === 'despesa' ? 'arrow-down' : 'arrow-up'} size={18} color={type === t ? (t === 'despesa' ? '#ef4444' : '#10b981') : '#94a3b8'} />
                <Text style={[s.typeTxt, type === t && { color: t === 'despesa' ? '#ef4444' : '#10b981' }]}>{t === 'despesa' ? 'Despesa' : 'Receita'}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput style={s.input} placeholder="Descrição *" value={description} onChangeText={setDescription} placeholderTextColor="#cbd5e1" />

          <View style={s.inputIconWrap}>
            <Text style={s.prefixTxt}>R$</Text>
            <TextInput style={s.inputClean} placeholder="0,00" value={value} onChangeText={handleValueChange} keyboardType="numeric" placeholderTextColor="#cbd5e1" />
          </View>

          <Text style={s.label}>Origem do pagamento *</Text>
          <View style={s.originRow}>
            <TouchableOpacity style={[s.originBtn, originType === 'account' && s.originBtnActive]} onPress={() => { setOriginType('account'); setOriginId(null); }}>
              <Ionicons name="wallet-outline" size={16} color={originType === 'account' ? '#10b981' : '#64748b'} />
              <Text style={[s.originTxt, originType === 'account' && s.originTxtActive]}>Conta</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.originBtn, originType === 'card' && s.originBtnActive]} onPress={() => { setOriginType('card'); setOriginId(null); }}>
              <Ionicons name="card-outline" size={16} color={originType === 'card' ? '#10b981' : '#64748b'} />
              <Text style={[s.originTxt, originType === 'card' && s.originTxtActive]}>Cartão</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
            {(originType === 'account' ? accounts : cards).map((item: any) => (
              <TouchableOpacity key={item.id} style={[s.pill, originId === item.id && s.pillActive]} onPress={() => setOriginId(item.id)}>
                <Text style={[s.pillTxt, originId === item.id && s.pillTxtActive]}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={s.label}>Categoria *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
            {categories.map((item: any) => (
              <TouchableOpacity key={item.id} style={[s.pill, categoryId === item.id && s.pillActive]} onPress={() => setCategoryId(item.id)}>
                <Text style={[s.pillTxt, categoryId === item.id && s.pillTxtActive]}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={s.label}>Frequência *</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {FREQ_OPTIONS.map(opt => (
              <TouchableOpacity key={opt.value} style={[s.pill, frequency === opt.value && s.pillActive]} onPress={() => setFrequency(opt.value)}>
                <Text style={[s.pillTxt, frequency === opt.value && s.pillTxtActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>A cada</Text>
              <View style={s.inputSuffix}>
                <TextInput style={s.inputClean} placeholder="1" value={interval} onChangeText={setIntervalVal} keyboardType="numeric" placeholderTextColor="#cbd5e1" />
                <Text style={s.suffixTxt}>{FREQ_LABELS[frequency] || 'vez'}</Text>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Data de início *</Text>
              <TextInput style={s.input} placeholder="AAAA-MM-DD" value={startDate} onChangeText={setStartDate} placeholderTextColor="#cbd5e1" />
            </View>
          </View>

          <Text style={s.label}>Término (opcional)</Text>
          <TextInput style={s.input} placeholder="AAAA-MM-DD" value={endDate} onChangeText={setEndDate} placeholderTextColor="#cbd5e1" />

          <View style={s.formActions}>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setShowForm(false)}><Text style={s.cancelTxt}>Cancelar</Text></TouchableOpacity>
            <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveTxt}>{editingId ? 'Salvar Alterações' : 'Criar Recorrência'}</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {!showForm && (
        <FlatList
          data={recurrences}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isExp = item.type === 'despesa';
            const isActive = item.status === 'active';
            const freqLabel = FREQ_LABELS[item.frequency] || item.frequency;
            return (
              <View style={[s.card, !isActive && { opacity: 0.65 }]}>
                <View style={s.cardTop}>
                  <View style={[s.iconBox, { backgroundColor: isExp ? '#fee2e2' : '#dcfce7' }]}>
                    <Ionicons name="repeat" size={18} color={isExp ? '#ef4444' : '#10b981'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardDesc}>{item.description}</Text>
                    <Text style={s.cardFreq}>{freqLabel} • Dia {item.day_of_month}</Text>
                    {item.category?.name && (
                      <View style={s.catBadge}>
                        <Text style={s.catBadgeTxt}>{item.category.name}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[s.cardVal, { color: isExp ? '#ef4444' : '#10b981' }]}>
                    R$ {parseFloat(item.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
                <View style={s.cardBot}>
                  <View style={[s.statusBadge, { backgroundColor: isActive ? '#dcfce7' : '#f1f5f9' }]}>
                    <View style={[s.statusDot, { backgroundColor: isActive ? '#10b981' : '#94a3b8' }]} />
                    <Text style={[s.statusTxt, { color: isActive ? '#10b981' : '#64748b' }]}>{isActive ? 'Ativa' : 'Pausada'}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity style={s.actBtn} onPress={() => openEdit(item)}>
                      <Ionicons name="create-outline" size={14} color="#64748b" />
                      <Text style={s.actTxt}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.actBtn} onPress={() => toggleStatus(item)}>
                      <Ionicons name={isActive ? 'pause' : 'play'} size={14} color="#64748b" />
                      <Text style={s.actTxt}>{isActive ? 'Pausar' : 'Retomar'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.actBtn, { backgroundColor: '#fee2e2' }]} onPress={() => handleDelete(item.id)}>
                      <Ionicons name="trash-outline" size={14} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={<EmptyState icon="repeat-outline" title="Nenhuma recorrência" subtitle="Crie uma recorrência para despesas ou receitas fixas." actionLabel="Criar Recorrência" onAction={openCreate} />}
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
  formCard: { backgroundColor: '#fff', margin: 20, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#f1f5f9', maxHeight: '85%', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
  formHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  formTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  closeForm: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 12, fontWeight: '600', color: '#64748b', marginLeft: 4 },
  input: { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, backgroundColor: '#f8fafc', paddingHorizontal: 16, height: 48, fontSize: 15, color: '#0f172a' },
  inputIconWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, backgroundColor: '#f8fafc', paddingHorizontal: 14, height: 48, gap: 10 },
  inputClean: { flex: 1, fontSize: 15, color: '#0f172a' },
  prefixTxt: { fontSize: 15, fontWeight: '700', color: '#94a3b8' },
  inputSuffix: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, backgroundColor: '#f8fafc', paddingHorizontal: 14, height: 48 },
  suffixTxt: { fontSize: 13, color: '#64748b', fontWeight: '500', marginLeft: 8 },
  typeRow: { flexDirection: 'row', gap: 12 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  typeTxt: { fontSize: 14, fontWeight: '700', color: '#94a3b8' },
  originRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
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
  list: { padding: 20, paddingBottom: 100 },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  iconBox: { width: 42, height: 42, borderRadius: 13, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  cardDesc: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 2 },
  cardFreq: { fontSize: 13, color: '#64748b' },
  catBadge: { backgroundColor: '#f1f5f9', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 6 },
  catBadgeTxt: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  cardVal: { fontSize: 16, fontWeight: '800', flexShrink: 0 },
  cardBot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f8fafc', paddingTop: 14 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusTxt: { fontSize: 12, fontWeight: '700' },
  actBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#f8fafc', borderRadius: 9, borderWidth: 1, borderColor: '#f1f5f9' },
  actTxt: { fontSize: 12, fontWeight: '600', color: '#64748b' },
});
