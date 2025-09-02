import React, { useState } from 'react';
import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

// Mock message data
const mockConversations = [
  {
    id: '1',
    type: 'dm',
    user: {
      name: '心理小助手',
      avatar: '🌟',
      isOfficial: true
    },
    lastMessage: '记得每天关注自己的心情变化哦 💙',
    timestamp: '刚刚',
    unreadCount: 1,
    isOnline: true
  },
  {
    id: '2', 
    type: 'dm',
    user: {
      name: '小雨',
      avatar: '😊',
      isOfficial: false
    },
    lastMessage: '谢谢你的鼓励，今天感觉好多了！',
    timestamp: '10分钟前',
    unreadCount: 0,
    isOnline: true
  },
  {
    id: '3',
    type: 'group',
    groupName: '焦虑支持小组',
    avatar: '🤗',
    lastMessage: '大家都可以分享一下今天的感受',
    sender: '阳光',
    timestamp: '30分钟前',
    unreadCount: 3,
    memberCount: 12
  },
  {
    id: '4',
    type: 'group', 
    groupName: '正念冥想练习',
    avatar: '🧘‍♀️',
    lastMessage: '今晚8点一起冥想吧',
    sender: '李医生',
    timestamp: '1小时前',
    unreadCount: 0,
    memberCount: 28
  },
  {
    id: '5',
    type: 'dm',
    user: {
      name: '勇敢的心',
      avatar: '💪',
      isOfficial: false
    },
    lastMessage: '你的建议真的很有帮助',
    timestamp: '2小时前',
    unreadCount: 0,
    isOnline: false
  }
];

const mockGroups = [
  {
    id: 'g1',
    name: '新人互助群',
    description: '刚加入GlowCare的朋友们互相支持',
    memberCount: 156,
    avatar: '🌱',
    isJoined: false
  },
  {
    id: 'g2',
    name: '抑郁症康复交流',
    description: '分享康复经验，互相陪伴成长',
    memberCount: 89,
    avatar: '🌈',
    isJoined: false
  },
  {
    id: 'g3', 
    name: '职场压力释放',
    description: '工作中的压力和困扰，大家一起面对',
    memberCount: 234,
    avatar: '💼',
    isJoined: true
  },
  {
    id: 'g4',
    name: '学生心理健康',
    description: '学生专属的心理健康交流空间',
    memberCount: 178,
    avatar: '📚',
    isJoined: false
  }
];

export default function MessagesScreen() {
  const [activeTab, setActiveTab] = useState('conversations'); // conversations, discover
  const [searchText, setSearchText] = useState('');

  const ConversationItem = ({ item }) => (
    <TouchableOpacity style={styles.conversationItem}>
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.type === 'group' ? item.avatar : item.user.avatar}
          </Text>
        </View>
        {item.type === 'dm' && item.isOnline && (
          <View style={styles.onlineIndicator} />
        )}
        {item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>
              {item.unreadCount > 99 ? '99+' : item.unreadCount}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <View style={styles.titleRow}>
            <Text style={styles.conversationTitle}>
              {item.type === 'group' ? item.groupName : item.user.name}
            </Text>
            {item.type === 'dm' && item.user.isOfficial && (
              <Ionicons name="checkmark-circle" size={14} color="#6366f1" />
            )}
            {item.type === 'group' && (
              <View style={styles.groupBadge}>
                <Ionicons name="people" size={10} color="#6b7280" />
                <Text style={styles.memberCountText}>{item.memberCount}</Text>
              </View>
            )}
          </View>
          <Text style={styles.timestamp}>{item.timestamp}</Text>
        </View>

        <View style={styles.messagePreview}>
          {item.type === 'group' && item.sender && (
            <Text style={styles.senderName}>{item.sender}: </Text>
          )}
          <Text 
            style={[
              styles.lastMessage,
              item.unreadCount > 0 && styles.unreadMessage
            ]}
            numberOfLines={1}
          >
            {item.lastMessage}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const GroupItem = ({ item }) => (
    <TouchableOpacity style={styles.groupItem}>
      <View style={styles.groupAvatar}>
        <Text style={styles.groupAvatarText}>{item.avatar}</Text>
      </View>
      
      <View style={styles.groupContent}>
        <Text style={styles.groupName}>{item.name}</Text>
        <Text style={styles.groupDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <Text style={styles.groupMemberCount}>
          {item.memberCount} 位成员
        </Text>
      </View>
      
      <TouchableOpacity 
        style={[
          styles.joinButton,
          item.isJoined && styles.joinedButton
        ]}
      >
        <Text style={[
          styles.joinButtonText,
          item.isJoined && styles.joinedButtonText
        ]}>
          {item.isJoined ? '已加入' : '加入'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const filteredConversations = mockConversations.filter(item =>
    (item.type === 'group' ? item.groupName : item.user.name)
      .toLowerCase()
      .includes(searchText.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="auto" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>消息</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="search-outline" size={22} color="#6b7280" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="add-outline" size={22} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'conversations' && styles.activeTab
          ]}
          onPress={() => setActiveTab('conversations')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'conversations' && styles.activeTabText
          ]}>
            对话
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'discover' && styles.activeTab
          ]}
          onPress={() => setActiveTab('discover')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'discover' && styles.activeTabText
          ]}>
            发现群组
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder={activeTab === 'conversations' ? '搜索对话...' : '搜索群组...'}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {activeTab === 'conversations' ? (
          <>
            {/* Quick Actions */}
            <View style={styles.quickActions}>
              <TouchableOpacity style={styles.quickActionItem}>
                <View style={styles.quickActionIcon}>
                  <Ionicons name="heart-outline" size={20} color="#ef4444" />
                </View>
                <Text style={styles.quickActionText}>紧急支持</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.quickActionItem}>
                <View style={styles.quickActionIcon}>
                  <Ionicons name="people-outline" size={20} color="#6366f1" />
                </View>
                <Text style={styles.quickActionText}>在线咨询</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.quickActionItem}>
                <View style={styles.quickActionIcon}>
                  <Ionicons name="library-outline" size={20} color="#059669" />
                </View>
                <Text style={styles.quickActionText}>资源库</Text>
              </TouchableOpacity>
            </View>

            {/* Conversations */}
            <View style={styles.conversationsSection}>
              <Text style={styles.sectionTitle}>最近对话</Text>
              {filteredConversations.map(item => (
                <ConversationItem key={item.id} item={item} />
              ))}
            </View>
          </>
        ) : (
          <View style={styles.discoverSection}>
            <Text style={styles.sectionTitle}>推荐群组</Text>
            <Text style={styles.sectionSubtitle}>
              加入感兴趣的群组，与志同道合的朋友交流
            </Text>
            
            {mockGroups.map(item => (
              <GroupItem key={item.id} item={item} />
            ))}
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#6366f1',
  },
  tabText: {
    fontSize: 16,
    color: '#6b7280',
  },
  activeTabText: {
    color: '#6366f1',
    fontWeight: '600',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: 'white',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#374151',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: 'white',
    marginBottom: 8,
  },
  quickActionItem: {
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  quickActionText: {
    fontSize: 12,
    color: '#6b7280',
  },
  conversationsSection: {
    backgroundColor: 'white',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    padding: 16,
    paddingBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: 'white',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  conversationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginRight: 6,
  },
  groupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  memberCountText: {
    fontSize: 10,
    color: '#6b7280',
    marginLeft: 2,
  },
  timestamp: {
    fontSize: 12,
    color: '#9ca3af',
  },
  messagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  senderName: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
  },
  lastMessage: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  unreadMessage: {
    color: '#1f2937',
    fontWeight: '500',
  },
  discoverSection: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  groupAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  groupAvatarText: {
    fontSize: 18,
  },
  groupContent: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  groupDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
    lineHeight: 18,
  },
  groupMemberCount: {
    fontSize: 12,
    color: '#9ca3af',
  },
  joinButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  joinedButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  joinButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  joinedButtonText: {
    color: '#6b7280',
  },
});