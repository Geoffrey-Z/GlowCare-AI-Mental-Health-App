import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const API_BASE = `${EXPO_PUBLIC_BACKEND_URL}/api`;
const DEMO_USER_ID = 'demo-user-123';

const EMOTION_MAP: Record<string, { emoji: string; label: string; color: string }> = {
  joy:      { emoji: '😊', label: '愉悦', color: '#f59e0b' },
  sadness:  { emoji: '😢', label: '悲伤', color: '#3b82f6' },
  anger:    { emoji: '😠', label: '愤怒', color: '#ef4444' },
  fear:     { emoji: '😨', label: '恐惧', color: '#8b5cf6' },
  anxiety:  { emoji: '😰', label: '焦虑', color: '#f97316' },
  disgust:  { emoji: '🤢', label: '厌恶', color: '#84cc16' },
  surprise: { emoji: '😲', label: '惊讶', color: '#06b6d4' },
  shame:    { emoji: '😳', label: '羞耻', color: '#ec4899' },
  guilt:    { emoji: '😔', label: '愧疚', color: '#64748b' },
  love:     { emoji: '🥰', label: '爱意', color: '#f43f5e' },
  neutral:  { emoji: '😐', label: '平静', color: '#9ca3af' },
};

const CRISIS_COLORS = ['#22c55e', '#84cc16', '#f59e0b', '#f97316', '#ef4444', '#7f1d1d'];
const CRISIS_LABELS = ['正常', '轻微', '低度', '中度', '高危', '紧急'];

type ConversationItem = {
  id: string;
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
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPage = async (cursor?: string | null, isRefresh = false) => {
    if (loading && !isRefresh) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '20' });
      if (cursor) params.set('cursor', cursor);
      const res = await fetch(`${API_BASE}/conversations/${DEMO_USER_ID}/history?${params}`);
      if (!res.ok) throw new Error('加载失败，请重试');
      const data: PageResp = await res.json();
      setItems(prev => (cursor && !isRefresh ? [...prev, ...data.items] : data.items));
      setNextCursor(data.next_cursor ?? null);
      setError(null);
    } catch (e: any) {
      setError(e?.message || '网络错误');
    } finally {
      setLoading(false);
      setInitialLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadPage(null); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setNextCursor(null);
    loadPage(null, true);
  }, []);

  const onEndReached = () => {
    if (nextCursor && !loading) loadPage(nextCursor);
  };

  const renderItem = ({ item }: { item: ConversationItem }) => {
    const primary = item?.analysis?.emotion_primary || 'neutral';
    const emo = EMOTION_MAP[primary] ?? EMOTION_MAP['neutral'];
    const risk = Number(item?.analysis?.risk_score ?? 0);
    const cl = Math.min(5, Math.max(0, Number(item.crisis_level ?? 0)));
    const summary = item?.analysis?.summary;
    const ts = new Date(item.timestamp).toLocaleString('zh-CN');

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/conversations/${item.id}`)}
        activeOpacity={0.85}
      >
        <View style={styles.cardTop}>
          <View style={[styles.emotionBadge, { backgroundColor: emo.color + '20' }]}>
            <Text style={styles.emojiText}>{emo.emoji}</Text>
            <Text style={[styles.emotionLabel, { color: emo.color }]}>{emo.label}</Text>
          </View>
          <View style={[styles.crisisBadge, { backgroundColor: CRISIS_COLORS[cl] + '20' }]}>
            <View style={[styles.crisisDot, { backgroundColor: CRISIS_COLORS[cl] }]} />
            <Text style={[styles.crisisLabel, { color: CRISIS_COLORS[cl] }]}>
              {CRISIS_LABELS[cl]} {cl}/5
            </Text>
          </View>
        </View>

        {summary ? (
          <Text numberOfLines={2} style={styles.summary}>{summary}</Text>
        ) : (
          <Text numberOfLines={2} style={styles.snippet}>{item.conversation_text}</Text>
        )}

        <View style={styles.riskRow}>
          <Text style={styles.riskBarLabel}>风险</Text>
          <View style={styles.riskBarBg}>
            <View
              style={[
                styles.riskBarFill,
                { width: `${Math.round(risk * 100)}%`, backgroundColor: risk >= 0.6 ? '#ef4444' : risk >= 0.3 ? '#f59e0b' : '#22c55e' },
              ]}
            />
          </View>
          <Text style={[styles.riskPct, { color: risk >= 0.6 ? '#ef4444' : '#6b7280' }]}>
            {Math.round(risk * 100)}%
          </Text>
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.time}>{ts}</Text>
          <View style={styles.viewRow}>
            <Text style={styles.viewText}>查看详情</Text>
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
        <Text style={styles.title}>对话分析历史</Text>
        <View style={{ width: 40 }} />
      </View>

      {initialLoading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>加载历史记录...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerWrap}>
          <Ionicons name="cloud-offline-outline" size={48} color="#9ca3af" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => loadPage(null)} style={styles.retryBtn}>
            <Text style={styles.retryText}>重新加载</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          onEndReachedThreshold={0.6}
          onEndReached={onEndReached}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
          ListFooterComponent={
            loading && nextCursor ? (
              <View style={{ alignItems: 'center', padding: 16 }}>
                <ActivityIndicator color="#6366f1" />
                <Text style={{ color: '#9ca3af', marginTop: 4, fontSize: 12 }}>加载更多...</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.centerWrap}>
              <Ionicons name="chatbubble-ellipses-outline" size={56} color="#d1d5db" />
              <Text style={styles.emptyTitle}>暂无对话记录</Text>
              <Text style={styles.emptySubtitle}>去「对话分析」页面完成第一次分析吧</Text>
              <TouchableOpacity style={styles.goBtn} onPress={() => router.push('/conversations')}>
                <Text style={styles.goBtnText}>前往分析</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f0f4ff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#f3f4f6' },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { color: '#9ca3af', marginTop: 8 },
  errorText: { color: '#b91c1c', marginBottom: 12, textAlign: 'center' },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#eef2ff', borderRadius: 10 },
  retryText: { color: '#4f46e5', fontWeight: '600' },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginTop: 16 },
  emptySubtitle: { color: '#9ca3af', marginTop: 4, textAlign: 'center' },
  goBtn: { marginTop: 16, backgroundColor: '#6366f1', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  goBtnText: { color: '#fff', fontWeight: '700' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  emotionBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  emojiText: { fontSize: 16 },
  emotionLabel: { marginLeft: 5, fontWeight: '700', fontSize: 13 },
  crisisBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  crisisDot: { width: 8, height: 8, borderRadius: 4, marginRight: 5 },
  crisisLabel: { fontSize: 12, fontWeight: '600' },
  summary: { color: '#1f2937', fontSize: 14, lineHeight: 20, marginBottom: 10 },
  snippet: { color: '#6b7280', fontSize: 13, lineHeight: 19, marginBottom: 10 },
  riskRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  riskBarLabel: { fontSize: 11, color: '#9ca3af', width: 28 },
  riskBarBg: { flex: 1, height: 6, backgroundColor: '#f3f4f6', borderRadius: 3, overflow: 'hidden', marginHorizontal: 8 },
  riskBarFill: { height: '100%', borderRadius: 3 },
  riskPct: { fontSize: 12, fontWeight: '600', width: 32, textAlign: 'right' },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 10 },
  time: { color: '#9ca3af', fontSize: 12 },
  viewRow: { flexDirection: 'row', alignItems: 'center' },
  viewText: { color: '#6366f1', fontWeight: '600', fontSize: 13 },
});
