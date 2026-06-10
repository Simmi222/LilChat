import React, { useState, useEffect, useCallback } from 'react'
import { X, BadgeCheck, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { storiesAPI } from '../services/api'
import toast from 'react-hot-toast'

/**
 * StoryViewer — supports multiple stories per user with prev/next navigation
 * Props:
 *   stories        — array of story objects for this user
 *   initialIndex   — which story to start at (default 0)
 *   onClose        — fn to close the viewer
 *   currentClerkId — current logged-in user's clerk id
 *   onDelete       — fn to refresh stories list after delete
 */
const StoryViewer = ({ stories = [], initialIndex = 0, onClose, currentClerkId, onDelete,
    // legacy single-story support
    viewStory, setViewStory }) => {

    // Support legacy single-story usage
    const storyList = stories.length > 0 ? stories : (viewStory ? [viewStory] : [])
    const closeViewer = onClose || (() => setViewStory?.(null))

    const [idx, setIdx]         = useState(initialIndex)
    const [progress, setProgress] = useState(0)
    const [deleting, setDeleting] = useState(false)

    const current = storyList[idx]
    const isOwnStory = current?.user?.clerk_id === currentClerkId
    const hasPrev = idx > 0
    const hasNext = idx < storyList.length - 1

    const goNext = useCallback(() => {
        if (hasNext) { setIdx(i => i + 1); setProgress(0) }
        else closeViewer()
    }, [hasNext, closeViewer])

    const goPrev = useCallback(() => {
        if (hasPrev) { setIdx(i => i - 1); setProgress(0) }
    }, [hasPrev])

    // Auto-progress bar + auto-advance for non-video stories
    useEffect(() => {
        if (!current || current.media_type === 'video') return
        setProgress(0)
        const duration = 5000
        const tick = 100
        let elapsed = 0
        const interval = setInterval(() => {
            elapsed += tick
            const pct = Math.min((elapsed / duration) * 100, 100)
            setProgress(pct)
            if (elapsed >= duration) { clearInterval(interval); goNext() }
        }, tick)
        return () => clearInterval(interval)
    }, [idx, current?.id])

    // Keyboard navigation
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'ArrowRight') goNext()
            if (e.key === 'ArrowLeft')  goPrev()
            if (e.key === 'Escape')     closeViewer()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [goNext, goPrev, closeViewer])

    const handleDelete = async () => {
        if (!currentClerkId) { toast.error('Login required'); return }
        try {
            setDeleting(true)
            await storiesAPI.deleteStory(current.id, currentClerkId)
            toast.success('Story deleted!')
            if (storyList.length === 1) { closeViewer(); onDelete?.() }
            else { goNext(); onDelete?.() }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to delete story')
        } finally {
            setDeleting(false)
        }
    }

    if (!current) return null

    // Get the best available media URL
    const mediaUrl = current.media_url || current.media || null

    const renderContent = () => {
        switch (current.media_type) {
            case 'image':
                return (
                    <>
                        {mediaUrl ? (
                            <img
                                src={mediaUrl}
                                alt="story"
                                onError={(e) => { e.target.style.display = 'none' }}
                                style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'contain' }}
                            />
                        ) : (
                            // Fallback when image URL missing (e.g. Cloudinary not configured yet)
                            <div style={{
                                position:'absolute', inset:0, display:'flex', flexDirection:'column',
                                alignItems:'center', justifyContent:'center', gap:12,
                                color:'rgba(255,255,255,0.5)', fontSize:14,
                            }}>
                                <span style={{ fontSize:48 }}>🖼️</span>
                                <span>Image unavailable</span>
                            </div>
                        )}
                        {current.content && (
                            <div style={{
                                position:'absolute', bottom:0, left:0, right:0,
                                padding:'32px 24px 24px',
                                background:'linear-gradient(to top, rgba(0,0,0,0.82) 0%, transparent 100%)',
                                color:'#fff', fontSize:16, fontWeight:500, textAlign:'center',
                                whiteSpace:'pre-wrap', wordBreak:'break-word',
                                textShadow:'0 1px 6px rgba(0,0,0,0.9)', zIndex:5,
                            }}>
                                {current.content}
                            </div>
                        )}
                    </>
                )
            case 'video':
                return (
                    <>
                        {mediaUrl ? (
                            <video
                                onEnded={goNext}
                                src={mediaUrl}
                                controls
                                autoPlay
                                style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'contain' }}
                            />
                        ) : (
                            <div style={{
                                position:'absolute', inset:0, display:'flex', flexDirection:'column',
                                alignItems:'center', justifyContent:'center', gap:12,
                                color:'rgba(255,255,255,0.5)', fontSize:14,
                            }}>
                                <span style={{ fontSize:48 }}>🎬</span>
                                <span>Video unavailable</span>
                            </div>
                        )}
                        {current.content && (
                            <div style={{
                                position:'absolute', bottom:0, left:0, right:0,
                                padding:'32px 24px 24px',
                                background:'linear-gradient(to top, rgba(0,0,0,0.82) 0%, transparent 100%)',
                                color:'#fff', fontSize:16, fontWeight:500, textAlign:'center',
                                whiteSpace:'pre-wrap', wordBreak:'break-word',
                                textShadow:'0 1px 6px rgba(0,0,0,0.9)', zIndex:5,
                            }}>
                                {current.content}
                            </div>
                        )}
                    </>
                )
            case 'text':
                return (
                    <div className='absolute inset-0 flex items-center justify-center p-8 text-white text-2xl text-center font-semibold'
                        style={{ whiteSpace:'pre-wrap' }}>
                        {current.content}
                    </div>
                )
            default: return null
        }
    }

    return (
        <div
            className='fixed inset-0 z-[110] flex items-center justify-center'
            style={{ backgroundColor: current.media_type === 'text' ? current.background_color : '#000' }}
        >
            {/* ── Progress bars (one per story) ── */}
            <div className='absolute top-0 left-0 right-0 flex gap-1 px-3 pt-2' style={{ zIndex:20 }}>
                {storyList.map((s, i) => (
                    <div key={s.id} className='flex-1 h-0.5 rounded-full overflow-hidden' style={{ backgroundColor:'rgba(255,255,255,0.35)' }}>
                        <div
                            className='h-full rounded-full'
                            style={{
                                backgroundColor:'#fff',
                                width: i < idx ? '100%' : i === idx ? `${progress}%` : '0%',
                                transition: i === idx ? 'none' : undefined,
                            }}
                        />
                    </div>
                ))}
            </div>

            {/* ── User info top-left ── */}
            <div className='absolute top-5 left-4 flex items-center gap-3 backdrop-blur-sm rounded-xl px-3 py-2'
                style={{ zIndex:15, backgroundColor:'rgba(0,0,0,0.45)' }}>
                <img src={current.user?.profile_picture} alt=""
                    className='w-8 h-8 rounded-full object-cover border border-white/60' />
                <div className='text-white flex items-center gap-1.5'>
                    <span className='font-semibold text-sm'>
                        {current.user?.full_name || `${current.user?.first_name} ${current.user?.last_name}`.trim()}
                    </span>
                    <BadgeCheck size={15} />
                    {storyList.length > 1 && (
                        <span className='text-white/60 text-xs ml-1'>{idx + 1} / {storyList.length}</span>
                    )}
                </div>
            </div>

            {/* ── Top-right buttons ── */}
            <div className='absolute top-5 right-4 flex items-center gap-2' style={{ zIndex:15 }}>
                {isOwnStory && (
                    <button onClick={handleDelete} disabled={deleting}
                        className='text-white bg-red-500/80 hover:bg-red-600 p-2 rounded-full transition disabled:opacity-50 cursor-pointer'>
                        <Trash2 size={16} />
                    </button>
                )}
                <button onClick={closeViewer}
                    className='text-white bg-black/40 hover:bg-black/60 p-2 rounded-full transition cursor-pointer'>
                    <X size={20} />
                </button>
            </div>

            {/* ── Prev arrow ── */}
            {hasPrev && (
                <button
                    onClick={goPrev}
                    className='absolute left-3 z-20 flex items-center justify-center rounded-full transition active:scale-90'
                    style={{
                        top:'50%', transform:'translateY(-50%)',
                        width:44, height:44,
                        backgroundColor:'rgba(255,255,255,0.18)',
                        backdropFilter:'blur(4px)',
                        border:'1px solid rgba(255,255,255,0.25)',
                        color:'#fff', cursor:'pointer',
                    }}
                >
                    <ChevronLeft size={24} />
                </button>
            )}

            {/* ── Next arrow ── */}
            {hasNext && (
                <button
                    onClick={goNext}
                    className='absolute right-3 z-20 flex items-center justify-center rounded-full transition active:scale-90'
                    style={{
                        top:'50%', transform:'translateY(-50%)',
                        width:44, height:44,
                        backgroundColor:'rgba(255,255,255,0.18)',
                        backdropFilter:'blur(4px)',
                        border:'1px solid rgba(255,255,255,0.25)',
                        color:'#fff', cursor:'pointer',
                    }}
                >
                    <ChevronRight size={24} />
                </button>
            )}

            {/* ── Story content ── */}
            <div style={{ position:'absolute', inset:0, zIndex:0 }}>
                {renderContent()}
            </div>
        </div>
    )
}

export default StoryViewer