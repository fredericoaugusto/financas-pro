import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '../components/Toast';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      toast({ type: 'warning', title: 'Atenção', message: 'Preencha e-mail e senha.' });
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
      toast({ type: 'success', title: 'Bem-vindo!' });
      router.replace('/(tabs)');
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Credenciais inválidas.';
      toast({ type: 'error', title: 'Erro ao entrar', message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.logoArea}>
          <View style={s.logoCircle}>
            <Ionicons name="cash-outline" size={40} color="#fff" />
          </View>
          <Text style={s.logoTitle}>FinançasPro</Text>
          <Text style={s.logoSub}>Controle financeiro inteligente</Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Bem-vindo de volta!</Text>
          <Text style={s.cardSub}>Entre na sua conta para continuar</Text>

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

          <TouchableOpacity style={[s.btn, loading && { opacity: 0.7 }]} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Entrar</Text>}
          </TouchableOpacity>

          <View style={s.divider}><View style={s.line} /><Text style={s.divTxt}>ou</Text><View style={s.line} /></View>
          <TouchableOpacity style={s.regLink} onPress={() => router.push('/register')}>
            <Text style={s.regTxt}>Não tem conta? <Text style={s.regBold}>Criar conta</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1e293b' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: 60, paddingBottom: 40 },
  logoArea: { alignItems: 'center', marginBottom: 36 },
  logoCircle: { width: 80, height: 80, borderRadius: 24, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center', marginBottom: 16, shadowColor: '#10b981', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10 },
  logoTitle: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  logoSub: { fontSize: 14, color: '#94a3b8', marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 28, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 12 },
  cardTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  cardSub: { fontSize: 14, color: '#64748b', marginBottom: 28 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, backgroundColor: '#f8fafc', paddingHorizontal: 14, height: 50 },
  input: { flex: 1, fontSize: 15, color: '#0f172a' },
  btn: { backgroundColor: '#10b981', borderRadius: 12, height: 52, justifyContent: 'center', alignItems: 'center', marginTop: 8, shadowColor: '#10b981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
  btnTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  line: { flex: 1, height: 1, backgroundColor: '#f1f5f9' },
  divTxt: { marginHorizontal: 12, fontSize: 12, color: '#94a3b8' },
  regLink: { alignItems: 'center' },
  regTxt: { fontSize: 14, color: '#64748b' },
  regBold: { color: '#10b981', fontWeight: '700' },
});
