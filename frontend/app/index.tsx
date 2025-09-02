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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

// Import screens
import EmotionTrackingScreen from './emotions';
import ConversationAnalysisScreen from './conversations';
import CrisisSupportScreen from './support';
import SocialFeedScreen from './reports';
import MessagesScreen from './messages';
import ProfileScreen from './profile';

const { width, height } = Dimensions.get('window');

// API configuration
const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const API_BASE = `${EXPO_PUBLIC_BACKEND_URL}/api`;

// Mock user ID for demo
const DEMO_USER_ID = 'demo-user-123';

// Navigation helper for profile
let currentNavigation = null;

// Main component
export default function GlowCareApp() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [loading, setLoading] = useState(false);
  const [emotions, setEmotions] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [profileParams, setProfileParams] = useState(null);

  // Initialize user on app start
  useEffect(() => {
    initializeUser();
    if (activeTab === 'home') {
      loadHomeData();
    }
  }, [activeTab]);

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

  const loadHomeData = async () => {
    try {
      // Load recent emotions
      const emotionsResponse = await fetch(`${API_BASE}/emotions/${DEMO_USER_ID}?limit=7`);
      if (emotionsResponse.ok) {
        const emotionsData = await emotionsResponse.json();
        setEmotions(emotionsData);
      }

      // Load week report
      const reportResponse = await fetch(`${API_BASE}/reports/${DEMO_USER_ID}/mood?period=week`);
      if (reportResponse.ok) {
        const reportData = await reportResponse.json();
        setReportData(reportData);
      }
    } catch (error) {
      console.error('Error loading home data:', error);
    }
  };

  const testAPIConnection = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/health`);
      const data = await response.json();
      
      Alert.alert(
        'API状态',
        `状态: ${data.status}\nAI: ${data.services?.ai}\n数据库: ${data.services?.database}`,
        [{ text: '确定' }]
      );
    } catch (error) {
      Alert.alert('连接错误', '无法连接到API');
      console.error('API connection error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Navigation helper
  const navigationHelper = {
    navigate: (screen, params) => {
      if (screen === 'profile') {
        setProfileParams(params);
        setActiveTab('profile');
      }
    },
    goBack: () => {
      setActiveTab('reports'); // Go back to social feed
      setProfileParams(null);
    }
  };

  // Calendar Heatmap Component (simplified for home page)
  const WeeklyHeatmap = ({ emotions }) => {
    const getDaysThisWeek = () => {
      const today = new Date();
      const currentDay = today.getDay();
      const days = [];
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        days.push(date);
      }
      return days;
    };

    const getEmotionForDate = (date) => {
      const dateStr = date.toDateString();
      return emotions.find(emotion => 
        new Date(emotion.timestamp).toDateString() === dateStr
      );
    };

    const getIntensityColor = (intensity) => {
      if (!intensity) return '#f3f4f6';
      if (intensity <= 3) return '#fecaca';
      if (intensity <= 5) return '#fde047';
      if (intensity <= 7) return '#84cc16';
      return '#22c55e';
    };

    const days = getDaysThisWeek();

    return (
      <View style={styles.weeklyHeatmap}>
        <Text style={styles.heatmapTitle}>本周心情</Text>
        <View style={styles.heatmapDays}>
          {days.map((date, index) => {
            const emotion = getEmotionForDate(date);
            const isToday = date.toDateString() === new Date().toDateString();
            
            return (
              <View key={index} style={styles.heatmapDay}>
                <View
                  style={[
                    styles.heatmapDot,
                    { backgroundColor: getIntensityColor(emotion?.intensity) },
                    isToday && styles.todayDot
                  ]}
                />
                <Text style={styles.heatmapDayText}>
                  {['日', '一', '二', '三', '四', '五', '六'][date.getDay()]}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  // Components
  const TabButton = ({ id, icon, label, isActive, onPress, hasNotification = false }) => (
    <TouchableOpacity
      style={[styles.tabButton, isActive && styles.activeTab]}
      onPress={() => onPress(id)}
    >
      <View style={styles.tabIconContainer}>
        <Ionicons 
          name={icon} 
          size={24} 
          color={isActive ? '#6366f1' : '#9ca3af'} 
        />
        {hasNotification && (
          <View style={styles.notificationDot} />
        )}
      </View>
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

  const StatCard = ({ title, value, icon, color = '#6366f1' }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  const WelcomeScreen = () => (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.welcomeTitle}>欢迎使用 GlowCare</Text>
        <Text style={styles.welcomeSubtitle}>
          您的AI心理健康伙伴
        </Text>
        {currentUser && (
          <Text style={styles.userGreeting}>
            你好，{currentUser.name}！👋
          </Text>
        )}
      </View>

      {/* Weekly Mood Summary */}
      {emotions.length > 0 && (
        <View style={styles.moodSummarySection}>
          <WeeklyHeatmap emotions={emotions} />
        </View>
      )}

      {/* Weekly Stats */}
      {reportData && reportData.summary && (
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>本周数据</Text>
          <View style={styles.statsGrid}>
            <StatCard
              title="记录次数"
              value={reportData.summary.total_entries || 0}
              icon="bar-chart-outline"
              color="#6366f1"
            />
            <StatCard
              title="平均心情"
              value={`${reportData.summary.average_intensity || 0}/10`}
              icon="pulse-outline"
              color="#ef4444"
            />
            <StatCard
              title="主要情绪"
              value={reportData.summary.most_common_emotion || 'N/A'}
              icon="heart-outline"
              color="#22c55e"
            />
          </View>
        </View>
      )}

      <View style={styles.featuresContainer}>
        <Text style={styles.sectionTitle}>核心功能</Text>
        
        <FeatureCard
          icon="heart-outline"
          title="情绪记录"
          description="使用AI分析和监测您的情绪模式"
          color="#ef4444"
          onPress={() => setActiveTab('emotions')}
        />
        
        <FeatureCard
          icon="chatbubbles-outline"
          title="对话分析"
          description="困难对话中的实时支持和建议"
          color="#06b6d4"
          onPress={() => setActiveTab('conversations')}
        />
        
        <FeatureCard
          icon="shield-checkmark-outline"
          title="危机支持"
          description="呼吸练习和CBT技术的即时帮助"
          color="#f59e0b"
          onPress={() => setActiveTab('support')}
        />
        
        <FeatureCard
          icon="people-outline"
          title="心理社区"
          description="与他人分享经验，获得支持和鼓励"
          color="#8b5cf6"
          onPress={() => setActiveTab('reports')}
        />
        
        <FeatureCard
          icon="mail-outline"
          title="消息中心"
          description="私信交流和群组讨论，专业咨询"
          color="#059669"
          onPress={() => setActiveTab('messages')}
        />
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>快捷操作</Text>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryAction]}
          onPress={() => setActiveTab('emotions')}
        >
          <Ionicons name="add-circle-outline" size={24} color="white" />
          <Text style={styles.primaryActionText}>现在记录心情</Text>
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
            {loading ? '测试中...' : '测试AI连接'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* AI Insights Section */}
      {reportData && reportData.ai_insights && (
        <View style={styles.insightsSection}>
          <Text style={styles.sectionTitle}>AI洞察</Text>
          <View style={styles.insightsContainer}>
            <Ionicons name="bulb-outline" size={24} color="#f59e0b" />
            <Text style={styles.insightsText}>
              {reportData.ai_insights}
            </Text>
          </View>
        </View>
      )}

      {/* Tips Section */}
      <View style={styles.tipsSection}>
        <Text style={styles.sectionTitle}>每日心理健康贴士</Text>
        
        <View style={styles.tipCard}>
          <Ionicons name="sunny-outline" size={20} color="#f59e0b" />
          <Text style={styles.tipText}>
            <Text style={styles.tipTitle}>晨间例行：</Text>
            以正念和意图开始您的一天
          </Text>
        </View>
        
        <View style={styles.tipCard}>
          <Ionicons name="walk-outline" size={20} color="#22c55e" />
          <Text style={styles.tipText}>
            <Text style={styles.tipTitle}>身体活动：</Text>
            即使是短暂的散步也能改善您的心情
          </Text>
        </View>
        
        <View style={styles.tipCard}>
          <Ionicons name="people-outline" size={20} color="#6366f1" />
          <Text style={styles.tipText}>
            <Text style={styles.tipTitle}>社交联系：</Text>
            联系您关心的人
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          🌟 您的心理健康之旅从这里开始
        </Text>
      </View>
    </ScrollView>
  );

  const renderCurrentScreen = () => {
    switch (activeTab) {
      case 'emotions':
        return <EmotionTrackingScreen />;
      case 'conversations':
        return <ConversationAnalysisScreen />;
      case 'support':
        return <CrisisSupportScreen />;
      case 'reports':
        return <SocialFeedScreen navigation={navigationHelper} />;
      case 'messages':
        return <MessagesScreen />;
      case 'profile':
        return <ProfileScreen route={{ params: profileParams }} navigation={navigationHelper} />;
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

      {/* Bottom Navigation - Hide for profile screen */}
      {activeTab !== 'profile' && (
        <View style={styles.bottomNav}>
          <TabButton
            id="home"
            icon="home-outline"
            label="首页"
            isActive={activeTab === 'home'}
            onPress={setActiveTab}
          />
          <TabButton
            id="emotions"
            icon="heart-outline"
            label="情绪"
            isActive={activeTab === 'emotions'}
            onPress={setActiveTab}
          />
          <TabButton
            id="conversations"
            icon="chatbubbles-outline"
            label="对话"
            isActive={activeTab === 'conversations'}
            onPress={setActiveTab}
          />
          <TabButton
            id="support"
            icon="shield-checkmark-outline"
            label="支持"
            isActive={activeTab === 'support'}
            onPress={setActiveTab}
          />
          <TabButton
            id="reports"
            icon="people-outline"
            label="社区"
            isActive={activeTab === 'reports'}
            onPress={setActiveTab}
          />
          <TabButton
            id="messages"
            icon="mail-outline"
            label="消息"
            isActive={activeTab === 'messages'}
            onPress={setActiveTab}
            hasNotification={true}
          />
        </View>
      )}
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
  moodSummarySection: {
    padding: 24,
    paddingTop: 0,
  },
  weeklyHeatmap: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  heatmapTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  heatmapDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heatmapDay: {
    alignItems: 'center',
  },
  heatmapDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  todayDot: {
    borderColor: '#6366f1',
  },
  heatmapDayText: {
    fontSize: 12,
    color: '#6b7280',
  },
  statsSection: {
    padding: 24,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '30%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
  },
  featuresContainer: {
    padding: 24,
    paddingTop: 0,
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
  insightsSection: {
    padding: 24,
    paddingTop: 0,
  },
  insightsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  insightsText: {
    flex: 1,
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginLeft: 12,
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
  tabIconContainer: {
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
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
});