import { BadgeCheck, Heart, MessageCircle, Share2, Send, MoreVertical, Trash2, X } from 'lucide-react'
import React, { useState, useRef, useEffect } from 'react'
import moment from 'moment'
import { useNavigate } from 'react-router-dom'
import { postsAPI } from '../services/api'
import toast from 'react-hot-toast'
import { useUser } from '@clerk/react'

const Postcard = ({ post, onPostUpdate, onPostDeleted }) => {
  const { user: clerkUser } = useUser()
  const navigate = useNavigate()
  const menuRef = useRef(null)

  const postWithHashtags = post.content?.replace(
    /(#\w+)/g,
    '<span style="color:#16a34a;font-weight:500">$1</span>'
  ) || ''

  const isOwnPost = clerkUser?.id && post.user?.clerk_id === clerkUser.id

  const [likes,             setLikes]            = useState(post.likes_count || 0)
  const [liked,             setLiked]            = useState(post.liked_by_current_user || false)
  const [showComments,      setShowComments]     = useState(false)
  const [comments,          setComments]         = useState(post.comments || [])
  const [commentsCount,     setCommentsCount]    = useState(post.comments_count || 0)
  const [commentText,       setCommentText]      = useState('')
  const [loadingComments,   setLoadingComments]  = useState(false)
  const [submittingComment, setSubmittingComment]= useState(false)
  const [showMenu,          setShowMenu]         = useState(false)
  const [deletingPost,      setDeletingPost]     = useState(false)
  const [deletingCommentId, setDeletingCommentId]= useState(null)
  const [confirmDelete,     setConfirmDelete]    = useState(false)

  // Close menu on outside click
  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLike = async () => {
    if (!clerkUser?.id) { toast.error('Login required'); return }
    // Optimistic update
    const wasLiked = liked
    setLiked(!wasLiked)
    setLikes(prev => wasLiked ? prev - 1 : prev + 1)
    try {
      if (wasLiked) {
        await postsAPI.unlikePost(post.id, clerkUser.id)
        // Don't refresh feed - just update locally
      } else {
        await postsAPI.likePost(post.id, clerkUser.id)
        // Don't refresh feed - just update locally
      }
    } catch (err) {
      // Revert optimistic update on failure
      console.error('Like error:', err.response?.status, err.response?.data)
      const status = err.response?.status
      if (status === 400 && !wasLiked) {
        // Already liked on server — keep liked state, just fix count
        setLiked(true)
      } else if (status === 400 && wasLiked) {
        // Already unliked on server — keep unliked
        setLiked(false)
      } else {
        // Real error — revert
        setLiked(wasLiked)
        setLikes(prev => wasLiked ? prev + 1 : prev - 1)
        toast.error('Could not update like. Try again.')
      }
    }
  }

  const handleToggleComments = async () => {
    if (!showComments) {
      try {
        setLoadingComments(true)
        const res = await postsAPI.getComments(post.id)
        setComments(Array.isArray(res.data) ? res.data : [])
      } catch {
        toast.error('Could not load comments')
      } finally {
        setLoadingComments(false)
      }
    }
    setShowComments(prev => !prev)
  }

  const handleSubmitComment = async (e) => {
    e.preventDefault()
    if (!commentText.trim()) return
    if (!clerkUser?.id) { toast.error('Login required to comment'); return }
    try {
      setSubmittingComment(true)
      const res = await postsAPI.createComment(post.id, commentText.trim(), clerkUser.id)
      setComments(prev => [...prev, res.data])
      setCommentsCount(prev => prev + 1)
      setCommentText('')
    } catch (err) {
      console.error('Comment error:', err.response?.status, err.response?.data)
      toast.error(err.response?.data?.error || err.response?.data?.detail || 'Failed to post comment')
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleDeletePost = async () => {
    try {
      setDeletingPost(true)
      await postsAPI.deletePost(post.id, clerkUser.id)
      setConfirmDelete(false)
      onPostDeleted && onPostDeleted(post.id)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete post')
    } finally {
      setDeletingPost(false)
    }
  }

  const handleDeleteComment = async (commentId) => {
    if (!clerkUser?.id) return
    try {
      setDeletingCommentId(commentId)
      await postsAPI.deleteComment(post.id, commentId, clerkUser.id)
      setComments(prev => prev.filter(c => c.id !== commentId))
      setCommentsCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete comment')
    } finally {
      setDeletingCommentId(null)
    }
  }

  const handleShare = async () => {
    const postUrl = `${window.location.origin}/profile/${post.user?.id}`
    const shareData = {
      title: `${post.user?.full_name || post.user?.first_name}'s post on lilChat`,
      text: post.content ? post.content.slice(0, 100) : 'Check out this post on lilChat!',
      url: postUrl,
    }
    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData)
      } else {
        // Fallback — copy link to clipboard
        await navigator.clipboard.writeText(postUrl)
        toast.success('🔗 Link copied to clipboard!')
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        // User cancelled share — no error needed
        try {
          await navigator.clipboard.writeText(postUrl)
          toast.success('🔗 Link copied to clipboard!')
        } catch {
          toast.error('Could not share post')
        }
      }
    }
  }

  // Can delete a comment: post owner OR comment owner
  const canDeleteComment = (comment) => {
    if (!clerkUser?.id) return false
    if (isOwnPost) return true                           // own post → delete any comment
    return comment.user?.clerk_id === clerkUser.id       // other's post → only own comment
  }

  return (
    <>
      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4' style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className='rounded-2xl border p-6 w-full max-w-sm space-y-4' style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 rounded-full flex items-center justify-center' style={{ backgroundColor: 'rgba(239,68,68,0.12)' }}>
                <Trash2 className='w-5 h-5 text-red-500' />
              </div>
              <div>
                <h3 className='font-bold text-sm' style={{ color: 'var(--text-primary)' }}>Delete Post?</h3>
                <p className='text-xs' style={{ color: 'var(--text-muted)' }}>This action cannot be undone.</p>
              </div>
            </div>
            <div className='flex gap-2'>
              <button onClick={() => setConfirmDelete(false)} className='flex-1 py-2.5 rounded-xl text-sm font-medium border transition' style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-input)' }}>
                Cancel
              </button>
              <button onClick={handleDeletePost} disabled={deletingPost} className='flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition disabled:opacity-50' style={{ backgroundColor: '#ef4444' }}>
                {deletingPost ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        className='rounded-2xl border p-4 space-y-4 w-full max-w-2xl transition-all duration-300'
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
          boxShadow: '0 1px 8px var(--shadow-color)',
        }}
      >
        {/* ── User info + menu ── */}
        <div className='flex items-center justify-between'>
          <div onClick={() => navigate('/profile/' + post.user?.id)} className='flex items-center gap-3 cursor-pointer flex-1 min-w-0'>
            <img src={post.user?.profile_picture} alt='Profile' className='w-10 h-10 rounded-full shadow object-cover flex-shrink-0' />
            <div className='min-w-0'>
              <div className='flex items-center gap-1'>
                <span className='font-semibold text-sm truncate' style={{ color: 'var(--text-primary)' }}>
                  {post.user?.full_name || `${post.user?.first_name} ${post.user?.last_name}`.trim()}
                </span>
                <BadgeCheck className='w-4 h-4 text-green-500 flex-shrink-0' />
              </div>
              <div className='text-xs' style={{ color: 'var(--text-muted)' }}>
                @{post.user?.username || post.user?.email?.split('@')[0]} · {moment(post.created_at).fromNow()}
              </div>
            </div>
          </div>

          {/* 3-dot menu — only for own posts */}
          {isOwnPost && (
            <div className='relative flex-shrink-0 ml-2' ref={menuRef}>
              <button
                onClick={() => setShowMenu(v => !v)}
                className='w-8 h-8 rounded-full flex items-center justify-center transition hover:opacity-70'
                style={{ backgroundColor: showMenu ? 'var(--bg-input)' : 'transparent', color: 'var(--text-muted)' }}
              >
                <MoreVertical className='w-4 h-4' />
              </button>
              {showMenu && (
                <div className='absolute right-0 top-9 z-20 rounded-xl border shadow-lg min-w-[130px] overflow-hidden' style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                  <button
                    onClick={() => { setShowMenu(false); setConfirmDelete(true) }}
                    className='w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition'
                  >
                    <Trash2 className='w-3.5 h-3.5' />
                    Delete Post
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Post text content ── */}
        {post.content && (
          <div className='text-sm whitespace-pre-line leading-relaxed' style={{ color: 'var(--text-primary)' }} dangerouslySetInnerHTML={{ __html: postWithHashtags }} />
        )}

        {/* ── Post media ── */}
        {(post.image_urls || []).length > 0 && (() => {
          const urls = post.image_urls || []
          const isSingle = urls.length === 1
          return (
            <div className={`grid gap-1.5 rounded-xl overflow-hidden ${isSingle ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {urls.map((url, index) => {
                const isVideo = url?.startsWith('data:video') || /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)
                return isVideo ? (
                  <video
                    key={index}
                    src={url}
                    controls
                    className='w-full'
                    style={{
                      objectFit: 'contain',
                      backgroundColor: '#000',
                      display: 'block',
                      maxHeight: isSingle ? 560 : 280,
                    }}
                  />
                ) : (
                  <img
                    key={index}
                    src={url}
                    alt='Post media'
                    className='w-full'
                    style={{
                      objectFit: 'contain',
                      backgroundColor: '#000',
                      display: 'block',
                      maxHeight: isSingle ? 560 : 280,
                    }}
                  />
                )
              })}
            </div>
          )
        })()}

        {/* ── Actions ── */}
        <div className='flex items-center gap-5 text-sm pt-2 border-t' style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
          <button onClick={handleLike} className='flex items-center gap-1.5 hover:text-red-500 transition cursor-pointer'>
            <Heart className={`w-4 h-4 ${liked ? 'text-red-500 fill-red-500' : ''}`} />
            <span>{likes}</span>
          </button>
          <button onClick={handleToggleComments} className='flex items-center gap-1.5 hover:text-green-500 transition cursor-pointer'>
            <MessageCircle className={`w-4 h-4 ${showComments ? 'text-green-500' : ''}`} />
            <span>{commentsCount}</span>
          </button>
          <button onClick={handleShare} className='flex items-center gap-1.5 hover:text-green-500 transition cursor-pointer ml-auto'>
            <Share2 className='w-4 h-4' />
            <span>Share</span>
          </button>
        </div>

        {/* ── Comments panel ── */}
        {showComments && (
          <div className='border-t pt-3 space-y-3' style={{ borderColor: 'var(--border-color)' }}>
            {loadingComments ? (
              <p className='text-xs text-center py-2' style={{ color: 'var(--text-muted)' }}>Loading comments...</p>
            ) : comments.length === 0 ? (
              <p className='text-xs text-center py-2' style={{ color: 'var(--text-muted)' }}>No comments yet. Be the first!</p>
            ) : (
              <div className='space-y-2 max-h-52 overflow-y-auto pr-1'>
                {comments.map((c, i) => (
                  <div key={c.id || i} className='flex items-start gap-2 group'>
                    <img src={c.user?.profile_picture} alt='' className='w-7 h-7 rounded-full object-cover flex-shrink-0 mt-0.5' />
                    <div className='rounded-xl px-3 py-1.5 flex-1 min-w-0' style={{ backgroundColor: 'var(--bg-input)' }}>
                      <span className='text-xs font-semibold' style={{ color: 'var(--text-primary)' }}>
                        {c.user?.full_name || c.user?.first_name}
                      </span>
                      <p className='text-xs mt-0.5 break-words' style={{ color: 'var(--text-secondary)' }}>{c.content}</p>
                    </div>
                    {/* Delete comment button */}
                    {canDeleteComment(c) && (
                      <button
                        onClick={() => handleDeleteComment(c.id)}
                        disabled={deletingCommentId === c.id}
                        className='flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-red-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-40 mt-0.5'
                        title='Delete comment'
                      >
                        {deletingCommentId === c.id
                          ? <span className='w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin' />
                          : <Trash2 className='w-3 h-3' />
                        }
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Comment input */}
            <form onSubmit={handleSubmitComment} className='flex items-center gap-2'>
              <img src={clerkUser?.imageUrl} alt='' className='w-7 h-7 rounded-full object-cover flex-shrink-0' />
              <input
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder='Write a comment...'
                className='flex-1 text-sm rounded-full px-4 py-1.5 outline-none border transition'
                style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
              />
              <button type='submit' disabled={submittingComment || !commentText.trim()} className='text-green-500 hover:text-green-600 disabled:opacity-40 transition cursor-pointer'>
                <Send className='w-4 h-4' />
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  )
}

export default Postcard