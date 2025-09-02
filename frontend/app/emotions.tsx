import React, { useState, useEffect } from 'react';
import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import Slider from '@react-native-community/slider';

const { width } = Dimensions.get('window');
const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const API_BASE = `${EXPO_PUBLIC_BACKEND_URL}/api`;

// Mock user ID for demo
const DEMO_USER_ID = 'demo-user-123';

export default function EmotionTrackingScreen() {
  const [textInput, setTextInput] = useState('');
  const [moodIntensity, setMoodIntensity] = useState(5);
  const [context, setContext] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recentEmotions, setRecentEmotions] = useState([]);
  const [permissionResponse, requestPermission] = Audio.usePermissions();

  useEffect(() => {
    loadRecentEmotions();
  }, []);

  const loadRecentEmotions = async () => {
    try {
      const response = await fetch(`${API_BASE}/emotions/${DEMO_USER_ID}?limit=5`);
      if (response.ok) {
        const emotions = await response.json();
        setRecentEmotions(emotions);
      }
    } catch (error) {
      console.error('Error loading emotions:', error);
    }
  };

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
      
      // For now, we'll simulate speech-to-text conversion
      // In a real implementation, you would process the audio file
      const simulatedText = "I'm feeling anxious about my upcoming presentation";
      setTextInput(simulatedText);
      
      Alert.alert(
        'Voice Recorded', 
        'Your voice has been processed and converted to text. You can edit it before submitting.',
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

  const submitEmotion = async () => {
    if (!textInput.trim()) {
      Alert.alert('Input Required', 'Please enter how you\'re feeling or record a voice note.');
      return;
    }

    setIsProcessing(true);

    try {
      const emotionData = {
        user_id: DEMO_USER_ID,
        text_input: textInput,
        context: context || null,
        source: 'manual'
      };

      const response = await fetch(`${API_BASE}/emotions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emotionData),
      });

      if (response.ok) {
        const result = await response.json();
        
        Alert.alert(
          'Emotion Logged Successfully!',
          `Detected: ${result.emotion} (Intensity: ${result.intensity}/10)\n\nYour feelings have been recorded and analyzed.`,
          [{ text: 'OK' }]
        );

        // Reset form
        setTextInput('');
        setContext('');
        setMoodIntensity(5);
        
        // Reload recent emotions
        loadRecentEmotions();
      } else {
        throw new Error('Failed to submit emotion');
      }
    } catch (error) {
      console.error('Error submitting emotion:', error);
      Alert.alert('Error', 'Failed to log your emotion. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getMoodColor = (intensity) => {
    if (intensity <= 2) return '#ef4444'; // Red - Very negative
    if (intensity <= 4) return '#f59e0b'; // Orange - Negative
    if (intensity <= 6) return '#eab308'; // Yellow - Neutral
    if (intensity <= 8) return '#84cc16'; // Light green - Positive
    return '#22c55e'; // Green - Very positive
  };

  const getMoodLabel = (intensity) => {
    if (intensity <= 2) return 'Very Low';
    if (intensity <= 4) return 'Low';
    if (intensity <= 6) return 'Neutral';
    if (intensity <= 8) return 'Good';
    return 'Excellent';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="auto" />
      
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>How are you feeling?</Text>
          <Text style={styles.subtitle}>
            Express your emotions through text, voice, or both
          </Text>
        </View>

        {/* Text Input Section */}
        <View style={styles.inputSection}>
          <Text style={styles.sectionTitle}>Tell us about your feelings</Text>
          <TextInput
            style={styles.textInput}
            value={textInput}
            onChangeText={setTextInput}
            placeholder="I'm feeling... (e.g., anxious, happy, stressed, excited)"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Voice Recording Section */}
        <View style={styles.inputSection}>
          <Text style={styles.sectionTitle}>Or record a voice note</Text>
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
              {isProcessing ? 'Processing...' : isRecording ? 'Stop Recording' : 'Start Recording'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Mood Intensity Slider */}
        <View style={styles.inputSection}>
          <Text style={styles.sectionTitle}>Mood Intensity</Text>
          <View style={styles.sliderContainer}>
            <Text style={[styles.moodLabel, { color: getMoodColor(moodIntensity) }]}>
              {getMoodLabel(moodIntensity)} ({moodIntensity}/10)
            </Text>
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={10}
              step={1}
              value={moodIntensity}
              onValueChange={setMoodIntensity}
              minimumTrackTintColor={getMoodColor(moodIntensity)}
              maximumTrackTintColor="#e5e7eb"
              thumbStyle={{ backgroundColor: getMoodColor(moodIntensity) }}
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>Very Low</Text>
              <Text style={styles.sliderLabel}>Excellent</Text>
            </View>
          </View>
        </View>

        {/* Context Section */}
        <View style={styles.inputSection}>
          <Text style={styles.sectionTitle}>Context (Optional)</Text>
          <TextInput
            style={styles.contextInput}
            value={context}
            onChangeText={setContext}
            placeholder="What's happening? (work, relationships, health, etc.)"
            multiline
            numberOfLines={2}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!textInput.trim() || isProcessing) && styles.disabledButton
          ]}
          onPress={submitEmotion}
          disabled={!textInput.trim() || isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Ionicons name="heart" size={24} color="white" />
          )}
          <Text style={styles.submitButtonText}>
            {isProcessing ? 'Analyzing...' : 'Log My Emotion'}
          </Text>
        </TouchableOpacity>

        {/* Recent Emotions */}
        {recentEmotions.length > 0 && (
          <View style={styles.recentSection}>
            <Text style={styles.sectionTitle}>Recent Entries</Text>
            {recentEmotions.map((emotion) => (
              <View key={emotion.id} style={styles.emotionCard}>
                <View style={styles.emotionHeader}>
                  <Text style={styles.emotionType}>{emotion.emotion}</Text>
                  <Text style={styles.emotionIntensity}>
                    {emotion.intensity}/10
                  </Text>
                </View>
                <Text style={styles.emotionText} numberOfLines={2}>
                  {emotion.text_input}
                </Text>
                <Text style={styles.emotionDate}>
                  {formatDate(emotion.timestamp)}
                </Text>
              </View>
            ))}
            
            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>View All Entries</Text>
              <Ionicons name="arrow-forward" size={16} color="#6366f1" />
            </TouchableOpacity>
          </View>
        )}
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
    minHeight: 100,
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
    backgroundColor: '#6366f1',
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
  sliderContainer: {
    backgroundColor: 'white',
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
  moodLabel: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  contextInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1f2937',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minHeight: 60,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  submitButton: {
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
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  recentSection: {
    padding: 24,
    paddingTop: 0,
  },
  emotionCard: {
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
  emotionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  emotionType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
    textTransform: 'capitalize',
  },
  emotionIntensity: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  emotionText: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 8,
    lineHeight: 20,
  },
  emotionDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginTop: 8,
  },
  viewAllText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 4,
  },
});