import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import api from '../services/api';
import { toast } from '../components/Toast';
import EmptyState from '../components/EmptyState';

export default function GoalsScreen() {
  const router = useRouter();
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('flag-outline');
  const [color, setColor] = useState('#6366f1');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const [activeGoal, setActiveGoal] = useState<any>(null);
  const [actionType, setActionType] = useState<'deposit'|'withdraw'|null>(null);
  const [actionAmount, setActionAmount] = useState('');

  useFocusEffect(useCallback(() => { load(); }, []));

  const load = async () => {
    try { const res = await api.get('/goals'); setGoals(res.data.data || res.data); }
    catch { toast({ type: 'error', title: 'Erro' }); }
    finally { setLoading(false); }
  };

  const handleCurrencyChange = (text: string, setter: (val: string) => void) => {
    const digits = text.replace(/\D/g, '');
    if (!digits) { setter(''); return; }
    const value = (parseInt(digits, 10) / 100).toFixed(2);
    setter(value.replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
  };

  const saveForm = async () => {
    if (!name || !targetAmount) return toast({ type: 'warning', title: 'Preencha nome e valor alvo' });
    setSaving(true);
    try {
      await api.post('/goals', { 
        name, 
        icon,
        color,
        target_amount: parseFloat(targetAmount.replace(/\./g, '').replace(',', '.')), 
        current_amount: parseFloat(currentAmount.replace(/\./g, '').replace(',', '.')) || 0,
        target_date: deadline || null,
        description
      });
      toast({ type: 'success', title: 'Objetivo criado!' });
      setShowForm(false); 
      load();
    } catch { toast({ type: 'error', title: 'Erro' }); }
    finally { setSaving(false); }
  };

  const handleAction = async () => {
    if (!actionAmount) return;
    const val = parseFloat(actionAmount.replace(/\./g, '').replace(',', '.'));
    if (isNaN(val) || val <= 0) return;

    try {
      await api.post(`/goals/${activeGoal.id}/${actionType}`, { amount: val });
      toast({ type: 'success', title: actionType === 'deposit' ? 'Depósito salvo!' : 'Retirada salva!' });
      setActiveGoal(null); setActionType(null); setActionAmount('');
      load();
    } catch (e: any) { toast({ type: 'error', title: 'Erro', message: e.response?.data?.message }); }
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#10b981" /></View>;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Ionicons name="arrow-back" size={22} color="#0f172a" /></TouchableOpacity>
        <View style={{ flex: 1 }}><Text style={s.title}>Objetivos</Text><Text style={s.sub}>Alcance suas metas</Text></View>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowForm(!showForm)}><Ionicons name={showForm ? "close" : "add"} size={20} color="#fff" /></TouchableOpacity>
      </View>

      {showForm && (
        <ScrollView style={s.formCard} contentContainerStyle={{ gap: 12, paddingBottom: 20 }}>
          <Text style={s.formTitle}>Novo Objetivo</Text>
          <Text style={s.label}>Nome *</Text>
          <TextInput style={s.input} placeholder="Ex: Reserva de emergência" value={name} onChangeText={setName} />
          
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Ícone</Text>
              <TextInput style={s.input} placeholder="Ex: flag-outline" value={icon} onChangeText={setIcon} autoCapitalize="none" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Cor</Text>
              <View style={s.colorWrap}>
                <View style={[s.colorDot, { backgroundColor: color }]} />
                <TextInput style={s.colorInput} placeholder="#Hex" value={color} onChangeText={setColor} />
              </View>
            </View>
          </View>

          <Text style={s.label}>Valor da meta *</Text>
          <View style={s.inputIconWrap}>
            <Text style={s.prefixTxt}>R$</Text>
            <TextInput style={s.inputClean} placeholder="0,00" value={targetAmount} onChangeText={t => handleCurrencyChange(t, setTargetAmount)} keyboardType="numeric" />
          </View>

          <Text style={s.label}>Valor inicial</Text>
          <View style={s.inputIconWrap}>
            <Text style={s.prefixTxt}>R$</Text>
            <TextInput style={s.inputClean} placeholder="0,00" value={currentAmount} onChangeText={t => handleCurrencyChange(t, setCurrentAmount)} keyboardType="numeric" />
          </View>

          <Text style={s.label}>Data limite (opcional)</Text>
          <TextInput style={s.input} placeholder="dd/mm/aaaa" value={deadline} onChangeText={setDeadline} />
          
          <Text style={s.label}>Descrição</Text>
          <TextInput style={[s.input, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]} placeholder="Opcional" value={description} onChangeText={setDescription} multiline />

          <View style={s.formActions}>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setShowForm(false)}><Text style={s.cancelTxt}>Cancelar</Text></TouchableOpacity>
            <TouchableOpacity style={s.saveBtn} onPress={saveForm}><Text style={s.saveTxt}>{saving ? 'Salvando...' : 'Criar'}</Text></TouchableOpacity>
          </View>
        </ScrollView>
      )}

      <FlatList
        data={goals}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={s.list}
        renderItem={({ item }) => {
          const current = parseFloat(item.current_amount || 0);
          const target = parseFloat(item.target_amount || 0);
          const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
          return (
            <View style={s.card}>
              <View style={s.cardHdr}>
                <Text style={s.cardName}>{item.name}</Text>
                <Text style={s.pctTxt}>{pct.toFixed(1)}%</Text>
              </View>
              <View style={s.barBg}><View style={[s.barFill, { width: `${pct}%` }]} /></View>
              <View style={s.cardFtr}>
                <Text style={s.valTxt}>R$ {current.toFixed(2)} / R$ {target.toFixed(2)}</Text>
              </View>
              <View style={s.actionRow}>
                <TouchableOpacity style={s.actBtnOut} onPress={() => { setActiveGoal(item); setActionType('withdraw'); }}>
                  <Ionicons name="remove" size={16} color="#ef4444" /><Text style={[s.actBtnTxt, { color: '#ef4444' }]}>Retirar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.actBtn} onPress={() => { setActiveGoal(item); setActionType('deposit'); }}>
                  <Ionicons name="add" size={16} color="#fff" /><Text style={s.actBtnTxt}>Depositar</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<EmptyState icon="flag-outline" title="Nenhum objetivo" subtitle="Defina metas para poupar dinheiro." actionLabel="Criar Objetivo" onAction={() => setShowForm(true)} />}
      />

      {/* Modal de Ação */}
      <Modal visible={!!activeGoal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalT}>{actionType === 'deposit' ? 'Depositar' : 'Retirar'}: {activeGoal?.name}</Text>
            <TextInput style={s.input} placeholder="Valor em R$" value={actionAmount} onChangeText={t => handleCurrencyChange(t, setActionAmount)} keyboardType="numeric" autoFocus />
            <View style={s.modalAct}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setActiveGoal(null)}><Text style={s.cancelTxt}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={s.confirmBtn} onPress={handleAction}><Text style={s.saveTxt}>Confirmar</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  inputIconWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, backgroundColor: '#f8fafc', paddingHorizontal: 14, height: 48, gap: 10 },
  inputClean: { flex: 1, fontSize: 15, color: '#0f172a' },
  prefixTxt: { fontSize: 15, fontWeight: '700', color: '#94a3b8' },
  colorWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, backgroundColor: '#f8fafc', paddingHorizontal: 10, height: 48 },
  colorDot: { width: 20, height: 20, borderRadius: 4, marginRight: 8 },
  colorInput: { flex: 1, fontSize: 15, color: '#0f172a' },
  formActions: { flexDirection: 'row', gap: 12, marginTop: 12 },
  cancelBtn: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' }, cancelTxt: { fontSize: 15, fontWeight: '600', color: '#64748b' },
  saveBtn: { flex: 1, height: 48, borderRadius: 12, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center' }, saveTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
  list: { padding: 20, paddingBottom: 100 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  cardHdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardName: { fontSize: 18, fontWeight: '700', color: '#0f172a' }, pctTxt: { fontSize: 16, fontWeight: '800', color: '#10b981' },
  barBg: { height: 10, backgroundColor: '#f1f5f9', borderRadius: 5, overflow: 'hidden', marginBottom: 12 }, barFill: { height: '100%', backgroundColor: '#10b981', borderRadius: 5 },
  cardFtr: { marginBottom: 16 }, valTxt: { fontSize: 14, color: '#64748b', fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 12 },
  actBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, backgroundColor: '#10b981', paddingVertical: 12, borderRadius: 12 },
  actBtnOut: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: '#fee2e2', paddingVertical: 12, borderRadius: 12 },
  actBtnTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
  modalBox: { backgroundColor: '#fff', borderRadius: 20, padding: 24, gap: 16 }, modalT: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  modalAct: { flexDirection: 'row', gap: 12, marginTop: 8 },

  confirmBtn: { flex: 1, height: 48, borderRadius: 12, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' }
});
