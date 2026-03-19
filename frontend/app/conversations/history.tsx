import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const API_BASE = `${EXPO_PUBLIC_BACKEND_URL}/api`;
const DEMO_USER_ID = 'demo-user-123';

type ConversationItem = {
  id: string;
  user_id: string;
  conversation_text: string;
  analysis: any;
  support_suggestions: string[];
  crisis_level: number;
  timestamp: string;
};

type PageResp = { items: ConversationItem[]; next_cursor?: string | null };

export default function ConversationHistoryScreen() {
  const router = useRouter();
  const [items, setItems] = useState<ConversationItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(async (cursor?: string | null) => {
    if (loading) return;
    setLoading(true);
    try {
      const url = new URL(`${API_BASE}/conversations/${DEMO_USER_ID}/history`);
      url.searchParams.set('limit', '20');
      if (cursor) url.searchParams.set('cursor', cursor);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Failed to load history');
      const data: PageResp = await res.json();
      setItems(prev => (cursor ? [...prev, ...data.items] : data.items));
      setNextCursor(data.next_cursor ?? null);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Load error');
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [loading]);

  useEffect(() => { loadPage(null); }, []);

  const onEndReached = () => {
    if (nextCursor && !loading) loadPage(nextCursor);
  };

  const renderItem = ({ item }: { item: ConversationItem }) => {
    const primary = item?.analysis?.emotion_primary || 'neutral';
    const risk = Number(item?.analysis?.risk_score ?? 0);
    const ts = new Date(item.timestamp).toLocaleString();
    return (
      <TouchableOpacity style={styles.card} onPress={() => router.push(`/conversations/${item.id}`)}>
        <View style={styles.cardHeader}>
          <Text style={styles.primary}>{primary}</Text>
          <View style={styles.riskWrap}>
            <Ionicons name="warning" size={14} color={risk >= 0.6 ? '#ef4444' : '#9ca3af'} />
            <Text style={[styles.riskText, { color: risk >= 0.6 ? '#ef4444' : '#6b7280' }]}>{Math.round(risk * 100)}%</Text>
          </View>
        </View>
        <Text numberOfLines={2} style={styles.snippet}>{item.conversation_text}</Text>
        <View style={styles.footerRow}>
          <Text style={styles.time}>{ts}</Text>
          <View style={styles.viewRow}>
            <Text style={styles.viewText}>View</Text>
            <Ionicons name="chevron-forward" size={16} color="#6366f1" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="auto" />
      <View style={styles.header}> 
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Conversation History</Text>
        <View style={{ width: 40 }} />
      </View>

      {initialLoading ? (
        <View style={styles.centerWrap}><ActivityIndicator size="large" color="#6366f1" /></View>
      ) : error ? (
        <View style={styles.centerWrap}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => loadPage(null)} style={styles.retryBtn}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
        </View>
      ) : (
        <FlashList
          data={items}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          estimatedItemSize={140}
          contentContainerStyle={{ padding: 16 }}
          onEndReachedThreshold={0.6}
          onEndReached={onEndReached}
          ListFooterComponent={loading && nextCursor ? <ActivityIndicator color="#6366f1" /> : null}
          ListEmptyComponent={<View style={styles.centerWrap}><Text style={styles.emptyText}>No conversations yet</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#fff' },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#b91c1c', marginBottom: 8 },
  retryBtn: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#eef2ff', borderRadius: 8 },
  retryText: { color: '#4f46e5', fontWeight: '600' },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 12, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 3.84, elevation: 3 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  primary: { fontWeight: '700', color: '#111827', textTransform: 'capitalize' },
  riskWrap: { flexDirection: 'row', alignItems: 'center' },
  riskText: { marginLeft: 4, fontSize: 12 },
  snippet: { color: '#374151', marginTop: 8 },
  footerRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  time: { color: '#6b7280', fontSize: 12 },
  viewRow: { flexDirection: 'row', alignItems: 'center' },
  viewText: { color: '#6366f1', fontWeight: '600', marginRight: 4 },
});
