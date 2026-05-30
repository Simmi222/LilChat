import React, { useState, useEffect } from 'react'
import { Users, UserPlus, UserCheck, UserRoundPen, MessageSquare, Loader } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { useUser } from '@clerk/react'
import { usersAPI } from '../services/api'

const Connections = () => {
  const navigate  = useNavigate()
  const { user: clerkUser } = useUser()
  const [currentTab, setCurrentTab] = useState('Followers')
  const [loading, setLoading]       = useState(true)

  const [followersState,   setFollowersState]   = useState([])
  const [followingState,   setFollowingState]   = useState([])
  const [pendingState,     setPendingState]     = useState([])
  const [connectionsState, setConnectionsState] = useState([])

  const fetchData = async () => {
    if (!clerkUser?.id) return
    try {
      setLoading(true)
      const meRes = await usersAPI.getMe(clerkUser.id)
      const myId  = meRes.data.id

      const [follRes, followRes] = await Promise.all([
        usersAPI.getFollowers(myId),
        usersAPI.getFollowing(myId),
      ])

      const followers = Array.isArray(follRes.data)  ? follRes.data  : []
      const following = Array.isArray(followRes.data) ? followRes.data : []

      setFollowersState(followers)
      setFollowingState(following)

      const followingIds = new Set(following.map(u => u.id))
      setConnectionsState(followers.filter(u => followingIds.has(u.id)))
    } catch (err) {
      console.error('Connections fetch error:', err)
      toast.error('Failed to load connections')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [clerkUser?.id])

  const handleUnfollow = async (e, user) => {
    e.stopPropagation()
    try {
      await usersAPI.unfollow(user.id, clerkUser.id)
      setFollowingState(prev => prev.filter(u => u.id !== user.id))
      setConnectionsState(prev => prev.filter(u => u.id !== user.id))
      toast.success(`Unfollowed ${user.full_name}`)
    } catch {
      toast.error('Failed to unfollow')
    }
  }

  const handleViewProfile = (e, user) => {
    e.stopPropagation()
    navigate(`/profile/${user.id}`)
  }

  const dataArray = [
    { label: 'Followers',   value: followersState,   icon: Users },
    { label: 'Following',   value: followingState,   icon: UserCheck },
    { label: 'Connections', value: connectionsState, icon: UserPlus },
    { label: 'Pending',     value: pendingState,     icon: UserRoundPen },
  ]

  const currentData = dataArray.find(d => d.label === currentTab)?.value || []

  return (
    <div className='min-h-screen transition-colors duration-300' style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className='max-w-6xl mx-auto p-6'>

        {/* Title */}
        <div className='mb-8'>
          <h1 className='text-3xl font-bold mb-1' style={{ color: 'var(--text-primary)' }}>Connections</h1>
          <p className='text-sm' style={{ color: 'var(--text-secondary)' }}>Manage your connections and relationships</p>
        </div>

        {/* Tab Buttons */}
        <div className='mb-8 flex flex-wrap gap-3'>
          {dataArray.map((tab) => {
            const active = currentTab === tab.label
            return (
              <button
                key={tab.label}
                onClick={() => setCurrentTab(tab.label)}
                className='flex flex-col items-center justify-center gap-1 h-20 w-36 rounded-xl border transition-all duration-200 active:scale-95'
                style={{
                  backgroundColor: active ? 'var(--accent)' : 'var(--bg-card)',
                  borderColor: active ? 'var(--accent)' : 'var(--border-color)',
                  color: active ? '#fff' : 'var(--text-secondary)',
                  boxShadow: active ? '0 4px 14px rgba(34,197,94,0.3)' : '0 1px 6px var(--shadow-color)'
                }}
              >
                <tab.icon className='w-5 h-5' />
                <span className='text-sm font-medium'>{tab.label}</span>
                <span className='text-xs opacity-80'>{tab.value.length}</span>
              </button>
            )
          })}
        </div>

        {/* Users List */}
        {loading ? (
          <div className='flex justify-center py-16'>
            <Loader className='w-8 h-8 animate-spin' style={{ color: 'var(--accent)' }} />
          </div>
        ) : (
          <div className='grid md:grid-cols-2 gap-3'>
            {currentData.length === 0 ? (
              <p className='col-span-2 text-center py-12' style={{ color: 'var(--text-muted)' }}>
                No {currentTab.toLowerCase()} yet.
              </p>
            ) : (
              currentData.map((user) => (
                <div
                  key={user.id}
                  onClick={() => navigate(`/profile/${user.id}`)}
                  className='flex items-center justify-between gap-3 p-4 rounded-xl border transition-all duration-200 cursor-pointer hover:opacity-80'
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-color)',
                    boxShadow: '0 1px 6px var(--shadow-color)'
                  }}
                >
                  {/* Left — user info */}
                  <div className='flex items-center gap-3 flex-1 min-w-0'>
                    <img
                      src={user.profile_picture || `https://ui-avatars.com/api/?name=${user.first_name}+${user.last_name}&background=16a34a&color=fff`}
                      alt={user.full_name}
                      className='w-12 h-12 rounded-full object-cover flex-shrink-0'
                    />
                    <div className='min-w-0'>
                      <p className='font-medium truncate text-sm' style={{ color: 'var(--text-primary)' }}>
                        {user.full_name || `${user.first_name} ${user.last_name}`.trim()}
                      </p>
                      <p className='text-xs truncate' style={{ color: 'var(--text-secondary)' }}>
                        @{user.username || user.email?.split('@')[0]}
                      </p>
                      {user.bio && (
                        <p className='text-xs truncate mt-0.5' style={{ color: 'var(--text-muted)' }}>
                          {user.bio.slice(0, 40)}…
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right — action buttons */}
                  <div className='flex items-center gap-2 flex-shrink-0'>
                    <button
                      onClick={(e) => handleViewProfile(e, user)}
                      className='px-3 py-1.5 text-xs text-white rounded-lg transition active:scale-95'
                      style={{ backgroundColor: 'var(--accent)' }}
                    >
                      Profile
                    </button>

                    {currentTab === 'Following' && (
                      <button
                        onClick={(e) => handleUnfollow(e, user)}
                        className='px-3 py-1.5 text-xs rounded-lg transition active:scale-95 hover:bg-red-100 hover:text-red-600'
                        style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                      >
                        Unfollow
                      </button>
                    )}

                    {currentTab === 'Connections' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/messages/${user.id}`) }}
                        className='px-3 py-1.5 text-xs rounded-lg transition flex items-center gap-1 active:scale-95'
                        style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                      >
                        <MessageSquare className='w-3 h-3' /> Message
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Connections