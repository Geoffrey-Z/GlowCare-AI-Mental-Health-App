import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Slider from '@react-native-community/slider';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const API_BASE = `${EXPO_PUBLIC_BACKEND_URL}/api`;
const DEMO_USER_ID = 'demo-user-123';

const AI_MODELS = [
  { provider: 'anthropic', model: 'claude-4-sonnet-20250514', label: 'Claude 4 Sonnet', desc: '中文理解出色，共情能力强 ⭐', tag: '推荐' },
  { provider: 'openai',    model: 'gpt-5.2',                  label: 'GPT-5.2',         desc: 'OpenAI 最新旗舰，综合能力最强', tag: '强大' },
  { provider: 'gemini',    model: 'gemini-2.5-pro',           label: 'Gemini 2.5 Pro',  desc: 'Google 多语言，逻辑推理优秀', tag: '' },
  { provider: 'openai',    model: 'gpt-4o-mini',              label: 'GPT-4o mini',     desc: '响应快速，适合低延迟场景', tag: '快速' },
];

type Settings = {
  llm_provider: string;
  llm_model: string;
  risk_threshold: number;
  crisis_threshold: number;
  language: string;
  daily_reminder: boolean;
  reminder_time: string;
};

const DEFAULT_SETTINGS: Settings = {
  llm_provider: 'anthropic',
  llm_model: 'claude-4-sonnet-20250514',
  risk_threshold: 0.6,
  crisis_threshold: 4,
  language: 'zh',
  daily_reminder: false,
  reminder_time: '20:00',
};

export default function SettingsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetch(`${API_BASE}/users/${DEMO_USER_ID}/settings`);
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (e) {
      // use defaults silently
    } finally {
      setLoading(false);
    }
  };

  const update = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/users/${DEMO_USER_ID}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error('保存失败');
      setDirty(false);
      Alert.alert('已保存', '设置已成功保存');
    } catch (e) {
      Alert.alert('保存失败', '请检查网络连接后重试');
    } finally {
      setSaving(false);
    }
  };

  const Section = ({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon as any} size={18} color="#6366f1" />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );

  const Row = ({ label, right }: { label: string; right: React.ReactNode }) => (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowRight}>{right}</View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="auto" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.title}>个人设置</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      </SafeAreaView>
    );
  }

  const selectedModel = AI_MODELS.find(m => m.model === settings.llm_model);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="auto" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>个人设置</Text>
        {dirty ? (
          <TouchableOpacity onPress={saveSettings} style={styles.saveBtn} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>保存</Text>}
          </TouchableOpacity>
        ) : (
          <View style={{ width: 56 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>

        {/* AI Model */}
        <Section title="AI 分析模型" icon="hardware-chip-outline">
          {AI_MODELS.map((m) => {
            const selected = settings.llm_model === m.model;
            return (
              <TouchableOpacity
                key={m.model}
                style={[styles.modelCard, selected && styles.modelCardSelected]}
                onPress={() => { update('llm_provider', m.provider); update('llm_model', m.model); }}
                activeOpacity={0.8}
              >
                <View style={styles.modelLeft}>
                  <View style={[styles.radio, selected && styles.radioSelected]}>
                    {selected && <View style={styles.radioDot} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.modelLabelRow}>
                      <Text style={[styles.modelLabel, selected && { color: '#6366f1' }]}>{m.label}</Text>
                      {!!m.tag && (
                        <View style={[styles.modelTag, selected && styles.modelTagSelected]}>
                          <Text style={[styles.modelTagText, selected && { color: '#6366f1' }]}>{m.tag}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.modelDesc}>{m.desc}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </Section>

        {/* Risk thresholds */}
        <Section title="风险提醒阈值" icon="warning-outline">
          <Text style={styles.sliderHint}>当 AI 评估风险分 ≥ 此值时显示提醒</Text>
          <View style={styles.sliderRow}>
            <Text style={styles.sliderMin}>低</Text>
            <Slider
              style={styles.slider}
              minimumValue={0.2}
              maximumValue={0.9}
              step={0.05}
              value={settings.risk_threshold}
              onValueChange={(v) => update('risk_threshold', Math.round(v * 20) / 20)}
              minimumTrackTintColor="#6366f1"
              maximumTrackTintColor="#e5e7eb"
              thumbTintColor="#6366f1"
            />
            <Text style={styles.sliderMax}>高</Text>
          </View>
          <View style={styles.sliderValue}>
            <Text style={styles.sliderValueText}>当前阈值：{Math.round(settings.risk_threshold * 100)}%</Text>
          </View>

          <View style={[styles.divider, { marginVertical: 16 }]} />

          <Text style={styles.sliderHint}>当危机等级 ≥ 此值时弹出即时支持</Text>
          <View style={styles.sliderRow}>
            <Text style={styles.sliderMin}>宽松</Text>
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={5}
              step={1}
              value={settings.crisis_threshold}
              onValueChange={(v) => update('crisis_threshold', v)}
              minimumTrackTintColor="#ef4444"
              maximumTrackTintColor="#e5e7eb"
              thumbTintColor="#ef4444"
            />
            <Text style={styles.sliderMax}>严格</Text>
          </View>
          <View style={styles.sliderValue}>
            <Text style={[styles.sliderValueText, { color: '#ef4444' }]}>危机等级 ≥ {settings.crisis_threshold}/5</Text>
          </View>
        </Section>

        {/* Language */}
        <Section title="语言偏好" icon="language-outline">
          <View style={styles.langRow}>
            {[{ code: 'zh', label: '中文' }, { code: 'en', label: 'English' }].map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[styles.langBtn, settings.language === lang.code && styles.langBtnSelected]}
                onPress={() => update('language', lang.code)}
              >
                <Text style={[styles.langBtnText, settings.language === lang.code && styles.langBtnTextSelected]}>
                  {lang.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        {/* Daily reminder */}
        <Section title="每日情绪提醒" icon="notifications-outline">
          <Row
            label="开启每日提醒"
            right={
              <Switch
                value={settings.daily_reminder}
                onValueChange={(v) => update('daily_reminder', v)}
                trackColor={{ false: '#e5e7eb', true: '#a5b4fc' }}
                thumbColor={settings.daily_reminder ? '#6366f1' : '#f9fafb'}
              />
            }
          />
          {settings.daily_reminder && (
            <View style={styles.reminderTimeRow}>
              <Text style={styles.rowLabel}>提醒时间</Text>
              <View style={styles.timePicker}>
                {['08:00', '12:00', '18:00', '20:00', '22:00'].map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.timeOption, settings.reminder_time === t && styles.timeOptionSelected]}
                    onPress={() => update('reminder_time', t)}
                  >
                    <Text style={[styles.timeOptionText, settings.reminder_time === t && styles.timeOptionTextSelected]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </Section>

        {/* Current config summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>当前配置摘要</Text>
          <Text style={styles.summaryLine}>🤖 AI 模型：{selectedModel?.label || settings.llm_model}</Text>
          <Text style={styles.summaryLine}>⚠️ 风险提醒阈值：{Math.round(settings.risk_threshold * 100)}%</Text>
          <Text style={styles.summaryLine}>🚨 危机等级提醒：≥ {settings.crisis_threshold}/5</Text>
          <Text style={styles.summaryLine}>🌐 语言：{settings.language === 'zh' ? '中文' : 'English'}</Text>
          <Text style={styles.summaryLine}>🔔 每日提醒：{settings.daily_reminder ? `已开启 (${settings.reminder_time})` : '已关闭'}</Text>
        </View>

        {dirty && (
          <TouchableOpacity style={styles.bigSaveBtn} onPress={saveSettings} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.bigSaveBtnText}>保存所有设置</Text>}
          </TouchableOpacity>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f0f4ff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#f3f4f6' },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  saveBtn: { backgroundColor: '#6366f1', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, minWidth: 56, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  section: { marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#374151', marginLeft: 6 },
  sectionBody: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },

  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  rowLabel: { fontSize: 14, color: '#374151' },
  rowRight: { alignItems: 'flex-end' },

  modelCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#e5e7eb', marginBottom: 10 },
  modelCardSelected: { borderColor: '#6366f1', backgroundColor: '#eef2ff' },
  modelLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  radioSelected: { borderColor: '#6366f1' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#6366f1' },
  modelLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  modelLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
  modelTag: { marginLeft: 6, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: '#f3f4f6', borderRadius: 6 },
  modelTagSelected: { backgroundColor: '#ddd6fe' },
  modelTagText: { fontSize: 10, color: '#6b7280', fontWeight: '600' },
  modelDesc: { fontSize: 12, color: '#9ca3af' },

  sliderHint: { fontSize: 12, color: '#6b7280', marginBottom: 8 },
  sliderRow: { flexDirection: 'row', alignItems: 'center' },
  slider: { flex: 1, marginHorizontal: 8, height: 40 },
  sliderMin: { fontSize: 11, color: '#9ca3af', width: 24 },
  sliderMax: { fontSize: 11, color: '#9ca3af', width: 24, textAlign: 'right' },
  sliderValue: { alignItems: 'center', marginTop: 4 },
  sliderValueText: { fontSize: 13, fontWeight: '600', color: '#6366f1' },
  divider: { height: 1, backgroundColor: '#f3f4f6' },

  langRow: { flexDirection: 'row', gap: 12 },
  langBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#e5e7eb', alignItems: 'center' },
  langBtnSelected: { borderColor: '#6366f1', backgroundColor: '#eef2ff' },
  langBtnText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  langBtnTextSelected: { color: '#6366f1' },

  reminderTimeRow: { marginTop: 12 },
  timePicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  timeOption: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: '#e5e7eb' },
  timeOptionSelected: { borderColor: '#6366f1', backgroundColor: '#eef2ff' },
  timeOptionText: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  timeOptionTextSelected: { color: '#6366f1' },

  summaryCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginTop: 4, marginBottom: 16 },
  summaryTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 10 },
  summaryLine: { fontSize: 13, color: '#6b7280', marginBottom: 6 },

  bigSaveBtn: { backgroundColor: '#6366f1', padding: 16, borderRadius: 16, alignItems: 'center' },
  bigSaveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
