import React, { useState, useEffect } from 'react'
import { Image, X, FileText, Type } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useUser } from '@clerk/react'
import { storiesAPI } from '../services/api'
import { useNavigate } from 'react-router-dom'

const CreateStory = () => {
  const { user: clerkUser } = useUser()
  const navigate = useNavigate()
  const [media, setMedia] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)  // stable URL for preview
  const [text, setText] = useState('')
  const [mediaType, setMediaType] = useState('text')
  const [backgroundColor, setBackgroundColor] = useState('#6366f1')
  const [loading, setLoading] = useState(false)

  // Revoke old object URL when media changes to avoid memory leaks
  useEffect(() => {
    if (!media) { setPreviewUrl(null); return }
    const url = URL.createObjectURL(media)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [media])

  const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6']

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      setMediaType(file.type.startsWith('video') ? 'video' : 'image')
      setMedia(file)  // previewUrl is derived via useEffect
    }
    e.target.value = ''
  }

  const handleSubmit = async () => {
    if (!media && !text.trim()) { toast.error('Please add a photo, video, or text'); return }
    if (!clerkUser?.id) { toast.error('User not logged in'); return }

    setLoading(true)
    try {
      const formData = new FormData()
      if (media) formData.append('media', media)
      formData.append('content', text.trim())
      formData.append('media_type', mediaType)
      formData.append('background_color', backgroundColor)
      formData.append('clerk_id', clerkUser.id)

      await storiesAPI.createStory(formData)
      setTimeout(() => navigate('/'), 300)
    } catch (error) {
      const msg = error.response?.data?.detail || error.response?.data?.clerk_id || error.message || 'Failed to create story'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  if (!clerkUser) return (
    <div className='min-h-screen flex items-center justify-center transition-colors duration-300'
      style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-muted)' }}>
      Loading...
    </div>
  )

  return (
    <div className='min-h-screen transition-colors duration-300' style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className='max-w-2xl mx-auto p-6'>

        {/* Title */}
        <div className='mb-8'>
          <h1 className='text-3xl font-bold mb-1' style={{ color: 'var(--text-primary)' }}>
            Create Story
          </h1>
          <p className='text-sm' style={{ color: 'var(--text-secondary)' }}>
            Share something that disappears in 24 hours
          </p>
        </div>

        {/* Card */}
        <div
          className='rounded-2xl border p-6 transition-colors duration-300'
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-color)',
            boxShadow: '0 2px 12px var(--shadow-color)'
          }}
        >
          {/* User header */}
          <div className='flex items-center gap-3 mb-6'>
            <img
              src={clerkUser.imageUrl}
              alt={clerkUser.fullName}
              className='w-12 h-12 rounded-full object-cover flex-shrink-0'
            />
            <div>
              <h2 className='font-semibold text-sm' style={{ color: 'var(--text-primary)' }}>
                {clerkUser.fullName}
              </h2>
              <p className='text-xs' style={{ color: 'var(--text-muted)' }}>
                {clerkUser.primaryEmailAddress?.emailAddress}
              </p>
            </div>
          </div>

          {/* Preview box */}
          <div
            className='w-full h-80 rounded-2xl mb-6 overflow-hidden relative flex items-end justify-center'
            style={{ backgroundColor: mediaType === 'text' ? backgroundColor : '#111' }}
          >
            {/* Media layer — use stable previewUrl, not inline createObjectURL */}
            {previewUrl && mediaType === 'image' && (
              <img
                src={previewUrl}
                alt='preview'
                className='absolute inset-0 w-full h-full object-contain'
              />
            )}
            {previewUrl && mediaType === 'video' && (
              <video
                key={previewUrl}
                src={previewUrl}
                className='absolute inset-0 w-full h-full object-contain'
                controls
              />
            )}

            {/* Text display */}
            {mediaType === 'text' ? (
              /* Text-only story: centred big text */
              <p
                className='absolute inset-0 flex items-center justify-center text-white text-xl text-center px-6 font-semibold drop-shadow-lg'
                style={{ whiteSpace: 'pre-wrap' }}
              >
                {text || 'Your story preview'}
              </p>
            ) : text ? (
              /* Media + caption: bottom gradient overlay */
              <div
                className='relative w-full px-4 py-4 z-10 text-center'
                style={{
                  background: 'linear-gradient(to top, rgba(0,0,0,0.80) 0%, transparent 100%)',
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 500,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  textShadow: '0 1px 6px rgba(0,0,0,0.9)',
                }}
              >
                {text}
              </div>
            ) : !media ? (
              /* Empty placeholder */
              <p className='absolute inset-0 flex items-center justify-center text-white/40 text-sm'>
                Your story preview
              </p>
            ) : null}
          </div>

          {/* Caption / text input — ALWAYS visible */}
          <div className='mb-4'>
            <label
              className='text-xs font-semibold mb-2 flex items-center gap-1.5'
              style={{ color: 'var(--text-secondary)' }}
            >
              <Type className='w-3.5 h-3.5' />
              {media ? 'Add a caption (optional)' : "What's your story?"}
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={media ? 'Write a caption for your photo/video...' : "What's on your mind?"}
              maxLength={300}
              rows={media ? 2 : 3}
              className='w-full rounded-xl px-4 py-3 text-sm outline-none resize-none transition-colors duration-300 placeholder-gray-400'
              style={{
                backgroundColor: 'var(--bg-input)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
              }}
            />
            <div className='flex justify-end mt-1'>
              <span className='text-xs' style={{ color: text.length > 250 ? '#ef4444' : 'var(--text-muted)' }}>
                {text.length}/300
              </span>
            </div>
          </div>

          {/* Background color picker — only for text-only stories */}
          {mediaType === 'text' && (
            <div className='mb-4'>
              <label className='text-xs font-semibold mb-2 block' style={{ color: 'var(--text-secondary)' }}>
                Background Color
              </label>
              <div className='flex gap-2'>
                {colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setBackgroundColor(color)}
                    className='w-8 h-8 rounded-full transition-all active:scale-90'
                    style={{
                      backgroundColor: color,
                      border: backgroundColor === color ? '3px solid var(--text-primary)' : '2px solid transparent',
                      boxShadow: backgroundColor === color ? `0 0 0 2px var(--bg-card), 0 0 0 4px ${color}` : 'none'
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Selected media info */}
          {media && (
            <div
              className='mb-4 p-3 rounded-xl flex items-center justify-between'
              style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)' }}
            >
              <span className='text-sm' style={{ color: 'var(--text-secondary)' }}>
                {mediaType === 'image' ? 'Image' : 'Video'} selected
              </span>
              <button
                onClick={() => { setMedia(null); setMediaType('text') }}
                className='text-red-400 hover:text-red-500 transition'
              >
                <X className='w-4 h-4' />
              </button>
            </div>
          )}

          {/* Bottom bar */}
          <div
            className='flex items-center justify-between pt-5 border-t transition-colors duration-300'
            style={{ borderColor: 'var(--border-color)' }}
          >
            <div className='flex gap-2'>
              {/* Photo/Video button */}
              <label
                htmlFor='story-media'
                className='flex items-center gap-2 text-sm px-3 py-2 rounded-xl transition cursor-pointer hover:opacity-80'
                style={{
                  backgroundColor: media ? 'rgba(34,197,94,0.12)' : 'var(--bg-input)',
                  color: media ? 'var(--accent)' : 'var(--text-secondary)',
                  border: `1px solid ${media ? 'var(--accent)' : 'transparent'}`
                }}
              >
                <Image className='w-4 h-4' />
                <span>{media ? 'Change' : 'Photo/Video'}</span>
              </label>
              <input
                type='file' id='story-media' accept='image/*,video/*'
                hidden onChange={handleFileSelect}
              />

              {/* Text-only mode button */}
              <button
                onClick={() => { setMedia(null); setMediaType('text') }}
                className='flex items-center gap-2 text-sm px-3 py-2 rounded-xl transition hover:opacity-80'
                style={{
                  backgroundColor: !media ? 'rgba(34,197,94,0.12)' : 'var(--bg-input)',
                  color: !media ? 'var(--accent)' : 'var(--text-secondary)',
                  border: `1px solid ${!media ? 'var(--accent)' : 'transparent'}`
                }}
              >
                <FileText className='w-4 h-4' />
                <span>Text Only</span>
              </button>
            </div>

            {/* Share button */}
            <button
              disabled={loading}
              onClick={handleSubmit}
              className='font-semibold px-6 py-2.5 rounded-xl text-sm text-white transition active:scale-95 disabled:opacity-50'
              style={{ backgroundColor: 'var(--accent)' }}
            >
              {loading ? 'Sharing...' : 'Share Story'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreateStory
