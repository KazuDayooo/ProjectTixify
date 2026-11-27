import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { mobileApi } from '@/lib/api';
import { saveAuth } from '@/lib/auth';

type AuthFormProps = { mode: 'login' | 'register' };

export default function AuthForm({ mode }: AuthFormProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme];
  const router = useRouter();
  const isRegister = mode === 'register';
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const completeAuth = async (response: Awaited<ReturnType<typeof mobileApi.login>>) => {
    if (!response.session || !response.user) {
      setError(response.message || 'Pendaftaran berhasil. Silakan konfirmasi email untuk masuk.');
      return false;
    }
    await saveAuth(response.session, response.user);
    router.replace('/(tabs)/account');
    return true;
  };

  const submit = async () => {
    setError('');
    setNotice('');
    if (isRegister && nickname.trim().length < 2) {
      setError('Nickname minimal 2 karakter.');
      return;
    }
    if (isRegister && !/^\+?[0-9\s()-]{8,20}$/.test(phone.trim())) {
      setError('Masukkan nomor telepon yang valid.');
      return;
    }
    if (!isRegister && !loginIdentifier.trim()) {
      setError('Masukkan email atau nomor telepon.');
      return;
    }
    if (isRegister && !email.trim() && !phone.trim()) {
      setError('Isi email atau nomor telepon sebagai ID login. Boleh menggunakan data dummy.');
      return;
    }
    if (password.length < 8) {
      setError('Password minimal 8 karakter.');
      return;
    }
    if (isRegister && password !== confirmPassword) {
      setError('Konfirmasi password belum sama.');
      return;
    }

    setBusy(true);
    try {
      if (isRegister) {
        const response = await mobileApi.register({ nickname: nickname.trim(), phone: phone.trim(), email: email.trim(), password });
        if (response.session && response.user) {
          await completeAuth(response);
        } else {
          setNotice(response.message || 'Akun berhasil dibuat. Silakan masuk dengan email atau nomor telepon.');
        }
      } else {
        const response = await mobileApi.login({ identifier: loginIdentifier.trim(), password });
        await completeAuth(response);
      }
    } catch (err) {
      setError((err as Error).message || (isRegister ? 'Pendaftaran gagal. Coba lagi.' : 'Login gagal. Periksa email dan password.'));
    } finally {
      setBusy(false);
    }
  };

  const inputStyle = [
    styles.input,
    {
      color: theme.text,
      backgroundColor: colorScheme === 'dark' ? '#0f172a' : '#f8fafc',
      borderColor: theme.border,
    },
  ];

  return (
    <KeyboardAvoidingView style={[styles.page, { backgroundColor: theme.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={() => router.replace(isRegister ? '/login' : '/register')} accessibilityLabel={isRegister ? 'Buka halaman masuk' : 'Buka halaman daftar'}>
            <Ionicons name="arrow-back" size={19} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.topLabel, { color: theme.muted }]}>TIXIFY • TIKET EVENT</Text>
          <View style={{ width: 42 }} />
        </View>

        <View style={[styles.authCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.brandMark}><Ionicons name="ticket" size={28} color="#fff" /></View>
          <Text style={[styles.eyebrow, { color: theme.primary }]}>{isRegister ? 'AKUN TIXIFY' : 'SELAMAT DATANG KEMBALI'}</Text>
          <Text style={[styles.title, { color: theme.text }]}>{isRegister ? 'Mulai pengalamanmu' : 'Masuk ke akunmu'}</Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>
            {isRegister ? 'Email dan nomor telepon boleh berupa data dummy. Isi minimal salah satunya untuk login.' : 'Masuk menggunakan email atau nomor telepon yang didaftarkan.'}
          </Text>

          {isRegister && (
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Nickname</Text>
              <View style={[styles.inputWrap, { borderColor: theme.border, backgroundColor: colorScheme === 'dark' ? '#0f172a' : '#f8fafc' }]}>
                <Ionicons name="person-outline" size={18} color={theme.muted} />
                <TextInput style={[inputStyle, styles.inputInset]} value={nickname} onChangeText={setNickname} placeholder="Nama panggilan kamu" placeholderTextColor={theme.muted} autoCapitalize="words" autoComplete="nickname" maxLength={40} returnKeyType="next" />
              </View>
            </View>
          )}

          {isRegister && (
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Email (boleh dummy)</Text>
              <View style={[styles.inputWrap, { borderColor: theme.border, backgroundColor: colorScheme === 'dark' ? '#0f172a' : '#f8fafc' }]}>
                <Ionicons name="mail-outline" size={18} color={theme.muted} />
                <TextInput style={[inputStyle, styles.inputInset]} value={email} onChangeText={setEmail} placeholder="Email atau ID pilihanmu" placeholderTextColor={theme.muted} autoCapitalize="none" autoCorrect={false} keyboardType="default" maxLength={120} returnKeyType="next" />
              </View>
            </View>
          )}

          {isRegister && (
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Nomor telepon</Text>
              <View style={[styles.inputWrap, { borderColor: theme.border, backgroundColor: colorScheme === 'dark' ? '#0f172a' : '#f8fafc' }]}>
                <Ionicons name="call-outline" size={18} color={theme.muted} />
                <TextInput style={[inputStyle, styles.inputInset]} value={phone} onChangeText={setPhone} placeholder="Nomor atau ID dummy" placeholderTextColor={theme.muted} keyboardType="default" maxLength={120} returnKeyType="next" />
              </View>
            </View>
          )}

          {!isRegister && (
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Email atau nomor telepon</Text>
              <View style={[styles.inputWrap, { borderColor: theme.border, backgroundColor: colorScheme === 'dark' ? '#0f172a' : '#f8fafc' }]}>
                <Ionicons name="person-outline" size={18} color={theme.muted} />
                <TextInput style={[inputStyle, styles.inputInset]} value={loginIdentifier} onChangeText={setLoginIdentifier} placeholder="Email atau nomor saat daftar" placeholderTextColor={theme.muted} autoCapitalize="none" autoCorrect={false} keyboardType="default" returnKeyType="next" />
              </View>
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Password</Text>
            <View style={[styles.inputWrap, { borderColor: theme.border, backgroundColor: colorScheme === 'dark' ? '#0f172a' : '#f8fafc' }]}>
              <Ionicons name="lock-closed-outline" size={18} color={theme.muted} />
              <TextInput style={[inputStyle, styles.inputInset]} value={password} onChangeText={setPassword} placeholder="Minimal 8 karakter" placeholderTextColor={theme.muted} secureTextEntry={!showPassword} autoCapitalize="none" autoComplete={isRegister ? 'new-password' : 'current-password'} returnKeyType={isRegister ? 'next' : 'done'} onSubmitEditing={isRegister ? undefined : submit} />
              <TouchableOpacity onPress={() => setShowPassword((value) => !value)} accessibilityLabel={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={19} color={theme.muted} />
              </TouchableOpacity>
            </View>
          </View>

          {isRegister && (
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Konfirmasi password</Text>
              <View style={[styles.inputWrap, { borderColor: theme.border, backgroundColor: colorScheme === 'dark' ? '#0f172a' : '#f8fafc' }]}>
                <Ionicons name="shield-checkmark-outline" size={18} color={theme.muted} />
                <TextInput style={[inputStyle, styles.inputInset]} value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Ulangi password" placeholderTextColor={theme.muted} secureTextEntry={!showConfirmPassword} autoCapitalize="none" autoComplete="new-password" returnKeyType="done" onSubmitEditing={submit} />
                <TouchableOpacity onPress={() => setShowConfirmPassword((value) => !value)} accessibilityLabel={showConfirmPassword ? 'Sembunyikan password' : 'Tampilkan password'}>
                  <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={19} color={theme.muted} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={18} color="#dc2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          {notice ? (
            <View style={styles.noticeBox}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#047857" />
              <Text style={styles.noticeText}>{notice}</Text>
            </View>
          ) : null}

          <TouchableOpacity style={[styles.submitButton, { backgroundColor: theme.primary, opacity: busy ? 0.72 : 1 }]} onPress={submit} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <>
              <Text style={styles.submitText}>{isRegister ? 'Buat akun' : 'Masuk'}</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </>}
          </TouchableOpacity>

          <View style={styles.switchRow}>
            <Text style={[styles.switchText, { color: theme.muted }]}>{isRegister ? 'Sudah punya akun?' : 'Belum punya akun?'}</Text>
            <TouchableOpacity onPress={() => router.replace(isRegister ? '/login' : '/register')}>
              <Text style={[styles.switchLink, { color: theme.primary }]}>{isRegister ? 'Masuk' : 'Daftar sekarang'}</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={[styles.footnote, { color: theme.muted }]}>Dengan melanjutkan, kamu menyetujui ketentuan penggunaan Tixify.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 28 },
  topBar: { width: '100%', maxWidth: 460, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1 },
  topLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.8 },
  authCard: { width: '100%', maxWidth: 460, alignSelf: 'center', padding: 24, borderWidth: 1, borderRadius: 22, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.07, shadowRadius: 24, elevation: 3 },
  brandMark: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 18, borderRadius: 17, backgroundColor: '#102b50' },
  eyebrow: { textAlign: 'center', fontSize: 10, fontWeight: '900', letterSpacing: 1.9 },
  title: { marginTop: 8, textAlign: 'center', fontSize: 27, fontWeight: '900', letterSpacing: -0.8 },
  subtitle: { marginTop: 8, marginBottom: 24, textAlign: 'center', fontSize: 13, lineHeight: 20 },
  fieldGroup: { marginBottom: 14 },
  label: { marginBottom: 7, fontSize: 12, fontWeight: '800' },
  inputWrap: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderWidth: 1, borderRadius: 13 },
  input: { minHeight: 48, paddingVertical: 0, borderWidth: 0, borderRadius: 0, fontSize: 14 },
  inputInset: { flex: 1, width: undefined, backgroundColor: 'transparent', paddingHorizontal: 0 },
  errorBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 2, marginBottom: 12, padding: 11, borderWidth: 1, borderColor: '#fecaca', borderRadius: 12, backgroundColor: '#fef2f2' },
  errorText: { flex: 1, color: '#b91c1c', fontSize: 12, lineHeight: 17 },
  noticeBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 2, marginBottom: 12, padding: 11, borderWidth: 1, borderColor: '#a7f3d0', borderRadius: 12, backgroundColor: '#ecfdf5' },
  noticeText: { flex: 1, color: '#065f46', fontSize: 12, lineHeight: 17 },
  submitButton: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 6, borderRadius: 13 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 5, marginTop: 20 },
  switchText: { fontSize: 12 },
  switchLink: { fontSize: 12, fontWeight: '900' },
  footnote: { maxWidth: 350, alignSelf: 'center', marginTop: 16, textAlign: 'center', fontSize: 10, lineHeight: 15 },
});
