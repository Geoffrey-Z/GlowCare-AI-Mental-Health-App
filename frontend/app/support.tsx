import React, { useState } from 'react';
import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const API_BASE = `${EXPO_PUBLIC_BACKEND_URL}/api`;

// Mock user ID for demo
const DEMO_USER_ID = 'demo-user-123';

// Breathing Exercise Component
const BreathingExercise = ({ isActive, onComplete }) => {
  const [phase, setPhase] = useState('inhale'); // inhale, hold, exhale
  const [count, setCount] = useState(4);
  const [cycle, setCycle] = useState(0);
  const [scaleValue] = useState(new Animated.Value(1));

  React.useEffect(() => {
    if (!isActive) return;
    const timer = setInterval(() => {
      setCount(prev => {
        if (prev <= 1) {
          if (phase === 'inhale') {
            setPhase('hold');
            return 4;
          } else if (phase === 'hold') {
            setPhase('exhale');
            return 6;
          } else {
            setPhase('inhale');
            setCycle(prev => prev + 1);
            return 4;
          }
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, isActive]);

  React.useEffect(() => {
    if (!isActive) return;
    if (phase === 'inhale') {
      Animated.timing(scaleValue, { toValue: 1.3, duration: 4000, useNativeDriver: true }).start();
    } else if (phase === 'exhale') {
      Animated.timing(scaleValue, { toValue: 1, duration: 6000, useNativeDriver: true }).start();
    }
  }, [phase, isActive]);

  React.useEffect(() => { if (cycle >= 5) onComplete(); }, [cycle]);
  if (!isActive) return null;

  const getPhaseText = () => (phase === 'inhale' ? 'Breathe In' : phase === 'hold' ? 'Hold' : 'Breathe Out');
  const getPhaseColor = () => (phase === 'inhale' ? '#22c55e' : phase === 'hold' ? '#eab308' : '#6366f1');

  return (
    <View style={styles.breathingContainer}>
      <Text style={styles.breathingTitle}>Breathing Exercise</Text>
      <Text style={styles.cycleText}>Cycle {cycle + 1} of 5</Text>
      <Animated.View style={[styles.breathingCircle, { backgroundColor: getPhaseColor(), transform: [{ scale: scaleValue }] }]}>
        <Text style={styles.breathingPhase}>{getPhaseText()}</Text>
        <Text style={styles.breathingCount}>{count}</Text>
      </Animated.View>
      <Text style={styles.breathingInstruction}>Follow the circle and breathe naturally</Text>
    </View>
  );
};

export default function CrisisSupportScreen() {
  const [selectedSupport, setSelectedSupport] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [supportResult, setSupportResult] = useState<any>(null);
  const [contextInput, setContextInput] = useState('');
  const [showBreathing, setShowBreathing] = useState(false);

  // CBT State
  const [cbt, setCbt] = useState({
    autoThought: '',
    evidenceFor: '',
    evidenceAgainst: '',
    balancedThought: '',
    distortions: [] as string[],
  });
  const distortionsList = ['非黑即白', '过度概括', '灾难化', '读心术', '贴标签', '情绪化推理', '应该/必须', '否定积极', '预言未来', '选择性注意'];

  // Crisis Overlay
  const [showCrisisOverlay, setShowCrisisOverlay] = useState(false);
  const [crisisData, setCrisisData] = useState<any>(null);

  const supportTypes = [
    { id: 'crisis', title: 'Crisis Support', description: 'Immediate help for overwhelming feelings', icon: 'warning-outline', color: '#ef4444' },
    { id: 'breathing', title: 'Breathing Exercise', description: 'Guided breathing to calm anxiety', icon: 'fitness-outline', color: '#22c55e' },
    { id: 'cbt', title: 'CBT Techniques', description: 'Cognitive behavioral therapy tools', icon: 'bulb-outline', color: '#8b5cf6' },
    { id: 'general', title: 'General Support', description: 'Everyday emotional support', icon: 'heart-outline', color: '#06b6d4' },
  ];

  const getSupportHelp = async (type: string) => {
    setIsLoading(true);
    setSupportResult(null);
    setSelectedSupport(type);

    if (type === 'breathing') {
      setShowBreathing(true);
      setIsLoading(false);
      return;
    }

    try {
      const supportData = { user_id: DEMO_USER_ID, request_type: type, context: contextInput || `User requesting ${type} support` };
      const response = await fetch(`${API_BASE}/support/crisis`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(supportData) });
      if (!response.ok) throw new Error('Failed to get support');
      const result = await response.json();
      setSupportResult(result);

      // Show crisis overlay if severe
      if ((result?.crisis_level ?? 0) >= 4) {
        setCrisisData(result);
        setShowCrisisOverlay(true);
      }
    } catch (error) {
      console.error('Error getting support:', error);
      Alert.alert('Error', 'Failed to get support. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const assessRiskNow = async () => {
    try {
      setIsLoading(true);
      const resp = await fetch(`${API_BASE}/support/crisis`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: DEMO_USER_ID, request_type: 'crisis', context: contextInput || 'Self risk assessment' }) });
      const data = await resp.json();
      setSupportResult(data);
      if ((data?.crisis_level ?? 0) >= 4) {
        setCrisisData(data);
        setShowCrisisOverlay(true);
      } else {
        Alert.alert('Assessment Complete', `Crisis Level: ${data?.crisis_level ?? 0}/5`);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to assess risk');
    } finally {
      setIsLoading(false);
    }
  };

  const resetSupport = () => {
    setSelectedSupport(null);
    setSupportResult(null);
    setShowBreathing(false);
    setContextInput('');
    setCbt({ autoThought: '', evidenceFor: '', evidenceAgainst: '', balancedThought: '', distortions: [] });
  };

  const toggleDistortion = (d: string) => {
    setCbt(prev => ({ ...prev, distortions: prev.distortions.includes(d) ? prev.distortions.filter(x => x !== d) : [...prev.distortions, d] }));
  };

  const CbtForm = () => (
    <View style={styles.resultContainer}>
      <Text style={styles.resultTitle}>Thought Record (CBT)</Text>

      <Text style={styles.fieldLabel}>Automatic Thought</Text>
      <TextInput style={styles.cbtInput} placeholder="写下此刻最困扰你的自动化想法…" value={cbt.autoThought} onChangeText={v => setCbt(p => ({ ...p, autoThought: v }))} multiline />

      <Text style={styles.fieldLabel}>Evidence For</Text>
      <TextInput style={styles.cbtInput} placeholder="有哪些事实似乎支持这个想法？" value={cbt.evidenceFor} onChangeText={v => setCbt(p => ({ ...p, evidenceFor: v }))} multiline />

      <Text style={styles.fieldLabel}>Evidence Against</Text>
      <TextInput style={styles.cbtInput} placeholder="有哪些事实与这个想法相反？" value={cbt.evidenceAgainst} onChangeText={v => setCbt(p => ({ ...p, evidenceAgainst: v }))} multiline />

      <Text style={styles.fieldLabel}>Common Distortions</Text>
      <View style={styles.chipsWrap}>
        {distortionsList.map(d => (
          <TouchableOpacity key={d} style={[styles.chip, cbt.distortions.includes(d) && styles.chipSelected]} onPress={() => toggleDistortion(d)}>
            <Text style={[styles.chipText, cbt.distortions.includes(d) && styles.chipSelectedText]}>{d}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.fieldLabel}>Balanced Thought</Text>
      <TextInput style={styles.cbtInput} placeholder="尝试用更平衡、温和和现实的方式表述…" value={cbt.balancedThought} onChangeText={v => setCbt(p => ({ ...p, balancedThought: v }))} multiline />

      <View style={{ marginTop: 8 }}>
        <Text style={styles.helperText}>热身提问（可任选）：</Text>
        <Text style={styles.helperBullet}>• 如果这是朋友的想法，你会如何回应？</Text>
        <Text style={styles.helperBullet}>• 这件事一年后还同样重要吗？</Text>
        <Text style={styles.helperBullet}>• 是否忽略了哪些积极证据？</Text>
      </View>

      <TouchableOpacity style={styles.primaryBtn} onPress={() => Alert.alert('Saved', 'Your thought record has been saved locally.')}>
        <Ionicons name="save-outline" size={18} color="white" />
        <Text style={styles.primaryBtnText}>Save Thought Record</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="auto" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Crisis Support</Text>
            <Text style={styles.subtitle}>Immediate help when you need it most</Text>
          </View>

          {/* Context Input + Risk Assess */}
          {!selectedSupport && !showBreathing && (
            <View style={styles.inputSection}>
              <Text style={styles.sectionTitle}>What's bothering you? (Optional)</Text>
              <TextInput style={styles.contextInput} value={contextInput} onChangeText={setContextInput} placeholder="Tell us what's happening so we can provide better support..." multiline numberOfLines={3} textAlignVertical="top" />
              <TouchableOpacity style={styles.secondaryBtn} onPress={assessRiskNow}>
                <Ionicons name="pulse-outline" size={18} color="#6366f1" />
                <Text style={styles.secondaryBtnText}>Quick Risk Self-Check</Text>
              </TouchableOpacity>
            </View>
          )}

          {showBreathing && (
            <BreathingExercise isActive={showBreathing} onComplete={() => { setShowBreathing(false); Alert.alert('Exercise Complete', 'Great job! You completed the breathing exercise.'); }} />
          )}

          {!selectedSupport && !showBreathing && (
            <View style={styles.supportSection}>
              <Text style={styles.sectionTitle}>Choose Support Type</Text>
              {supportTypes.map(item => (
                <TouchableOpacity key={item.id} style={[styles.supportCard, { borderLeftColor: item.color }]} onPress={() => getSupportHelp(item.id)}>
                  <View style={[styles.supportIcon, { backgroundColor: item.color + '20' }]}>
                    <Ionicons name={item.icon as any} size={28} color={item.color} />
                  </View>
                  <View style={styles.supportContent}>
                    <Text style={styles.supportTitle}>{item.title}</Text>
                    <Text style={styles.supportDescription}>{item.description}</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={20} color="#9ca3af" />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Loading State */}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6366f1" />
              <Text style={styles.loadingText}>Getting your support...</Text>
            </View>
          )}

          {/* CBT Flow */}
          {selectedSupport === 'cbt' && !isLoading && <CbtForm />}

          {/* Support Results for crisis/general */}
          {supportResult && selectedSupport !== 'cbt' && (
            <View style={styles.resultContainer}>
              {supportResult.support_type === 'cbt_technique' ? (
                <>
                  <Text style={styles.resultTitle}>{supportResult.technique}</Text>
                  <View style={styles.instructionsContainer}>
                    {supportResult.steps?.map((step: string, index: number) => (
                      <View key={index} style={styles.instructionItem}>
                        <Text style={styles.instructionNumber}>{index + 1}</Text>
                        <Text style={styles.instructionText}>{step}</Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : supportResult.support_type === 'breathing_exercise' ? (
                <>
                  <Text style={styles.resultTitle}>Breathing Exercise Guide</Text>
                  <View style={styles.instructionsContainer}>
                    {supportResult.instructions?.map((instruction: string, index: number) => (
                      <View key={index} style={styles.instructionItem}>
                        <Text style={styles.instructionNumber}>{index + 1}</Text>
                        <Text style={styles.instructionText}>{instruction}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={styles.durationText}>Duration: {supportResult.duration}</Text>
                </>
              ) : (
                <>
                  <Text style={styles.resultTitle}>Immediate Support</Text>
                  <Text style={styles.supportText}>{supportResult.immediate_support}</Text>
                  {supportResult.coping_strategies && (
                    <View style={styles.strategiesContainer}>
                      <Text style={styles.strategiesTitle}>Coping Strategies:</Text>
                      {supportResult.coping_strategies.map((strategy: string, index: number) => (
                        <View key={index} style={styles.strategyItem}>
                          <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                          <Text style={styles.strategyText}>{strategy}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}
            </View>
          )}

          {(selectedSupport || showBreathing) && (
            <TouchableOpacity style={styles.resetButton} onPress={resetSupport}>
              <Ionicons name="arrow-back" size={20} color="#6366f1" />
              <Text style={styles.resetButtonText}>Try Another Support Option</Text>
            </TouchableOpacity>
          )}

          {/* Emergency Resources */}
          <View style={styles.emergencySection}>
            <Text style={styles.emergencyTitle}>Emergency Resources</Text>
            <View style={styles.emergencyCard}>
              <Text style={styles.emergencyCardTitle}>If you're in immediate danger:</Text>
              <Text style={styles.emergencyCardText}>• Call your local emergency number (911 in US){'\n'}• Contact a crisis hotline{'\n'}• Reach out to a trusted friend or family member{'\n'}• Go to your nearest emergency room</Text>
            </View>
          </View>
        </ScrollView>

        {/* Crisis Overlay */}
        <Modal visible={showCrisisOverlay} transparent animationType="slide" onRequestClose={() => setShowCrisisOverlay(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Ionicons name="warning" size={22} color="#ef4444" />
                <Text style={styles.modalTitle}>High Risk Detected</Text>
              </View>
              <Text style={styles.modalText}>{crisisData?.immediate_support || 'We are here with you. Take a breath.'}</Text>
              {crisisData?.coping_strategies?.length ? (
                <View style={{ marginTop: 12 }}>
                  {crisisData.coping_strategies.map((c: string, i: number) => (
                    <View key={`cr-${i}`} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      <Ionicons name="checkmark-circle-outline" size={18} color="#22c55e" />
                      <Text style={{ marginLeft: 8, color: '#374151', flex: 1 }}>{c}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowCrisisOverlay(false)}>
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 24, alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1f2937', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6b7280', textAlign: 'center' },
  inputSection: { padding: 24, paddingTop: 0 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1f2937', marginBottom: 16 },
  contextInput: { backgroundColor: 'white', borderRadius: 12, padding: 16, fontSize: 16, color: '#1f2937', borderWidth: 1, borderColor: '#e5e7eb', minHeight: 80, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3.84, elevation: 5 },
  supportSection: { padding: 24, paddingTop: 0 },
  supportCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 12, borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3.84, elevation: 5 },
  supportIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  supportContent: { flex: 1 },
  supportTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 4 },
  supportDescription: { fontSize: 14, color: '#6b7280' },
  loadingContainer: { alignItems: 'center', padding: 40 },
  loadingText: { marginTop: 16, fontSize: 16, color: '#6b7280' },
  resultContainer: { backgroundColor: 'white', margin: 24, padding: 20, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3.84, elevation: 5 },
  resultTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937', marginBottom: 16 },
  supportText: { fontSize: 16, color: '#4b5563', lineHeight: 24, marginBottom: 16 },
  instructionsContainer: { marginBottom: 16 },
  instructionItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  instructionNumber: { fontSize: 14, fontWeight: 'bold', color: '#6366f1', backgroundColor: '#f0f9ff', borderRadius: 12, width: 24, height: 24, textAlign: 'center', lineHeight: 24, marginRight: 12 },
  instructionText: { flex: 1, fontSize: 14, color: '#4b5563', lineHeight: 20 },
  durationText: { fontSize: 14, color: '#6b7280', textAlign: 'center', fontStyle: 'italic' },
  strategiesContainer: { marginTop: 16 },
  strategiesTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 12 },
  strategyItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  strategyText: { flex: 1, fontSize: 14, color: '#4b5563', marginLeft: 8, lineHeight: 20 },
  resetButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', margin: 24, padding: 16, backgroundColor: 'white', borderRadius: 12, borderWidth: 2, borderColor: '#6366f1', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3.84, elevation: 5 },
  resetButtonText: { color: '#6366f1', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  breathingContainer: { alignItems: 'center', padding: 40, backgroundColor: 'white', margin: 24, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3.84, elevation: 5 },
  breathingTitle: { fontSize: 24, fontWeight: 'bold', color: '#1f2937', marginBottom: 8 },
  cycleText: { fontSize: 16, color: '#6b7280', marginBottom: 32 },
  breathingCircle: { width: 150, height: 150, borderRadius: 75, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  breathingPhase: { fontSize: 18, fontWeight: '600', color: 'white', marginBottom: 8 },
  breathingCount: { fontSize: 32, fontWeight: 'bold', color: 'white' },
  breathingInstruction: { fontSize: 16, color: '#6b7280', textAlign: 'center' },
  // CBT styles
  fieldLabel: { fontSize: 14, color: '#6b7280', marginBottom: 6 },
  cbtInput: { backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', padding: 12, minHeight: 60, marginBottom: 12 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#f3f4f6', borderRadius: 999, marginRight: 8, marginBottom: 8 },
  chipSelected: { backgroundColor: '#eef2ff', borderWidth: 1, borderColor: '#6366f1' },
  chipText: { fontSize: 12, color: '#374151' },
  chipSelectedText: { color: '#4338ca', fontWeight: '600' },
  helperText: { fontSize: 12, color: '#6b7280', marginTop: 6 },
  helperBullet: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  primaryBtn: { marginTop: 12, backgroundColor: '#6366f1', padding: 12, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  primaryBtnText: { color: 'white', fontWeight: '600', marginLeft: 6 },
  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: 'white', width: '100%', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'center' },
  modalTitle: { marginLeft: 8, fontWeight: '700', color: '#1f2937' },
  modalText: { color: '#374151', marginTop: 8 },
  modalCloseBtn: { marginTop: 12, backgroundColor: '#6366f1', padding: 12, borderRadius: 10, alignItems: 'center' },
  modalCloseText: { color: 'white', fontWeight: '600' },
  // Emergency section
  emergencySection: { padding: 24, paddingTop: 0 },
  emergencyTitle: { fontSize: 18, fontWeight: '600', color: '#dc2626', marginBottom: 12 },
  emergencyCard: { backgroundColor: '#fef2f2', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#fecaca' },
  emergencyCardTitle: { fontSize: 16, fontWeight: '600', color: '#dc2626', marginBottom: 8 },
  emergencyCardText: { fontSize: 14, color: '#7f1d1d', lineHeight: 20 },
});