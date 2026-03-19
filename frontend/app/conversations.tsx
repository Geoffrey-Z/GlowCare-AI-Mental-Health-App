import React, { useState, useRef } from 'react';
import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Modal,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const API_BASE = `${EXPO_PUBLIC_BACKEND_URL}/api`;

const DEMO_USER_ID = 'demo-user-123';

export default function ConversationAnalysisScreen() {
  const router = useRouter();
  const [conversationText, setConversationText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [perm, setPerm] = useState<{ granted: boolean; canAskAgain?: boolean } | null>(null);

  const avRecordingRef = useRef<Audio.Recording | null>(null);

  const [recordSeconds, setRecordSeconds] = useState(0);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [showCrisisOverlay, setShowCrisisOverlay] = useState(false);
  const [crisisData, setCrisisData] = useState<any>(null);

  const startRecordingTimer = () => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    setRecordSeconds(0);
    recordTimerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
  };

  const stopRecordingTimer = () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
  };

  const formatTime = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

  const ensureMicPermission = async () => {
    try {
      const current = await Audio.getPermissionsAsync();
      if (current?.granted) {
        setPerm(current as any);
        return true;
      }
      const asked = await Audio.requestPermissionsAsync();
      setPerm(asked as any);
      return !!asked?.granted;
    } catch {
      return false;
    }
  };

  const handleWebRecordingFallback = () => {
    Alert.alert('提示', '当前 Web 预览不支持麦克风录音。将使用示例转写填入文本框，建议使用手机端 Expo Go 体验完整录音流程。', [
      { text: '取消' },
      { text: '使用示例', onPress: () => setConversationText('我尝试表达自己的观点，但对方打断我几次，心里挺受挫的，也有点生气。') },
    ]);
  };

  const startRecording = async () => {
    if (Platform.OS === 'web') {
      handleWebRecordingFallback();
      return;
    }
    try {
      const granted = await ensureMicPermission();
      if (!granted) {
        const actions = (perm?.canAskAgain ?? true)
          ? [
              { text: '取消' },
              { text: '再次请求', onPress: () => ensureMicPermission() },
              { text: '使用示例', onPress: () => setConversationText('今天和同事沟通不顺利，我的意见被忽视了，心里很沮丧也有点生气。') },
            ]
          : [
              { text: '取消' },
              { text: '去设置', onPress: () => Linking.openSettings() },
              { text: '使用示例', onPress: () => setConversationText('今天和同事沟通不顺利，我的意见被忽视了，心里很沮丧也有点生气。') },
            ];
        Alert.alert('麦克风权限未授予', '请在系统设置中为 Expo Go 开启麦克风权限。', actions);
        return;
      }

      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      avRecordingRef.current = rec;

      setIsRecording(true);
      startRecordingTimer();
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Failed to start recording. Please check microphone permissions.');
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    stopRecordingTimer();
    setIsProcessing(true);
    try {
      const rec = avRecordingRef.current;
      if (rec) {
        await rec.stopAndUnloadAsync();
        const uri = rec.getURI();
        console.log('Recording saved to:', uri);
      }

      const simulatedConversation = '我和领导开会时紧张得说不出话，后来一直在自责，担心大家觉得我不专业。';
      setConversationText(simulatedConversation);
      Alert.alert('Conversation Recorded', '已将转写文本填入输入框，您可在分析前进行修改。');
    } catch (error) {
      console.error('Error processing recording:', error);
      Alert.alert('Error', 'Failed to process recording');
    } finally {
      setIsProcessing(false);
      avRecordingRef.current = null;
    }
  };

  const analyzeConversation = async () => {
    if (!conversationText.trim()) {
      Alert.alert('Input Required', 'Please enter a conversation or record one first.');
      return;
    }
    setIsAnalyzing(true);
    setAnalysisResult(null);
    try {
      const conversationData = { user_id: DEMO_USER_ID, conversation_text: conversationText };
      const response = await fetch(`${API_BASE}/conversations/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(conversationData) });
      if (!response.ok) throw new Error('Failed to analyze conversation');
      const result = await response.json();
      setAnalysisResult(result);
      const risk = result?.analysis?.risk_score ?? 0;
      const crisisLevel = result?.crisis_level ?? 0;
      if (risk >= 0.6 || crisisLevel >= 4) await triggerCrisisOverlay(conversationText);
    } catch (error) {
      console.error('Error analyzing conversation:', error);
      Alert.alert('Error', 'Failed to analyze conversation. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const triggerCrisisOverlay = async (text: string) => {
    try {
      const resp = await fetch(`${API_BASE}/support/crisis`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: DEMO_USER_ID, request_type: 'crisis', context: text }) });
      const data = await resp.json();
      setCrisisData(data);
      setShowCrisisOverlay(true);
    } catch (e) {
      setCrisisData({ immediate_support: '我在这里支持你，我们一起一步一步来。', coping_strategies: ['做3次深呼吸', '联系一个信任的人', '喝一杯温水'], crisis_level: 3 });
      setShowCrisisOverlay(true);
    }
  };

  const ProgressBar = ({ value, color = '#6366f1' }: { value: number; color?: string }) => (
    <View style={styles.progressBarBg}><View style={[styles.progressBarFill, { width: `${Math.min(100, Math.max(0, value * 100))}%`, backgroundColor: color }]} /></View>
  );
  const Chip = ({ label, tone = '#f3f4f6', textColor = '#374151' }) => (<View style={[styles.chip, { backgroundColor: tone }]}><Text style={[styles.chipText, { color: textColor }]}>{label}</Text></View>);
  const SuggestionItem = ({ suggestion }) => (<View style={styles.suggestionRow}><Ionicons name="checkmark-circle-outline" size={18} color="#22c55e" /><Text style={styles.suggestionText}>{suggestion}</Text></View>);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="auto" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Conversation Analysis</Text>
            <TouchableOpacity onPress={() => router.push('/conversations/history')} style={styles.historyBtn}>
              <Ionicons name="time-outline" size={18} color="#4f46e5" />
              <Text style={styles.historyText}>History</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>Describe your conversation</Text>
            <TextInput style={styles.textInput} value={conversationText} onChangeText={setConversationText} placeholder="Tell me about a conversation that's bothering you..." multiline numberOfLines={6} textAlignVertical="top" />
          </View>

          {isRecording && (<View style={styles.recordingBanner}><View style={styles.blinkDot} /><Text style={styles.recordingText}>Recording... {formatTime(recordSeconds)}</Text></View>)}

          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>Or record your thoughts</Text>
            <TouchableOpacity style={[styles.recordButton, isRecording && styles.recordingButton]} onPress={isRecording ? stopRecording : startRecording} disabled={isProcessing}>
              {isProcessing ? <ActivityIndicator color="white" size="small" /> : <Ionicons name={isRecording ? 'stop' : 'mic'} size={24} color="white" />}
              <Text style={styles.recordButtonText}>{isProcessing ? 'Processing...' : isRecording ? 'Stop Recording' : 'Start Recording'}</Text>
            </TouchableOpacity>
            {Platform.OS === 'web' && (<Text style={styles.webNote}>Note: Web 预览不支持麦克风录音，请使用手机端体验。</Text>)}
          </View>

          <TouchableOpacity style={[styles.analyzeButton, (!conversationText.trim() || isAnalyzing) && styles.disabledButton]} onPress={analyzeConversation} disabled={!conversationText.trim() || isAnalyzing}>
            {isAnalyzing ? <ActivityIndicator color="white" size="small" /> : <Ionicons name="analytics" size={24} color="white" />}
            <Text style={styles.analyzeButtonText}>{isAnalyzing ? 'Analyzing...' : 'Analyze Conversation'}</Text>
          </TouchableOpacity>

          {analysisResult && (
            <View style={styles.resultsSection}>
              <Text style={styles.sectionTitle}>Analysis Results</Text>
              <View style={styles.crisisLevelCard}><View style={styles.crisisLevelHeader}><Ionicons name="shield-checkmark" size={24} color={analysisResult.crisis_level >= 4 ? '#ef4444' : '#22c55e'} /><Text style={styles.crisisLevelTitle}>Crisis Level</Text></View><View style={styles.crisisLevelIndicator}><Text style={[styles.crisisLevelValue, { color: analysisResult.crisis_level >= 4 ? '#ef4444' : '#22c55e' }]}>{analysisResult.crisis_level}/5</Text></View></View>
              {analysisResult.analysis && (
                <View style={styles.analysisCard}>
                  <Text style={styles.cardTitle}>Emotion & Summary</Text>
                  <View style={styles.rowBetween}><Chip label={`Primary: ${analysisResult.analysis.emotion_primary || 'neutral'}`} tone="#eff6ff" textColor="#1f2937" /></View>
                  <View style={styles.metricRow}><Text style={styles.metricLabel}>Valence</Text><ProgressBar value={(analysisResult.analysis.valence + 1) / 2} color="#06b6d4" /></View>
                  <View style={styles.metricRow}><Text style={styles.metricLabel}>Arousal</Text><ProgressBar value={analysisResult.analysis.arousal} color="#8b5cf6" /></View>
                  <View style={styles.metricRow}><Text style={styles.metricLabel}>Risk</Text><ProgressBar value={analysisResult.analysis.risk_score} color="#ef4444" /></View>
                  {!!analysisResult.analysis.summary && (<View style={{ marginTop: 12 }}><Text style={styles.summaryText}>{analysisResult.analysis.summary}</Text></View>)}
                  {analysisResult.analysis.triggers?.length > 0 && (<View style={{ marginTop: 12 }}><Text style={styles.subTitle}>Triggers</Text><View style={styles.chipsWrap}>{analysisResult.analysis.triggers.map((t: string, i: number) => (<Chip key={`trig-${i}`} label={t} />))}</View></View>)}
                  {analysisResult.analysis.distortions?.length > 0 && (<View style={{ marginTop: 12 }}><Text style={styles.subTitle}>Cognitive Distortions</Text><View style={styles.chipsWrap}>{analysisResult.analysis.distortions.map((d: string, i: number) => (<Chip key={`dist-${i}`} label={d} tone="#fff7ed" textColor="#9a3412" />))}</View></View>)}
                </View>
              )}
              {analysisResult.support_suggestions?.length > 0 && (<View style={styles.suggestionsSection}><Text style={styles.cardTitle}>Recommended Actions</Text>{analysisResult.support_suggestions.map((s: string, idx: number) => (<View style={styles.suggestionRow} key={`sug-${idx}`}><Ionicons name="checkmark-circle-outline" size={18} color="#22c55e" /><Text style={styles.suggestionText}>{s}</Text></View>))}</View>)}
            </View>
          )}
        </ScrollView>

        <Modal visible={showCrisisOverlay} transparent animationType="slide" onRequestClose={() => setShowCrisisOverlay(false)}>
          <View style={styles.modalBackdrop}><View style={styles.modalCard}><View style={styles.modalHeader}><Ionicons name="warning" size={22} color="#ef4444" /><Text style={styles.modalTitle}>Immediate Support</Text></View><Text style={styles.modalText}>{crisisData?.immediate_support || 'You are not alone. Let’s take a breath together.'}</Text>{crisisData?.coping_strategies?.length ? (<View style={{ marginTop: 12 }}>{crisisData.coping_strategies.map((c: string, i: number) => (<View key={`cr-${i}`} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}><Ionicons name="checkmark-circle-outline" size={18} color="#22c55e" /><Text style={{ marginLeft: 8, color: '#374151', flex: 1 }}>{c}</Text></View>))}</View>) : null}<TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowCrisisOverlay(false)}><Text style={styles.modalCloseText}>Close</Text></TouchableOpacity></View></View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1 },
  header: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1f2937' },
  historyBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eef2ff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  historyText: { color: '#4f46e5', fontWeight: '600', marginLeft: 6 },
  inputSection: { padding: 16, paddingTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 8 },
  textInput: { backgroundColor: 'white', borderRadius: 12, padding: 12, fontSize: 16, color: '#1f2937', borderWidth: 1, borderColor: '#e5e7eb', minHeight: 120 },
  recordingBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#fecaca', marginHorizontal: 16, marginTop: 4, padding: 8, borderRadius: 8 },
  blinkDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ef4444', marginRight: 8 },
  recordingText: { color: '#991b1b', fontWeight: '600' },
  recordButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#6366f1', padding: 12, borderRadius: 12 },
  recordingButton: { backgroundColor: '#ef4444' },
  recordButtonText: { color: 'white', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  webNote: { marginTop: 8, color: '#6b7280', fontSize: 12 },
  analyzeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#6366f1', padding: 14, borderRadius: 12, marginHorizontal: 16 },
  disabledButton: { opacity: 0.6 },
  analyzeButtonText: { color: 'white', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  resultsSection: { padding: 16 },
  crisisLevelCard: { backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 12 },
  crisisLevelHeader: { flexDirection: 'row', alignItems: 'center' },
  crisisLevelTitle: { marginLeft: 8, fontWeight: '600', color: '#1f2937' },
  crisisLevelIndicator: { marginTop: 8 },
  crisisLevelValue: { fontSize: 14, fontWeight: '600' },
  analysisCard: { backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricRow: { marginTop: 8 },
  metricLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  progressBarBg: { width: '100%', height: 8, backgroundColor: '#f3f4f6', borderRadius: 6, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 6 },
  subTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#f3f4f6', borderRadius: 999, marginRight: 8, marginBottom: 8 },
  chipText: { fontSize: 12 },
  suggestionsSection: { backgroundColor: 'white', padding: 16, borderRadius: 12, marginTop: 8 },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  suggestionText: { marginLeft: 8, color: '#374151', flex: 1 },
  emergencyCard: { backgroundColor: '#fff7ed', padding: 16, borderRadius: 12, marginTop: 12, borderWidth: 1, borderColor: '#fed7aa' },
  emergencyHeader: { flexDirection: 'row', alignItems: 'center' },
  emergencyTitle: { marginLeft: 8, color: '#9a3412', fontWeight: '700' },
  emergencyText: { color: '#9a3412', marginTop: 8 },
  emergencyButton: { backgroundColor: '#ef4444', padding: 12, borderRadius: 10, marginTop: 12, alignItems: 'center' },
  emergencyButtonText: { color: 'white', fontWeight: '600' },
  tipsSection: { padding: 16 },
  tipCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 12 },
  tipText: { flex: 1, color: '#4b5563', marginLeft: 12 },
  tipTitle: { fontWeight: '600', color: '#1f2937' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: 'white', width: '100%', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'center' },
  modalTitle: { marginLeft: 8, fontWeight: '700', color: '#1f2937' },
  modalText: { color: '#374151', marginTop: 8 },
  modalCloseBtn: { marginTop: 12, backgroundColor: '#6366f1', padding: 12, borderRadius: 10, alignItems: 'center' },
  modalCloseText: { color: 'white', fontWeight: '600' },
});
