import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const API_BASE = `${EXPO_PUBLIC_BACKEND_URL}/api`;

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
const CRISIS_BG = ['#f0fdf4', '#f7fee7', '#fffbeb', '#fff7ed', '#fef2f2', '#fef2f2'];

const ProgressBar = ({ value, color }: { value: number; color: string }) => (
  <View style={pbStyles.bg}>
    <View style={[pbStyles.fill, { width: `${Math.min(100, Math.max(0, value * 100))}%`, backgroundColor: color }]} />
  </View>
);

const pbStyles = StyleSheet.create({
  bg: { flex: 1, height: 8, backgroundColor: '#f3f4f6', borderRadius: 6, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 6 },
});

export default function ConversationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/conversations/detail/${id}`);
        if (!res.ok) throw new Error('加载失败，请检查网络');
        const d = await res.json();
        setData(d);
      } catch (e: any) {
        setError(e?.message || '网络错误');
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
  }, [id]);

  const HeaderBar = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={20} color="#111827" />
      </TouchableOpacity>
      <Text style={styles.title}>对话详情</Text>
      <View style={{ width: 40 }} />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="auto" />
        <HeaderBar />
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>加载分析报告...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="auto" />
        <HeaderBar />
        <View style={styles.centerWrap}>
          <Ionicons name="alert-circle-outline" size={56} color="#f87171" />
          <Text style={styles.errorText}>{error || '数据为空'}</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.retryBtn}>
            <Text style={styles.retryText}>返回</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const primary = data?.analysis?.emotion_primary || 'neutral';
  const emo = EMOTION_MAP[primary] ?? EMOTION_MAP['neutral'];
  const risk = Number(data?.analysis?.risk_score ?? 0);
  const valence = Number(data?.analysis?.valence ?? 0);
  const arousal = Number(data?.analysis?.arousal ?? 0.5);
  const cl = Math.min(5, Math.max(0, Number(data.crisis_level ?? 0)));
  const ts = new Date(data.timestamp).toLocaleString('zh-CN');

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="auto" />
      <HeaderBar />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Hero card */}
        <View style={[styles.heroCard, { borderTopColor: emo.color }]}>
          <View style={styles.heroTop}>
            <View style={[styles.emojiCircle, { backgroundColor: emo.color + '20' }]}>
              <Text style={styles.heroEmoji}>{emo.emoji}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.heroEmotion, { color: emo.color }]}>{emo.label}</Text>
              <Text style={styles.heroTime}>{ts}</Text>
            </View>
            <View style={[styles.crisisBadge, { backgroundColor: CRISIS_BG[cl], borderColor: CRISIS_COLORS[cl] }]}>
              <Text style={[styles.crisisText, { color: CRISIS_COLORS[cl] }]}>
                危机 {cl}/5{'\n'}{CRISIS_LABELS[cl]}
              </Text>
            </View>
          </View>
          {data?.analysis?.summary ? (
            <View style={styles.summaryBox}>
              <Ionicons name="chatbubble-ellipses-outline" size={16} color="#6366f1" />
              <Text style={styles.summaryText}>{data.analysis.summary}</Text>
            </View>
          ) : null}
        </View>

        {/* Metric card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>情绪指标</Text>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>情绪效价</Text>
            <ProgressBar value={(valence + 1) / 2} color="#06b6d4" />
            <Text style={styles.metricVal}>{valence >= 0 ? '+' : ''}{valence.toFixed(2)}</Text>
          </View>
          <Text style={styles.metricHint}>负面 ←→ 正面（-1 到 +1）</Text>

          <View style={[styles.metricRow, { marginTop: 12 }]}>
            <Text style={styles.metricLabel}>激活度</Text>
            <ProgressBar value={arousal} color="#8b5cf6" />
            <Text style={styles.metricVal}>{(arousal * 100).toFixed(0)}%</Text>
          </View>
          <Text style={styles.metricHint}>平静 ←→ 激动（0 到 1）</Text>

          <View style={[styles.metricRow, { marginTop: 12 }]}>
            <Text style={styles.metricLabel}>风险评分</Text>
            <ProgressBar value={risk} color={risk >= 0.6 ? '#ef4444' : risk >= 0.3 ? '#f59e0b' : '#22c55e'} />
            <Text style={[styles.metricVal, { color: risk >= 0.6 ? '#ef4444' : '#111827' }]}>
              {Math.round(risk * 100)}%
            </Text>
          </View>
          <Text style={styles.metricHint}>自伤/他伤/严重功能受损风险</Text>
        </View>

        {/* Triggers */}
        {Array.isArray(data?.analysis?.triggers) && data.analysis.triggers.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>触发因素</Text>
            <View style={styles.chipsWrap}>
              {data.analysis.triggers.map((t: string, i: number) => (
                <View key={`tg-${i}`} style={styles.chip}>
                  <Text style={styles.chipText}>{t}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Cognitive distortions */}
        {Array.isArray(data?.analysis?.distortions) && data.analysis.distortions.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="warning-outline" size={18} color="#d97706" />
              <Text style={[styles.cardTitle, { marginLeft: 6, marginBottom: 0 }]}>认知偏差</Text>
            </View>
            <View style={[styles.chipsWrap, { marginTop: 10 }]}>
              {data.analysis.distortions.map((d: string, i: number) => (
                <View key={`cd-${i}`} style={[styles.chip, { backgroundColor: '#fff7ed' }]}>
                  <Text style={[styles.chipText, { color: '#9a3412' }]}>{d}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Recommended actions */}
        {Array.isArray(data?.support_suggestions) && data.support_suggestions.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>建议行动</Text>
            {data.support_suggestions.map((s: string, i: number) => (
              <View key={`s-${i}`} style={styles.actionRow}>
                <View style={styles.actionIndex}>
                  <Text style={styles.actionIndexText}>{i + 1}</Text>
                </View>
                <Text style={styles.actionText}>{s}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Original text */}
        <View style={[styles.card, { marginBottom: 0 }]}>
          <Text style={styles.cardTitle}>原始对话</Text>
          <Text style={styles.originalText}>{data.conversation_text}</Text>
        </View>

        {/* Bottom actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/conversations/history')}>
            <Ionicons name="list-outline" size={18} color="#6366f1" />
            <Text style={styles.secondaryText}>返回历史</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/conversations')}>
            <Ionicons name="add-circle-outline" size={18} color="#fff" />
            <Text style={styles.primaryText}>新建分析</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
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
  errorText: { color: '#b91c1c', marginTop: 12, textAlign: 'center' },
  retryBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#eef2ff', borderRadius: 10 },
  retryText: { color: '#4f46e5', fontWeight: '600' },
  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderTopWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center' },
  emojiCircle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  heroEmoji: { fontSize: 26 },
  heroEmotion: { fontSize: 18, fontWeight: '700' },
  heroTime: { color: '#9ca3af', fontSize: 12, marginTop: 2 },
  crisisBadge: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignItems: 'center' },
  crisisText: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  summaryBox: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 12, backgroundColor: '#eef2ff', padding: 12, borderRadius: 10 },
  summaryText: { flex: 1, color: '#374151', fontSize: 14, lineHeight: 20, marginLeft: 8 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  metricRow: { flexDirection: 'row', alignItems: 'center' },
  metricLabel: { width: 56, fontSize: 12, color: '#6b7280' },
  metricVal: { width: 44, textAlign: 'right', fontSize: 12, fontWeight: '600', color: '#111827' },
  metricHint: { fontSize: 11, color: '#d1d5db', marginTop: 3, marginLeft: 56 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#f3f4f6', borderRadius: 999, marginRight: 8, marginBottom: 8 },
  chipText: { fontSize: 12, color: '#374151' },
  actionRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  actionIndex: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center', marginRight: 10, marginTop: 1 },
  actionIndexText: { fontSize: 12, fontWeight: '700', color: '#6366f1' },
  actionText: { flex: 1, color: '#374151', fontSize: 14, lineHeight: 20 },
  originalText: { color: '#6b7280', fontSize: 13, lineHeight: 20 },
  actionsRow: { flexDirection: 'row', marginTop: 20, gap: 12 },
  secondaryBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#6366f1', padding: 12, borderRadius: 12,
  },
  secondaryText: { color: '#6366f1', fontWeight: '700', marginLeft: 6 },
  primaryBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#6366f1', padding: 12, borderRadius: 12,
  },
  primaryText: { color: '#fff', fontWeight: '700', marginLeft: 6 },
});
