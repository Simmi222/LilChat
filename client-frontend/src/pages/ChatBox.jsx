import React, { useState, useRef, useEffect, useCallback } from 'react'
import { SendHorizonal, Loader, X, CornerUpLeft } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { chatsAPI, usersAPI } from '../services/api'
import { useUser } from '@clerk/react'
import toast from 'react-hot-toast'
import moment from 'moment'

const ChatBox = () => {
  const { userId } = useParams()
  // isLoaded = true once Clerk has finished initializing
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser()

  const [messages,  setMessages]  = useState([])
  const [text,      setText]      = useState('')
  const [otherUser, setOtherUser] = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [sending,   setSending]   = useState(false)
  const [replyTo,   setReplyTo]   = useState(null)
  const messageEndRef = useRef(null)
  const inputRef      = useRef(null)

  const scrollToBottom = () =>
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' })

  /* ──────────────────────────────────────────────────────
     Fetch messages
     Wait for both userId AND Clerk to be fully ready (user object must exist)
  ────────────────────────────────────────────────────── */
  const fetchMessages = useCallback(async (silent = false) => {
    // Guard: need a valid userId, Clerk must be initialized, AND user must exist
    if (!userId || userId === 'undefined' || !clerkLoaded || !clerkUser?.id) return

    try {
      if (!silent) setLoading(true)

      // 1. Fetch the other user's profile on initial load only
      if (!silent) {
        const userRes = await usersAPI.getUser(userId)
        setOtherUser(userRes.data)
      }

      // 2. Fetch messages between current user and other user
      //    clerk_id is passed so backend can identify the current user
      const msgsRes = await chatsAPI.getChatsWithUser(userId, clerkUser.id)
      const fetched = Array.isArray(msgsRes.data) ? msgsRes.data : []
      setMessages(fetched)
    } catch (err) {
      console.error('fetchMessages FULL ERROR:', err)
      console.error('Status:', err?.response?.status)
      console.error('Data:', err?.response?.data)
      console.error('URL called:', err?.config?.url)
      console.error('Params:', err?.config?.params)
      // Only show toast on non-silent (initial) load
      if (!silent) {
        toast.error(`Could not load messages (${err?.response?.status || 'Network Error'})`)
      }
    } finally {
      if (!silent) setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, clerkLoaded, clerkUser?.id])

  // Run initial fetch once Clerk is ready AND user is available
  useEffect(() => {
    if (clerkLoaded && clerkUser?.id) fetchMessages()
  }, [fetchMessages, clerkLoaded, clerkUser?.id])

  // Poll every 4s for new messages (only when user is ready)
  useEffect(() => {
    if (!clerkLoaded || !clerkUser?.id) return
    const interval = setInterval(() => fetchMessages(true), 4000)
    return () => clearInterval(interval)
  }, [fetchMessages, clerkLoaded, clerkUser?.id])

  // Scroll to bottom when messages update
  useEffect(() => { scrollToBottom() }, [messages])

  /* ──────────────────────────────────────────────────────
     Send a message
  ────────────────────────────────────────────────────── */
  const sendMessage = async () => {
    const trimmed = text.trim()
    if (!trimmed) return
    if (!clerkUser?.id) { toast.error('Please log in to send messages'); return }

    try {
      setSending(true)
      await chatsAPI.sendMessage({
        to_user_id:   userId,
        text:         trimmed,
        message_type: 'text',
        clerk_id:     clerkUser.id,
        ...(replyTo ? { reply_to_id: replyTo.id } : {}),
      })
      setText('')
      setReplyTo(null)
      await fetchMessages(true)
    } catch (err) {
      console.error('Send error:', err)
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // True if the message was sent by the currently logged-in user
  const isMine = (msg) =>
    msg.sender?.clerk_id === clerkUser?.id ||
    msg.from_user?.clerk_id === clerkUser?.id

  /* ──────────────────────────────────────────────────────
     Loading state (Clerk not ready OR messages fetching)
  ────────────────────────────────────────────────────── */
  // Show loading skeleton while Clerk is initializing OR while fetching for the first time
  if (!clerkLoaded || !clerkUser?.id || loading) {
    return (
      <div className='flex flex-col h-screen transition-colors duration-300' style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className='flex items-center gap-3 px-4 py-3 border-b transition-colors duration-300' style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className='w-9 h-9 rounded-full animate-pulse' style={{ backgroundColor: 'var(--bg-input)' }} />
          <div className='space-y-1'>
            <div className='w-32 h-3 rounded animate-pulse' style={{ backgroundColor: 'var(--bg-input)' }} />
            <div className='w-20 h-2 rounded animate-pulse' style={{ backgroundColor: 'var(--bg-input)' }} />
          </div>
        </div>
        <div className='flex-1 flex items-center justify-center flex-col gap-3'>
          <Loader className='w-7 h-7 animate-spin' style={{ color: 'var(--accent)' }} />
          <p className='text-sm' style={{ color: 'var(--text-muted)' }}>Loading messages...</p>
        </div>
      </div>
    )
  }

  /* ──────────────────────────────────────────────────────
     Main render
  ────────────────────────────────────────────────────── */
  return (
    <div className='flex flex-col h-screen transition-colors duration-300' style={{ backgroundColor: 'var(--bg-primary)' }}>

      {/* Header */}
      <div className='flex items-center gap-3 px-4 py-3 border-b transition-colors duration-300' style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        {otherUser ? (
          <>
            <img src={otherUser.profile_picture} alt='' className='w-9 h-9 rounded-full object-cover' />
            <div>
              <p className='font-semibold text-sm leading-tight' style={{ color: 'var(--text-primary)' }}>
                {otherUser.first_name} {otherUser.last_name}
              </p>
              <p className='text-xs' style={{ color: 'var(--text-muted)' }}>@{otherUser.email?.split('@')[0]}</p>
            </div>
          </>
        ) : (
          <p className='text-sm' style={{ color: 'var(--text-muted)' }}>Loading...</p>
        )}
      </div>

      {/* Messages area */}
      <div className='flex-1 overflow-y-auto px-4 py-4 space-y-2'>
        {messages.length === 0 ? (
          <p className='text-center py-10 text-sm' style={{ color: 'var(--text-muted)' }}>
            No messages yet. Say hi! 👋
          </p>
        ) : (
          messages.map((msg, idx) => {
            const mine = isMine(msg)
            return (
              <div
                key={msg.id || idx}
                className={`flex ${mine ? 'justify-end' : 'justify-start'} group`}
              >
                {/* Avatar for received messages */}
                {!mine && (
                  <img
                    src={otherUser?.profile_picture}
                    alt=''
                    className='w-7 h-7 rounded-full object-cover self-end mr-2 flex-shrink-0'
                  />
                )}

                <div className='max-w-[65%] relative'>
                  {/* Reply button (appears on hover) */}
                  <button
                    onClick={() => { setReplyTo(msg); inputRef.current?.focus() }}
                    className={`absolute ${mine ? 'right-full mr-2' : 'left-full ml-2'} top-1
                      opacity-0 group-hover:opacity-100 transition
                      border rounded-full p-1 shadow-sm
                      hover:text-green-500`}
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
                    title='Reply'
                  >
                    <CornerUpLeft size={13} />
                  </button>

                  {/* Bubble */}
                  <div
                    className={`px-3 py-2 rounded-2xl text-sm shadow-sm ${mine ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                    style={mine
                      ? { backgroundColor: '#22c55e', color: '#fff' }
                      : { backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }
                    }
                  >
                    {/* Quoted reply preview */}
                    {msg.reply_to && (
                      <div
                        className={`mb-1.5 px-2 py-1 rounded border-l-4 text-xs
                          ${mine
                            ? 'border-green-200 bg-green-400/40 text-green-100'
                            : 'border-green-400 bg-green-50 text-gray-600'
                          }`}
                      >
                        <p className='font-semibold mb-0.5'>
                          {msg.reply_to.sender?.first_name}
                        </p>
                        <p className='line-clamp-2 opacity-80'>{msg.reply_to.content}</p>
                      </div>
                    )}

                    {/* Message text */}
                    <p className='whitespace-pre-wrap break-words leading-relaxed'>
                      {msg.content || msg.text}
                    </p>

                    {/* Timestamp */}
                    <p className={`text-[10px] mt-1 text-right
                      ${mine ? 'text-green-200' : 'text-gray-400'}`}
                    >
                      {moment(msg.created_at).format('h:mm A')}
                    </p>
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messageEndRef} />
      </div>

      {/* Reply preview bar */}
      {replyTo && (
        <div className='flex items-center gap-2 px-4 py-2 border-t transition-colors duration-300' style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className='flex-1 border-l-4 border-green-500 pl-2 py-0.5 rounded' style={{ backgroundColor: 'rgba(34,197,94,0.08)' }}>
            <p className='text-xs font-semibold text-green-600'>
              {isMine(replyTo) ? 'You' : otherUser?.first_name}
            </p>
            <p className='text-xs line-clamp-1' style={{ color: 'var(--text-secondary)' }}>{replyTo.content}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className='hover:text-red-400 transition p-1' style={{ color: 'var(--text-muted)' }}>
            <X size={15} />
          </button>
        </div>
      )}

      {/* Input bar */}
      <div className='px-4 py-3 border-t transition-colors duration-300' style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <div className='flex items-center gap-2 rounded-full px-4 py-2 max-w-3xl mx-auto' style={{ backgroundColor: 'var(--bg-input)' }}>
          <input
            ref={inputRef}
            type='text'
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKey}
            placeholder='Type a message...'
            disabled={sending}
            className='flex-1 bg-transparent outline-none text-sm placeholder-gray-400'
            style={{ color: 'var(--text-primary)' }}
          />
          <button
            onClick={sendMessage}
            disabled={sending || !text.trim()}
            className='bg-green-500 hover:bg-green-600 active:scale-95 transition p-2 rounded-full text-white disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0'
          >
            {sending ? <Loader size={16} className='animate-spin' /> : <SendHorizonal size={16} />}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChatBox