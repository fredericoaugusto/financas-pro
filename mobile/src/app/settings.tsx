import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '../components/Toast';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  const handleSave = async () => {
    if (!name.trim()) return toast({ type: 'warning', title: 'O nome é obrigatório.' });
    setSaving(true);
    try {
      const payload: any = { name: name.trim() };
      // Email e senha apenas se preenchidos para alterar
      if (email.trim() && email !== user?.email) payload.email = email.trim();
      if (password.trim()) payload.password = password.trim();

      await api.put('/auth/profile', payload);
      await refreshUser();
      
      toast({ type: 'success', title: 'Perfil atualizado!' });
      setPassword(''); // limpar senha após sucesso
    } catch (e: any) {
      toast({ type: 'error', title: 'Erro ao salvar', message: e.response?.data?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Configurações</Text>
          <Text style={s.sub}>Seu perfil e preferências</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.card}>
          <Text style={s.cardTitle}>Dados do Perfil</Text>
          
          <View style={s.group}>
            <Text style={s.label}>Nome Completo</Text>
            <TextInput style={s.input} value={name} onChangeText={setName} />
          </View>
          
          <View style={s.group}>
            <Text style={s.label}>E-mail (Login)</Text>
            <TextInput style={s.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          </View>

          <View style={s.group}>
            <Text style={s.label}>Nova Senha</Text>
            <TextInput style={s.input} value={password} onChangeText={setPassword} placeholder="Deixe em branco para não alterar" secureTextEntry />
          </View>

          <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveTxt}>Salvar Alterações</Text>}
          </TouchableOpacity>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Preferências do Aplicativo</Text>
          
          <View style={s.prefRow}>
            <View style={s.prefIcon}><Ionicons name="moon" size={18} color="#6366f1" /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.prefName}>Tema Escuro</Text>
              <Text style={s.prefSub}>Sincronizado com o sistema</Text>
            </View>
            <View style={s.toggleOn}><View style={s.toggleDot} /></View>
          </View>
          
          <View style={s.prefRow}>
            <View style={s.prefIcon}><Ionicons name="notifications" size={18} color="#f59e0b" /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.prefName}>Notificações Push</Text>
              <Text style={s.prefSub}>Alertas de orçamento e faturas</Text>
            </View>
            <View style={s.toggleOn}><View style={s.toggleDot} /></View>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: '#0f172a' }, sub: { fontSize: 13, color: '#64748b', marginTop: 2 },
  scroll: { padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 24, marginBottom: 20, borderWidth: 1, borderColor: '#f1f5f9' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 20 },
  group: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#64748b', marginBottom: 8 },
  input: { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, backgroundColor: '#f8fafc', paddingHorizontal: 16, height: 50, fontSize: 15, color: '#0f172a' },
  saveBtn: { backgroundColor: '#10b981', height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  saveTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
  prefRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 14 },
  prefIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  prefName: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  prefSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  toggleOn: { width: 44, height: 24, borderRadius: 12, backgroundColor: '#10b981', padding: 2, alignItems: 'flex-end', justifyContent: 'center' },
  toggleDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' }
});
