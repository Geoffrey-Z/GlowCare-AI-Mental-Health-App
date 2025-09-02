import React, { useState, useEffect } from 'react';
import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');
const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const API_BASE = `${EXPO_PUBLIC_BACKEND_URL}/api`;

// Mock user ID for demo
const DEMO_USER_ID = 'demo-user-123';

// Calendar Heatmap Component
const CalendarHeatmap = ({ emotions }) => {
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getEmotionForDate = (date) => {
    const dateStr = date.toDateString();
    return emotions.find(emotion => 
      new Date(emotion.timestamp).toDateString() === dateStr
    );
  };

  const getIntensityColor = (intensity) => {
    if (!intensity) return '#f3f4f6'; // No data - light gray
    
    const colors = [
      '#fef2f2', // 1 - very light red
      '#fecaca', // 2 - light red  
      '#f87171', // 3 - red
      '#ef4444', // 4 - darker red
      '#dc2626', // 5 - dark red
      '#fef3c7', // 6 - light yellow
      '#fde047', // 7 - yellow
      '#84cc16', // 8 - light green
      '#22c55e', // 9 - green
      '#16a34a', // 10 - dark green
    ];
    
    return colors[Math.floor(intensity) - 1] || '#f3f4f6';
  };

  const currentDate = new Date();
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  
  const days = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Add day headers
  for (let i = 0; i < 7; i++) {
    days.push(
      <View key={`header-${i}`} style={styles.dayHeader}>
        <Text style={styles.dayHeaderText}>{dayNames[i]}</Text>
      </View>
    );
  }
  
  // Add empty cells for days before month starts
  for (let i = 0; i < firstDay; i++) {
    days.push(<View key={`empty-${i}`} style={styles.emptyDay} />);
  }
  
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const emotion = getEmotionForDate(date);
    const isToday = date.toDateString() === new Date().toDateString();
    
    days.push(
      <TouchableOpacity
        key={day}
        style={[
          styles.dayCell,
          { backgroundColor: getIntensityColor(emotion?.intensity) },
          isToday && styles.todayCell
        ]}
      >
        <Text style={[
          styles.dayText,
          emotion && styles.dayWithData,
          isToday && styles.todayText
        ]}>
          {day}
        </Text>
      </TouchableOpacity>
    );
  }
  
  return (
    <View style={styles.calendarContainer}>
      <Text style={styles.calendarTitle}>
        {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
      </Text>
      <View style={styles.calendar}>
        {days}
      </View>
      <View style={styles.legend}>
        <Text style={styles.legendText}>Less</Text>
        <View style={styles.legendColors}>
          {[1, 3, 5, 7, 10].map(intensity => (
            <View
              key={intensity}
              style={[
                styles.legendColor,
                { backgroundColor: getIntensityColor(intensity) }
              ]}
            />
          ))}
        </View>
        <Text style={styles.legendText}>More</Text>
      </View>
    </View>
  );
};

export default function MoodReportsScreen() {
  const [loading, setLoading] = useState(false);
  const [reportPeriod, setReportPeriod] = useState('week');
  const [emotions, setEmotions] = useState([]);
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    loadEmotionsData();
  }, []);

  const loadEmotionsData = async () => {
    try {
      const response = await fetch(`${API_BASE}/emotions/${DEMO_USER_ID}?limit=30`);
      if (response.ok) {
        const emotionsData = await response.json();
        setEmotions(emotionsData);
      }
    } catch (error) {
      console.error('Error loading emotions:', error);
    }
  };

  const generateReport = async (period) => {
    setLoading(true);
    setReportPeriod(period);
    
    try {
      const response = await fetch(`${API_BASE}/reports/${DEMO_USER_ID}/mood?period=${period}`);
      if (response.ok) {
        const data = await response.json();
        setReportData(data);
      }
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, color = '#6366f1' }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  const EmotionBreakdown = ({ breakdown }) => {
    if (!breakdown) return null;
    
    const total = Object.values(breakdown).reduce((sum, count) => sum + count, 0);
    
    return (
      <View style={styles.breakdownContainer}>
        <Text style={styles.sectionTitle}>Emotion Breakdown</Text>
        {Object.entries(breakdown).map(([emotion, count]) => {
          const percentage = ((count / total) * 100).toFixed(1);
          return (
            <View key={emotion} style={styles.emotionRow}>
              <Text style={styles.emotionName}>{emotion}</Text>
              <View style={styles.emotionBar}>
                <View
                  style={[
                    styles.emotionProgress,
                    { width: `${percentage}%` }
                  ]}
                />
              </View>
              <Text style={styles.emotionPercentage}>{percentage}%</Text>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="auto" />
      
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Mood Reports</Text>
          <Text style={styles.subtitle}>
            Track your emotional patterns and insights
          </Text>
        </View>

        {/* Calendar Heatmap */}
        <View style={styles.section}>
          <CalendarHeatmap emotions={emotions} />
        </View>

        {/* Report Period Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Generate Report</Text>
          <View style={styles.periodSelector}>
            <TouchableOpacity
              style={[
                styles.periodButton,
                reportPeriod === 'week' && styles.activePeriod
              ]}
              onPress={() => generateReport('week')}
            >
              <Text style={[
                styles.periodText,
                reportPeriod === 'week' && styles.activePeriodText
              ]}>
                Weekly
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.periodButton,
                reportPeriod === 'month' && styles.activePeriod
              ]}
              onPress={() => generateReport('month')}
            >
              <Text style={[
                styles.periodText,
                reportPeriod === 'month' && styles.activePeriodText
              ]}>
                Monthly
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Loading State */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>Generating your report...</Text>
          </View>
        )}

        {/* Report Results */}
        {reportData && !loading && (
          <>
            {/* Stats Cards */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {reportPeriod === 'week' ? 'Weekly' : 'Monthly'} Summary
              </Text>
              <View style={styles.statsGrid}>
                <StatCard
                  title="Total Entries"
                  value={reportData.summary?.total_entries || 0}
                  icon="bar-chart-outline"
                  color="#6366f1"
                />
                <StatCard
                  title="Avg. Intensity"
                  value={`${reportData.summary?.average_intensity || 0}/10`}
                  icon="pulse-outline"
                  color="#ef4444"
                />
                <StatCard
                  title="Top Emotion"
                  value={reportData.summary?.most_common_emotion || 'N/A'}
                  icon="heart-outline"
                  color="#22c55e"
                />
              </View>
            </View>

            {/* Emotion Breakdown */}
            <View style={styles.section}>
              <EmotionBreakdown breakdown={reportData.summary?.emotion_breakdown} />
            </View>

            {/* AI Insights */}
            {reportData.ai_insights && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>AI Insights</Text>
                <View style={styles.insightsContainer}>
                  <Ionicons name="bulb-outline" size={24} color="#f59e0b" />
                  <Text style={styles.insightsText}>
                    {reportData.ai_insights}
                  </Text>
                </View>
              </View>
            )}
          </>
        )}

        {/* Quick Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tips for Better Mood Tracking</Text>
          <View style={styles.tipsContainer}>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
              <Text style={styles.tipText}>
                Track your mood daily for better insights
              </Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
              <Text style={styles.tipText}>
                Include context to understand patterns
              </Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
              <Text style={styles.tipText}>
                Use voice notes for richer emotional data
              </Text>
            </View>
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
  section: {
    padding: 24,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  calendarContainer: {
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
  calendarTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 16,
  },
  calendar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dayHeader: {
    width: '14.28%',
    alignItems: 'center',
    paddingBottom: 8,
  },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  emptyDay: {
    width: '14.28%',
    height: 32,
  },
  dayCell: {
    width: '14.28%',
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    marginBottom: 4,
  },
  todayCell: {
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  dayText: {
    fontSize: 12,
    color: '#6b7280',
  },
  dayWithData: {
    color: '#1f2937',
    fontWeight: '600',
  },
  todayText: {
    color: '#6366f1',
    fontWeight: 'bold',
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  legendText: {
    fontSize: 12,
    color: '#6b7280',
  },
  legendColors: {
    flexDirection: 'row',
    marginHorizontal: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginHorizontal: 2,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  activePeriod: {
    backgroundColor: '#6366f1',
  },
  periodText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  activePeriodText: {
    color: 'white',
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
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
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
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  breakdownContainer: {
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
  emotionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  emotionName: {
    width: 80,
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    textTransform: 'capitalize',
  },
  emotionBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    marginHorizontal: 12,
  },
  emotionProgress: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 4,
  },
  emotionPercentage: {
    width: 40,
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
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
  tipsContainer: {
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
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#4b5563',
    marginLeft: 12,
  },
});