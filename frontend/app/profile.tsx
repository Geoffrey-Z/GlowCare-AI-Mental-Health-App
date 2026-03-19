import React, { useState, useEffect } from 'react';
import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

// Mock user data with background and posts
const getUserData = (userId) => {
  const users = {
    'me': {
      id: 'me',
      name: '我',
      avatar: '😊',
      verified: false,
      posts: 12,
      followers: 45,
      following: 67,
      bio: '热爱生活，关注心理健康 ✨\n每天记录情绪，分享正能量',
      backgroundImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=200&fit=crop',
      userPosts: [
        {
          id: 'my1',
          content: '今天心情特别好！和朋友一起去看了电影，笑得很开心 😄',
          images: ['https://images.unsplash.com/photo-1489710437720-ebb67ec84dd2?w=300&h=300&fit=crop'],
          likes: 23,
          timestamp: '2小时前',
          cardHeight: 280
        },
        {
          id: 'my2', 
          content: '分享一个呼吸练习的小技巧：4-7-8呼吸法真的很有效！',
          images: ['https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=300&h=220&fit=crop'],
          likes: 45,
          timestamp: '1天前',
          cardHeight: 250
        },
        {
          id: 'my3',
          content: '早上的晨跑让我充满活力 🏃‍♀️ 运动真的是最好的心情调节剂',
          images: ['https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=350&fit=crop'],
          likes: 67,
          timestamp: '3天前', 
          cardHeight: 320
        }
      ]
    },
    'user1': {
      id: 'user1',
      name: '小雨',
      avatar: '😊',
      verified: false,
      posts: 23,
      followers: 156,
      following: 89,
      bio: '每天都要开心一点点 🌈\n社交恐惧症康复中...',
      backgroundImage: 'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=400&h=200&fit=crop',
      userPosts: [
        {
          id: 'u1p1',
          content: '今天终于克服了社交焦虑，和同事一起吃午饭了！',
          images: ['https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=300&h=400&fit=crop'],
          likes: 24,
          timestamp: '2小时前',
          cardHeight: 380
        },
        {
          id: 'u1p2',
          content: '分享一些克服社交焦虑的小方法 💪',
          images: ['https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&h=280&fit=crop'],
          likes: 89,
          timestamp: '1周前',
          cardHeight: 300
        }
      ]
    },
    'official': {
      id: 'official',
      name: '心理小助手',
      avatar: '🌟',
      verified: true,
      isOfficial: true,
      posts: 1240,
      followers: 12500,
      following: 0,
      bio: 'GlowCare官方账号 💙\n每日为您提供心理健康小贴士',
      backgroundImage: 'https://images.unsplash.com/photo-1516796181074-bf453fbfa3e6?w=400&h=200&fit=crop',
      userPosts: [
        {
          id: 'op1',
          content: '💙 每日正念提醒\n\n深呼吸，专注当下。你的感受是有效的，给自己一些温柔。',
          images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=250&fit=crop'],
          likes: 156,
          timestamp: '4小时前',
          cardHeight: 280
        },
        {
          id: 'op2',
          content: '🌟 每日心理健康提醒：寻求帮助是勇敢的表现，不是软弱。',
          images: ['https://images.unsplash.com/photo-1518611012118-696072aa579a?w=300&h=300&fit=crop'],
          likes: 234,
          timestamp: '1天前',
          cardHeight: 320
        }
      ]
    }
  };
  
  return users[userId] || users['me'];
};

export default function ProfileScreen({ route, navigation }) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('posts'); // posts, liked
  
  // Get user ID from route params or default to current user
  const userId = route?.params?.userId || 'me';
  const userData = getUserData(userId);
  const isOwnProfile = userId === 'me';

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  // 瀑布流布局算法
  const formatPostsForMasonry = (posts) => {
    const leftColumn = [];
    const rightColumn = [];
    let leftHeight = 0;
    let rightHeight = 0;

    posts.forEach((post) => {
      const cardHeight = post.cardHeight || 280;
      
      if (leftHeight <= rightHeight) {
        leftColumn.push({ ...post, columnIndex: 0 });
        leftHeight += cardHeight + 12;
      } else {
        rightColumn.push({ ...post, columnIndex: 1 });
        rightHeight += cardHeight + 12;
      }
    });

    return { leftColumn, rightColumn };
  };

  const { leftColumn, rightColumn } = formatPostsForMasonry(userData.userPosts);

  const PostCard = ({ post, style }) => (
    <TouchableOpacity 
      style={[styles.postCard, { minHeight: post.cardHeight || 280 }, style]} 
      activeOpacity={0.95}
    >
      {/* 封面图片 */}
      {post.images && post.images.length > 0 && (
        <Image source={{ uri: post.images[0] }} style={styles.postImage} resizeMode="cover" />
      )}
      
      {/* 内容 */}
      <View style={styles.postContent}>
        <Text style={styles.postText} numberOfLines={3}>
          {post.content}
        </Text>
      </View>
      
      {/* 底部信息 */}
      <View style={styles.postBottom}>
        <View style={styles.postStats}>
          <Ionicons name="heart-outline" size={14} color="#6b7280" />
          <Text style={styles.postLikes}>{post.likes}</Text>
        </View>
        <Text style={styles.postTime}>{post.timestamp}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      
      <ScrollView 
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with background */}
        <View style={styles.headerContainer}>
          {/* Background Image */}
          <Image 
            source={{ uri: userData.backgroundImage }} 
            style={styles.backgroundImage}
            resizeMode="cover"
          />
          
          {/* Header overlay */}
          <View style={styles.headerOverlay}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation?.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.headerActionButton} onPress={() => router.push('/profile/settings')}>
                <Ionicons name="settings-outline" size={22} color="white" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerActionButton}>
                <Ionicons name="share-outline" size={22} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* User Info Section */}
        <View style={styles.userInfoSection}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{userData.avatar}</Text>
            </View>
          </View>
          
          {/* User Details */}
          <View style={styles.userDetails}>
            <View style={styles.userName}>
              <Text style={styles.userNameText}>{userData.name}</Text>
              {userData.verified && (
                <Ionicons 
                  name="checkmark-circle" 
                  size={20} 
                  color={userData.isOfficial ? '#6366f1' : userData.isProfessional ? '#059669' : '#22c55e'} 
                />
              )}
            </View>
            
            {userData.isOfficial && (
              <Text style={styles.officialBadge}>GlowCare 官方账号</Text>
            )}
            {userData.isProfessional && (
              <Text style={styles.professionalBadge}>认证心理咨询师</Text>
            )}
            
            {/* Bio */}
            <Text style={styles.bio}>{userData.bio}</Text>
            
            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{userData.posts}</Text>
                <Text style={styles.statLabel}>动态</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{userData.followers}</Text>
                <Text style={styles.statLabel}>粉丝</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{userData.following}</Text>
                <Text style={styles.statLabel}>关注</Text>
              </View>
            </View>
            
            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              {isOwnProfile ? (
                <TouchableOpacity style={styles.editButton}>
                  <Text style={styles.editButtonText}>编辑资料</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity style={styles.followButton}>
                    <Text style={styles.followButtonText}>+ 关注</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.messageButton}>
                    <Ionicons name="chatbubble-outline" size={16} color="#6366f1" />
                    <Text style={styles.messageButtonText}>私信</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'posts' && styles.activeTab]}
            onPress={() => setActiveTab('posts')}
          >
            <Ionicons 
              name="grid-outline" 
              size={20} 
              color={activeTab === 'posts' ? '#6366f1' : '#9ca3af'} 
            />
            <Text style={[
              styles.tabText,
              activeTab === 'posts' && styles.activeTabText
            ]}>
              动态
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'liked' && styles.activeTab]}
            onPress={() => setActiveTab('liked')}
          >
            <Ionicons 
              name="heart-outline" 
              size={20} 
              color={activeTab === 'liked' ? '#6366f1' : '#9ca3af'} 
            />
            <Text style={[
              styles.tabText,
              activeTab === 'liked' && styles.activeTabText
            ]}>
              点赞
            </Text>
          </TouchableOpacity>
        </View>

        {/* Posts Grid */}
        {activeTab === 'posts' && (
          <View style={styles.postsContainer}>
            {userData.userPosts.length > 0 ? (
              <View style={styles.masonryContainer}>
                {/* 左列 */}
                <View style={styles.column}>
                  {leftColumn.map((post) => (
                    <PostCard 
                      key={post.id} 
                      post={post} 
                      style={{ marginBottom: 12 }}
                    />
                  ))}
                </View>
                
                {/* 右列 */}
                <View style={styles.column}>
                  {rightColumn.map((post) => (
                    <PostCard 
                      key={post.id} 
                      post={post} 
                      style={{ marginBottom: 12 }}
                    />
                  ))}
                </View>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="camera-outline" size={48} color="#9ca3af" />
                <Text style={styles.emptyStateText}>还没有发布动态</Text>
              </View>
            )}
          </View>
        )}

        {/* Liked Posts */}
        {activeTab === 'liked' && (
          <View style={styles.emptyState}>
            <Ionicons name="heart-outline" size={48} color="#9ca3af" />
            <Text style={styles.emptyStateText}>还没有点赞的内容</Text>
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
  headerContainer: {
    position: 'relative',
    height: 200,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.3)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 50,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerActionButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    marginLeft: 8,
  },
  userInfoSection: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingBottom: 20,
    marginBottom: 8,
  },
  avatarContainer: {
    alignItems: 'center',
    marginTop: -40,
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  avatarText: {
    fontSize: 36,
  },
  userDetails: {
    alignItems: 'center',
  },
  userName: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  userNameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginRight: 8,
  },
  officialBadge: {
    fontSize: 12,
    color: '#6366f1',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 12,
  },
  professionalBadge: {
    fontSize: 12,
    color: '#059669',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 12,
  },
  bio: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    marginHorizontal: 20,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  followButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 12,
  },
  followButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  editButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  editButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  messageButtonText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#6366f1',
  },
  tabText: {
    fontSize: 14,
    color: '#9ca3af',
    marginLeft: 6,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#6366f1',
    fontWeight: '600',
  },
  postsContainer: {
    backgroundColor: 'white',
    paddingTop: 16,
    minHeight: 300,
  },
  masonryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  column: {
    flex: 1,
    paddingHorizontal: 6,
  },
  postCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  postImage: {
    width: '100%',
    height: 120,
  },
  postContent: {
    padding: 8,
  },
  postText: {
    fontSize: 12,
    color: '#374151',
    lineHeight: 16,
  },
  postBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  postStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postLikes: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  postTime: {
    fontSize: 10,
    color: '#9ca3af',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: 'white',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 12,
  },
});