import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { chatsAPI } from '../services/api'
import { useUser } from '@clerk/react'
import { MessageCircle, ChevronRight } from 'lucide-react'

const RecentMessages = () => {
  const { user: clerkUser } = useUser()
  const [messages, setMessages] = useState([])

  const fetchRecentMessages = useCallback(async () => {
    try {
      const response = await chatsAPI.getConversations(clerkUser?.id)
      setMessages(Array.isArray(response.data) ? response.data.slice(0, 5) : [])
    } catch {
      setMessages([])
    }
  }, [clerkUser?.id])

  useEffect(() => { fetchRecentMessages() }, [fetchRecentMessages])
  useEffect(() => {
    const interval = setInterval(fetchRecentMessages, 8000)
    return () => clearInterval(interval)
  }, [fetchRecentMessages])

  return (
    <div
      className='mt-4 rounded-2xl border transition-colors duration-300 overflow-hidden'
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-color)',
        boxShadow: '0 2px 12px var(--shadow-color)',
        width: 280,
      }}
    >
      {/* Header */}
      <div
        className='flex items-center justify-between px-4 py-3 border-b'
        style={{ borderColor: 'var(--border-color)' }}
      >
        <div className='flex items-center gap-2'>
          <MessageCircle className='w-4 h-4 text-green-500' />
          <h3 className='font-semibold text-sm' style={{ color: 'var(--text-primary)' }}>
            Recent Messages
          </h3>
        </div>
        <Link
          to='/messages'
          className='text-xs font-medium transition hover:opacity-70'
          style={{ color: 'var(--accent)' }}
        >
          See all
        </Link>
      </div>

      {/* List */}
      <div className='flex flex-col py-1'>
        {messages.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-6 gap-2'>
            <MessageCircle className='w-8 h-8' style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
            <p className='text-xs' style={{ color: 'var(--text-muted)' }}>No messages yet</p>
          </div>
        ) : (
          messages.map((user, index) => (
            <Link
              to={`/messages/${user.id}`}
              key={user.id || index}
              className='flex items-center gap-3 px-4 py-2.5 transition-colors'
              style={{ textDecoration: 'none' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-input)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              {/* Avatar with unread dot */}
              <div className='relative flex-shrink-0'>
                <img
                  src={user.profile_picture || `https://ui-avatars.com/api/?name=${user.first_name}+${user.last_name}&background=16a34a&color=fff&size=64`}
                  alt={user.first_name}
                  className='w-10 h-10 rounded-full object-cover'
                  style={{ border: '2px solid var(--border-color)' }}
                />
                {user.unread_count > 0 ? (
                  <span
                    className='absolute -top-0.5 -right-0.5 w-4 h-4 text-white text-[9px] font-bold rounded-full flex items-center justify-center'
                    style={{ backgroundColor: 'var(--accent)' }}
                  >
                    {user.unread_count > 9 ? '9+' : user.unread_count}
                  </span>
                ) : (
                  /* Online-style dot for active convos */
                  <span
                    className='absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full'
                    style={{ backgroundColor: '#22c55e', border: '2px solid var(--bg-card)' }}
                  />
                )}
              </div>

              {/* Name + last message */}
              <div className='flex-1 min-w-0'>
                <span
                  className='block text-sm truncate'
                  style={{
                    color: 'var(--text-primary)',
                    fontWeight: user.unread_count > 0 ? 700 : 500,
                  }}
                >
                  {user.first_name} {user.last_name}
                </span>
                <span
                  className='block text-xs truncate'
                  style={{
                    color: user.unread_count > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                    fontWeight: user.unread_count > 0 ? 600 : 400,
                  }}
                >
                  {user.last_message || 'Start chatting…'}
                </span>
              </div>

              <ChevronRight className='w-3.5 h-3.5 flex-shrink-0' style={{ color: 'var(--text-muted)' }} />
            </Link>
          ))
        )}
      </div>
    </div>
  )
}

export default RecentMessages