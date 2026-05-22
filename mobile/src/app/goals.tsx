import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Modal, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import api from '../services/api';
import { toast } from '../components/Toast';
import EmptyState from '../components/EmptyState';

const ICON_OPTIONS = ['flag-outline', 'home-outline', 'car-outline', 'airplane-outline', 'school-outline', 'heart-outline', 'star-outline', 'gift-outline', 'briefcase-outline', 'diamond-outline'];
const COLOR_OPTIONS = ['#6366f1', '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#64748b'];

export default function GoalsScreen() {
  const router = useRouter();
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('flag-outline');
  const [color, setColor] = useState('#6366f1');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const [activeGoal, setActiveGoal] = useState<any>(null);
  const [actionType, setActionType] = useState<'deposit' | 'withdraw' | null>(null);
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

  const openCreate = () => {
    setEditingId(null);
    setName('');
    setIcon('flag-outline');
    setColor('#6366f1');
    setTargetAmount('');
    setCurrentAmount('');
    setDeadline('');
    setDescription('');
    setShowForm(true);
  };

  const openEdit = (item: any) => {
    setEditingId(item.id);
    setName(item.name || '');
    setIcon(item.icon || 'flag-outline');
    setColor(item.color || '#6366f1');
    const target = parseFloat(item.target_amount || 0);
    const current = parseFloat(item.current_amount || 0);
    setTargetAmount(target.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
    setCurrentAmount(current.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
    setDeadline(item.target_date ? item.target_date.split('T')[0] : '');
    setDescription(item.description || '');
    setShowForm(true);
  };

  const saveForm = async () => {
    if (!name || !targetAmount) return toast({ type: 'warning', title: 'Preencha nome e valor alvo' });
    setSaving(true);
    try {
      const payload = {
        name,
        icon,
        color,
        target_amount: parseFloat(targetAmount.replace(/\./g, '').replace(',', '.')),
        current_amount: parseFloat(currentAmount.replace(/\./g, '').replace(',', '.')) || 0,
        target_date: deadline || null,
        description,
      };
      if (editingId) {
        await api.put(`/goals/${editingId}`, payload);
        toast({ type: 'success', title: 'Objetivo atualizado!' });
      } else {
        await api.post('/goals', payload);
        toast({ type: 'success', title: 'Objetivo criado!' });
      }
      setShowForm(false);
      load();
    } catch { toast({ type: 'error', title: 'Erro' }); }
    finally { setSaving(false); }
  };

  const handleDelete = (id: number, goalName: string) => {
    Alert.alert('Excluir Objetivo', `Deseja excluir "${goalName}"? Esta ação não pode ser desfeita.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/goals/${id}`);
            toast({ type: 'success', title: 'Objetivo excluído!' });
            load();
          } catch { toast({ type: 'error', title: 'Erro ao excluir' }); }
        }
      }
    ]);
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
        <View style={{ flex: 1 }}><Text style={s.title}>Objetivos</Text><Text style={s.sub}>Alcance suas metas financeiras</Text></View>
        <TouchableOpacity style={s.addBtn} onPress={showForm ? () => setShowForm(false) : openCreate}>
          <Ionicons name={showForm ? 'close' : 'add'} size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {showForm && (
        <ScrollView style={s.formCard} contentContainerStyle={{ gap: 12, paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
          <View style={s.formHeaderRow}>
            <Text style={s.formTitle}>{editingId ? 'Editar Objetivo' : 'Novo Objetivo'}</Text>
            <TouchableOpacity onPress={() => setShowForm(false)} style={s.closeForm}>
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <Text style={s.label}>Nome *</Text>
          <TextInput style={s.input} placeholder="Ex: Reserva de emergência" placeholderTextColor="#cbd5e1" value={name} onChangeText={setName} />

          <Text style={s.label}>Ícone</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {ICON_OPTIONS.map(ic => (
              <TouchableOpacity
                key={ic}
                style={[s.iconOption, icon === ic && { backgroundColor: color + '33', borderColor: color }]}
                onPress={() => setIcon(ic)}
              >
                <Ionicons name={ic as any} size={22} color={icon === ic ? color : '#94a3b8'} />
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={s.label}>Cor</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {COLOR_OPTIONS.map(c => (
              <TouchableOpacity
                key={c}
                style={[s.colorCircle, { backgroundColor: c }, color === c && s.colorActive]}
                onPress={() => setColor(c)}
              />
            ))}
          </View>

          <Text style={s.label}>Valor da meta *</Text>
          <View style={s.inputIconWrap}>
            <Text style={s.prefixTxt}>R$</Text>
            <TextInput style={s.inputClean} placeholder="0,00" placeholderTextColor="#cbd5e1" value={targetAmount} onChangeText={t => handleCurrencyChange(t, setTargetAmount)} keyboardType="numeric" />
          </View>

          <Text style={s.label}>Valor inicial</Text>
          <View style={s.inputIconWrap}>
            <Text style={s.prefixTxt}>R$</Text>
            <TextInput style={s.inputClean} placeholder="0,00" placeholderTextColor="#cbd5e1" value={currentAmount} onChangeText={t => handleCurrencyChange(t, setCurrentAmount)} keyboardType="numeric" />
          </View>

          <Text style={s.label}>Data limite (opcional)</Text>
          <TextInput style={s.input} placeholder="AAAA-MM-DD" placeholderTextColor="#cbd5e1" value={deadline} onChangeText={setDeadline} />

          <Text style={s.label}>Descrição</Text>
          <TextInput style={[s.input, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]} placeholder="Opcional" placeholderTextColor="#cbd5e1" value={description} onChangeText={setDescription} multiline />

          <View style={s.formActions}>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setShowForm(false)}><Text style={s.cancelTxt}>Cancelar</Text></TouchableOpacity>
            <TouchableOpacity style={s.saveBtn} onPress={saveForm}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveTxt}>{editingId ? 'Salvar Alterações' : 'Criar'}</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      <FlatList
        data={goals}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const current = parseFloat(item.current_amount || 0);
          const target = parseFloat(item.target_amount || 0);
          const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
          const isComplete = pct >= 100;
          const cardColor = item.color || '#6366f1';
          return (
            <View style={s.card}>
              {/* Header */}
              <View style={s.cardHdr}>
                <View style={[s.cardIconWrap, { backgroundColor: cardColor + '20' }]}>
                  <Ionicons name={(item.icon || 'flag-outline') as any} size={22} color={cardColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardName}>{item.name}</Text>
                  {item.target_date && (
                    <Text style={s.cardDate}>Meta: {new Date(item.target_date).toLocaleDateString('pt-BR')}</Text>
                  )}
                </View>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  <TouchableOpacity style={s.editIconBtn} onPress={() => openEdit(item)}>
                    <Ionicons name="create-outline" size={16} color="#64748b" />
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.editIconBtn, { backgroundColor: '#fee2e2' }]} onPress={() => handleDelete(item.id, item.name)}>
                    <Ionicons name="trash-outline" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Progress */}
              <View style={s.barBg}>
                <View style={[s.barFill, { width: `${pct}%` as any, backgroundColor: isComplete ? '#10b981' : cardColor }]} />
              </View>

              <View style={s.cardFtr}>
                <Text style={s.valTxt}>R$ {current.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de R$ {target.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
                <Text style={[s.pctTxt, { color: isComplete ? '#10b981' : cardColor }]}>{pct.toFixed(1)}%</Text>
              </View>

              {isComplete && (
                <View style={s.completeBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                  <Text style={s.completeTxt}>Meta atingida! 🎉</Text>
                </View>
              )}

              {/* Actions */}
              <View style={s.actionRow}>
                <TouchableOpacity style={s.actBtnOut} onPress={() => { setActiveGoal(item); setActionType('withdraw'); }}>
                  <Ionicons name="remove" size={16} color="#ef4444" />
                  <Text style={[s.actBtnTxt, { color: '#ef4444' }]}>Retirar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.actBtn, { backgroundColor: cardColor }]} onPress={() => { setActiveGoal(item); setActionType('deposit'); }}>
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text style={s.actBtnTxt}>Depositar</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<EmptyState icon="flag-outline" title="Nenhum objetivo" subtitle="Defina metas para poupar dinheiro." actionLabel="Criar Objetivo" onAction={openCreate} />}
      />

      {/* Modal de Ação */}
      <Modal visible={!!activeGoal} transparent animationType="fade" onRequestClose={() => setActiveGoal(null)}>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <Text style={s.modalT}>{actionType === 'deposit' ? '💰 Depositar' : '📤 Retirar'}</Text>
              <TouchableOpacity onPress={() => { setActiveGoal(null); setActionAmount(''); }} style={s.closeForm}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <Text style={s.modalSub}>{activeGoal?.name}</Text>
            <View style={s.inputIconWrap}>
              <Text style={s.prefixTxt}>R$</Text>
              <TextInput
                style={s.inputClean}
                placeholder="0,00"
                placeholderTextColor="#cbd5e1"
                value={actionAmount}
                onChangeText={t => handleCurrencyChange(t, setActionAmount)}
                keyboardType="numeric"
                autoFocus
              />
            </View>
            <View style={s.modalAct}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => { setActiveGoal(null); setActionAmount(''); }}>
                <Text style={s.cancelTxt}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.confirmBtn} onPress={handleAction}>
                <Text style={s.saveTxt}>Confirmar</Text>
              </TouchableOpacity>
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
  formCard: { backgroundColor: '#fff', margin: 20, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#f1f5f9', maxHeight: '85%', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
  formHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  formTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  closeForm: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 12, fontWeight: '600', color: '#64748b', marginLeft: 4 },
  input: { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, backgroundColor: '#f8fafc', paddingHorizontal: 16, height: 48, fontSize: 15, color: '#0f172a' },
  inputIconWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, backgroundColor: '#f8fafc', paddingHorizontal: 14, height: 48, gap: 10 },
  inputClean: { flex: 1, fontSize: 15, color: '#0f172a' },
  prefixTxt: { fontSize: 15, fontWeight: '700', color: '#94a3b8' },
  iconOption: { width: 48, height: 48, borderRadius: 13, backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  colorCircle: { width: 32, height: 32, borderRadius: 16 },
  colorActive: { borderWidth: 3, borderColor: '#0f172a', transform: [{ scale: 1.1 }] },
  formActions: { flexDirection: 'row', gap: 12, marginTop: 12 },
  cancelBtn: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' }, cancelTxt: { fontSize: 15, fontWeight: '600', color: '#64748b' },
  saveBtn: { flex: 1, height: 48, borderRadius: 12, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center' }, saveTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
  list: { padding: 20, paddingBottom: 100 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  cardHdr: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  cardIconWrap: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  cardName: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  cardDate: { fontSize: 12, color: '#94a3b8', marginTop: 3 },
  editIconBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  barBg: { height: 10, backgroundColor: '#f1f5f9', borderRadius: 5, overflow: 'hidden', marginBottom: 10 },
  barFill: { height: '100%', borderRadius: 5 },
  cardFtr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  valTxt: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  pctTxt: { fontSize: 16, fontWeight: '800' },
  completeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#dcfce7', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 12, alignSelf: 'flex-start' },
  completeTxt: { fontSize: 12, fontWeight: '700', color: '#10b981' },
  actionRow: { flexDirection: 'row', gap: 10 },
  actBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 12, borderRadius: 13 },
  actBtnOut: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#fee2e2', paddingVertical: 12, borderRadius: 13 },
  actBtnTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 },
  modalBox: { backgroundColor: '#fff', borderRadius: 24, padding: 24, gap: 16, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalT: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  modalSub: { fontSize: 14, color: '#64748b', marginTop: -8 },
  modalAct: { flexDirection: 'row', gap: 12, marginTop: 4 },
  confirmBtn: { flex: 1, height: 48, borderRadius: 12, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
});
