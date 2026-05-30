import React, { useState, useRef } from 'react'
import { X, Camera, ImagePlus } from 'lucide-react'
import { usersAPI } from '../services/api'
import toast from 'react-hot-toast'

const ProfileModal = ({ user, setShowEdit, onProfileUpdate, clerkId }) => {
  const [formData, setFormData] = useState({
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    bio: user.bio || '',
    location: user.location || '',
    profile_picture: user.profile_picture || '',
    cover_photo: user.cover_photo || '',
  })
  const [profilePreview, setProfilePreview] = useState(user.profile_picture || '')
  const [coverPreview, setCoverPreview]     = useState(user.cover_photo || '')
  const [loading, setLoading] = useState(false)

  const profileInputRef = useRef(null)
  const coverInputRef   = useRef(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  const handleProfilePicChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const b64 = await fileToBase64(file)
    setProfilePreview(b64)
    setFormData(prev => ({ ...prev, profile_picture: b64 }))
  }

  const handleCoverChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const b64 = await fileToBase64(file)
    setCoverPreview(b64)
    setFormData(prev => ({ ...prev, cover_photo: b64 }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      await usersAPI.updateMe(formData, clerkId)
      toast.success('Profile updated successfully!')
      setShowEdit(false)
      onProfileUpdate()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  /* ── input style helper ── */
  const inputStyle = {
    backgroundColor: 'var(--bg-input)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-color)',
  }

  return (
    <div className='fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm'>
      <div
        className='rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto no-scrollbar transition-colors duration-300'
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
      >

        {/* Header */}
        <div
          className='flex justify-between items-center p-6 border-b sticky top-0 z-10 transition-colors duration-300'
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        >
          <h2 className='text-xl font-bold' style={{ color: 'var(--text-primary)' }}>Edit Profile</h2>
          <button
            onClick={() => setShowEdit(false)}
            className='w-8 h-8 rounded-full flex items-center justify-center transition hover:opacity-70'
            style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)' }}
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        <form onSubmit={handleSubmit} className='p-6 space-y-5'>

          {/* Cover Photo */}
          <div>
            <label className='block text-sm font-medium mb-2' style={{ color: 'var(--text-secondary)' }}>
              Cover Photo
            </label>
            <div
              onClick={() => coverInputRef.current?.click()}
              className='relative h-28 rounded-xl overflow-hidden cursor-pointer group border-2 border-dashed transition'
              style={{
                background: coverPreview ? 'none' : 'linear-gradient(135deg, #a7f3d0, #6ee7b7)',
                borderColor: 'var(--border-color)'
              }}
            >
              {coverPreview && <img src={coverPreview} alt='cover' className='w-full h-full object-cover' />}
              <div className='absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition'>
                <ImagePlus className='text-white w-7 h-7' />
                <span className='text-white text-sm ml-2 font-medium'>Change Cover</span>
              </div>
            </div>
            <input ref={coverInputRef} type='file' accept='image/*' className='hidden' onChange={handleCoverChange} />
          </div>

          {/* Profile Picture */}
          <div>
            <label className='block text-sm font-medium mb-2' style={{ color: 'var(--text-secondary)' }}>
              Profile Picture
            </label>
            <div className='flex items-center gap-4'>
              <div
                onClick={() => profileInputRef.current?.click()}
                className='relative w-20 h-20 rounded-full overflow-hidden cursor-pointer group border-2 border-dashed flex-shrink-0 transition'
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)' }}
              >
                {profilePreview
                  ? <img src={profilePreview} alt='profile' className='w-full h-full object-cover' />
                  : <div className='w-full h-full flex items-center justify-center' style={{ color: 'var(--text-muted)' }}><Camera className='w-7 h-7' /></div>
                }
                <div className='absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition rounded-full'>
                  <Camera className='text-white w-5 h-5' />
                </div>
              </div>
              <div className='text-sm' style={{ color: 'var(--text-muted)' }}>
                <p>Click the circle to upload a photo</p>
                <p className='text-xs mt-1'>JPG, PNG or GIF — max 5MB</p>
              </div>
            </div>
            <input ref={profileInputRef} type='file' accept='image/*' className='hidden' onChange={handleProfilePicChange} />
          </div>

          {/* First Name */}
          <div>
            <label className='block text-sm font-medium mb-1' style={{ color: 'var(--text-secondary)' }}>First Name</label>
            <input
              type='text' name='first_name' value={formData.first_name} onChange={handleChange}
              className='w-full rounded-xl px-4 py-2.5 text-sm outline-none transition'
              style={inputStyle}
            />
          </div>

          {/* Last Name */}
          <div>
            <label className='block text-sm font-medium mb-1' style={{ color: 'var(--text-secondary)' }}>Last Name</label>
            <input
              type='text' name='last_name' value={formData.last_name} onChange={handleChange}
              className='w-full rounded-xl px-4 py-2.5 text-sm outline-none transition'
              style={inputStyle}
            />
          </div>

          {/* Bio */}
          <div>
            <label className='block text-sm font-medium mb-1' style={{ color: 'var(--text-secondary)' }}>Bio</label>
            <textarea
              name='bio' value={formData.bio} onChange={handleChange}
              rows='3' placeholder='Tell people about yourself...'
              className='w-full rounded-xl px-4 py-2.5 text-sm outline-none resize-none transition'
              style={inputStyle}
            />
          </div>

          {/* Location */}
          <div>
            <label className='block text-sm font-medium mb-1' style={{ color: 'var(--text-secondary)' }}>Location</label>
            <input
              type='text' name='location' value={formData.location} onChange={handleChange}
              placeholder='e.g. Mumbai, India'
              className='w-full rounded-xl px-4 py-2.5 text-sm outline-none transition'
              style={inputStyle}
            />
          </div>

          {/* Buttons */}
          <div className='flex gap-3 pt-2'>
            <button
              type='button'
              onClick={() => setShowEdit(false)}
              className='flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition border active:scale-95'
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
            >
              Cancel
            </button>
            <button
              type='submit'
              disabled={loading}
              className='flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition active:scale-95 disabled:opacity-50'
              style={{ backgroundColor: 'var(--accent)' }}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ProfileModal