import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const API_BASE = `${EXPO_PUBLIC_BACKEND_URL}/api`;

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
        if (!res.ok) throw new Error('Failed to load detail');
        const d = await res.json();
        setData(d);
      } catch (e: any) {
        setError(e?.message || 'Load error');
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
  }, [id]);

  const Chip = ({ label, tone = '#f3f4f6', textColor = '#374151' }) => (
    <View style={[styles.chip, { backgroundColor: tone }]}>
      <Text style={[styles.chipText, { color: textColor }]}>{label}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="auto" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Conversation Detail</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centerWrap}><ActivityIndicator size="large" color="#6366f1" /></View>
      ) : error ? (
        <View style={styles.centerWrap}><Text style={styles.errorText}>{error}</Text></View>
      ) : !data ? (
        <View style={styles.centerWrap}><Text style={styles.emptyText}>No data</Text></View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Summary</Text>
            <Text style={styles.summary}>{data?.analysis?.summary || '—'}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Emotion</Text>
            <Text style={styles.rowText}>Primary: <Text style={styles.bold}>{data?.analysis?.emotion_primary || 'neutral'}</Text></Text>
            <Text style={styles.rowText}>Valence: <Text style={styles.bold}>{data?.analysis?.valence ?? 0}</Text></Text>
            <Text style={styles.rowText}>Arousal: <Text style={styles.bold}>{data?.analysis?.arousal ?? 0}</Text></Text>
            <Text style={styles.rowText}>Risk: <Text style={[styles.bold, { color: (data?.analysis?.risk_score ?? 0) >= 0.6 ? '#ef4444' : '#111827' }]}>{Math.round((data?.analysis?.risk_score ?? 0) * 100)}%</Text></Text>
          </View>

          {Array.isArray(data?.analysis?.triggers) && data.analysis.triggers.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Triggers</Text>
              <View style={styles.chipsWrap}>
                {data.analysis.triggers.map((t: string, i: number) => <Chip key={`tg-${i}`} label={t} />)}
              </View>
            </View>
          )}

          {Array.isArray(data?.analysis?.distortions) && data.analysis.distortions.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Cognitive Distortions</Text>
              <View style={styles.chipsWrap}>
                {data.analysis.distortions.map((t: string, i: number) => <Chip key={`cd-${i}`} label={t} tone="#fff7ed" textColor="#9a3412" />)}
              </View>
            </View>
          )}

          {Array.isArray(data?.support_suggestions) && data.support_suggestions.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Recommended Actions</Text>
              {data.support_suggestions.map((s: string, i: number) => (
                <View key={`s-${i}`} style={styles.suggestionRow}>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#22c55e" />
                  <Text style={styles.suggestionText}>{s}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={[styles.card, { marginBottom: 28 }]}>
            <Text style={styles.cardTitle}>Meta</Text>
            <Text style={styles.rowText}>Crisis Level: <Text style={styles.bold}>{data.crisis_level}/5</Text></Text>
            <Text style={styles.rowText}>Time: <Text style={styles.bold}>{new Date(data.timestamp).toLocaleString()}</Text></Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/conversations')}>
              <Ionicons name="refresh" size={18} color="#fff" />
              <Text style={styles.primaryText}>Analyze Another</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
  errorText: { color: '#b91c1c' },
  emptyText: { color: '#6b7280' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 3.84, elevation: 3 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 },
  summary: { color: '#374151' },
  rowText: { color: '#374151', marginTop: 4 },
  bold: { fontWeight: '700', color: '#111827' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#f3f4f6', borderRadius: 999, marginRight: 8, marginBottom: 8 },
  chipText: { fontSize: 12 },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  suggestionText: { marginLeft: 8, color: '#374151', flex: 1 },
  primaryBtn: { marginTop: 12, backgroundColor: '#6366f1', padding: 12, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  primaryText: { color: '#fff', fontWeight: '700', marginLeft: 6 },
});
