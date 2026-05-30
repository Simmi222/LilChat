import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { chatsAPI } from '../services/api'
import { useUser } from '@clerk/react'
import { MessageSquare, Loader } from 'lucide-react'
import moment from 'moment'

const Messages = () => {
  const navigate = useNavigate()
  const { user: clerkUser } = useUser()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchConversations = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const response = await chatsAPI.getConversations(clerkUser?.id)
      setConversations(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [clerkUser?.id])

  useEffect(() => { fetchConversations() }, [fetchConversations])

  useEffect(() => {
    const interval = setInterval(() => fetchConversations(true), 5000)
    return () => clearInterval(interval)
  }, [fetchConversations])

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center transition-colors duration-300' style={{ backgroundColor: 'var(--bg-primary)' }}>
        <Loader className='w-7 h-7 animate-spin' style={{ color: 'var(--accent)' }} />
      </div>
    )
  }

  return (
    <div className='min-h-screen transition-colors duration-300' style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className='max-w-2xl mx-auto p-6'>

        {/* Header */}
        <div className='mb-6'>
          <h1 className='text-2xl font-bold' style={{ color: 'var(--text-primary)' }}>Messages</h1>
          <p className='text-sm mt-1' style={{ color: 'var(--text-secondary)' }}>Your conversations</p>
        </div>

        <div className='flex flex-col gap-2'>
          {conversations.length === 0 ? (
            <div className='text-center py-16' style={{ color: 'var(--text-muted)' }}>
              <MessageSquare className='w-10 h-10 mx-auto mb-3 opacity-30' />
              <p className='font-medium'>No conversations yet</p>
              <p className='text-sm mt-1'>Go to Connections to start messaging!</p>
            </div>
          ) : (
            conversations.map((user) => (
              <button
                key={user.id}
                onClick={() => navigate(`/messages/${user.id}`)}
                className='flex items-center gap-4 rounded-xl p-4 hover:opacity-80 transition text-left w-full border'
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-color)',
                  boxShadow: '0 1px 6px var(--shadow-color)'
                }}
              >
                {/* Avatar + unread badge */}
                <div className='relative flex-shrink-0'>
                  <img
                    src={user.profile_picture}
                    alt={user.first_name}
                    className='w-12 h-12 rounded-full object-cover'
                  />
                  {user.unread_count > 0 && (
                    <span className='absolute -top-1 -right-1 w-5 h-5 bg-green-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center'>
                      {user.unread_count > 9 ? '9+' : user.unread_count}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className='flex-1 min-w-0'>
                  <div className='flex items-center justify-between'>
                    <p className={`font-medium truncate ${user.unread_count > 0 ? 'font-semibold' : ''}`}
                      style={{ color: 'var(--text-primary)' }}>
                      {user.first_name} {user.last_name}
                    </p>
                    {user.last_message_at && (
                      <span className='text-xs ml-2 flex-shrink-0' style={{ color: 'var(--text-muted)' }}>
                        {moment(user.last_message_at).fromNow()}
                      </span>
                    )}
                  </div>
                  <p className={`text-sm truncate mt-0.5`}
                    style={{ color: user.unread_count > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {user.last_message || 'Start a conversation'}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default Messages