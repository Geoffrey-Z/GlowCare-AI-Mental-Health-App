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
          // Move to next phase
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
      Animated.timing(scaleValue, {
        toValue: 1.3,
        duration: 4000,
        useNativeDriver: true,
      }).start();
    } else if (phase === 'exhale') {
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 6000,
        useNativeDriver: true,
      }).start();
    }
  }, [phase, isActive]);

  React.useEffect(() => {
    if (cycle >= 5) {
      onComplete();
    }
  }, [cycle]);

  if (!isActive) return null;

  const getPhaseText = () => {
    switch (phase) {
      case 'inhale': return 'Breathe In';
      case 'hold': return 'Hold';
      case 'exhale': return 'Breathe Out';
      default: return '';
    }
  };

  const getPhaseColor = () => {
    switch (phase) {
      case 'inhale': return '#22c55e';
      case 'hold': return '#eab308';
      case 'exhale': return '#6366f1';
      default: return '#6366f1';
    }
  };

  return (
    <View style={styles.breathingContainer}>
      <Text style={styles.breathingTitle}>Breathing Exercise</Text>
      <Text style={styles.cycleText}>Cycle {cycle + 1} of 5</Text>
      
      <Animated.View
        style={[
          styles.breathingCircle,
          { 
            backgroundColor: getPhaseColor(),
            transform: [{ scale: scaleValue }]
          }
        ]}
      >
        <Text style={styles.breathingPhase}>{getPhaseText()}</Text>
        <Text style={styles.breathingCount}>{count}</Text>
      </Animated.View>
      
      <Text style={styles.breathingInstruction}>
        Follow the circle and breathe naturally
      </Text>
    </View>
  );
};

export default function CrisisSupportScreen() {
  const [selectedSupport, setSelectedSupport] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [supportResult, setSupportResult] = useState(null);
  const [contextInput, setContextInput] = useState('');
  const [showBreathing, setShowBreathing] = useState(false);

  const supportTypes = [
    {
      id: 'crisis',
      title: 'Crisis Support',
      description: 'Immediate help for overwhelming feelings',
      icon: 'warning-outline',
      color: '#ef4444',
    },
    {
      id: 'breathing',
      title: 'Breathing Exercise',
      description: 'Guided breathing to calm anxiety',
      icon: 'fitness-outline',
      color: '#22c55e',
    },
    {
      id: 'cbt',
      title: 'CBT Techniques',
      description: 'Cognitive behavioral therapy tools',
      icon: 'bulb-outline',
      color: '#8b5cf6',
    },
    {
      id: 'general',
      title: 'General Support',
      description: 'Everyday emotional support',
      icon: 'heart-outline',
      color: '#06b6d4',
    },
  ];

  const getSupportHelp = async (type) => {
    setIsLoading(true);
    setSupportResult(null);
    setSelectedSupport(type);

    if (type === 'breathing') {
      setShowBreathing(true);
      setIsLoading(false);
      return;
    }

    try {
      const supportData = {
        user_id: DEMO_USER_ID,
        request_type: type,
        context: contextInput || `User requesting ${type} support`,
      };

      const response = await fetch(`${API_BASE}/support/crisis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(supportData),
      });

      if (response.ok) {
        const result = await response.json();
        setSupportResult(result);
      } else {
        throw new Error('Failed to get support');
      }
    } catch (error) {
      console.error('Error getting support:', error);
      Alert.alert('Error', 'Failed to get support. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetSupport = () => {
    setSelectedSupport(null);
    setSupportResult(null);
    setShowBreathing(false);
    setContextInput('');
  };

  const SupportCard = ({ item }) => (
    <TouchableOpacity
      style={[styles.supportCard, { borderLeftColor: item.color }]}
      onPress={() => getSupportHelp(item.id)}
    >
      <View style={[styles.supportIcon, { backgroundColor: item.color + '20' }]}>
        <Ionicons name={item.icon} size={28} color={item.color} />
      </View>
      <View style={styles.supportContent}>
        <Text style={styles.supportTitle}>{item.title}</Text>
        <Text style={styles.supportDescription}>{item.description}</Text>
      </View>
      <Ionicons name="arrow-forward" size={20} color="#9ca3af" />
    </TouchableOpacity>
  );

  const renderSupportResult = () => {
    if (!supportResult) return null;

    if (supportResult.support_type === 'breathing_exercise') {
      return (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>Breathing Exercise Guide</Text>
          <View style={styles.instructionsContainer}>
            {supportResult.instructions.map((instruction, index) => (
              <View key={index} style={styles.instructionItem}>
                <Text style={styles.instructionNumber}>{index + 1}</Text>
                <Text style={styles.instructionText}>{instruction}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.durationText}>
            Duration: {supportResult.duration}
          </Text>
        </View>
      );
    }

    if (supportResult.support_type === 'cbt_technique') {
      return (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>{supportResult.technique}</Text>
          <View style={styles.instructionsContainer}>
            {supportResult.steps.map((step, index) => (
              <View key={index} style={styles.instructionItem}>
                <Text style={styles.instructionNumber}>{index + 1}</Text>
                <Text style={styles.instructionText}>{step}</Text>
              </View>
            ))}
          </View>
        </View>
      );
    }

    // Crisis support response
    return (
      <View style={styles.resultContainer}>
        <Text style={styles.resultTitle}>Immediate Support</Text>
        <Text style={styles.supportText}>
          {supportResult.immediate_support}
        </Text>
        
        {supportResult.coping_strategies && (
          <View style={styles.strategiesContainer}>
            <Text style={styles.strategiesTitle}>Coping Strategies:</Text>
            {supportResult.coping_strategies.map((strategy, index) => (
              <View key={index} style={styles.strategyItem}>
                <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                <Text style={styles.strategyText}>{strategy}</Text>
              </View>
            ))}
          </View>
        )}

        {supportResult.seek_help && (
          <View style={styles.emergencyNotice}>
            <Ionicons name="warning" size={20} color="#ef4444" />
            <Text style={styles.emergencyText}>
              Consider reaching out to a mental health professional or trusted person.
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="auto" />
      
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Crisis Support</Text>
          <Text style={styles.subtitle}>
            Immediate help when you need it most
          </Text>
        </View>

        {showBreathing && (
          <BreathingExercise
            isActive={showBreathing}
            onComplete={() => {
              setShowBreathing(false);
              Alert.alert(
                'Exercise Complete',
                'Great job! You completed the breathing exercise. How do you feel?',
                [{ text: 'OK', onPress: resetSupport }]
              );
            }}
          />
        )}

        {!selectedSupport && !showBreathing && (
          <>
            {/* Context Input */}
            <View style={styles.inputSection}>
              <Text style={styles.sectionTitle}>
                What's bothering you? (Optional)
              </Text>
              <TextInput
                style={styles.contextInput}
                value={contextInput}
                onChangeText={setContextInput}
                placeholder="Tell us what's happening so we can provide better support..."
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Support Options */}
            <View style={styles.supportSection}>
              <Text style={styles.sectionTitle}>Choose Support Type</Text>
              {supportTypes.map(item => (
                <SupportCard key={item.id} item={item} />
              ))}
            </View>
          </>
        )}

        {/* Loading State */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>Getting your support...</Text>
          </View>
        )}

        {/* Support Results */}
        {supportResult && renderSupportResult()}

        {/* Reset Button */}
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
            <Text style={styles.emergencyCardTitle}>
              If you're in immediate danger:
            </Text>
            <Text style={styles.emergencyCardText}>
              • Call your local emergency number (911 in US)
              • Contact a crisis hotline
              • Reach out to a trusted friend or family member
              • Go to your nearest emergency room
            </Text>
          </View>
        </View>

        {/* Self-Care Tips */}
        <View style={styles.tipsSection}>
          <Text style={styles.sectionTitle}>Daily Self-Care</Text>
          
          <View style={styles.tipCard}>
            <Ionicons name="sunny-outline" size={20} color="#f59e0b" />
            <Text style={styles.tipText}>
              <Text style={styles.tipTitle}>Morning Routine: </Text>
              Start your day with intention and mindfulness
            </Text>
          </View>
          
          <View style={styles.tipCard}>
            <Ionicons name="walk-outline" size={20} color="#22c55e" />
            <Text style={styles.tipText}>
              <Text style={styles.tipTitle}>Physical Activity: </Text>
              Even a short walk can improve your mood
            </Text>
          </View>
          
          <View style={styles.tipCard}>
            <Ionicons name="people-outline" size={20} color="#6366f1" />
            <Text style={styles.tipText}>
              <Text style={styles.tipTitle}>Social Connection: </Text>
              Reach out to someone you care about
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  inputSection: {
    padding: 24,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  contextInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1f2937',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minHeight: 80,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  supportSection: {
    padding: 24,
    paddingTop: 0,
  },
  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  supportIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  supportContent: {
    flex: 1,
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  supportDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  resultContainer: {
    backgroundColor: 'white',
    margin: 24,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  supportText: {
    fontSize: 16,
    color: '#4b5563',
    lineHeight: 24,
    marginBottom: 16,
  },
  instructionsContainer: {
    marginBottom: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  instructionNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6366f1',
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    width: 24,
    height: 24,
    textAlign: 'center',
    lineHeight: 24,
    marginRight: 12,
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  durationText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  strategiesContainer: {
    marginTop: 16,
  },
  strategiesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  strategyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  strategyText: {
    flex: 1,
    fontSize: 14,
    color: '#4b5563',
    marginLeft: 8,
    lineHeight: 20,
  },
  emergencyNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef2f2',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  emergencyText: {
    flex: 1,
    fontSize: 14,
    color: '#dc2626',
    marginLeft: 8,
    lineHeight: 20,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 24,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6366f1',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  resetButtonText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  breathingContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: 'white',
    margin: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  breathingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  cycleText: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 32,
  },
  breathingCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  breathingPhase: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 8,
  },
  breathingCount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  breathingInstruction: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  emergencySection: {
    padding: 24,
    paddingTop: 0,
  },
  emergencyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: 12,
  },
  emergencyCard: {
    backgroundColor: '#fef2f2',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  emergencyCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: 8,
  },
  emergencyCardText: {
    fontSize: 14,
    color: '#7f1d1d',
    lineHeight: 20,
  },
  tipsSection: {
    padding: 24,
    paddingTop: 0,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginLeft: 12,
  },
  tipTitle: {
    fontWeight: '600',
    color: '#1f2937',
  },
});