import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../services/api';
import { toast } from '../components/Toast';

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      toast({ type: 'warning', title: 'Preencha todos os campos.' });
      return;
    }
    if (password !== passwordConfirmation) {
      toast({ type: 'error', title: 'As senhas não coincidem.' });
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/register', {
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });
      toast({ type: 'success', title: 'Conta criada!', message: 'Faça login para continuar.' });
      router.replace('/login');
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Erro ao criar conta.';
      toast({ type: 'error', title: 'Ops', message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={s.logoArea}>
          <Text style={s.logoTitle}>Criar Conta</Text>
          <Text style={s.logoSub}>Junte-se ao FinançasPro hoje</Text>
        </View>

        <View style={s.card}>
          <View style={s.inputGroup}>
            <Text style={s.label}>Nome Completo</Text>
            <View style={s.inputWrap}>
              <Ionicons name="person-outline" size={18} color="#94a3b8" style={{ marginRight: 10 }} />
              <TextInput style={s.input} placeholder="Seu nome" placeholderTextColor="#cbd5e1" value={name} onChangeText={setName} autoCapitalize="words" />
            </View>
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>E-mail</Text>
            <View style={s.inputWrap}>
              <Ionicons name="mail-outline" size={18} color="#94a3b8" style={{ marginRight: 10 }} />
              <TextInput style={s.input} placeholder="seu@email.com" placeholderTextColor="#cbd5e1" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            </View>
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>Senha</Text>
            <View style={s.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color="#94a3b8" style={{ marginRight: 10 }} />
              <TextInput style={s.input} placeholder="••••••••" placeholderTextColor="#cbd5e1" value={password} onChangeText={setPassword} secureTextEntry={!showPw} />
              <TouchableOpacity onPress={() => setShowPw(!showPw)}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>Confirmar Senha</Text>
            <View style={s.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color="#94a3b8" style={{ marginRight: 10 }} />
              <TextInput style={s.input} placeholder="••••••••" placeholderTextColor="#cbd5e1" value={passwordConfirmation} onChangeText={setPasswordConfirmation} secureTextEntry={!showPw} />
            </View>
          </View>

          <TouchableOpacity style={[s.btn, loading && { opacity: 0.7 }]} onPress={handleRegister} disabled={loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Cadastrar</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1e293b' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: 40 },
  header: { position: 'absolute', top: 50, left: 24, zIndex: 10 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  logoArea: { alignItems: 'center', marginBottom: 36, marginTop: 40 },
  logoTitle: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  logoSub: { fontSize: 14, color: '#94a3b8', marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 28, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 12 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, backgroundColor: '#f8fafc', paddingHorizontal: 14, height: 50 },
  input: { flex: 1, fontSize: 15, color: '#0f172a' },
  btn: { backgroundColor: '#10b981', borderRadius: 12, height: 52, justifyContent: 'center', alignItems: 'center', marginTop: 8, shadowColor: '#10b981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
  btnTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
