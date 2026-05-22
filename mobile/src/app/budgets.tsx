import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, ScrollView, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import api from '../services/api';
import { toast } from '../components/Toast';
import EmptyState from '../components/EmptyState';

export default function BudgetsScreen() {
  const router = useRouter();
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [budgetType, setBudgetType] = useState<'geral' | 'categoria'>('categoria');
  const [name, setName] = useState('');
  const [period, setPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => { load(); }, []));

  const handleAmountChange = (text: string) => {
    const digits = text.replace(/\D/g, '');
    if (!digits) { setAmount(''); return; }
    const value = (parseInt(digits, 10) / 100).toFixed(2);
    setAmount(value.replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
  };

  const load = async () => {
    try {
      const [budRes, catRes] = await Promise.all([
        api.get('/budgets/summary'),
        api.get('/categories')
      ]);
      setBudgets(budRes.data.data || budRes.data);
      setCategories(catRes.data.data || catRes.data);
    } catch { toast({ type: 'error', title: 'Erro' }); }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditingId(null);
    setBudgetType('categoria');
    setName('');
    setPeriod('monthly');
    setCategoryId(null);
    setAmount('');
    setShowForm(true);
  };

  const openEdit = (item: any) => {
    setEditingId(item.id);
    setBudgetType(item.category_id ? 'categoria' : 'geral');
    setName(item.name || '');
    setPeriod(item.period === 'annual' ? 'annual' : 'monthly');
    setCategoryId(item.category_id || null);
    const v = parseFloat(item.amount || 0);
    setAmount(v.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
    setShowForm(true);
  };

  const handleDelete = (id: number, itemName: string) => {
    Alert.alert('Excluir Orçamento', `Deseja excluir o orçamento "${itemName}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/budgets/${id}`);
            toast({ type: 'success', title: 'Orçamento excluído!' });
            load();
          } catch { toast({ type: 'error', title: 'Erro ao excluir' }); }
        }
      }
    ]);
  };

  const saveForm = async () => {
    if (!amount || (budgetType === 'categoria' && !categoryId)) {
      return toast({ type: 'warning', title: 'Preencha os campos obrigatórios' });
    }
    setSaving(true);
    try {
      const payload: any = {
        amount: parseFloat(amount.replace(/\./g, '').replace(',', '.')) || 0,
        period: budgetType === 'geral' ? period : 'monthly',
      };
      if (budgetType === 'categoria') {
        payload.category_id = categoryId;
      } else {
        payload.name = name || 'Orçamento Geral';
      }

      if (editingId) {
        await api.put(`/budgets/${editingId}`, payload);
        toast({ type: 'success', title: 'Orçamento atualizado!' });
      } else {
        await api.post('/budgets', payload);
        toast({ type: 'success', title: 'Orçamento salvo!' });
      }
      setShowForm(false);
      load();
    } catch { toast({ type: 'error', title: 'Erro ao salvar' }); }
    finally { setSaving(false); }
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#10b981" /></View>;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Ionicons name="arrow-back" size={22} color="#0f172a" /></TouchableOpacity>
        <View style={{ flex: 1 }}><Text style={s.title}>Orçamentos</Text><Text style={s.sub}>Controle seus limites de gastos</Text></View>
        <TouchableOpacity style={s.addBtn} onPress={showForm ? () => setShowForm(false) : openCreate}>
          <Ionicons name={showForm ? 'close' : 'add'} size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {showForm && (
        <View style={s.formCard}>
          <View style={s.formHeaderRow}>
            <Text style={s.formTitle}>{editingId ? 'Editar Orçamento' : 'Novo Orçamento'}</Text>
            <TouchableOpacity onPress={() => setShowForm(false)} style={s.closeForm}>
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={s.typeRow}>
            <TouchableOpacity style={[s.typeBtn, budgetType === 'categoria' && s.typeBtnA]} onPress={() => setBudgetType('categoria')}>
              <Ionicons name="pricetag-outline" size={15} color={budgetType === 'categoria' ? '#10b981' : '#64748b'} />
              <Text style={[s.typeTxt, budgetType === 'categoria' && s.typeTxtA]}>Por Categoria</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.typeBtn, budgetType === 'geral' && s.typeBtnA]} onPress={() => setBudgetType('geral')}>
              <Ionicons name="globe-outline" size={15} color={budgetType === 'geral' ? '#10b981' : '#64748b'} />
              <Text style={[s.typeTxt, budgetType === 'geral' && s.typeTxtA]}>Geral</Text>
            </TouchableOpacity>
          </View>

          {budgetType === 'categoria' ? (
            <View style={s.catList}>
              <Text style={s.label}>Selecione a Categoria *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {categories.map(c => (
                  <TouchableOpacity key={c.id} onPress={() => setCategoryId(c.id)} style={[s.pill, categoryId === c.id && s.pillActive]}>
                    <Text style={[s.pillTxt, categoryId === c.id && { color: '#fff' }]}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              <TextInput style={s.input} placeholder="Nome (opcional)" placeholderTextColor="#cbd5e1" value={name} onChangeText={setName} />
              <Text style={s.label}>Periodicidade *</Text>
              <View style={s.typeRow}>
                <TouchableOpacity style={[s.typeBtn, period === 'monthly' && s.typeBtnA]} onPress={() => setPeriod('monthly')}>
                  <Text style={[s.typeTxt, period === 'monthly' && s.typeTxtA]}>Mensal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.typeBtn, period === 'annual' && s.typeBtnA]} onPress={() => setPeriod('annual')}>
                  <Text style={[s.typeTxt, period === 'annual' && s.typeTxtA]}>Anual</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={s.moneyWrap}>
            <Text style={s.moneyPrefix}>R$</Text>
            <TextInput style={s.moneyInput} placeholder="0,00" placeholderTextColor="#cbd5e1" value={amount} onChangeText={handleAmountChange} keyboardType="numeric" />
          </View>

          <View style={s.formActions}>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setShowForm(false)}><Text style={s.cancelTxt}>Cancelar</Text></TouchableOpacity>
            <TouchableOpacity style={s.saveBtn} onPress={saveForm}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveTxt}>{editingId ? 'Salvar Alterações' : 'Criar'}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={budgets}
        keyExtractor={item => item.id?.toString()}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const used = parseFloat(item.spent || 0);
          const limit = parseFloat(item.amount || 0);
          const pct = limit > 0 ? (used / limit) * 100 : 0;
          const isWarning = pct >= 80;
          const isOver = pct >= 100;
          const barColor = isOver ? '#ef4444' : isWarning ? '#f59e0b' : '#10b981';
          const displayName = item.category?.name || item.name || 'Geral';

          return (
            <View style={s.card}>
              <View style={s.cardHdr}>
                <View>
                  <Text style={s.catName}>{displayName}</Text>
                  {item.period === 'annual' && <Text style={s.periodLabel}>Anual</Text>}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[s.pctTxt, { color: barColor }]}>{pct.toFixed(0)}%</Text>
                  <TouchableOpacity style={s.editIconBtn} onPress={() => openEdit(item)}>
                    <Ionicons name="create-outline" size={15} color="#64748b" />
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.editIconBtn, { backgroundColor: '#fee2e2' }]} onPress={() => handleDelete(item.id, displayName)}>
                    <Ionicons name="trash-outline" size={15} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={s.barBg}>
                <View style={[s.barFill, { width: `${Math.min(pct, 100)}%` as any, backgroundColor: barColor }]} />
              </View>
              <View style={s.cardFtr}>
                <View>
                  <Text style={s.usedLabel}>Usado</Text>
                  <Text style={[s.usedTxt, { color: barColor }]}>R$ {used.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={s.limitLabel}>Limite</Text>
                  <Text style={s.limitTxt}>R$ {limit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
                </View>
              </View>
              {isOver && (
                <View style={s.warningBox}>
                  <Ionicons name="warning" size={13} color="#ef4444" />
                  <Text style={s.warningTxt}>Limite ultrapassado!</Text>
                </View>
              )}
              {isWarning && !isOver && (
                <View style={[s.warningBox, { backgroundColor: '#fef3c7' }]}>
                  <Ionicons name="alert-circle" size={13} color="#f59e0b" />
                  <Text style={[s.warningTxt, { color: '#d97706' }]}>Atenção: {pct.toFixed(0)}% utilizado</Text>
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={<EmptyState icon="pie-chart-outline" title="Nenhum orçamento" subtitle="Defina limites de gastos por categoria." actionLabel="Criar Orçamento" onAction={openCreate} />}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' }, center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: '#0f172a' }, sub: { fontSize: 13, color: '#64748b', marginTop: 2 },
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center' },
  formCard: { backgroundColor: '#fff', margin: 20, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4, gap: 12 },
  formHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  formTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  closeForm: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: '#64748b', marginLeft: 4, marginTop: 4 },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#fff' },
  typeBtnA: { borderColor: '#10b981', backgroundColor: '#f0fdf4' },
  typeTxt: { fontSize: 13, fontWeight: '600', color: '#64748b' }, typeTxtA: { color: '#10b981' },
  catList: { gap: 8 }, pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: '#f1f5f9', marginRight: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  pillActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' }, pillTxt: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  input: { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, backgroundColor: '#f8fafc', paddingHorizontal: 16, height: 48, fontSize: 15, color: '#0f172a' },
  moneyWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, backgroundColor: '#f8fafc', paddingHorizontal: 16, height: 52 },
  moneyPrefix: { fontSize: 16, color: '#64748b', marginRight: 8, fontWeight: '600' },
  moneyInput: { flex: 1, fontSize: 20, fontWeight: '800', color: '#0f172a' },
  formActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' }, cancelTxt: { fontSize: 15, fontWeight: '600', color: '#64748b' },
  saveBtn: { flex: 1, height: 48, borderRadius: 12, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center' }, saveTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
  list: { padding: 20, paddingBottom: 100 },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 },
  cardHdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  catName: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  periodLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600', marginTop: 2 },
  pctTxt: { fontSize: 15, fontWeight: '800' },
  editIconBtn: { width: 32, height: 32, borderRadius: 9, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  barBg: { height: 10, backgroundColor: '#f1f5f9', borderRadius: 5, overflow: 'hidden', marginBottom: 14 }, barFill: { height: '100%', borderRadius: 5 },
  cardFtr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  usedLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600', marginBottom: 2 },
  usedTxt: { fontSize: 15, fontWeight: '700' },
  limitLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600', marginBottom: 2 },
  limitTxt: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  warningBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fee2e2', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginTop: 12 },
  warningTxt: { fontSize: 12, fontWeight: '700', color: '#ef4444' },
});
