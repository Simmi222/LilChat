import { Calendar, MapPin, PenBox, Verified, UserPlus, UserCheck, MessageSquare, Loader } from 'lucide-react'
import React, { useState, useEffect } from 'react'
import moment from 'moment'
import { useUser } from '@clerk/react'
import { useNavigate } from 'react-router-dom'
import { usersAPI } from '../services/api'
import toast from 'react-hot-toast'

const UserProfileInfo = ({ user, posts, profileId, setShowEdit, onProfileUpdate, onStatClick, activeSection }) => {
  const { user: clerkUser } = useUser()
  const navigate = useNavigate()
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [followerCount, setFollowerCount] = useState(user.followers_count || 0)

  useEffect(() => {
    if (profileId && clerkUser?.id) {
      usersAPI.isFollowing(profileId, clerkUser.id)
        .then(res => setIsFollowing(res.data.is_following))
        .catch(() => {})
    }
  }, [profileId, clerkUser?.id])

  const handleFollowToggle = async () => {
    if (!clerkUser?.id) { toast.error('Login required'); return }
    try {
      setFollowLoading(true)
      if (isFollowing) {
        await usersAPI.unfollow(user.id, clerkUser.id)
        setIsFollowing(false)
        setFollowerCount(prev => Math.max(0, prev - 1))
        toast.success(`Unfollowed ${user.full_name || user.first_name}`)
      } else {
        await usersAPI.follow(user.id, clerkUser.id)
        setIsFollowing(true)
        setFollowerCount(prev => prev + 1)
        toast.success(`Following ${user.full_name || user.first_name}!`)
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action failed')
    } finally {
      setFollowLoading(false)
    }
  }

  const isOwnProfile = !profileId

  const stats = [
    { label: 'Posts',     val: user.posts_count || 0,    key: 'posts' },
    { label: 'Followers', val: followerCount,              key: 'followers' },
    { label: 'Following', val: user.following_count || 0, key: 'following' },
  ]

  return (
    <div
      className='relative py-4 px-6 md:px-8 rounded-b-2xl transition-colors duration-300'
      style={{ backgroundColor: 'var(--bg-card)' }}
    >
      <div className='flex flex-col md:flex-row items-start gap-6'>

        {/* Profile Picture */}
        <div
          className='w-32 h-32 absolute -top-16 rounded-full overflow-hidden flex-shrink-0'
          style={{ border: '4px solid var(--bg-card)', boxShadow: '0 4px 12px var(--shadow-color)' }}
        >
          <img
            src={user.profile_picture || `https://ui-avatars.com/api/?name=${user.first_name}+${user.last_name}&background=16a34a&color=fff&size=128`}
            alt={user.first_name}
            className='w-full h-full object-cover rounded-full'
          />
        </div>

        <div className='w-full pt-16 md:pt-0 md:pl-36'>
          <div className='flex flex-col space-y-4'>

            {/* Name + Action Buttons */}
            <div className='flex flex-col md:flex-row items-start justify-between gap-4'>
              <div>
                <div className='flex items-center gap-3'>
                  <h1 className='text-2xl md:text-3xl font-bold' style={{ color: 'var(--text-primary)' }}>
                    {user.full_name || `${user.first_name} ${user.last_name}`.trim()}
                  </h1>
                  {user.is_verified && <Verified className='w-6 h-6 text-green-500' />}
                </div>
                <p className='text-sm mt-1' style={{ color: 'var(--text-secondary)' }}>
                  @{user.username || user.email?.split('@')[0]}
                </p>
              </div>

              {/* Edit / Follow + Message buttons */}
              <div className='flex items-center gap-2 mt-4 md:mt-0'>
                {isOwnProfile ? (
                  <button
                    onClick={() => setShowEdit(true)}
                    className='flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all border active:scale-95'
                    style={{
                      backgroundColor: 'var(--bg-input)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <PenBox className='w-4 h-4' />
                    Edit Profile
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleFollowToggle}
                      disabled={followLoading}
                      className='flex items-center gap-2 px-5 py-2 rounded-lg font-medium text-sm transition-all active:scale-95 disabled:opacity-60'
                      style={isFollowing
                        ? { backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }
                        : { backgroundColor: 'var(--accent)', color: '#fff' }
                      }
                    >
                      {followLoading
                        ? <Loader className='w-4 h-4 animate-spin' />
                        : isFollowing
                          ? <><UserCheck className='w-4 h-4' /> Following</>
                          : <><UserPlus className='w-4 h-4' /> Follow</>
                      }
                    </button>
                    <button
                      onClick={() => navigate(`/messages/${user.id}`)}
                      className='flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all active:scale-95'
                      style={{
                        backgroundColor: 'var(--bg-input)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)'
                      }}
                    >
                      <MessageSquare className='w-4 h-4' />
                      Message
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Bio */}
            <p className='text-sm max-w-2xl leading-relaxed' style={{ color: 'var(--text-secondary)' }}>
              {user.bio || 'No bio added yet'}
            </p>

            {/* Location + Joined */}
            <div className='flex flex-col md:flex-row gap-5 text-sm' style={{ color: 'var(--text-secondary)' }}>
              <span className='flex items-center gap-2'>
                <MapPin className='w-4 h-4 text-green-500 flex-shrink-0' />
                {user.location || 'Add a location'}
              </span>
              <span className='flex items-center gap-2'>
                <Calendar className='w-4 h-4 text-green-500 flex-shrink-0' />
                Joined <span className='font-medium ml-1' style={{ color: 'var(--text-primary)' }}>{moment(user.created_at).fromNow()}</span>
              </span>
            </div>

            {/* Stats — Followers & Following clickable, navigate inline */}
            <div className='flex gap-6 md:gap-8 pt-1'>
              {stats.map(({ label, val, key }) => {
                const isClickable = true  // all stats are clickable
                const isActive = activeSection === key
                return isClickable ? (
                  <button
                    key={label}
                    onClick={() => onStatClick?.(key)}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
                  >
                    <span
                      className='text-lg font-bold block'
                      style={{ color: isActive ? 'var(--accent)' : 'var(--text-primary)' }}
                    >
                      {val}
                    </span>
                    <span
                      className='text-xs block'
                      style={{
                        color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                        borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                        paddingBottom: 2,
                      }}
                    >
                      {label}
                    </span>
                  </button>
                ) : (
                  <div key={label} className='flex flex-col gap-0.5'>
                    <span className='text-lg font-bold' style={{ color: 'var(--text-primary)' }}>{val}</span>
                    <span className='text-xs' style={{ color: 'var(--text-secondary)' }}>{label}</span>
                  </div>
                )
              })}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

export default UserProfileInfo