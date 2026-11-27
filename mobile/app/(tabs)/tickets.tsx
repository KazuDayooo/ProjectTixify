import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { mobileApi, type OrderLookup, type OwnedOrder } from '@/lib/api';
import { rp, tgl, STATUS_LABEL } from '@/lib/format';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import QRCode from 'react-native-qrcode-svg';

const RECENT_ORDERS_KEY = '@tixify_recent_orders';

export default function TicketsScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme];

  const [inputCode, setInputCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [ticket, setTicket] = useState<OrderLookup | null>(null);
  const [myOrders, setMyOrders] = useState<OwnedOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [recentCodes, setRecentCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadRecentCodes = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_ORDERS_KEY);
      if (stored) {
        setRecentCodes(JSON.parse(stored));
      }
    } catch {
      // silent
    }
  }, []);

  const loadMyOrders = useCallback(async () => {
    setOrdersLoading(true);
    setOrdersError(null);
    try {
      const orders = await mobileApi.myOrders();
      setMyOrders(orders);
      setTicket((current) => current ? orders.find((order) => order.code === current.code) || current : current);
    } catch (err) {
      setOrdersError((err as Error).message);
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void loadRecentCodes();
    void loadMyOrders();
  }, [loadMyOrders, loadRecentCodes]));

  const saveRecentCode = async (code: string) => {
    try {
      const existing = await AsyncStorage.getItem(RECENT_ORDERS_KEY);
      let list: string[] = existing ? JSON.parse(existing) : [];
      list = [code, ...list.filter((c) => c !== code)].slice(0, 15);
      await AsyncStorage.setItem(RECENT_ORDERS_KEY, JSON.stringify(list));
      setRecentCodes(list);
    } catch {
      // silent
    }
  };

  const clearRecentCodes = async () => {
    await AsyncStorage.removeItem(RECENT_ORDERS_KEY);
    setRecentCodes([]);
  };

  const handleLookup = async (codeToLookup?: string) => {
    const code = (codeToLookup || inputCode).trim().toUpperCase();
    if (!code) {
      Alert.alert('Perhatian', 'Masukkan kode pesanan Anda.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await mobileApi.lookup(code);
      setTicket(res);
      setInputCode(code);
      saveRecentCode(code);
    } catch (err) {
      setTicket(null);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    if (!ticket) return;
    setPaying(true);
    try {
      await mobileApi.payOrder(ticket.code);
      const refreshedTicket = await mobileApi.lookup(ticket.code);
      setTicket(refreshedTicket);
      await loadMyOrders();
      Alert.alert('Sukses!', 'Pembayaran simulasi Midtrans berhasil. Tiket Anda sudah diterbitkan.');
    } catch (err) {
      Alert.alert('Gagal Membayar', (err as Error).message);
    } finally {
      setPaying(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* SEARCH / LOOKUP SECTION */}
      <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="search-circle" size={24} color={theme.primary} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Tiketku &amp; Status Pesanan</Text>
        </View>
        <Text style={[styles.sectionSubtitle, { color: theme.muted }]}>
          Masukkan 8-karakter kode pesanan Anda untuk melihat e-tiket dan status pembayaran.
        </Text>

        <View style={styles.searchRow}>
          <TextInput
            style={[
              styles.codeInput,
              {
                color: theme.text,
                borderColor: theme.border,
                backgroundColor: colorScheme === 'dark' ? '#0f172a' : '#f8fafc',
              },
            ]}
            placeholder="Contoh: A2425C55"
            placeholderTextColor={theme.muted}
            value={inputCode}
            onChangeText={(txt) => setInputCode(txt.toUpperCase())}
            autoCapitalize="characters"
            maxLength={12}
          />
          <TouchableOpacity
            style={[styles.lookupBtn, { backgroundColor: theme.primary }]}
            onPress={() => handleLookup()}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.lookupBtnText}>Cari</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* RECENT ORDERS CHIPS */}
        {recentCodes.length > 0 && (
          <View style={styles.recentWrap}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: theme.muted, textTransform: 'uppercase' }}>
                Riwayat Tiket Terakhir
              </Text>
              <TouchableOpacity onPress={clearRecentCodes}>
                <Text style={{ fontSize: 11, color: '#ef4444' }}>Hapus</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
              {recentCodes.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: ticket?.code === c ? theme.primary : colorScheme === 'dark' ? '#121e30' : '#edf2f8',
                      borderColor: ticket?.code === c ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => handleLookup(c)}>
                  <Text
                    style={[
                      styles.chipText,
                      { color: ticket?.code === c ? '#fff' : theme.primary },
                    ]}>
                    #{c}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="ticket" size={22} color={theme.primary} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Pesanan di Akun Saya</Text>
        </View>
        {ordersLoading && myOrders.length === 0 ? (
          <ActivityIndicator color={theme.primary} />
        ) : ordersError ? (
          <Text style={[styles.sectionSubtitle, { color: '#ef4444' }]}>{ordersError}</Text>
        ) : myOrders.length === 0 ? (
          <Text style={[styles.sectionSubtitle, { color: theme.muted, marginBottom: 0 }]}>Belum ada pesanan. Tiket yang dibeli akan muncul di sini.</Text>
        ) : myOrders.map((order) => (
          <TouchableOpacity
            key={order.code}
            style={[styles.myOrderRow, { borderColor: theme.border, backgroundColor: colorScheme === 'dark' ? '#0f172a' : '#f8fafc' }]}
            onPress={() => handleLookup(order.code)}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.orderEventName, { color: theme.text }]} numberOfLines={1}>{order.event_name}</Text>
              <Text style={[styles.orderMeta, { color: theme.muted }]}>#{order.code} · {order.qty} tiket · {rp(order.total)}</Text>
            </View>
            <View style={[styles.orderStatusBadge, { backgroundColor: order.status === 'paid' ? 'rgba(16, 185, 129, 0.14)' : order.status === 'pending' ? 'rgba(245, 158, 11, 0.14)' : 'rgba(239, 68, 68, 0.14)' }]}>
              <Text style={{ color: order.status === 'paid' ? '#10b981' : order.status === 'pending' ? '#f59e0b' : '#ef4444', fontWeight: '800', fontSize: 10 }}>
                {order.status === 'paid' ? 'LUNAS' : order.status === 'pending' ? 'MENUNGGU BAYAR' : 'DIBATALKAN'}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* ERROR MESSAGE */}
      {error && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={20} color="#ef4444" style={{ marginRight: 8 }} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* TICKET DISPLAY */}
      {ticket && (
        <View style={styles.ticketCardWrapper}>
          <View style={[styles.ticketCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {/* TICKET TOP PART */}
            <View style={styles.ticketTopPart}>
              <View style={styles.ticketBadgeRow}>
                <View style={styles.bookingCodeBadge}>
                  <Text style={styles.bookingCodeText}>#{ticket.code}</Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        ticket.status === 'paid'
                          ? 'rgba(16, 185, 129, 0.15)'
                          : ticket.status === 'pending'
                          ? 'rgba(245, 158, 11, 0.15)'
                          : 'rgba(239, 68, 68, 0.15)',
                    },
                  ]}>
                  <Text
                    style={{
                      color:
                        ticket.status === 'paid'
                          ? '#10b981'
                          : ticket.status === 'pending'
                          ? '#f59e0b'
                          : '#ef4444',
                      fontWeight: '800',
                      fontSize: 11,
                    }}>
                    {ticket.status === 'paid'
                      ? '✓ LUNAS'
                      : ticket.status === 'pending'
                      ? '⏳ MENUNGGU BAYAR'
                      : '✕ DIBATALKAN'}
                  </Text>
                </View>
              </View>

              <Text style={[styles.ticketEventTitle, { color: theme.text }]}>{ticket.event_name}</Text>

              {ticket.venue ? (
                <View style={styles.ticketMetaRow}>
                  <Ionicons name="location" size={14} color={theme.muted} />
                  <Text style={[styles.ticketMetaText, { color: theme.muted }]}>{ticket.venue}</Text>
                </View>
              ) : null}

              {ticket.event_date ? (
                <View style={styles.ticketMetaRow}>
                  <Ionicons name="calendar" size={14} color={theme.muted} />
                  <Text style={[styles.ticketMetaText, { color: theme.muted }]}>{tgl(ticket.event_date)}</Text>
                </View>
              ) : null}
            </View>

            {/* PERFORATION DIVIDER */}
            <View style={styles.dividerWrapper}>
              <View style={[styles.notchLeft, { backgroundColor: theme.background }]} />
              <View style={[styles.dashedLine, { borderColor: theme.border }]} />
              <View style={[styles.notchRight, { backgroundColor: theme.background }]} />
            </View>

            {/* TICKET BOTTOM / QR CODE STUB */}
            <View style={styles.ticketBottomPart}>
              <View style={styles.detailGrid}>
                <View style={styles.detailCol}>
                  <Text style={{ fontSize: 11, color: theme.muted }}>Nama Pembeli</Text>
                  <Text style={[styles.detailVal, { color: theme.text }]}>{ticket.buyer_name}</Text>
                </View>
                <View style={styles.detailCol}>
                  <Text style={{ fontSize: 11, color: theme.muted }}>Banyak Tiket</Text>
                  <Text style={[styles.detailVal, { color: theme.text }]}>{ticket.qty} Tiket</Text>
                </View>
              </View>

              <View style={[styles.detailGrid, { marginTop: 10 }]}>
                <View style={styles.detailCol}>
                  <Text style={{ fontSize: 11, color: theme.muted }}>Status Tiket</Text>
                  <Text style={[styles.detailVal, { color: theme.text }]}>{STATUS_LABEL[ticket.status]}</Text>
                </View>
                <View style={styles.detailCol}>
                  <Text style={{ fontSize: 11, color: theme.muted }}>Total Bayar</Text>
                  <Text style={[styles.detailVal, { color: theme.primary, fontWeight: '800' }]}>
                    {rp(ticket.total)}
                  </Text>
                </View>
              </View>

              {ticket.status === 'paid' && ticket.tickets?.map((entry, index) => (
                <View key={entry.code} style={[styles.qrContainer, { backgroundColor: colorScheme === 'dark' ? '#0f172a' : '#f8fafc', borderColor: theme.border }]}> 
                  <Text style={[styles.detailVal, { color: theme.text, marginBottom: 12 }]}>Tiket {index + 1}</Text>
                  {entry.status === 'valid' ? (
                    <QRCode
                      value={entry.code.trim().toUpperCase()}
                      size={260}
                      quietZone={24}
                      backgroundColor="#ffffff"
                      color="#000000"
                    />
                  ) : (
                    <View style={styles.usedTicketMark}><Ionicons name="checkmark-circle" size={48} color="#10b981" /><Text style={styles.usedTicketText}>SUDAH DIGUNAKAN</Text></View>
                  )}
                  <Text style={[styles.qrHelperText, { color: theme.muted }]}>
                    {entry.status === 'valid' ? `Kode ${entry.code} · tunjukkan saat masuk` : `Kode ${entry.code} tidak dapat digunakan kembali`}
                  </Text>
                </View>
              ))}
              {ticket.status === 'paid' && !ticket.tickets?.length && (
                <View style={[styles.qrContainer, { backgroundColor: colorScheme === 'dark' ? '#0f172a' : '#f8fafc', borderColor: theme.border }]}>
                  <Text style={[styles.qrHelperText, { color: theme.muted }]}>Tiket belum tersedia. Muat ulang pesanan beberapa saat lagi.</Text>
                </View>
              )}
              {ticket.status !== 'paid' && (
                <View style={[styles.qrContainer, { backgroundColor: colorScheme === 'dark' ? '#0f172a' : '#f8fafc', borderColor: theme.border }]}>
                  <Ionicons name="qr-code" size={72} color={theme.muted} />
                  <Text style={[styles.qrHelperText, { color: theme.muted }]}>Selesaikan pembayaran untuk mengaktifkan tiket masuk.</Text>
                </View>
              )}

              {/* PAY BUTTON IF PENDING */}
              {ticket.status === 'pending' && (
                <View style={styles.paymentPromptBox}>
                  <Text style={styles.paymentPromptText}>
                    Pesanan masih pending. Gunakan simulasi pembayaran Midtrans sementara untuk menerbitkan tiket.
                  </Text>
                  <TouchableOpacity
                    style={[styles.payNowBtn, { backgroundColor: '#10b981' }]}
                    onPress={handlePay}
                    disabled={paying}>
                    {paying ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Ionicons name="flash" size={16} color="#fff" style={{ marginRight: 6 }} />
                        <Text style={styles.payNowBtnText}>⚡ Bayar Sekarang (Simulasi Midtrans)</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>
      )}

      {/* EMPTY PLACEHOLDER */}
      {!ticket && !loading && !error && (
        <View style={styles.emptyPlaceholder}>
          <Ionicons name="ticket-outline" size={64} color={theme.muted} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Belum Ada Tiket yang Dibuka</Text>
          <Text style={[styles.emptySubtitle, { color: theme.muted }]}>
            Gunakan kolom pencarian di atas untuk memasukkan kode pesanan, atau pilih tiket yang pernah Anda pesan dari riwayat.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 14,
  },
  myOrderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    marginTop: 9,
    borderWidth: 1,
    borderRadius: 12,
  },
  orderEventName: {
    fontSize: 13,
    fontWeight: '800',
  },
  orderMeta: {
    fontSize: 11,
    marginTop: 4,
  },
  orderStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 7,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  codeInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  lookupBtn: {
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lookupBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  recentWrap: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  chipsScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 13,
    flex: 1,
  },
  ticketCardWrapper: {
    marginBottom: 40,
  },
  ticketCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  ticketTopPart: {
    padding: 20,
  },
  ticketBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bookingCodeBadge: {
    backgroundColor: '#edf2f8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bookingCodeText: {
    color: '#102b50',
    fontSize: 14,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ticketEventTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 8,
    lineHeight: 26,
  },
  ticketMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  ticketMetaText: {
    fontSize: 13,
  },
  dividerWrapper: {
    height: 24,
    position: 'relative',
    justifyContent: 'center',
  },
  dashedLine: {
    borderBottomWidth: 1.5,
    borderStyle: 'dashed',
    marginHorizontal: 18,
  },
  notchLeft: {
    position: 'absolute',
    left: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  notchRight: {
    position: 'absolute',
    right: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  ticketBottomPart: {
    padding: 20,
  },
  detailGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailCol: {
    flex: 1,
  },
  detailVal: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  qrContainer: {
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  qrHelperText: {
    fontSize: 11,
    marginTop: 10,
    textAlign: 'center',
  },
  usedTicketMark: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 132,
    height: 132,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  usedTicketText: {
    marginTop: 6,
    color: '#059669',
    fontSize: 10,
    fontWeight: '800',
  },
  paymentPromptBox: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
  },
  paymentPromptText: {
    color: '#92400e',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  payNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  payNowBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  emptyPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
