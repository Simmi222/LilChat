import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api'

const api = axios.create({
  baseURL: API_BASE,
})

// Users API
export const usersAPI = {
  getMe: (clerkId) => api.get('/users/me/', { params: clerkId ? { clerk_id: clerkId } : {} }),
  getUser: (userId) => api.get(`/users/${userId}/`),
  getAllUsers: () => api.get('/users/'),
  updateMe: (data, clerkId) => api.put('/users/me/', { ...data, clerk_id: clerkId }),
  sync: (clerkData) => api.post('/users/sync/', clerkData),
  follow: (userId, clerkId) => api.post(`/users/${userId}/follow/`, { clerk_id: clerkId }),
  unfollow: (userId, clerkId) => api.post(`/users/${userId}/unfollow/`, { clerk_id: clerkId }),
  getFollowers: (userId) => api.get(`/users/${userId}/followers/`),
  getFollowing: (userId) => api.get(`/users/${userId}/following_list/`),
  isFollowing: (userId, clerkId) => api.get(`/users/${userId}/is_following/`, { params: { clerk_id: clerkId } }),
}

export const postsAPI = {
  getPosts: (params) => api.get('/posts/', { params }),
  getPost: (postId) => api.get(`/posts/${postId}/`),
  createPost: (data) => api.post('/posts/', data),
  updatePost: (postId, data) => api.put(`/posts/${postId}/`, data),
  deletePost: (postId, clerkId) => api.delete(`/posts/${postId}/delete_post/`, { params: { clerk_id: clerkId } }),
  likePost: (postId, clerkId) => api.post(`/posts/${postId}/like/`, { clerk_id: clerkId }),
  unlikePost: (postId, clerkId) => api.post(`/posts/${postId}/unlike/`, { clerk_id: clerkId }),
  getFeed: () => api.get('/posts/feed/'),
  getComments: (postId) => api.get(`/posts/${postId}/comments/`),
  createComment: (postId, content, clerkId) => api.post(`/posts/${postId}/comments/create/`, { content, clerk_id: clerkId }),
  deleteComment: (postId, commentId, clerkId) => api.delete(`/posts/${postId}/delete_comment/${commentId}/`, { params: { clerk_id: clerkId } }),
}

// Chat API
export const chatsAPI = {
  getConversations: (clerkId) =>
    api.get('/chats/conversations/', { params: clerkId ? { clerk_id: clerkId } : {} }),
  getMessages: (userId, clerkId) =>
    api.get('/chats/with_user/', { params: { user_id: userId, ...(clerkId ? { clerk_id: clerkId } : {}) } }),
  // Legacy alias
  getChatsWithUser: (userId, clerkId) =>
    api.get('/chats/with_user/', { params: { user_id: userId, ...(clerkId ? { clerk_id: clerkId } : {}) } }),
  sendMessage: (data) => api.post('/chats/', data),
  sendChat: (data) => api.post('/chats/', data),
  getUnreadCount: (clerkId) =>
    api.get('/chats/unread_count/', { params: clerkId ? { clerk_id: clerkId } : {} }),
}

// Stories API
export const storiesAPI = {
  getStories: () => api.get('/stories/'),
  getFollowingStories: (clerkId) => api.get('/stories/following/', { params: clerkId ? { clerk_id: clerkId } : {} }),
  createStory: (data) => {
    // Handle FormData (for file uploads) and JSON (for backward compatibility)
    if (data instanceof FormData) {
      return api.post('/stories/', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    }
    return api.post('/stories/', data)
  },
  viewStory: (storyId) => api.post(`/stories/${storyId}/view/`),
  deleteStory: (storyId, clerkId) => api.delete(`/stories/${storyId}/`, { params: { clerk_id: clerkId } }),
}

// Connections API
export const connectionsAPI = {
  getConnections: () => api.get('/connections/'),
  sendRequest: (data) => api.post('/connections/send-request/', data),
  acceptRequest: (connectionId) => api.post(`/connections/${connectionId}/accept/`),
  rejectRequest: (connectionId) => api.post(`/connections/${connectionId}/reject/`),
  getPending: () => api.get('/connections/pending/'),
  getAccepted: () => api.get('/connections/accepted/'),
}

export default api
