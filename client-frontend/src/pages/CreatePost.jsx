import React, { useState, useRef, useEffect } from 'react'
import { Image, X, Send, ZoomIn, ZoomOut, Check, Move } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useUser } from '@clerk/react'
import { postsAPI } from '../services/api'
import { useNavigate } from 'react-router-dom'

/* ─────────────────────────────────────────────
   CIRCLE CROP TOOL
   - Full image shown behind
   - Fixed circle in center (bright, rest is dark)
   - Drag image to choose which part appears
   - Zoom slider to zoom in/out
───────────────────────────────────────────── */
const CIRCLE_SIZE = 300   // px — diameter of crop circle (display)
const OUT_SIZE    = 500   // px — output image resolution (keep base64 small)

const ImageCropper = ({ file, onConfirm, onCancel }) => {
  const imgRef      = useRef(null)
  const containerRef= useRef(null)

  const [imgUrl]          = useState(() => URL.createObjectURL(file))
  const [imgLoaded, setImgLoaded] = useState(false)
  const [naturalW, setNaturalW]   = useState(1)
  const [naturalH, setNaturalH]   = useState(1)
  const [zoom,     setZoom]       = useState(1)
  const [offset,   setOffset]     = useState({ x: 0, y: 0 })

  const dragging = useRef(false)
  const lastPos  = useRef({ x: 0, y: 0 })

  // Container size (square, slightly bigger than crop circle)
  const CONT = CIRCLE_SIZE + 80

  // When image loads: auto-scale to fill the circle
  const onLoad = (e) => {
    const nw = e.target.naturalWidth
    const nh = e.target.naturalHeight
    setNaturalW(nw)
    setNaturalH(nh)
    // fit to fill circle
    const fit = Math.max(CIRCLE_SIZE / nw, CIRCLE_SIZE / nh)
    setZoom(fit)
    setImgLoaded(true)
  }

  // Displayed dimensions of the image
  const dispW = naturalW * zoom
  const dispH = naturalH * zoom

  // Drag move
  const startDrag = (cx, cy) => {
    dragging.current = true
    lastPos.current = { x: cx, y: cy }
  }
  const moveDrag = (cx, cy) => {
    if (!dragging.current) return
    const dx = cx - lastPos.current.x
    const dy = cy - lastPos.current.y
    lastPos.current = { x: cx, y: cy }
    setOffset(p => {
      // clamp so image always covers circle
      const maxX = (dispW - CIRCLE_SIZE) / 2
      const maxY = (dispH - CIRCLE_SIZE) / 2
      return {
        x: Math.max(-maxX, Math.min(maxX, p.x + dx)),
        y: Math.max(-maxY, Math.min(maxY, p.y + dy)),
      }
    })
  }
  const endDrag = () => { dragging.current = false }

  // Clamp offset when zoom changes
  useEffect(() => {
    setOffset(p => {
      const maxX = Math.max(0, (dispW - CIRCLE_SIZE) / 2)
      const maxY = Math.max(0, (dispH - CIRCLE_SIZE) / 2)
      return {
        x: Math.max(-maxX, Math.min(maxX, p.x)),
        y: Math.max(-maxY, Math.min(maxY, p.y)),
      }
    })
  }, [zoom, dispW, dispH])

  const handleConfirm = () => {
    if (!imgLoaded) return

    // Use a fresh Image object — guarantees canvas draw works even if DOM img is hidden
    const freshImg = new window.Image()
    freshImg.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width  = OUT_SIZE
      canvas.height = OUT_SIZE
      const ctx = canvas.getContext('2d')

      const cx = CONT / 2
      const cy = CONT / 2

      const imgLeft = cx + offset.x - dispW / 2
      const imgTop  = cy + offset.y - dispH / 2

      const cropLeft = cx - CIRCLE_SIZE / 2
      const cropTop  = cy - CIRCLE_SIZE / 2

      const localX = cropLeft - imgLeft
      const localY = cropTop  - imgTop

      const srcX = localX / zoom
      const srcY = localY / zoom
      const srcW = CIRCLE_SIZE / zoom
      const srcH = CIRCLE_SIZE / zoom

      ctx.drawImage(freshImg, srcX, srcY, srcW, srcH, 0, 0, OUT_SIZE, OUT_SIZE)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
      onConfirm(dataUrl)
    }
    freshImg.src = imgUrl
  }

  // Image style: centered in container, offset by drag
  const imgStyle = {
    position: 'absolute',
    width:  dispW,
    height: dispH,
    top:  CONT / 2 + offset.y - dispH / 2,
    left: CONT / 2 + offset.x - dispW / 2,
    userSelect: 'none',
    pointerEvents: 'none',
    objectFit: 'fill',
    display: 'block',   // must be visible for canvas cross-origin
  }

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4'
      style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }}>
      <div className='w-full max-w-md rounded-2xl border overflow-hidden'
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>

        {/* Header */}
        <div className='flex items-center justify-between px-5 py-4 border-b' style={{ borderColor: 'var(--border-color)' }}>
          <div>
            <h3 className='font-bold text-sm' style={{ color: 'var(--text-primary)' }}>Crop Photo</h3>
            <p className='text-xs mt-0.5' style={{ color: 'var(--text-muted)' }}>
              Drag photo to frame · Zoom to resize
            </p>
          </div>
          <button onClick={onCancel}
            className='w-8 h-8 rounded-full flex items-center justify-center hover:opacity-70 transition'
            style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-muted)' }}>
            <X className='w-4 h-4' />
          </button>
        </div>

        {/* Crop area */}
        <div className='flex items-center justify-center py-5' style={{ backgroundColor: '#000' }}>
          {/* Container */}
          <div
            ref={containerRef}
            style={{
              position: 'relative',
              width:  CONT,
              height: CONT,
              overflow: 'hidden',
              cursor: dragging.current ? 'grabbing' : 'grab',
              backgroundColor: '#111',
              borderRadius: 12,
            }}
            onMouseDown={e => startDrag(e.clientX, e.clientY)}
            onMouseMove={e => moveDrag(e.clientX, e.clientY)}
            onMouseUp={endDrag}
            onMouseLeave={endDrag}
            onTouchStart={e => startDrag(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchMove={e => { e.preventDefault(); moveDrag(e.touches[0].clientX, e.touches[0].clientY) }}
            onTouchEnd={endDrag}
          >
            {/* Hidden img for load event */}
            <img ref={imgRef} src={imgUrl} alt='' onLoad={onLoad} style={imgStyle} draggable={false} />

            {/* Dark overlay with circle "hole" — uses box-shadow trick */}
            <div style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <div style={{
                width:  CIRCLE_SIZE,
                height: CIRCLE_SIZE,
                borderRadius: '50%',
                // box-shadow creates dark mask outside circle
                boxShadow: '0 0 0 1000px rgba(0,0,0,0.55)',
                border: '2.5px solid rgba(255,255,255,0.9)',
                flexShrink: 0,
              }} />
            </div>

            {/* Drag hint */}
            <div style={{
              position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
              display: 'flex', alignItems: 'center', gap: 4,
              backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff',
              padding: '3px 10px', borderRadius: 20, fontSize: 11,
              pointerEvents: 'none', whiteSpace: 'nowrap',
            }}>
              <Move style={{ width: 11, height: 11 }} /> Drag to reposition
            </div>
          </div>
        </div>

        {/* Zoom controls */}
        <div className='px-5 py-4 border-t flex items-center gap-3' style={{ borderColor: 'var(--border-color)' }}>
          <button onClick={() => setZoom(z => Math.max(Math.max(CIRCLE_SIZE / naturalW, CIRCLE_SIZE / naturalH), z - 0.1))}
            className='w-9 h-9 rounded-xl flex items-center justify-center border transition hover:opacity-80'
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-input)' }}>
            <ZoomOut className='w-4 h-4' />
          </button>

          {/* Slider */}
          <div className='flex-1 relative h-2 rounded-full' style={{ backgroundColor: 'var(--bg-input)' }}>
            {(() => {
              const minZ = Math.max(CIRCLE_SIZE / naturalW, CIRCLE_SIZE / naturalH)
              const maxZ = minZ * 4
              const pct  = ((zoom - minZ) / (maxZ - minZ)) * 100
              return <>
                <div className='absolute top-0 left-0 h-full rounded-full transition-all'
                  style={{ width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: 'var(--accent)' }} />
                <input type='range'
                  min={Math.max(CIRCLE_SIZE / naturalW, CIRCLE_SIZE / naturalH)}
                  max={Math.max(CIRCLE_SIZE / naturalW, CIRCLE_SIZE / naturalH) * 4}
                  step={0.01}
                  value={zoom}
                  onChange={e => setZoom(parseFloat(e.target.value))}
                  className='absolute inset-0 w-full opacity-0 cursor-pointer'
                  style={{ height: '100%' }}
                />
              </>
            })()}
          </div>

          <button onClick={() => setZoom(z => Math.min(Math.max(CIRCLE_SIZE / naturalW, CIRCLE_SIZE / naturalH) * 4, z + 0.1))}
            className='w-9 h-9 rounded-xl flex items-center justify-center border transition hover:opacity-80'
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-input)' }}>
            <ZoomIn className='w-4 h-4' />
          </button>

          <button
            onClick={handleConfirm}
            disabled={!imgLoaded}
            className='flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold text-white transition active:scale-95 disabled:opacity-40'
            style={{ backgroundColor: 'var(--accent)' }}>
            <Check className='w-4 h-4' /> Done
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   CREATE POST PAGE
───────────────────────────────────────────── */
const CreatePost = () => {
  const { user: clerkUser } = useUser()
  const navigate = useNavigate()
  const [content,  setContent]  = useState('')
  const [images,   setImages]   = useState([])   // { preview: dataUrl, isVideo }
  const [loading,  setLoading]  = useState(false)
  const [cropFile, setCropFile] = useState(null)

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type.startsWith('video')) {
      const reader = new FileReader()
      reader.onload = ev => setImages(prev => [...prev, { preview: ev.target.result, isVideo: true }])
      reader.readAsDataURL(file)
    } else {
      setCropFile(file)
    }
    e.target.value = ''
  }

  const handleCropConfirm = (dataUrl) => {
    setImages(prev => [...prev, { preview: dataUrl, isVideo: false }])
    setCropFile(null)
  }

  const handleSubmit = async () => {
    if (!content.trim() && images.length === 0) { toast.error('Please add text or a photo/video'); return }
    setLoading(true)
    try {
      await postsAPI.createPost({
        caption: content.trim() || '',   // allow empty caption when media is present
        image: images.length > 0 ? images[0].preview : '',
        clerk_id: clerkUser.id,
      })
      setContent('')
      setImages([])
      navigate('/')
    } catch (error) {
      console.error('Create post error:', error.response?.data || error.message)
      toast.error(error.response?.data?.detail || error.response?.data?.error || 'Failed to create post')
    } finally {
      setLoading(false)
    }
  }

  if (!clerkUser) return (
    <div className='min-h-screen flex items-center justify-center' style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-muted)' }}>
      Loading...
    </div>
  )

  return (
    <>
      {cropFile && (
        <ImageCropper
          file={cropFile}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropFile(null)}
        />
      )}

      <div className='min-h-screen transition-colors duration-300' style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className='max-w-2xl mx-auto p-6'>

          <div className='mb-8'>
            <h1 className='text-3xl font-bold mb-1' style={{ color: 'var(--text-primary)' }}>Create Post</h1>
            <p className='text-sm' style={{ color: 'var(--text-secondary)' }}>Share your thoughts with the world!</p>
          </div>

          <div className='rounded-2xl border p-6 transition-colors duration-300'
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', boxShadow: '0 2px 12px var(--shadow-color)' }}>

            {/* User header */}
            <div className='flex items-center gap-3 mb-5'>
              <img src={clerkUser.imageUrl} alt={clerkUser.fullName} className='w-12 h-12 rounded-full object-cover flex-shrink-0' />
              <div>
                <h2 className='font-semibold text-sm' style={{ color: 'var(--text-primary)' }}>{clerkUser.fullName}</h2>
                <p className='text-xs' style={{ color: 'var(--text-muted)' }}>{clerkUser.primaryEmailAddress?.emailAddress}</p>
              </div>
            </div>

            {/* Textarea */}
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="What's on your mind?"
              rows={5}
              maxLength={500}
              className='w-full rounded-xl px-4 py-3 text-sm outline-none resize-none transition-colors duration-300 placeholder-gray-400'
              style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            />
            <div className='flex justify-end mt-1 mb-3'>
              <span className='text-xs' style={{ color: content.length > 450 ? '#ef4444' : 'var(--text-muted)' }}>{content.length}/500</span>
            </div>

            {/* Media previews */}
            {images.length > 0 && (
              <div className='flex gap-2 flex-wrap mb-4'>
                {images.map((img, i) => (
                  <div key={i} className='relative'>
                    {img.isVideo
                      ? <video src={img.preview} className='h-24 w-24 object-cover rounded-xl' muted />
                      : <img src={img.preview} className='h-24 w-24 object-cover rounded-xl' alt='preview' />
                    }
                    <button onClick={() => setImages(images.filter((_, j) => j !== i))}
                      className='absolute -top-1.5 -right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 transition shadow'>
                      <X className='w-3.5 h-3.5' />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Bottom bar */}
            <div className='flex items-center justify-between pt-4 border-t' style={{ borderColor: 'var(--border-color)' }}>
              <label htmlFor='post-img'
                className='flex items-center gap-2 text-sm px-3 py-2 rounded-xl transition cursor-pointer hover:opacity-80'
                style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
                <Image className='w-4 h-4' />
                <span>Photo / Video</span>
              </label>
              <input type='file' id='post-img' accept='image/*,video/*' hidden onChange={handleFileSelect} />

              <button
                disabled={loading}
                onClick={handleSubmit}
                className='flex items-center gap-2 font-semibold px-6 py-2.5 rounded-xl text-sm text-white transition active:scale-95 disabled:opacity-50'
                style={{ backgroundColor: 'var(--accent)' }}>
                <Send className='w-4 h-4' />
                {loading ? 'Posting...' : 'Publish Post'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default CreatePost
