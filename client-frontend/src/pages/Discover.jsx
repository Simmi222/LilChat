import React, { useState, useMemo, useEffect } from 'react'
import { Search, MapPin, UserPlus, MessageSquare, Loader } from 'lucide-react'
import { usersAPI } from '../services/api'
import { useUser } from '@clerk/react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

const Discover = () => {
  const navigate = useNavigate()
  const { user: clerkUser } = useUser()
  const [searchTerm, setSearchTerm] = useState('')
  const [allUsers, setAllUsers] = useState([])
  const [followedUsers, setFollowedUsers] = useState(new Set())
  const [loading, setLoading] = useState(true)

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await usersAPI.getAllUsers()
      const users = Array.isArray(response.data) ? response.data : []
      setAllUsers(users)
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return allUsers
    const search = searchTerm.toLowerCase()
    return allUsers.filter(user =>
      user.first_name?.toLowerCase().includes(search) ||
      user.last_name?.toLowerCase().includes(search) ||
      user.full_name?.toLowerCase().includes(search) ||
      user.username?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search) ||
      user.bio?.toLowerCase().includes(search) ||
      user.location?.toLowerCase().includes(search)
    )
  }, [searchTerm, allUsers])

  const toggleFollow = async (userId) => {
    if (!clerkUser?.id) { toast.error('Please login first'); return }
    try {
      const isFollowing = followedUsers.has(userId)
      if (isFollowing) {
        await usersAPI.unfollow(userId, clerkUser.id)
        setFollowedUsers(prev => { const s = new Set(prev); s.delete(userId); return s })
        toast.success('Unfollowed')
      } else {
        await usersAPI.follow(userId, clerkUser.id)
        setFollowedUsers(prev => new Set([...prev, userId]))
        toast.success('Followed!')
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Action failed')
    }
  }

  return (
    <div className='min-h-screen transition-colors duration-300' style={{ backgroundColor: 'var(--bg-primary)' }}>

      {/* Sticky Header */}
      <div
        className='sticky top-0 z-10 backdrop-blur-md border-b transition-colors duration-300'
        style={{
          backgroundColor: 'color-mix(in srgb, var(--bg-card) 85%, transparent)',
          borderColor: 'var(--border-color)'
        }}
      >
        <div className='max-w-7xl mx-auto px-6 py-6'>
          <h1 className='text-3xl font-bold mb-1' style={{ color: 'var(--text-primary)' }}>
            Discover People
          </h1>
          <p className='text-sm mb-5' style={{ color: 'var(--text-secondary)' }}>
            Connect with amazing people and grow your network
          </p>

          {/* Search Bar */}
          <div className='relative max-w-2xl'>
            <Search className='absolute left-4 top-1/2 -translate-y-1/2' size={18} style={{ color: 'var(--text-muted)' }} />
            <input
              type='text'
              placeholder='Search people...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='w-full pl-12 pr-4 py-3 rounded-xl outline-none transition text-sm'
              style={{
                backgroundColor: 'var(--bg-input)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
              }}
            />
          </div>
        </div>
      </div>

      {/* User Grid */}
      <div className='max-w-7xl mx-auto px-6 py-10'>
        {loading ? (
          <div className='flex items-center justify-center py-20'>
            <Loader className='w-8 h-8 animate-spin' style={{ color: 'var(--accent)' }} />
          </div>
        ) : filteredUsers.length > 0 ? (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'>
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className='rounded-2xl border overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg'
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-color)',
                  boxShadow: '0 2px 10px var(--shadow-color)'
                }}
              >
                {/* Cover gradient */}
                <div className='h-20 bg-gradient-to-r from-green-400 to-emerald-500' />

                <div className='px-5 pb-5'>
                  {/* Avatar */}
                  <div className='flex justify-center -mt-10 mb-3'>
                    <img
                      src={user.profile_picture || `https://ui-avatars.com/api/?name=${user.first_name}+${user.last_name}&background=16a34a&color=fff`}
                      alt={user.first_name}
                      className='w-20 h-20 rounded-full object-cover shadow-md'
                      style={{ border: '3px solid var(--bg-card)' }}
                    />
                  </div>

                  {/* Name */}
                  <div className='text-center mb-2'>
                    <h3 className='text-base font-bold' style={{ color: 'var(--text-primary)' }}>
                      {user.full_name || `${user.first_name} ${user.last_name}`.trim()}
                    </h3>
                    <p className='text-xs' style={{ color: 'var(--text-secondary)' }}>
                      @{user.username || user.email?.split('@')[0]}
                    </p>
                  </div>

                  {/* Bio */}
                  {user.bio && (
                    <p className='text-xs text-center mb-2 line-clamp-2' style={{ color: 'var(--text-secondary)' }}>
                      {user.bio}
                    </p>
                  )}

                  {/* Location */}
                  {user.location && (
                    <div className='flex justify-center items-center gap-1 text-xs mb-3' style={{ color: 'var(--text-muted)' }}>
                      <MapPin size={12} />
                      {user.location}
                    </div>
                  )}

                  {/* Stats */}
                  <div
                    className='flex justify-between text-center mb-4 py-3'
                    style={{ borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}
                  >
                    {[
                      { label: 'Followers', val: user.followers_count || 0 },
                      { label: 'Following', val: user.following_count || 0 },
                      { label: 'Posts',     val: user.posts_count || 0 },
                    ].map(({ label, val }) => (
                      <div key={label}>
                        <p className='font-bold text-sm' style={{ color: 'var(--text-primary)' }}>{val}</p>
                        <p className='text-[11px]' style={{ color: 'var(--text-muted)' }}>{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className='flex gap-2'>
                    <button
                      onClick={() => toggleFollow(user.id)}
                      className='flex-1 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-1 active:scale-95'
                      style={followedUsers.has(user.id)
                        ? { backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)' }
                        : { backgroundColor: 'var(--accent)', color: '#fff' }
                      }
                    >
                      <UserPlus size={13} />
                      {followedUsers.has(user.id) ? 'Following' : 'Follow'}
                    </button>
                    <button
                      onClick={() => navigate(`/messages/${user.id}`)}
                      className='flex-1 py-2 rounded-lg text-sm flex items-center justify-center gap-1 transition active:scale-95'
                      style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                    >
                      <MessageSquare size={13} />
                      Message
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className='text-center py-16'>
            <Search size={36} className='mx-auto mb-3 opacity-20' style={{ color: 'var(--text-muted)' }} />
            <h3 className='text-lg font-semibold' style={{ color: 'var(--text-primary)' }}>No people found</h3>
            <p className='text-sm' style={{ color: 'var(--text-muted)' }}>Try different keywords</p>
          </div>
        )}
      </div>

      {!loading && filteredUsers.length > 0 && (
        <div className='text-center pb-6 text-sm' style={{ color: 'var(--text-muted)' }}>
          Showing {filteredUsers.length} users
        </div>
      )}
    </div>
  )
}

export default Discover
