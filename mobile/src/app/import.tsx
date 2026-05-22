import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, FlatList, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import api from '../services/api';
import { toast } from '../components/Toast';

const { width: SW } = Dimensions.get('window');

export default function ImportScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fileData, setFileData] = useState<any>(null);

  // Parsed state
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [defaultAccountId, setDefaultAccountId] = useState<number | null>(null);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        const ext = file.name.split('.').pop()?.toLowerCase();
        
        if (ext !== 'ofx' && ext !== 'qfx') {
          return toast({ type: 'warning', title: 'Arquivo inválido', message: 'Por favor, selecione um arquivo .ofx ou .qfx' });
        }
        
        uploadFile(file);
      }
    } catch (err) {
      toast({ type: 'error', title: 'Erro', message: 'Falha ao selecionar arquivo' });
    }
  };

  const uploadFile = async (fileInfo: any) => {
    setLoading(true);
    setFileData(fileInfo);
    
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: fileInfo.uri,
        name: fileInfo.name,
        type: fileInfo.mimeType || 'application/octet-stream'
      } as any);

      const res = await api.post('/import/parse', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const data = res.data;
      if (!data.transactions || data.transactions.length === 0) {
        toast({ type: 'warning', title: 'Aviso', message: 'Nenhuma transação encontrada no arquivo.' });
        reset();
        return;
      }

      setTransactions(data.transactions);
      setCategories(data.categories || []);
      setAccounts(data.accounts || []);
      setStats(data.stats || {});
      
      if (data.transactions.length > 0 && data.transactions[0].suggested_account_id) {
        setDefaultAccountId(data.transactions[0].suggested_account_id);
      }

      // Auto select new and transfers
      const initialSelected = new Set<number>();
      data.transactions.forEach((tx: any, idx: number) => {
        if (tx.ui_status === 'green' || tx.ui_status === 'blue' || tx.ui_status === 'yellow') {
          initialSelected.add(idx);
        }
      });
      setSelectedIds(initialSelected);
      
    } catch (e: any) {
      toast({ type: 'error', title: 'Erro ao processar', message: e.response?.data?.message });
      reset();
    } finally {
      setLoading(false);
    }
  };

  const confirmImport = async () => {
    if (!defaultAccountId) {
      return toast({ type: 'warning', title: 'Selecione uma conta de destino' });
    }
    
    if (selectedIds.size === 0) {
      return toast({ type: 'warning', title: 'Selecione as transações para importar' });
    }

    const payloadTxs = Array.from(selectedIds).map(idx => {
      const tx = transactions[idx];
      return {
        date: tx.original.date,
        description: tx.original.description,
        amount: tx.original.amount,
        type: tx.suggested_type,
        category_id: tx.suggested_category_id || null,
        account_id: defaultAccountId,
        hash: tx.hash,
        hash_version: tx.hash_version,
        status: 'confirmada'
      };
    });

    setLoading(true);
    try {
      const res = await api.post('/import/confirm', {
        default_account_id: defaultAccountId,
        transactions: payloadTxs
      });
      
      Alert.alert('Sucesso!', `${res.data.imported} transações importadas.`, [
        { text: 'OK', onPress: () => router.replace('/transactions') }
      ]);
    } catch (e: any) {
      toast({ type: 'error', title: 'Erro ao importar', message: e.response?.data?.message });
      setLoading(false);
    }
  };

  const toggleSelection = (idx: number) => {
    const next = new Set(selectedIds);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelectedIds(next);
  };

  const selectAll = () => setSelectedIds(new Set(transactions.map((_, i) => i)));
  const selectNone = () => setSelectedIds(new Set());

  const reset = () => {
    setTransactions([]);
    setFileData(null);
    setSelectedIds(new Set());
    setDefaultAccountId(null);
  };

  if (loading) {
    return (
      <View style={[s.root, s.center]}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={{ marginTop: 16, color: '#64748b' }}>Processando arquivo...</Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Importar Extrato</Text>
          <Text style={s.sub}>Importação OFX / QFX</Text>
        </View>
        {transactions.length > 0 && (
          <TouchableOpacity onPress={reset} style={s.resetBtn}>
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>

      {transactions.length === 0 ? (
        <View style={s.uploadZone}>
          <View style={s.uploadCircle}>
            <Ionicons name="document-text-outline" size={48} color="#3b82f6" />
          </View>
          <Text style={s.uploadTitle}>Selecione o arquivo do banco</Text>
          <Text style={s.uploadSub}>Suporta arquivos .ofx e .qfx gerados pelo seu banco ou cartão de crédito.</Text>
          <TouchableOpacity style={s.uploadBtn} onPress={pickDocument}>
            <Text style={s.uploadBtnTxt}>Selecionar Arquivo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={s.accountConfig}>
            <Text style={s.accountLabel}>Conta de destino para importação:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }} contentContainerStyle={{ gap: 8 }}>
              {accounts.map(acc => (
                <TouchableOpacity key={acc.id} style={[s.accPill, defaultAccountId === acc.id && s.accPillActive]} onPress={() => setDefaultAccountId(acc.id)}>
                  <Text style={[s.accPillTxt, defaultAccountId === acc.id && s.accPillTxtActive]}>{acc.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={s.statsRow}>
            <View style={s.statBox}><Text style={s.statNum}>{stats?.total || 0}</Text><Text style={s.statLbl}>Total</Text></View>
            <View style={[s.statBox, { backgroundColor: '#dcfce7' }]}><Text style={[s.statNum, { color: '#166534' }]}>{stats?.new || 0}</Text><Text style={[s.statLbl, { color: '#166534' }]}>Novos</Text></View>
            <View style={[s.statBox, { backgroundColor: '#fee2e2' }]}><Text style={[s.statNum, { color: '#991b1b' }]}>{stats?.duplicate || 0}</Text><Text style={[s.statLbl, { color: '#991b1b' }]}>Duplicados</Text></View>
          </View>

          <View style={s.filterActions}>
            <Text style={s.selCount}>{selectedIds.size} selecionados</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={selectAll}><Text style={s.filterLnk}>Todos</Text></TouchableOpacity>
              <TouchableOpacity onPress={selectNone}><Text style={s.filterLnk}>Nenhum</Text></TouchableOpacity>
            </View>
          </View>

          <FlatList
            data={transactions}
            keyExtractor={(_, i) => i.toString()}
            contentContainerStyle={s.list}
            renderItem={({ item, index }) => {
              const isSelected = selectedIds.has(index);
              const isDupe = item.ui_status === 'red';
              const amt = parseFloat(item.original.amount || 0);
              const isExp = amt < 0;

              return (
                <TouchableOpacity style={[s.txCard, isDupe && { opacity: 0.6 }]} onPress={() => toggleSelection(index)} activeOpacity={0.7}>
                  <View style={[s.checkCir, isSelected && s.checkCirOn]}>
                    {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.txDesc} numberOfLines={1}>{item.original.description}</Text>
                    <Text style={s.txDate}>{new Date(item.original.date).toLocaleDateString('pt-BR')} • {isDupe ? 'Duplicado' : 'Novo'}</Text>
                  </View>
                  <Text style={[s.txVal, { color: isExp ? '#ef4444' : '#10b981' }]}>
                    {isExp ? '' : '+'}R$ {Math.abs(amt).toFixed(2)}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />

          <View style={s.footer}>
            <TouchableOpacity style={[s.confirmBtn, (!defaultAccountId || selectedIds.size === 0) && { opacity: 0.5 }]} onPress={confirmImport} disabled={!defaultAccountId || selectedIds.size === 0}>
              <Text style={s.confirmTxt}>Confirmar Importação</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: '#0f172a' }, sub: { fontSize: 13, color: '#64748b', marginTop: 2 },
  resetBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fee2e2', justifyContent: 'center', alignItems: 'center' },
  uploadZone: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  uploadCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  uploadTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a', textAlign: 'center', marginBottom: 8 },
  uploadSub: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  uploadBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 16, shadowColor: '#3b82f6', shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
  uploadBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
  accountConfig: { backgroundColor: '#fff', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  accountLabel: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  accPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  accPillActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  accPillTxt: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  accPillTxtActive: { color: '#fff' },
  statsRow: { flexDirection: 'row', padding: 20, gap: 12 },
  statBox: { flex: 1, backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: '800', color: '#0f172a' }, statLbl: { fontSize: 12, fontWeight: '600', color: '#64748b', marginTop: 4 },
  filterActions: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 10 },
  selCount: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  filterLnk: { fontSize: 13, fontWeight: '700', color: '#3b82f6' },
  list: { paddingHorizontal: 20, paddingBottom: 120 },
  txCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 8, gap: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  checkCir: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#cbd5e1', justifyContent: 'center', alignItems: 'center' },
  checkCirOn: { backgroundColor: '#10b981', borderColor: '#10b981' },
  txDesc: { fontSize: 14, fontWeight: '600', color: '#0f172a' }, txDate: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  txVal: { fontSize: 15, fontWeight: '800' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 20, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  confirmBtn: { backgroundColor: '#3b82f6', height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  confirmTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
