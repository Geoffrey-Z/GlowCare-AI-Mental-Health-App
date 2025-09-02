import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { Audio } from 'expo-av';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const API_BASE = `${EXPO_PUBLIC_BACKEND_URL}/api`;

// Mock user ID for demo
const DEMO_USER_ID = 'demo-user-123';

export default function ConversationAnalysisScreen() {
  const [conversationText, setConversationText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [permissionResponse, requestPermission] = Audio.usePermissions();

  const startRecording = async () => {
    try {
      if (permissionResponse.status !== 'granted') {
        console.log('Requesting permission..');
        await requestPermission();
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Failed to start recording. Please check microphone permissions.');
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    setIsProcessing(true);
    
    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
      
      const uri = recording.getURI();
      
      // Simulate speech-to-text conversion for conversation
      const simulatedConversation = "I had a really difficult conversation with my manager today. They kept interrupting me and dismissing my ideas. I felt so frustrated and unheard. It's making me question whether I'm even good at my job.";
      setConversationText(simulatedConversation);
      
      Alert.alert(
        'Conversation Recorded', 
        'Your conversation has been processed. You can edit it before analysis.',
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('Error processing recording:', error);
      Alert.alert('Error', 'Failed to process recording');
    } finally {
      setRecording(null);
      setIsProcessing(false);
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
      const conversationData = {
        user_id: DEMO_USER_ID,
        conversation_text: conversationText,
      };

      const response = await fetch(`${API_BASE}/conversations/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(conversationData),
      });

      if (response.ok) {
        const result = await response.json();
        setAnalysisResult(result);
      } else {
        throw new Error('Failed to analyze conversation');
      }
    } catch (error) {
      console.error('Error analyzing conversation:', error);
      Alert.alert('Error', 'Failed to analyze conversation. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getCrisisLevelColor = (level) => {
    if (level <= 1) return '#22c55e'; // Green - low
    if (level <= 2) return '#84cc16'; // Light green - mild
    if (level <= 3) return '#eab308'; // Yellow - moderate
    if (level <= 4) return '#f59e0b'; // Orange - high
    return '#ef4444'; // Red - critical
  };

  const getCrisisLevelLabel = (level) => {
    if (level <= 1) return 'Low';
    if (level <= 2) return 'Mild';
    if (level <= 3) return 'Moderate';
    if (level <= 4) return 'High';
    return 'Critical';
  };

  const SuggestionCard = ({ suggestion, icon = "bulb-outline" }) => (
    <View style={styles.suggestionCard}>
      <View style={styles.suggestionIcon}>
        <Ionicons name={icon} size={20} color="#6366f1" />
      </View>
      <Text style={styles.suggestionText}>{suggestion}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="auto" />
      
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Conversation Analysis</Text>
          <Text style={styles.subtitle}>
            Get AI-powered insights and support for difficult conversations
          </Text>
        </View>

        {/* Input Section */}
        <View style={styles.inputSection}>
          <Text style={styles.sectionTitle}>Describe your conversation</Text>
          <TextInput
            style={styles.textInput}
            value={conversationText}
            onChangeText={setConversationText}
            placeholder="Tell me about a conversation that's bothering you..."
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        {/* Voice Recording Section */}
        <View style={styles.inputSection}>
          <Text style={styles.sectionTitle}>Or record your thoughts</Text>
          <TouchableOpacity
            style={[
              styles.recordButton,
              isRecording && styles.recordingButton
            ]}
            onPress={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Ionicons 
                name={isRecording ? "stop" : "mic"} 
                size={24} 
                color="white" 
              />
            )}
            <Text style={styles.recordButtonText}>
              {isProcessing ? 'Processing...' : isRecording ? 'Stop Recording' : 'Record Conversation'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Analyze Button */}
        <TouchableOpacity
          style={[
            styles.analyzeButton,
            (!conversationText.trim() || isAnalyzing) && styles.disabledButton
          ]}
          onPress={analyzeConversation}
          disabled={!conversationText.trim() || isAnalyzing}
        >
          {isAnalyzing ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Ionicons name="analytics" size={24} color="white" />
          )}
          <Text style={styles.analyzeButtonText}>
            {isAnalyzing ? 'Analyzing...' : 'Analyze Conversation'}
          </Text>
        </TouchableOpacity>

        {/* Analysis Results */}
        {analysisResult && (
          <View style={styles.resultsSection}>
            <Text style={styles.sectionTitle}>Analysis Results</Text>
            
            {/* Crisis Level Indicator */}
            <View style={styles.crisisLevelCard}>
              <View style={styles.crisisLevelHeader}>
                <Ionicons name="shield-checkmark" size={24} color={getCrisisLevelColor(analysisResult.crisis_level)} />
                <Text style={styles.crisisLevelTitle}>Crisis Level</Text>
              </View>
              <View style={styles.crisisLevelIndicator}>
                <Text style={[
                  styles.crisisLevelValue,
                  { color: getCrisisLevelColor(analysisResult.crisis_level) }
                ]}>
                  {getCrisisLevelLabel(analysisResult.crisis_level)} ({analysisResult.crisis_level}/5)
                </Text>
              </View>
            </View>

            {/* AI Analysis */}
            {analysisResult.analysis && (
              <View style={styles.analysisCard}>
                <Text style={styles.cardTitle}>AI Insights</Text>
                <Text style={styles.analysisText}>
                  {typeof analysisResult.analysis === 'string' 
                    ? analysisResult.analysis 
                    : JSON.stringify(analysisResult.analysis, null, 2)}
                </Text>
              </View>
            )}

            {/* Support Suggestions */}
            {analysisResult.support_suggestions && analysisResult.support_suggestions.length > 0 && (
              <View style={styles.suggestionsSection}>
                <Text style={styles.cardTitle}>Recommended Actions</Text>
                {analysisResult.support_suggestions.map((suggestion, index) => (
                  <SuggestionCard
                    key={index}
                    suggestion={suggestion}
                    icon="checkmark-circle-outline"
                  />
                ))}
              </View>
            )}

            {/* Emergency Resources */}
            {analysisResult.crisis_level >= 3 && (
              <View style={styles.emergencyCard}>
                <View style={styles.emergencyHeader}>
                  <Ionicons name="warning" size={24} color="#ef4444" />
                  <Text style={styles.emergencyTitle}>Need Immediate Support?</Text>
                </View>
                <Text style={styles.emergencyText}>
                  If you're feeling overwhelmed, consider reaching out to a professional or trusted friend.
                </Text>
                <TouchableOpacity style={styles.emergencyButton}>
                  <Text style={styles.emergencyButtonText}>Get Crisis Support</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Tips Section */}
        <View style={styles.tipsSection}>
          <Text style={styles.sectionTitle}>Conversation Tips</Text>
          
          <View style={styles.tipCard}>
            <Ionicons name="ear-outline" size={20} color="#22c55e" />
            <Text style={styles.tipText}>
              <Text style={styles.tipTitle}>Active Listening: </Text>
              Focus on understanding rather than preparing your response
            </Text>
          </View>
          
          <View style={styles.tipCard}>
            <Ionicons name="chatbubble-outline" size={20} color="#6366f1" />
            <Text style={styles.tipText}>
              <Text style={styles.tipTitle}>Use "I" Statements: </Text>
              Express your feelings without blaming others
            </Text>
          </View>
          
          <View style={styles.tipCard}>
            <Ionicons name="pause-outline" size={20} color="#f59e0b" />
            <Text style={styles.tipText}>
              <Text style={styles.tipTitle}>Take Breaks: </Text>
              It's okay to pause and collect your thoughts
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
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  inputSection: {
    padding: 24,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1f2937',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minHeight: 120,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#06b6d4',
    padding: 16,
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
  recordingButton: {
    backgroundColor: '#ef4444',
  },
  recordButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    margin: 24,
    padding: 18,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  analyzeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  resultsSection: {
    padding: 24,
    paddingTop: 0,
  },
  crisisLevelCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  crisisLevelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  crisisLevelTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8,
  },
  crisisLevelIndicator: {
    alignItems: 'center',
  },
  crisisLevelValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  analysisCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  analysisText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  suggestionsSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  suggestionIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  emergencyCard: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  emergencyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#dc2626',
    marginLeft: 8,
  },
  emergencyText: {
    fontSize: 14,
    color: '#7f1d1d',
    lineHeight: 20,
    marginBottom: 16,
  },
  emergencyButton: {
    backgroundColor: '#ef4444',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  emergencyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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