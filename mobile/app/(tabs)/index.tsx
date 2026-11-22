import React, { useCallback, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mobileApi, type EventItem, type Order } from '@/lib/api';
import { rp, tglShort } from '@/lib/format';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

const RECENT_ORDERS_KEY = '@tixify_recent_orders';

export default function ExploreScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme];
  const router = useRouter();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Buy Modal State
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [qty, setQty] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [successOrder, setSuccessOrder] = useState<Order | null>(null);
  const requestId = useRef(0);
  const hasLoadedEvents = useRef(false);

  const fetchEvents = useCallback(async () => {
    const currentRequest = ++requestId.current;
    if (hasLoadedEvents.current) setRefreshing(true);
    else setLoading(true);
    try {
      setError(null);
      const data = await mobileApi.events();
      if (currentRequest === requestId.current) {
        setEvents(Array.isArray(data) ? data : []);
        hasLoadedEvents.current = true;
      }
    } catch (err) {
      if (currentRequest === requestId.current) setError((err as Error).message);
    } finally {
      if (currentRequest === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchEvents();
      return () => {
        requestId.current += 1;
      };
    }, [fetchEvents])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };

  const filteredEvents = events.filter((e) => {
    const q = search.toLowerCase();
    return e.name.toLowerCase().includes(q) || (e.venue && e.venue.toLowerCase().includes(q));
  });

  const openBuyModal = (event: EventItem) => {
    setSelectedEvent(event);
    setQty(1);
    setSuccessOrder(null);
  };

  const closeBuyModal = () => {
    setSelectedEvent(null);
    setSuccessOrder(null);
    setSubmitting(false);
  };

  const handleCheckout = async () => {
    if (!selectedEvent) return;
    if (!buyerName.trim()) {
      Alert.alert('Perhatian', 'Silakan masukkan nama lengkap pembeli.');
      return;
    }
    if (!buyerEmail.trim() || !buyerEmail.includes('@')) {
      Alert.alert('Perhatian', 'Silakan masukkan alamat email yang valid.');
      return;
    }

    setSubmitting(true);
    try {
      const order = await mobileApi.createOrder({
        event_id: selectedEvent.id,
        buyer_name: buyerName.trim(),
        buyer_email: buyerEmail.trim(),
        qty,
      });

      // Simpan ke storage riwayat tiket ponsel
      try {
        const existing = await AsyncStorage.getItem(RECENT_ORDERS_KEY);
        const list: string[] = existing ? JSON.parse(existing) : [];
        if (!list.includes(order.code)) {
          list.unshift(order.code);
          await AsyncStorage.setItem(RECENT_ORDERS_KEY, JSON.stringify(list.slice(0, 20)));
        }
      } catch {
        // silent
      }

      setSuccessOrder(order);
      fetchEvents(); // Refresh kuota tiket
    } catch (err) {
      Alert.alert('Gagal Memesan', (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderEventItem = ({ item }: { item: EventItem }) => {
    const isSoldOut = item.stock < 1;
    return (
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={[styles.eventTitle, { color: theme.text }]}>{item.name}</Text>
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={14} color={theme.muted} />
              <Text style={[styles.metaText, { color: theme.muted }]}>{tglShort(item.event_date)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={14} color={theme.muted} />
              <Text style={[styles.metaText, { color: theme.muted }]} numberOfLines={1}>
                {item.venue || 'Venue akan diumumkan'}
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.stockBadge,
              { backgroundColor: isSoldOut ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)' },
            ]}>
            <Text style={{ color: isSoldOut ? '#ef4444' : '#10b981', fontWeight: '700', fontSize: 11 }}>
              {isSoldOut ? 'HABIS' : `Sisa ${item.stock}`}
            </Text>
          </View>
        </View>

        {item.description ? (
          <Text style={[styles.eventDesc, { color: theme.muted }]} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        <View style={[styles.cardFooter, { borderTopColor: theme.border }]}>
          <View>
            <Text style={{ fontSize: 11, color: theme.muted }}>Harga Tiket</Text>
            <Text style={[styles.priceText, { color: theme.primary }]}>{rp(item.price)}</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.buyBtn,
              { backgroundColor: isSoldOut ? '#94a3b8' : theme.primary },
            ]}
            disabled={isSoldOut}
            onPress={() => openBuyModal(item)}>
            <Ionicons name="ticket" size={16} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.buyBtnText}>{isSoldOut ? 'Habis' : 'Pesan Tiket'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Search Header Bar */}
      <View style={[styles.searchBarContainer, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.accountShortcut} onPress={() => router.push('/(tabs)/account')} accessibilityLabel="Buka akun">
          <Ionicons name="person-circle-outline" size={27} color={theme.primary} />
        </TouchableOpacity>
        <View style={[styles.searchInputWrapper, { backgroundColor: colorScheme === 'dark' ? '#0f172a' : '#f1f5f9' }]}>
          <Ionicons name="search" size={18} color={theme.muted} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Cari event konser, festival, lokasi..."
            placeholderTextColor={theme.muted}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={theme.muted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={styles.heroIntro}>
        <Text style={[styles.heroKicker, { color: theme.primary }]}>PENGALAMAN DIMULAI DI SINI</Text>
        <Text style={[styles.heroTitle, { color: theme.text }]}>Temukan event favoritmu.</Text>
        <Text style={[styles.heroSubtitle, { color: theme.muted }]}>Konser, festival, dan momen seru berikutnya menunggumu.</Text>
      </View>

      {/* Main List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.centerText, { color: theme.muted }]}>Memuat daftar event...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={[styles.errorTitle, { color: theme.text }]}>Event Tidak Dapat Dimuat</Text>
          <Text style={[styles.centerText, { color: theme.muted }]}>{error}</Text>
          <Text style={[styles.centerText, { color: theme.muted }]}>
            Periksa URL server di tab Info &amp; Server. Jika memakai ponsel fisik, gunakan IP komputer di Wi-Fi yang sama—bukan localhost.
          </Text>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: theme.primary }]} onPress={fetchEvents}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Coba Lagi</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsLink} onPress={() => router.push('/(tabs)/info')}>
            <Text style={{ color: theme.primary, fontWeight: '700' }}>Periksa pengaturan server</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => item.id}
          renderItem={renderEventItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Ionicons name="calendar-outline" size={48} color={theme.muted} />
              <Text style={[styles.centerText, { color: theme.muted }]}>
                {search ? 'Tidak ada event yang cocok dengan pencarian.' : 'Belum ada event tersedia.'}
              </Text>
              {!search && (
                <Text style={[styles.centerText, { color: theme.muted }]}>
                  Server berhasil dihubungi, tetapi belum ada event yang tersimpan. Tarik layar ke bawah untuk memuat ulang.
                </Text>
              )}
            </View>
          }
        />
      )}

      {/* BUY TICKET MODAL */}
      <Modal visible={!!selectedEvent} animationType="slide" transparent={true} onRequestClose={closeBuyModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalSubtitle, { color: theme.muted }]}>Formulir Pemesanan</Text>
                <Text style={[styles.modalTitle, { color: theme.text }]} numberOfLines={1}>
                  {selectedEvent?.name}
                </Text>
              </View>
              <TouchableOpacity onPress={closeBuyModal} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              {successOrder ? (
                /* SUCCESS STATE */
                <View style={styles.successWrapper}>
                  <View style={styles.successIconWrap}>
                    <Ionicons name="checkmark-circle" size={60} color="#10b981" />
                  </View>
                  <Text style={[styles.successTitle, { color: theme.text }]}>Pesanan Berhasil Dibuat!</Text>
                  <Text style={[styles.successDesc, { color: theme.muted }]}>
                    Simpan kode booking unik Anda untuk verifikasi e-tiket atau pembayaran:
                  </Text>
                  <View style={styles.codeBox}>
                    <Text style={styles.codeText}>{successOrder.code}</Text>
                  </View>
                  <View style={[styles.orderDetailCard, { backgroundColor: colorScheme === 'dark' ? '#0f172a' : '#f8fafc', borderColor: theme.border }]}>
                    <Text style={{ color: theme.muted, fontSize: 12 }}>Pemesan: {successOrder.buyer_name}</Text>
                    <Text style={{ color: theme.muted, fontSize: 12 }}>Jumlah: {successOrder.qty} Tiket</Text>
                    <Text style={{ color: theme.primary, fontWeight: '800', fontSize: 16, marginTop: 4 }}>
                      Total: {rp(successOrder.total)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.primaryActionBtn, { backgroundColor: theme.primary }]}
                    onPress={() => {
                      closeBuyModal();
                      router.push('/(tabs)/tickets');
                    }}>
                    <Text style={styles.primaryActionBtnText}>Buka di Tab "Tiketku" →</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* FORM INPUT */
                <>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.text }]}>Nama Lengkap *</Text>
                    <TextInput
                      style={[styles.inputBox, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                      placeholder="Contoh: Muhammad Raafi"
                      placeholderTextColor={theme.muted}
                      value={buyerName}
                      onChangeText={setBuyerName}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.text }]}>Alamat Email Aktif *</Text>
                    <TextInput
                      style={[styles.inputBox, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                      placeholder="nama@email.com"
                      placeholderTextColor={theme.muted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={buyerEmail}
                      onChangeText={setBuyerEmail}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.text }]}>Jumlah Tiket</Text>
                    <View style={styles.qtyControlRow}>
                      <TouchableOpacity
                        style={[styles.qtyBtn, { borderColor: theme.border }]}
                        onPress={() => setQty(Math.max(1, qty - 1))}
                        disabled={qty <= 1}>
                        <Ionicons name="remove" size={18} color={qty <= 1 ? theme.muted : theme.text} />
                      </TouchableOpacity>
                      <Text style={[styles.qtyNumber, { color: theme.text }]}>{qty}</Text>
                      <TouchableOpacity
                        style={[styles.qtyBtn, { borderColor: theme.border }]}
                        onPress={() => {
                          const maxStock = selectedEvent?.stock ?? 10;
                          if (qty < maxStock) setQty(qty + 1);
                        }}>
                        <Ionicons name="add" size={18} color={theme.text} />
                      </TouchableOpacity>
                      <Text style={{ fontSize: 12, color: theme.muted, marginLeft: 12 }}>
                        Maksimal {selectedEvent?.stock ?? 0} tiket
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.summaryBox, { backgroundColor: colorScheme === 'dark' ? '#0f172a' : '#f8fafc', borderColor: theme.border }]}>
                    <View style={styles.summaryRow}>
                      <Text style={{ color: theme.muted }}>Harga Satuan</Text>
                      <Text style={{ color: theme.text, fontWeight: '600' }}>{rp(selectedEvent?.price ?? 0)}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={{ color: theme.muted }}>Banyak Tiket</Text>
                      <Text style={{ color: theme.text, fontWeight: '600' }}>{qty}x</Text>
                    </View>
                    <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 8, marginTop: 4 }]}>
                      <Text style={{ fontWeight: '800', color: theme.text }}>Total Tagihan</Text>
                      <Text style={{ fontWeight: '800', fontSize: 18, color: theme.primary }}>
                        {rp((selectedEvent?.price ?? 0) * qty)}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.primaryActionBtn, { backgroundColor: theme.primary }]}
                    onPress={handleCheckout}
                    disabled={submitting}>
                    {submitting ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.primaryActionBtnText}>Konfirmasi &amp; Dapatkan E-Tiket</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  heroIntro: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 10,
  },
  heroKicker: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  heroTitle: {
    marginTop: 7,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.7,
  },
  heroSubtitle: {
    maxWidth: 340,
    marginTop: 5,
    fontSize: 13,
    lineHeight: 19,
  },
  accountShortcut: {
    width: 36,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  listContent: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 8,
  },
  eventTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 12,
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  eventDesc: {
    fontSize: 13,
    paddingHorizontal: 16,
    marginBottom: 12,
    lineHeight: 18,
  },
  cardFooter: {
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  priceText: {
    fontSize: 17,
    fontWeight: '800',
  },
  buyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  buyBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 40,
  },
  centerText: {
    marginTop: 10,
    fontSize: 14,
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  settingsLink: {
    marginTop: 16,
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  modalSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  inputBox: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  qtyControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyNumber: {
    fontSize: 18,
    fontWeight: '800',
    marginHorizontal: 16,
  },
  summaryBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginVertical: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  primaryActionBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryActionBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  successWrapper: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  successIconWrap: {
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  successDesc: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  codeBox: {
    backgroundColor: '#edf2f8',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#102b50',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  codeText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#102b50',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  orderDetailCard: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
});
