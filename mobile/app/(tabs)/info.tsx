import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getApiBaseUrl, setCustomApiUrl, getDefaultApiUrl, mobileApi } from '@/lib/api';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function InfoScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme];

  const [apiUrl, setApiUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    getApiBaseUrl().then(setApiUrl);
  }, []);

  const handleSaveUrl = async () => {
    if (!apiUrl.trim()) {
      Alert.alert('Perhatian', 'URL server tidak boleh kosong.');
      return;
    }
    await setCustomApiUrl(apiUrl);
    setTestResult(null);
    Alert.alert('Berhasil', 'URL backend API berhasil disimpan.');
  };

  const handleResetUrl = async () => {
    const defaultUrl = getDefaultApiUrl();
    setApiUrl(defaultUrl);
    await setCustomApiUrl(defaultUrl);
    setTestResult(null);
    Alert.alert('Direset', `URL backend dikembalikan ke default: ${defaultUrl}`);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      await mobileApi.health();
      const events = await mobileApi.events();
      setTestResult({
        ok: true,
        msg: events.length
          ? `Backend terhubung. ${events.length} event berhasil dimuat.`
          : 'Backend terhubung, tetapi belum ada event di database. Tambahkan event melalui Dashboard Admin.',
      });
    } catch (err) {
      setTestResult({
        ok: false,
        msg: (err as Error).message,
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* BRAND CARD */}
      <View style={[styles.brandCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.brandLogoWrap}>
          <Text style={{ fontSize: 32 }}>🎟️</Text>
        </View>
        <Text style={[styles.brandTitle, { color: theme.text }]}>Tixify Mobile</Text>
        <Text style={[styles.brandVersion, { color: theme.muted }]}>Versi 1.0.0 — Expo React Native</Text>
        <Text style={[styles.brandDesc, { color: theme.muted }]}>
          Aplikasi resmi pengunjung untuk pemesanan tiket event cepat, penyimpanan e-tiket digital, dan validasi barcode/QR instan.
        </Text>
      </View>

      {/* SERVER CONFIGURATION */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.cardHeaderRow}>
          <Ionicons name="server-outline" size={20} color={theme.primary} />
          <Text style={[styles.cardTitle, { color: theme.text }]}>Pengaturan Server API</Text>
        </View>
        <Text style={[styles.cardSubtitle, { color: theme.muted }]}>
          Aplikasi memakai backend Express yang terhubung ke Supabase. Pastikan backend aktif; untuk smartphone fisik, gunakan alamat IP komputer di jaringan Wi-Fi yang sama.
        </Text>
        <Text style={[styles.cardSubtitle, { color: theme.muted, marginTop: 0, marginBottom: 8 }]}>
          Alamat API aktif: {apiUrl || 'Memuat…'}
        </Text>

        <TextInput
          style={[
            styles.urlInput,
            {
              color: theme.text,
              borderColor: theme.border,
              backgroundColor: colorScheme === 'dark' ? '#0f172a' : '#f8fafc',
            },
          ]}
          value={apiUrl}
          onChangeText={setApiUrl}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="http://192.168.1.X:4000/api"
          placeholderTextColor={theme.muted}
        />

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.smallBtn, { backgroundColor: theme.primary }]}
            onPress={handleSaveUrl}>
            <Text style={styles.smallBtnText}>Simpan URL</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.smallBtnOutline, { borderColor: theme.border }]}
            onPress={handleResetUrl}>
            <Text style={[styles.smallBtnOutlineText, { color: theme.text }]}>Reset Default</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.smallBtnTest, { backgroundColor: '#10b981' }]}
            onPress={handleTestConnection}
            disabled={testing}>
            {testing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.smallBtnText}>Tes Koneksi</Text>
            )}
          </TouchableOpacity>
        </View>

        {testResult && (
          <View
            style={[
              styles.testResultBox,
              {
                backgroundColor: testResult.ok ? '#ecfdf5' : '#fef2f2',
                borderColor: testResult.ok ? '#a7f3d0' : '#fecaca',
              },
            ]}>
            <Ionicons
              name={testResult.ok ? 'checkmark-circle' : 'alert-circle'}
              size={18}
              color={testResult.ok ? '#059669' : '#dc2626'}
              style={{ marginRight: 6 }}
            />
            <Text
              style={{
                color: testResult.ok ? '#065f46' : '#991b1b',
                fontSize: 12,
                fontWeight: '600',
                flex: 1,
              }}>
              {testResult.msg}
            </Text>
          </View>
        )}
      </View>

      {/* FAQ & PANDUAN */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.cardHeaderRow}>
          <Ionicons name="help-circle-outline" size={20} color={theme.primary} />
          <Text style={[styles.cardTitle, { color: theme.text }]}>Panduan Penggunaan</Text>
        </View>

        <View style={styles.faqItem}>
          <Text style={[styles.faqQ, { color: theme.text }]}>1. Bagaimana cara membeli tiket?</Text>
          <Text style={[styles.faqA, { color: theme.muted }]}>
            Buka tab "Jelajah Event", pilih acara yang ingin dikunjungi, tekan "Pesan Tiket", isi nama dan email Anda, lalu konfirmasi.
          </Text>
        </View>

        <View style={styles.faqItem}>
          <Text style={[styles.faqQ, { color: theme.text }]}>2. Di mana tiket saya disimpan?</Text>
          <Text style={[styles.faqA, { color: theme.muted }]}>
            Semua tiket tersimpan di tab "Tiketku". Anda juga dapat memeriksa tiket kapan saja dengan memasukkan 8 digit kode booking.
          </Text>
        </View>

        <View style={styles.faqItem}>
          <Text style={[styles.faqQ, { color: theme.text }]}>3. Bagaimana cara masuk ke venue?</Text>
          <Text style={[styles.faqA, { color: theme.muted }]}>
            Tunjukkan kode QR e-tiket dari aplikasi mobile Tixify kepada petugas jaga di pintu masuk acara untuk dipindai.
          </Text>
        </View>
      </View>

      {/* ADMIN PORTAL NOTICE */}
      <View style={[styles.adminNoticeCard, { backgroundColor: theme.primaryLight, borderColor: theme.border }]}>
        <Ionicons name="shield-checkmark" size={28} color={theme.primary} style={{ marginBottom: 6 }} />
        <Text style={[styles.adminNoticeTitle, { color: theme.text }]}>Pengelola Acara / Administrator?</Text>
        <Text style={[styles.adminNoticeDesc, { color: theme.muted }]}>
          Aplikasi mobile dikhususkan untuk pengunjung. Untuk menambah event, mengubah kuota, atau memantau transaksi, gunakan Website Dashboard Admin Tixify:
        </Text>
        <View style={styles.adminUrlBox}>
          <Text style={styles.adminUrlText}>http://localhost:3000/admin</Text>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  brandCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  brandLogoWrap: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#edf2f8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 2,
  },
  brandVersion: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
  },
  brandDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  cardSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  urlInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  smallBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  smallBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  smallBtnOutline: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  smallBtnOutlineText: {
    fontWeight: '600',
    fontSize: 12,
  },
  smallBtnTest: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  testResultBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  faqItem: {
    marginTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  faqQ: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  faqA: {
    fontSize: 12,
    lineHeight: 17,
  },
  adminNoticeCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  adminNoticeTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
  adminNoticeDesc: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    marginBottom: 10,
  },
  adminUrlBox: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d8e0eb',
  },
  adminUrlText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#102b50',
    fontFamily: 'monospace',
  },
});
