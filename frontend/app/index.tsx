import React, { useState, useEffect } from 'react';
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');

// API configuration
const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const API_BASE = `${EXPO_PUBLIC_BACKEND_URL}/api`;

// Main component
export default function GlowCareApp() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [loading, setLoading] = useState(false);

  // Initialize user on app start
  useEffect(() => {
    initializeUser();
  }, []);

  const initializeUser = async () => {
    try {
      // For now, create a demo user
      const response = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Demo User',
          email: 'demo@glowcare.com'
        }),
      });
      
      if (response.ok) {
        const user = await response.json();
        setCurrentUser(user);
      }
    } catch (error) {
      console.error('Error initializing user:', error);
    }
  };

  const testAPIConnection = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/health`);
      const data = await response.json();
      
      Alert.alert(
        'API Status',
        `Status: ${data.status}\nAI: ${data.services?.ai}\nDB: ${data.services?.database}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Connection Error', 'Unable to connect to API');
      console.error('API connection error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Components
  const TabButton = ({ id, icon, label, isActive, onPress }) => (
    <TouchableOpacity
      style={[styles.tabButton, isActive && styles.activeTab]}
      onPress={() => onPress(id)}
    >
      <Ionicons 
        name={icon} 
        size={24} 
        color={isActive ? '#6366f1' : '#9ca3af'} 
      />
      <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const FeatureCard = ({ icon, title, description, onPress, color = '#6366f1' }) => (
    <TouchableOpacity style={styles.featureCard} onPress={onPress}>
      <View style={[styles.featureIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={28} color={color} />
      </View>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
    </TouchableOpacity>
  );

  const WelcomeScreen = () => (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.welcomeTitle}>Welcome to GlowCare</Text>
        <Text style={styles.welcomeSubtitle}>
          Your AI-powered mental health companion
        </Text>
        {currentUser && (
          <Text style={styles.userGreeting}>
            Hello, {currentUser.name}! 👋
          </Text>
        )}
      </View>

      <View style={styles.featuresContainer}>
        <Text style={styles.sectionTitle}>Core Features</Text>
        
        <FeatureCard
          icon="heart-outline"
          title="Emotion Tracking"
          description="Monitor and analyze your emotional patterns with AI"
          color="#ef4444"
          onPress={() => setActiveTab('emotions')}
        />
        
        <FeatureCard
          icon="chatbubbles-outline"
          title="Conversation Analysis"
          description="Real-time support during difficult conversations"
          color="#06b6d4"
          onPress={() => setActiveTab('conversations')}
        />
        
        <FeatureCard
          icon="shield-checkmark-outline"
          title="Crisis Support"
          description="Immediate help with breathing exercises and CBT"
          color="#f59e0b"
          onPress={() => setActiveTab('support')}
        />
        
        <FeatureCard
          icon="analytics-outline"
          title="Mood Reports"
          description="Weekly and monthly insights into your mental health"
          color="#8b5cf6"
          onPress={() => setActiveTab('reports')}
        />
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryAction]}
          onPress={() => setActiveTab('emotions')}
        >
          <Ionicons name="add-circle-outline" size={24} color="white" />
          <Text style={styles.primaryActionText}>Log Your Mood Now</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryAction]}
          onPress={testAPIConnection}
          disabled={loading}
        >
          <Ionicons 
            name={loading ? "sync-outline" : "pulse-outline"} 
            size={24} 
            color="#6366f1" 
          />
          <Text style={styles.secondaryActionText}>
            {loading ? 'Testing...' : 'Test AI Connection'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          🌟 Your mental health journey starts here
        </Text>
      </View>
    </ScrollView>
  );

  const PlaceholderScreen = ({ title, icon, description }) => (
    <View style={styles.placeholderContainer}>
      <Ionicons name={icon} size={64} color="#6366f1" />
      <Text style={styles.placeholderTitle}>{title}</Text>
      <Text style={styles.placeholderDescription}>{description}</Text>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setActiveTab('home')}
      >
        <Text style={styles.backButtonText}>← Back to Home</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCurrentScreen = () => {
    switch (activeTab) {
      case 'emotions':
        return (
          <PlaceholderScreen
            title="Emotion Tracking"
            icon="heart-outline"
            description="Log your emotions and get AI-powered insights. This feature will allow you to track your mood patterns over time."
          />
        );
      case 'conversations':
        return (
          <PlaceholderScreen
            title="Conversation Analysis"
            icon="chatbubbles-outline"
            description="Get real-time support during difficult conversations with AI-powered analysis and suggestions."
          />
        );
      case 'support':
        return (
          <PlaceholderScreen
            title="Crisis Support"
            icon="shield-checkmark-outline"
            description="Access immediate help with breathing exercises, CBT techniques, and crisis intervention support."
          />
        );
      case 'reports':
        return (
          <PlaceholderScreen
            title="Mood Reports"
            icon="analytics-outline"
            description="View comprehensive reports about your emotional patterns and mental health insights."
          />
        );
      default:
        return <WelcomeScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="auto" />
      
      <View style={styles.mainContent}>
        {renderCurrentScreen()}
      </View>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TabButton
          id="home"
          icon="home-outline"
          label="Home"
          isActive={activeTab === 'home'}
          onPress={setActiveTab}
        />
        <TabButton
          id="emotions"
          icon="heart-outline"
          label="Emotions"
          isActive={activeTab === 'emotions'}
          onPress={setActiveTab}
        />
        <TabButton
          id="conversations"
          icon="chatbubbles-outline"
          label="Chat"
          isActive={activeTab === 'conversations'}
          onPress={setActiveTab}
        />
        <TabButton
          id="support"
          icon="shield-checkmark-outline"
          label="Support"
          isActive={activeTab === 'support'}
          onPress={setActiveTab}
        />
        <TabButton
          id="reports"
          icon="analytics-outline"
          label="Reports"
          isActive={activeTab === 'reports'}
          onPress={setActiveTab}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  mainContent: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 24,
    paddingTop: 32,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  userGreeting: {
    fontSize: 18,
    color: '#6366f1',
    fontWeight: '600',
  },
  featuresContainer: {
    padding: 24,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  quickActions: {
    padding: 24,
    paddingTop: 0,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  primaryAction: {
    backgroundColor: '#6366f1',
  },
  secondaryAction: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  primaryActionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryActionText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeTab: {
    transform: [{ scale: 1.05 }],
  },
  tabLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  activeTabLabel: {
    color: '#6366f1',
    fontWeight: '600',
  },
  placeholderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  placeholderDescription: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#6366f1',
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});