import React, { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { clearAuth, getAuth, type StoredAuth } from '@/lib/auth';

export default function AccountScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme];
  const router = useRouter();
  const [auth, setAuth] = useState<StoredAuth | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    let active = true;
    getAuth().then((saved) => {
      if (active) {
        setAuth(saved);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, []));

  const logout = async () => {
    await clearAuth();
    setAuth(null);
  };

  if (loading) {
    return <View style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator color={theme.primary} /></View>;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.profileCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={[styles.avatar, { backgroundColor: theme.primaryLight }]}>
          <Ionicons name={auth ? 'person' : 'person-outline'} size={34} color={theme.primary} />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>{auth ? `Halo, ${auth.user.name}` : 'Akun Tixify'}</Text>
        <Text style={[styles.description, { color: theme.muted }]}>
          {auth ? 'Akunmu sudah terhubung. Gunakan email ini saat memesan tiket.' : 'Masuk atau buat akun untuk mulai menggunakan Tixify.'}
        </Text>
        {auth ? (
          <>
            <View style={[styles.emailRow, { backgroundColor: colorScheme === 'dark' ? '#0f172a' : '#f8fafc', borderColor: theme.border }]}>
              <Ionicons name="mail-outline" size={18} color={theme.muted} />
              <Text style={[styles.email, { color: theme.text }]}>{auth.user.email}</Text>
            </View>
            <TouchableOpacity style={[styles.primaryButton, { backgroundColor: theme.primary }]} onPress={() => router.push('/(tabs)')}>
              <Text style={styles.primaryText}>Jelajahi event</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryButton, { borderColor: theme.border }]} onPress={logout}>
              <Ionicons name="log-out-outline" size={18} color={theme.danger} />
              <Text style={[styles.secondaryText, { color: theme.danger }]}>Keluar dari akun</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={[styles.primaryButton, { backgroundColor: theme.primary }]} onPress={() => router.push('/login')}>
              <Text style={styles.primaryText}>Masuk</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryButton, { borderColor: theme.border }]} onPress={() => router.push('/register')}>
              <Text style={[styles.secondaryText, { color: theme.text }]}>Buat akun baru</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
      <View style={styles.privacyNote}>
        <Ionicons name="shield-checkmark-outline" size={18} color={theme.primary} />
        <Text style={[styles.privacyText, { color: theme.muted }]}>Data akun tersimpan dengan aman melalui layanan autentikasi Tixify.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 22 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  profileCard: { width: '100%', maxWidth: 480, alignSelf: 'center', alignItems: 'center', padding: 24, borderWidth: 1, borderRadius: 24 },
  avatar: { width: 76, height: 76, alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderRadius: 26 },
  title: { textAlign: 'center', fontSize: 24, fontWeight: '900' },
  description: { maxWidth: 300, marginTop: 7, marginBottom: 22, textAlign: 'center', fontSize: 13, lineHeight: 19 },
  emailRow: { width: '100%', minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 13, borderWidth: 1, borderRadius: 13 },
  email: { flex: 1, fontSize: 13, fontWeight: '700' },
  primaryButton: { width: '100%', minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, borderRadius: 14 },
  primaryText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  secondaryButton: { width: '100%', minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10, borderWidth: 1, borderRadius: 14 },
  secondaryText: { fontSize: 13, fontWeight: '800' },
  privacyNote: { maxWidth: 380, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18 },
  privacyText: { flex: 1, fontSize: 11, lineHeight: 16 },
});
