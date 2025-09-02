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
  FlatList,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

// Only import ImagePicker on native platforms
let ImagePicker;
if (Platform.OS !== 'web') {
  try {
    ImagePicker = require('expo-image-picker');
  } catch (e) {
    console.log('ImagePicker not available on this platform');
  }
}

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2; // 两列卡片，考虑边距
const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const API_BASE = `${EXPO_PUBLIC_BACKEND_URL}/api`;

// Mock user ID for demo
const DEMO_USER_ID = 'demo-user-123';

// Current user data
const currentUser = {
  id: 'me',
  name: '我',
  avatar: '😊',
  verified: false,
  posts: 12,
  followers: 45,
  following: 67,
  bio: '热爱生活，关注心理健康 ✨'
};

// Mock social feed data with varied heights like Xiaohongshu
const mockPosts = [
  {
    id: '1',
    user: {
      id: 'user1',
      name: '小雨',
      avatar: '😊',
      verified: false,
      posts: 23,
      followers: 156,
      following: 89
    },
    content: '今天终于克服了社交焦虑，和同事一起吃午饭了！小小的进步也值得庆祝 🎉\n\n分享一些我学到的小技巧：\n1. 深呼吸放松\n2. 提前准备话题\n3. 记住每个人都有紧张的时候',
    emotion: 'happy',
    intensity: 8,
    timestamp: '2小时前',
    likes: 24,
    comments: 8,
    isLiked: false,
    images: ['https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=300&h=400&fit=crop'],
    tags: ['社交焦虑', '小进步', '自信'],
    cardHeight: 380  // 较高的卡片
  },
  {
    id: '2',
    user: {
      id: 'official',
      name: '心理小助手',
      avatar: '🌟',
      verified: true,
      isOfficial: true,
      posts: 1240,
      followers: 12500,
      following: 0
    },
    content: '💙 每日正念提醒\n\n深呼吸，专注当下。你的感受是有效的，给自己一些温柔。',
    emotion: 'peaceful',
    timestamp: '4小时前',
    likes: 156,
    comments: 32,
    isLiked: true,
    images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=250&fit=crop'],
    tags: ['每日提醒', '正念', '自我关爱'],
    cardHeight: 280  // 中等高度
  },
  {
    id: '3',
    user: {
      id: 'user2',
      name: '阳光',
      avatar: '🌸',
      verified: false,
      posts: 67,
      followers: 234,
      following: 156
    },
    content: '分享我的情绪日记模板 📝 记录一个月后发现了很多有趣的模式',
    emotion: 'satisfied',
    intensity: 7,
    timestamp: '6小时前',
    likes: 43,
    comments: 15,
    isLiked: false,
    images: ['https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=300&h=320&fit=crop'],
    tags: ['情绪日记', '自我发现'],
    cardHeight: 320  // 中等偏高
  },
  {
    id: '4',
    user: {
      id: 'user3',
      name: '勇敢的心',
      avatar: '💪',
      verified: false,
      posts: 45,
      followers: 189,
      following: 201
    },
    content: '今天的瑜伽课让我感到前所未有的平静 🧘‍♀️ 身心连接真的很奇妙',
    emotion: 'peaceful',
    intensity: 9,
    timestamp: '8小时前',
    likes: 67,
    comments: 21,
    isLiked: true,
    images: ['https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=300&h=220&fit=crop'],
    tags: ['瑜伽', '正念', '身心健康'],
    cardHeight: 250  // 较矮的卡片
  },
  {
    id: '5',
    user: {
      id: 'doctor1',
      name: '李心理医生',
      avatar: '👨‍⚕️',
      verified: true,
      isProfessional: true,
      posts: 456,
      followers: 8900,
      following: 23
    },
    content: '关于焦虑管理的5个实用技巧 📚\n\n1. 腹式呼吸 - 4秒吸气，6秒呼气\n2. 渐进性肌肉放松 - 从头到脚逐步放松\n3. 认知重构 - 挑战负面想法\n4. 正念冥想 - 专注当下时刻\n5. 适度运动 - 每天至少30分钟\n\n记住，练习是关键！',
    emotion: 'educational',
    timestamp: '12小时前',
    likes: 198,
    comments: 45,
    isLiked: false,
    images: ['https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=300&h=360&fit=crop'],
    tags: ['专业建议', '焦虑管理', '心理技巧'],
    cardHeight: 420  // 最高的卡片
  },
  {
    id: '6',
    user: {
      id: 'user4',
      name: '晴天',
      avatar: '☀️',
      verified: false,
      posts: 78,
      followers: 312,
      following: 145
    },
    content: '和朋友聊天后心情好了很多 💕 有时候说出来真的会轻松很多',
    emotion: 'grateful',
    intensity: 8,
    timestamp: '1天前',
    likes: 89,
    comments: 12,
    isLiked: false,
    images: ['https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=300&h=190&fit=crop'],
    tags: ['友谊', '分享', '感恩'],
    cardHeight: 220  // 最矮的卡片
  },
  {
    id: '7',
    user: {
      id: 'user5',
      name: '心灵花园',
      avatar: '🌺',
      verified: false,
      posts: 89,
      followers: 445,
      following: 123
    },
    content: '今天学会了一个新的呼吸技巧，感觉整个人都平静了下来。想和大家分享这种美好的感受 ✨',
    emotion: 'peaceful',
    intensity: 8,
    timestamp: '1天前',
    likes: 56,
    comments: 18,
    isLiked: false,
    images: ['https://images.unsplash.com/photo-1518611012118-696072aa579a?w=300&h=280&fit=crop'],
    tags: ['呼吸练习', '内心平静'],
    cardHeight: 290
  }
];

export default function SocialFeedScreen() {
  const [posts, setPosts] = useState(mockPosts);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewPost, setShowNewPost] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPostText, setNewPostText] = useState('');
  const [selectedEmotion, setSelectedEmotion] = useState(null);
  const [selectedImages, setSelectedImages] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);

  const emotions = [
    { id: 'happy', name: '开心', emoji: '😊', color: '#22c55e' },
    { id: 'sad', name: '难过', emoji: '😢', color: '#6b7280' },
    { id: 'anxious', name: '焦虑', emoji: '😰', color: '#f59e0b' },
    { id: 'peaceful', name: '平静', emoji: '😌', color: '#06b6d4' },
    { id: 'excited', name: '兴奋', emoji: '🤩', color: '#8b5cf6' },
    { id: 'grateful', name: '感恩', emoji: '🙏', color: '#ec4899' },
  ];

  useEffect(() => {
    requestMediaPermissions();
  }, []);

  const requestMediaPermissions = async () => {
    if (Platform.OS !== 'web' && ImagePicker) {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('权限需要', '需要访问相册权限来上传图片');
      }
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
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

  const openUserProfile = (user) => {
    setSelectedUser(user);
    setShowUserProfile(true);
  };

  const openMyProfile = () => {
    setSelectedUser(currentUser);
    setShowUserProfile(true);
  };

  const pickImages = async () => {
    if (Platform.OS === 'web' || !ImagePicker) {
      Alert.alert('提示', '此功能在移动设备上可用');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.7,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets) {
        const imageUris = result.assets.map(asset => asset.uri);
        setSelectedImages([...selectedImages, ...imageUris.slice(0, 9 - selectedImages.length)]);
      }
    } catch (error) {
      console.log('Error picking images:', error);
      Alert.alert('提示', '图片选择失败');
    }
  };

  const pickVideo = async () => {
    if (Platform.OS === 'web' || !ImagePicker) {
      Alert.alert('提示', '此功能在移动设备上可用');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setSelectedVideo(result.assets[0].uri);
      }
    } catch (error) {
      console.log('Error picking video:', error);
      Alert.alert('提示', '视频选择失败');
    }
  };

  const removeImage = (index) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    setSelectedImages(newImages);
  };

  const removeVideo = () => {
    setSelectedVideo(null);
  };

  const publishPost = () => {
    if (!newPostText.trim() || !selectedEmotion) {
      Alert.alert('提示', '请输入内容并选择当前心情');
      return;
    }

    const newPost = {
      id: Date.now().toString(),
      user: currentUser,
      content: newPostText,
      emotion: selectedEmotion.id,
      intensity: 7,
      timestamp: '刚刚',
      likes: 0,
      comments: 0,
      isLiked: false,
      images: selectedImages,
      video: selectedVideo,
      tags: [],
      cardHeight: 240 + (selectedImages.length > 0 ? 120 : 0) + (selectedVideo ? 150 : 0)
    };

    setPosts([newPost, ...posts]);
    setNewPostText('');
    setSelectedEmotion(null);
    setSelectedImages([]);
    setSelectedVideo(null);
    setShowNewPost(false);
    Alert.alert('成功', '动态发布成功！');
  };

  // 优化瀑布流算法 - 使用实际卡片高度
  const formatPostsForMasonry = (posts) => {
    const leftColumn = [];
    const rightColumn = [];
    let leftHeight = 0;
    let rightHeight = 0;

    posts.forEach((post, index) => {
      const cardHeight = post.cardHeight || 280;
      
      if (leftHeight <= rightHeight) {
        leftColumn.push({ ...post, columnIndex: 0 });
        leftHeight += cardHeight + 12; // 加上margin
      } else {
        rightColumn.push({ ...post, columnIndex: 1 });
        rightHeight += cardHeight + 12;
      }
    });

    return { leftColumn, rightColumn };
  };

  const { leftColumn, rightColumn } = formatPostsForMasonry(posts);

  const PostCard = ({ post, style }) => (
    <TouchableOpacity 
      style={[styles.postCard, { minHeight: post.cardHeight || 280 }, style]} 
      activeOpacity={0.95}
    >
      {/* 封面图片或视频 */}
      {post.images && post.images.length > 0 && (
        <View style={styles.mediaContainer}>
          <Image source={{ uri: post.images[0] }} style={styles.postImage} resizeMode="cover" />
          {post.images.length > 1 && (
            <View style={styles.imageCountBadge}>
              <Ionicons name="images" size={12} color="white" />
              <Text style={styles.imageCountText}>{post.images.length}</Text>
            </View>
          )}
        </View>
      )}
      
      {post.video && (
        <View style={styles.mediaContainer}>
          <View style={styles.videoPlaceholder}>
            <Ionicons name="play-circle" size={40} color="white" />
          </View>
        </View>
      )}
      
      {/* 内容 */}
      <View style={styles.postContent}>
        <Text style={styles.postText} numberOfLines={4}>
          {post.content}
        </Text>
        
        {/* 标签 */}
        {post.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {post.tags.slice(0, 2).map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      
      {/* 底部信息 */}
      <View style={styles.postBottom}>
        <TouchableOpacity 
          style={styles.userRow}
          onPress={() => openUserProfile(post.user)}
          activeOpacity={0.7}
        >
          <View style={styles.miniAvatar}>
            <Text style={styles.miniAvatarText}>{post.user.avatar}</Text>
          </View>
          <Text style={styles.userName}>{post.user.name}</Text>
          {post.user.verified && (
            <Ionicons 
              name="checkmark-circle" 
              size={12} 
              color={post.user.isOfficial ? '#6366f1' : post.user.isProfessional ? '#059669' : '#22c55e'} 
            />
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.likeButton}
          onPress={() => toggleLike(post.id)}
        >
          <Ionicons 
            name={post.isLiked ? "heart" : "heart-outline"} 
            size={16} 
            color={post.isLiked ? "#ef4444" : "#6b7280"} 
          />
          <Text style={[styles.likeText, post.isLiked && styles.likedText]}>
            {post.likes}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const UserProfileModal = () => {
    if (!showUserProfile || !selectedUser) return null;
    
    return (
      <View style={styles.modalOverlay}>
        <View style={styles.profileModal}>
          <View style={styles.profileHeader}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowUserProfile(false)}
            >
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.profileInfo}>
            <TouchableOpacity style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>{selectedUser.avatar}</Text>
            </TouchableOpacity>
            
            <View style={styles.profileDetails}>
              <View style={styles.profileName}>
                <Text style={styles.profileNameText}>{selectedUser.name}</Text>
                {selectedUser.verified && (
                  <Ionicons 
                    name="checkmark-circle" 
                    size={20} 
                    color={selectedUser.isOfficial ? '#6366f1' : selectedUser.isProfessional ? '#059669' : '#22c55e'} 
                  />
                )}
              </View>
              
              {selectedUser.bio && (
                <Text style={styles.profileBio}>{selectedUser.bio}</Text>
              )}
              
              {selectedUser.isOfficial && (
                <Text style={styles.officialBadge}>GlowCare 官方账号</Text>
              )}
              {selectedUser.isProfessional && (
                <Text style={styles.professionalBadge}>认证心理咨询师</Text>
              )}
              
              <View style={styles.profileStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{selectedUser.posts}</Text>
                  <Text style={styles.statLabel}>动态</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{selectedUser.followers}</Text>
                  <Text style={styles.statLabel}>粉丝</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{selectedUser.following}</Text>
                  <Text style={styles.statLabel}>关注</Text>
                </View>
              </View>
              
              <View style={styles.profileActions}>
                {selectedUser.id === 'me' ? (
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
        </View>
      </View>
    );
  };

  const NewPostModal = () => {
    if (!showNewPost) return null;

    return (
      <View style={styles.modalOverlay}>
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
          
          <ScrollView showsVerticalScrollIndicator={false}>
            <TextInput
              style={styles.newPostInput}
              value={newPostText}
              onChangeText={setNewPostText}
              placeholder="分享你的心情、想法或经验..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            
            {/* 媒体预览 */}
            {(selectedImages.length > 0 || selectedVideo) && (
              <View style={styles.mediaPreview}>
                {/* 图片预览 */}
                {selectedImages.length > 0 && (
                  <View style={styles.imagesPreview}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {selectedImages.map((uri, index) => (
                        <View key={index} style={styles.imagePreviewContainer}>
                          <Image source={{ uri }} style={styles.imagePreview} />
                          <TouchableOpacity
                            style={styles.removeImageButton}
                            onPress={() => removeImage(index)}
                          >
                            <Ionicons name="close-circle" size={20} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}
                
                {/* 视频预览 */}
                {selectedVideo && (
                  <View style={styles.videoPreview}>
                    <View style={styles.videoPlaceholder}>
                      <Ionicons name="play-circle" size={30} color="#6366f1" />
                      <Text style={styles.videoText}>视频已选择</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.removeVideoButton}
                      onPress={removeVideo}
                    >
                      <Ionicons name="close-circle" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
            
            {/* 媒体选择按钮 */}
            <View style={styles.mediaButtons}>
              <TouchableOpacity style={styles.mediaButton} onPress={pickImages}>
                <Ionicons name="image-outline" size={20} color="#6366f1" />
                <Text style={styles.mediaButtonText}>图片</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.mediaButton} onPress={pickVideo}>
                <Ionicons name="videocam-outline" size={20} color="#6366f1" />
                <Text style={styles.mediaButtonText}>视频</Text>
              </TouchableOpacity>
            </View>
            
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
          </ScrollView>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="auto" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.profileAvatarButton}
          onPress={openMyProfile}
        >
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>{currentUser.avatar}</Text>
          </View>
          <Text style={styles.headerUsername}>{currentUser.name}</Text>
        </TouchableOpacity>
        
        <Text style={styles.title}>心理社区</Text>
        
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.searchButton}>
            <Ionicons name="search-outline" size={22} color="#6b7280" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.newPostButton}
            onPress={() => setShowNewPost(true)}
          >
            <Ionicons name="add-outline" size={24} color="#6366f1" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 双列瀑布流 */}
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* 社区提示 */}
        <View style={styles.communityTip}>
          <Ionicons name="heart" size={16} color="#ef4444" />
          <Text style={styles.communityTipText}>在这里分享你的心情，获得温暖支持</Text>
        </View>

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
      </ScrollView>

      {/* Modals */}
      <NewPostModal />
      <UserProfileModal />
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
  profileAvatarButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  headerAvatarText: {
    fontSize: 16,
  },
  headerUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchButton: {
    padding: 8,
    marginRight: 8,
  },
  newPostButton: {
    padding: 8,
  },
  communityTip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#fef2f2',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 8,
  },
  communityTipText: {
    fontSize: 14,
    color: '#dc2626',
    marginLeft: 6,
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
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  mediaContainer: {
    position: 'relative',
  },
  postImage: {
    width: '100%',
    height: 120,
  },
  imageCountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageCountText: {
    color: 'white',
    fontSize: 12,
    marginLeft: 4,
  },
  videoPlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postContent: {
    padding: 12,
  },
  postText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#f0f9ff',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 4,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 10,
    color: '#1e40af',
    fontWeight: '500',
  },
  postBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    paddingTop: 0,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  miniAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  miniAvatarText: {
    fontSize: 12,
  },
  userName: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    marginRight: 4,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  likeText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  likedText: {
    color: '#ef4444',
  },
  // 模态框样式
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  newPostModal: {
    backgroundColor: 'white',
    width: width - 32,
    borderRadius: 12,
    maxHeight: 600,
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
  mediaPreview: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  imagesPreview: {
    marginBottom: 12,
  },
  imagePreviewContainer: {
    position: 'relative',
    marginRight: 12,
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  videoPreview: {
    position: 'relative',
    alignItems: 'center',
  },
  videoText: {
    fontSize: 12,
    color: '#6366f1',
    marginTop: 4,
  },
  removeVideoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  mediaButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  mediaButtonText: {
    fontSize: 14,
    color: '#6366f1',
    marginLeft: 6,
    fontWeight: '500',
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
  // 个人主页样式
  profileModal: {
    backgroundColor: 'white',
    width: width - 32,
    borderRadius: 16,
    padding: 24,
  },
  profileHeader: {
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  closeButton: {
    padding: 4,
  },
  profileInfo: {
    alignItems: 'center',
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  profileAvatarText: {
    fontSize: 36,
  },
  profileDetails: {
    alignItems: 'center',
    width: '100%',
  },
  profileName: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  profileNameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginRight: 8,
  },
  profileBio: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 12,
  },
  officialBadge: {
    fontSize: 14,
    color: '#6366f1',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 16,
  },
  professionalBadge: {
    fontSize: 14,
    color: '#059669',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 16,
  },
  profileStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f3f4f6',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  profileActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  followButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 12,
  },
  followButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  editButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  editButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  messageButtonText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
});