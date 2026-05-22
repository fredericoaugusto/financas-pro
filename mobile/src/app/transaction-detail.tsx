import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Modal, KeyboardAvoidingView, Platform, FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../services/api';
import { toast } from '../components/Toast';

const PAY_LABEL: Record<string, string> = {
  pix: 'PIX', debito: 'Débito', credito: 'Crédito',
  dinheiro: 'Dinheiro', boleto: 'Boleto', transferencia: 'Transferência',
};
const PAYMENTS = ['dinheiro', 'pix', 'debito', 'credito', 'boleto'];

function DetailRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={[s.rowValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
  );
}

export default function TransactionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [tx, setTx] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDesc, setEditDesc] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editPayment, setEditPayment] = useState('');
  const [editCategoryId, setEditCategoryId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Pickers state
  const [categories, setCategories] = useState<any[]>([]);
  const [pickerType, setPickerType] = useState<'category' | null>(null);

  useEffect(() => {
    if (id) load();
    api.get('/categories').then(r => setCategories(r.data.data || r.data)).catch(() => {});
  }, [id]);

  const load = async () => {
    try {
      const r = await api.get(`/transactions/${id}`);
      const data = r.data.data || r.data;
      setTx(data);
      
      // Initialize edit state
      setEditDesc(data.description || '');
      setEditNotes(data.notes || '');
      const val = parseFloat(data.value || 0);
      setEditAmount(val.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
      
      if (data.date) {
        const [d, t] = data.date.split(' ');
        setEditDate(d || '');
        setEditTime(t ? t.substring(0, 5) : '');
      }
      
      setEditPayment(data.payment_method || 'dinheiro');
      setEditCategoryId(data.category_id || null);
    } catch { toast({ type: 'error', title: 'Erro ao carregar' }); }
    finally { setLoading(false); }
  };

  const handleAmountChange = (text: string) => {
    const digits = text.replace(/\D/g, '');
    if (!digits) { setEditAmount(''); return; }
    const val = (parseInt(digits, 10) / 100).toFixed(2);
    setEditAmount(val.replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
  };

  const handleSave = async () => {
    if (!editDesc || !editAmount || !editDate) {
      toast({ type: 'warning', title: 'Preencha valor, descrição e data' });
      return;
    }
    setSaving(true);
    try {
      const num = parseFloat(editAmount.replace(/\./g, '').replace(',', '.'));
      await api.put(`/transactions/${id}`, {
        description: editDesc,
        notes: editNotes,
        value: num,
        date: editTime ? `${editDate} ${editTime}` : editDate,
        payment_method: editPayment,
        category_id: editCategoryId,
      });
      toast({ type: 'success', title: 'Lançamento atualizado!' });
      setShowEditModal(false);
      load();
    } catch (e: any) {
      toast({ type: 'error', title: 'Erro', message: e.response?.data?.message });
    } finally { setSaving(false); }
  };

  const handleDelete = () => {
    Alert.alert('Excluir lançamento', 'Tem certeza? Esta ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/transactions/${id}`);
            toast({ type: 'success', title: 'Lançamento excluído!' });
            router.back();
          } catch (e: any) {
            toast({ type: 'error', title: 'Erro', message: e.response?.data?.message });
          }
        },
      },
    ]);
  };

  const handleToggle = async () => {
    try {
      await api.patch(`/transactions/${id}/toggle-status`);
      toast({ type: 'success', title: 'Status alterado!' });
      load();
    } catch (e: any) {
      toast({ type: 'error', title: 'Erro', message: e.response?.data?.message });
    }
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#10b981" /></View>;
  if (!tx) return <View style={s.center}><Text style={{ color: '#94a3b8' }}>Não encontrado</Text></View>;

  const isExp = tx.type === 'despesa';
  const isTransf = tx.type === 'transferencia';
  const val = parseFloat(tx.value || 0);
  const typeColor = isExp ? '#ef4444' : isTransf ? '#3b82f6' : '#10b981';
  const typeBg = isExp ? '#fee2e2' : isTransf ? '#dbeafe' : '#dcfce7';
  const typeIcon = isExp ? 'arrow-down-circle' : isTransf ? 'swap-horizontal' : 'arrow-up-circle';
  const typeLabel = isExp ? 'Despesa' : isTransf ? 'Transferência' : 'Receita';
  const isPending = tx.status === 'pendente';
  const dt = new Date(tx.date).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const selectedCategory = categories.find(c => c.id === editCategoryId);

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Detalhes</Text>
        <TouchableOpacity style={s.editBtn} onPress={() => setShowEditModal(true)}>
          <Ionicons name="create-outline" size={20} color="#10b981" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={[s.valueCard, { backgroundColor: typeBg }]}>
          <View style={[s.typeChip, { backgroundColor: typeColor + '22' }]}>
            <Ionicons name={typeIcon as any} size={18} color={typeColor} />
            <Text style={[s.typeLabel, { color: typeColor }]}>{typeLabel}</Text>
          </View>
          <Text style={[s.valueTxt, { color: typeColor }]}>
            {isExp ? '-' : isTransf ? '' : '+'}R$ {val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </Text>
          {isPending && (
            <View style={s.pendingBadge}>
              <Ionicons name="time-outline" size={14} color="#d97706" />
              <Text style={s.pendingTxt}>Pendente</Text>
            </View>
          )}
        </View>

        <View style={s.card}>
          <DetailRow label="Descrição" value={tx.description} />
          <DetailRow label="Data" value={dt} />
          <DetailRow
            label="Status"
            value={isPending ? 'Pendente' : 'Confirmado'}
            valueColor={isPending ? '#f59e0b' : '#10b981'}
          />
          {tx.payment_method && (
            <DetailRow label="Forma de Pagamento" value={PAY_LABEL[tx.payment_method] || tx.payment_method} />
          )}
          {tx.category?.name && (
            <DetailRow label="Categoria" value={tx.category.name} />
          )}
          {tx.account?.name && (
            <DetailRow label="Conta" value={tx.account.name} />
          )}
          {tx.card?.name && (
            <DetailRow label="Cartão" value={tx.card.name} />
          )}
          {tx.notes && (
            <View style={[s.row, { borderBottomWidth: 0 }]}>
              <Text style={s.rowLabel}>Observações</Text>
              <Text style={[s.rowValue, { color: '#64748b', maxWidth: '65%' }]}>{tx.notes}</Text>
            </View>
          )}
        </View>

        <View style={s.actionsCard}>
          <TouchableOpacity style={s.actionRow} onPress={handleToggle}>
            <View style={[s.actionIcon, { backgroundColor: '#dbeafe' }]}>
              <Ionicons name="swap-horizontal-outline" size={20} color="#3b82f6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.actionTitle}>Alternar Status</Text>
              <Text style={s.actionSub}>Marcar como {isPending ? 'confirmado' : 'pendente'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
          </TouchableOpacity>

          <View style={s.actionDivider} />

          <TouchableOpacity style={s.actionRow} onPress={() => setShowEditModal(true)}>
            <View style={[s.actionIcon, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="create-outline" size={20} color="#10b981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.actionTitle}>Editar Lançamento</Text>
              <Text style={s.actionSub}>Alterar dados da transação</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
          </TouchableOpacity>

          <View style={s.actionDivider} />

          <TouchableOpacity style={s.actionRow} onPress={handleDelete}>
            <View style={[s.actionIcon, { backgroundColor: '#fee2e2' }]}>
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.actionTitle, { color: '#ef4444' }]}>Excluir Lançamento</Text>
              <Text style={s.actionSub}>Esta ação não pode ser desfeita</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#fca5a5" />
          </TouchableOpacity>
        </View>
        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Expanded Edit Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Editar Lançamento</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)} style={s.closeBtn}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: '80%' }} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 20 }}>
              <Text style={s.editLabel}>Valor *</Text>
              <View style={s.moneyRow}>
                <Text style={s.moneyPrefix}>R$</Text>
                <TextInput style={s.moneyInput} value={editAmount} onChangeText={handleAmountChange} keyboardType="numeric" placeholder="0,00" placeholderTextColor="#cbd5e1" />
              </View>

              <Text style={s.editLabel}>Descrição *</Text>
              <TextInput style={s.editInput} value={editDesc} onChangeText={setEditDesc} placeholder="Descrição do lançamento" placeholderTextColor="#cbd5e1" />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.editLabel}>Data *</Text>
                  <TextInput style={s.editInput} placeholder="AAAA-MM-DD" value={editDate} onChangeText={setEditDate} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.editLabel}>Hora</Text>
                  <TextInput style={s.editInput} placeholder="00:00" value={editTime} onChangeText={setEditTime} />
                </View>
              </View>

              <Text style={s.editLabel}>Categoria</Text>
              <TouchableOpacity style={s.picker} onPress={() => setPickerType('category')}>
                <Text style={s.pickerTxt}>{selectedCategory?.name || 'Selecione...'}</Text>
                <Ionicons name="chevron-down" size={16} color="#94a3b8" />
              </TouchableOpacity>

              <Text style={s.editLabel}>Forma de Pagamento</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 4 }}>
                {PAYMENTS.map(p => (
                  <TouchableOpacity key={p} style={[s.pill, editPayment === p && s.pillActive]} onPress={() => setEditPayment(p)}>
                    <Text style={[s.pillTxt, editPayment === p && s.pillTxtActive]}>{PAY_LABEL[p]}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={s.editLabel}>Observações</Text>
              <TextInput style={[s.editInput, { height: 72, textAlignVertical: 'top', paddingTop: 12 }]} value={editNotes} onChangeText={setEditNotes} placeholder="Notas opcionais..." placeholderTextColor="#cbd5e1" multiline />

              <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveTxt}>Salvar Alterações</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Category Picker Modal */}
      <Modal visible={!!pickerType} transparent animationType="slide" onRequestClose={() => setPickerType(null)}>
        <View style={s.overlay2}>
          <View style={s.modal2}>
            <View style={s.modalH2}>
              <Text style={s.modalT2}>Selecionar Categoria</Text>
              <TouchableOpacity onPress={() => setPickerType(null)}><Ionicons name="close" size={22} color="#64748b" /></TouchableOpacity>
            </View>
            <FlatList
              data={categories.filter(c => c.type === tx?.type)}
              keyExtractor={i => i.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity style={s.modalRow2} onPress={() => { setEditCategoryId(item.id); setPickerType(null); }}>
                  <Text style={s.modalRowTxt2}>{item.name}</Text>
                  {editCategoryId === item.id && <Ionicons name="checkmark" size={18} color="#10b981" />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={s.emptyM}>Nenhuma categoria compatível.</Text>}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 12 },
  backBtn: { width: 44, height: 44, borderRadius: 13, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#0f172a' },
  editBtn: { width: 44, height: 44, borderRadius: 13, backgroundColor: '#f0fdf4', justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 20 },
  valueCard: { borderRadius: 24, padding: 28, alignItems: 'center', marginBottom: 16, gap: 12 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  typeLabel: { fontSize: 14, fontWeight: '700' },
  valueTxt: { fontSize: 40, fontWeight: '900', letterSpacing: -1 },
  pendingBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fef3c7', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  pendingTxt: { fontSize: 12, fontWeight: '700', color: '#d97706' },
  card: { backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 20, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  rowLabel: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  rowValue: { fontSize: 14, fontWeight: '600', color: '#1e293b', maxWidth: '60%', textAlign: 'right' },
  actionsCard: { backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 20, borderWidth: 1, borderColor: '#f1f5f9', overflow: 'hidden' },
  actionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, gap: 14 },
  actionDivider: { height: 1, backgroundColor: '#f8fafc' },
  actionIcon: { width: 44, height: 44, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  actionTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  actionSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, gap: 12, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  closeBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  editLabel: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  moneyRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 14, backgroundColor: '#f8fafc', paddingHorizontal: 16, height: 56 },
  moneyPrefix: { fontSize: 18, fontWeight: '700', color: '#94a3b8', marginRight: 8 },
  moneyInput: { flex: 1, fontSize: 24, fontWeight: '800', color: '#0f172a' },
  editInput: { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 14, backgroundColor: '#f8fafc', paddingHorizontal: 16, height: 50, fontSize: 15, color: '#0f172a' },
  picker: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 14, backgroundColor: '#f8fafc', paddingHorizontal: 16, height: 50, gap: 10 },
  pickerTxt: { flex: 1, fontSize: 15, color: '#0f172a' },
  pill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e2e8f0' },
  pillActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  pillTxt: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  pillTxtActive: { color: '#fff' },
  saveBtn: { backgroundColor: '#10b981', height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  saveTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
  overlay2: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modal2: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '60%', paddingBottom: 40 },
  modalH2: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalT2: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  modalRow2: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  modalRowTxt2: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  emptyM: { padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 14 },
});
