import React, { useState, useEffect } from 'react';
import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');
const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const API_BASE = `${EXPO_PUBLIC_BACKEND_URL}/api`;

// Mock user ID for demo
const DEMO_USER_ID = 'demo-user-123';

// Mock social feed data
const mockPosts = [
  {
    id: '1',
    user: {
      name: '小明',
      avatar: '😊',
      verified: true
    },
    content: '今天经过心理咨询后感觉好多了！想分享给大家一些呼吸练习的技巧：4秒吸气，保持4秒，6秒呼气。重复几次就会感觉平静很多 ✨',
    emotion: 'happy',
    intensity: 8,
    timestamp: '2小时前',
    likes: 24,
    comments: 8,
    shares: 3,
    tags: ['呼吸练习', '心理咨询', '自我关爱'],
    isLiked: false,
    images: []
  },
  {
    id: '2',
    user: {
      name: '心理小助手',
      avatar: '🌟',
      verified: true,
      isOfficial: true
    },
    content: '💙 每日心理健康提醒：\n\n记住，寻求帮助是勇敢的表现，不是软弱。你的感受是有效的，你值得被关爱和理解。\n\n如果今天感觉困难，试试这些小技巧：\n• 深呼吸3次\n• 找一个让你感到安全的地方\n• 联系一个信任的朋友\n• 记住这种感觉会过去\n\n你不是一个人在战斗 💪',
    emotion: 'support',
    timestamp: '4小时前',
    likes: 156,
    comments: 32,
    shares: 89,
    tags: ['每日提醒', '心理健康', '正能量'],
    isLiked: true,
    images: []
  },
  {
    id: '3',
    user: {
      name: '阳光小雨',
      avatar: '🌸',
      verified: false
    },
    content: '分享一下我最近的心情记录 📝 通过GlowCare记录了一个月的情绪变化，发现自己在周末心情明显更好。可能是因为可以多睡觉和做自己喜欢的事情吧！\n\n大家有什么让自己开心的小习惯吗？',
    emotion: 'peaceful',
    intensity: 7,
    timestamp: '6小时前',
    likes: 43,
    comments: 15,
    shares: 6,
    tags: ['情绪记录', '自我发现', '周末快乐'],
    isLiked: false,
    images: []
  },
  {
    id: '4',
    user: {
      name: '勇敢的心',
      avatar: '💪',
      verified: false
    },
    content: '想和大家分享我克服社交焦虑的小进步 🎉\n\n今天终于鼓起勇气和同事一起去吃午饭了！虽然开始很紧张，但发现大家都很友善。小步前进也是进步！\n\n给同样有社交焦虑的朋友们一些鼓励：你可以的，一小步一小步来 ❤️',
    emotion: 'proud',
    intensity: 9,
    timestamp: '8小时前',
    likes: 67,
    comments: 21,
    shares: 12,
    tags: ['社交焦虑', '小进步', '鼓励'],
    isLiked: true,
    images: []
  },
  {
    id: '5',
    user: {
      name: '心理咨询师李医生',
      avatar: '👨‍⚕️',
      verified: true,
      isProfessional: true
    },
    content: '关于情绪管理的专业建议 📚\n\n很多人认为负面情绪是不好的，但其实所有情绪都有它的价值：\n\n😢 悲伤 - 帮助我们处理失去和变化\n😠 愤怒 - 提醒我们边界被侵犯\n😰 焦虑 - 让我们对潜在威胁保持警觉\n😊 快乐 - 鼓励我们重复积极行为\n\n重要的不是消除情绪，而是学会理解和管理它们。',
    emotion: 'educational',
    timestamp: '12小时前',
    likes: 198,
    comments: 45,
    shares: 124,
    tags: ['专业建议', '情绪管理', '心理教育'],
    isLiked: false,
    images: []
  }
];

export default function SocialFeedScreen() {
  const [posts, setPosts] = useState(mockPosts);
  const [refreshing, setRefreshing] = useState(false);
  const [newPostText, setNewPostText] = useState('');
  const [showNewPost, setShowNewPost] = useState(false);
  const [selectedEmotion, setSelectedEmotion] = useState(null);

  const emotions = [
    { id: 'happy', name: '开心', emoji: '😊', color: '#22c55e' },
    { id: 'sad', name: '难过', emoji: '😢', color: '#6b7280' },
    { id: 'anxious', name: '焦虑', emoji: '😰', color: '#f59e0b' },
    { id: 'angry', name: '愤怒', emoji: '😠', color: '#ef4444' },
    { id: 'peaceful', name: '平静', emoji: '😌', color: '#06b6d4' },
    { id: 'excited', name: '兴奋', emoji: '🤩', color: '#8b5cf6' },
  ];

  const onRefresh = () => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const toggleLike = (postId) => {
    setPosts(posts.map(post => 
      post.id === postId 
        ? { 
            ...post, 
            isLiked: !post.isLiked,
            likes: post.isLiked ? post.likes - 1 : post.likes + 1
          }
        : post
    ));
  };

  const publishPost = () => {
    if (!newPostText.trim() || !selectedEmotion) {
      Alert.alert('提示', '请输入内容并选择当前心情');
      return;
    }

    const newPost = {
      id: Date.now().toString(),
      user: {
        name: '我',
        avatar: '😊',
        verified: false
      },
      content: newPostText,
      emotion: selectedEmotion.id,
      intensity: 7,
      timestamp: '刚刚',
      likes: 0,
      comments: 0,
      shares: 0,
      tags: [],
      isLiked: false,
      images: []
    };

    setPosts([newPost, ...posts]);
    setNewPostText('');
    setSelectedEmotion(null);
    setShowNewPost(false);
    Alert.alert('成功', '动态发布成功！');
  };

  const PostCard = ({ post }) => (
    <View style={styles.postCard}>
      {/* User Header */}
      <View style={styles.postHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{post.user.avatar}</Text>
          </View>
          <View style={styles.userDetails}>
            <View style={styles.userName}>
              <Text style={styles.userNameText}>{post.user.name}</Text>
              {post.user.verified && (
                <Ionicons 
                  name="checkmark-circle" 
                  size={16} 
                  color={post.user.isOfficial ? '#6366f1' : post.user.isProfessional ? '#059669' : '#22c55e'} 
                />
              )}
              {post.user.isOfficial && (
                <Text style={styles.officialTag}>官方</Text>
              )}
              {post.user.isProfessional && (
                <Text style={styles.professionalTag}>专家</Text>
              )}
            </View>
            <Text style={styles.timestamp}>{post.timestamp}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-horizontal" size={20} color="#9ca3af" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <Text style={styles.postContent}>{post.content}</Text>

      {/* Emotion Badge */}
      {post.emotion && (
        <View style={styles.emotionBadge}>
          <Text style={styles.emotionText}>
            当前心情: {emotions.find(e => e.id === post.emotion)?.emoji} {emotions.find(e => e.id === post.emotion)?.name}
            {post.intensity && ` (${post.intensity}/10)`}
          </Text>
        </View>
      )}

      {/* Tags */}
      {post.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {post.tags.map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Actions */}
      <View style={styles.postActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => toggleLike(post.id)}
        >
          <Ionicons 
            name={post.isLiked ? "heart" : "heart-outline"} 
            size={20} 
            color={post.isLiked ? "#ef4444" : "#6b7280"} 
          />
          <Text style={[styles.actionText, post.isLiked && styles.likedText]}>
            {post.likes}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="chatbubble-outline" size={20} color="#6b7280" />
          <Text style={styles.actionText}>{post.comments}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="share-outline" size={20} color="#6b7280" />
          <Text style={styles.actionText}>{post.shares}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="auto" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>心理社区</Text>
        <TouchableOpacity 
          style={styles.newPostButton}
          onPress={() => setShowNewPost(true)}
        >
          <Ionicons name="add-circle-outline" size={24} color="#6366f1" />
        </TouchableOpacity>
      </View>

      {/* New Post Modal */}
      {showNewPost && (
        <View style={styles.newPostModal}>
          <View style={styles.newPostHeader}>
            <TouchableOpacity onPress={() => setShowNewPost(false)}>
              <Text style={styles.cancelButton}>取消</Text>
            </TouchableOpacity>
            <Text style={styles.newPostTitle}>分享动态</Text>
            <TouchableOpacity onPress={publishPost}>
              <Text style={styles.publishButton}>发布</Text>
            </TouchableOpacity>
          </View>
          
          <TextInput
            style={styles.newPostInput}
            value={newPostText}
            onChangeText={setNewPostText}
            placeholder="分享你的心情、想法或经验..."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          
          <View style={styles.emotionSelector}>
            <Text style={styles.emotionSelectorTitle}>当前心情:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {emotions.map(emotion => (
                <TouchableOpacity
                  key={emotion.id}
                  style={[
                    styles.emotionOption,
                    selectedEmotion?.id === emotion.id && styles.selectedEmotion
                  ]}
                  onPress={() => setSelectedEmotion(emotion)}
                >
                  <Text style={styles.emotionEmoji}>{emotion.emoji}</Text>
                  <Text style={styles.emotionName}>{emotion.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Posts Feed */}
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Community Guidelines */}
        <View style={styles.guidelinesCard}>
          <View style={styles.guidelinesHeader}>
            <Ionicons name="information-circle" size={20} color="#6366f1" />
            <Text style={styles.guidelinesTitle}>社区指南</Text>
          </View>
          <Text style={styles.guidelinesText}>
            这里是一个安全、支持和理解的空间。请友善交流，尊重他人，分享积极正面的内容。
          </Text>
        </View>

        {/* Posts */}
        {posts.map(post => (
          <PostCard key={post.id} post={post} />
        ))}
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
  newPostButton: {
    padding: 8,
  },
  newPostModal: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  newPostHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  cancelButton: {
    color: '#6b7280',
    fontSize: 16,
  },
  newPostTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  publishButton: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '600',
  },
  newPostInput: {
    padding: 16,
    fontSize: 16,
    color: '#1f2937',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  emotionSelector: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  emotionSelectorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  emotionOption: {
    alignItems: 'center',
    padding: 12,
    marginRight: 12,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    minWidth: 60,
  },
  selectedEmotion: {
    backgroundColor: '#ede9fe',
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  emotionEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  emotionName: {
    fontSize: 12,
    color: '#4b5563',
  },
  guidelinesCard: {
    backgroundColor: '#eff6ff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  guidelinesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  guidelinesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    marginLeft: 8,
  },
  guidelinesText: {
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
  postCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  userNameText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginRight: 6,
  },
  officialTag: {
    fontSize: 10,
    color: '#6366f1',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  professionalTag: {
    fontSize: 10,
    color: '#059669',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#9ca3af',
  },
  moreButton: {
    padding: 4,
  },
  postContent: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 12,
  },
  emotionBadge: {
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  emotionText: {
    fontSize: 13,
    color: '#166534',
    fontWeight: '500',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  tag: {
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '500',
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 6,
  },
  likedText: {
    color: '#ef4444',
  },
});