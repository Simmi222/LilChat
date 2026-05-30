import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/react'
import UserProfileInfo from '../components/UserProfileInfo'
import PostCard from '../components/Postcard'
import Loading from '../components/Loading'
import ProfileModal from '../components/ProfileModal'
import axios from 'axios'
import toast from 'react-hot-toast'
import { usersAPI } from '../services/api'
import { Loader, BadgeCheck } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api'

/* ── Simple inline user row ── */
const UserListItem = ({ u }) => {
  const navigate = useNavigate()
  return (
    <div
      onClick={() => navigate(`/profile/${u.id}`)}
      className='flex items-center gap-3 py-3 px-1 cursor-pointer rounded-xl transition-colors duration-150'
      style={{ borderBottom: '1px solid var(--border-color)' }}
      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-input)'}
      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
    >
      <img
        src={u.profile_picture || `https://ui-avatars.com/api/?name=${u.first_name}+${u.last_name}&background=16a34a&color=fff&size=80`}
        alt={u.full_name || u.first_name}
        className='w-11 h-11 rounded-full object-cover flex-shrink-0'
        style={{ border: '2px solid var(--border-color)' }}
      />
      <div className='min-w-0 flex-1'>
        <div className='flex items-center gap-1'>
          <span className='font-semibold text-sm' style={{ color: 'var(--text-primary)' }}>
            {u.full_name || `${u.first_name} ${u.last_name}`.trim()}
          </span>
          <BadgeCheck className='w-3.5 h-3.5 text-green-500 flex-shrink-0' />
        </div>
        <p className='text-xs' style={{ color: 'var(--text-muted)' }}>
          @{u.username || u.email?.split('@')[0]}
        </p>
      </div>
    </div>
  )
}

const Profile = () => {
  const { user: clerkUser } = useUser()
  const { profileId } = useParams()

  const [user, setUser]         = useState(null)
  const [posts, setPosts]       = useState([])
  const [showEdit, setShowEdit] = useState(false)
  const [loading, setLoading]   = useState(true)

  // 'posts' | 'followers' | 'following'
  const [section, setSection]         = useState('posts')
  const [followList, setFollowList]   = useState([])
  const [followLoading, setFollowLoading] = useState(false)

  const fetchUser = async () => {
    try {
      setLoading(true)
      let userResponse

      if (profileId) {
        userResponse = await axios.get(`${API_BASE}/users/${profileId}/`)
      } else if (clerkUser?.id) {
        try {
          userResponse = await axios.post(`${API_BASE}/users/sync/`, {
            clerk_id: clerkUser.id,
            email: clerkUser.primaryEmailAddress?.emailAddress,
            first_name: clerkUser.firstName || '',
            last_name: clerkUser.lastName || ''
          })
        } catch (e) {
          const usersResponse = await axios.get(`${API_BASE}/users/?clerk_id=${clerkUser.id}`)
          if (usersResponse.data?.length > 0) {
            userResponse = { data: usersResponse.data[0] }
          }
        }
      }

      if (!userResponse?.data) { toast.error('User not found'); return }

      setUser(userResponse.data)
      const userId = userResponse.data.id
      const postsResponse = await axios.get(`${API_BASE}/posts/?user=${userId}`)
      setPosts(postsResponse.data || [])
    } catch (error) {
      console.error('Error fetching user:', error)
      toast.error('Failed to load user profile')
    } finally {
      setLoading(false)
    }
  }

  // Called by UserProfileInfo when Followers/Following is clicked
  const handleStatClick = async (type) => {
    if (type === 'posts') { setSection('posts'); return }
    setSection(type)
    setFollowLoading(true)
    try {
      const res = type === 'followers'
        ? await usersAPI.getFollowers(user.id)
        : await usersAPI.getFollowing(user.id)
      setFollowList(Array.isArray(res.data) ? res.data : [])
    } catch {
      toast.error(`Could not load ${type}`)
    } finally {
      setFollowLoading(false)
    }
  }

  useEffect(() => { fetchUser() }, [profileId, clerkUser])
  // Reset to posts when profile changes
  useEffect(() => { setSection('posts') }, [profileId])

  if (loading) return <Loading />

  return user ? (
    <div
      className='relative h-full overflow-y-scroll no-scrollbar p-6 transition-colors duration-300'
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <div className='max-w-3xl mx-auto'>

        {/* Profile Card */}
        <div
          className='rounded-2xl border transition-colors duration-300'
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-color)',
            boxShadow: '0 2px 12px var(--shadow-color)'
          }}
        >
          {/* Cover photo */}
          <div className='h-40 md:h-52 bg-gradient-to-r from-green-300 via-emerald-400 to-green-400 rounded-t-2xl overflow-hidden'>
            {user.cover_photo && (
              <img src={user.cover_photo} alt='cover' className='w-full h-full object-cover' />
            )}
          </div>

          {/* User info */}
          <UserProfileInfo
            user={user}
            posts={posts}
            profileId={profileId}
            setShowEdit={setShowEdit}
            onProfileUpdate={fetchUser}
            onStatClick={handleStatClick}
            activeSection={section}
          />
        </div>

        {/* ── Content below profile card ── */}
        <div className='mt-6'>

          {/* Posts */}
          {section === 'posts' && (
            <div className='flex flex-col items-center gap-6'>
              {posts?.length > 0
                ? posts.map(post => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onPostDeleted={id => setPosts(prev => prev.filter(p => p.id !== id))}
                    />
                  ))
                : <p className='py-10 text-sm' style={{ color: 'var(--text-muted)' }}>No posts yet</p>
              }
            </div>
          )}

          {/* Followers / Following inline list */}
          {(section === 'followers' || section === 'following') && (
            <div
              className='rounded-2xl border p-4 transition-colors duration-300'
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-color)',
                boxShadow: '0 2px 12px var(--shadow-color)'
              }}
            >
              {/* Back to posts link */}
              <button
                onClick={() => setSection('posts')}
                className='text-xs mb-4 flex items-center gap-1 transition hover:opacity-70'
                style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                ← Back to posts
              </button>

              <h3 className='font-bold text-base mb-4' style={{ color: 'var(--text-primary)' }}>
                {section === 'followers' ? 'Followers' : 'Following'}
                {!followLoading && (
                  <span className='ml-2 text-sm font-normal' style={{ color: 'var(--text-muted)' }}>
                    {followList.length}
                  </span>
                )}
              </h3>

              {followLoading ? (
                <div className='flex justify-center py-10'>
                  <Loader className='w-6 h-6 animate-spin' style={{ color: 'var(--accent)' }} />
                </div>
              ) : followList.length === 0 ? (
                <p className='text-sm py-8 text-center' style={{ color: 'var(--text-muted)' }}>
                  {section === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
                </p>
              ) : (
                <div>
                  {followList.map(u => <UserListItem key={u.id} u={u} />)}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEdit && (
        <ProfileModal
          user={user}
          setShowEdit={setShowEdit}
          onProfileUpdate={fetchUser}
          clerkId={clerkUser?.id}
        />
      )}
    </div>
  ) : (
    <Loading />
  )
}

export default Profile