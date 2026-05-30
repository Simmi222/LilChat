import { ArrowLeft, Sparkle, TextIcon, Upload } from 'lucide-react'
import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { storiesAPI } from '../services/api'
import { useUser } from '@clerk/react'


const StoryModal = ({ setShowModal, fetchStories }) => {
    const { user: clerkUser } = useUser()
    const bgColor = ["#FF5733", "#33FF57", "#3357FF", "#FF33A8", "#A833FF", "#FF8C33", "#8CFF33", "#8C33FF", "#FF3333"]

    const [mode, setMode] = useState("text")
    const [background, setBackground] = useState(bgColor[0])
    const [text, setText] = useState("")
    const [media, setMedia] = useState(null)
    const [previewUrl, setPreviewUrl] = useState(null)


    const handleMediaUpload = (e) => {
        const file = e.target.files[0]
        if (file) {
            setMedia(file)
            setPreviewUrl(URL.createObjectURL(file))
            setMode("media")
        }
    }
    const handleCreateStory = async () => {
        if (mode === "text" && text.trim() === "") {
            toast.error("Please enter text or upload media")
            return
        }
        if (mode === "media" && !media) {
            toast.error("Please upload media")
            return
        }
        try {
            const formData = new FormData()
            formData.append("content", text)
            formData.append("media_type", mode === "media" ? (media?.type.startsWith("video") ? "video" : "image") : "text")
            if (media) formData.append("media", media)
            formData.append("background_color", background)
            if (clerkUser?.id) formData.append("clerk_id", clerkUser.id)
            await storiesAPI.createStory(formData)
            toast.success("Story created successfully")
            setShowModal(false)
            fetchStories()
        } catch (error) {
            console.error('Error creating story:', error)
            toast.error(error.response?.data?.detail || "Failed to create story")
        }
    }
    return (
        <div className='fixed inset-0 z-110 bg-black/80 backdrop-blur text-white flex items-center justify-center p-4'>
            <div className='w-full max-w-sm flex flex-col gap-4'>
                {/* Header */}
                <div className='flex items-center justify-between'>
                    <button onClick={() => setShowModal(false)} className='text-white p-2 cursor-pointer hover:bg-white/10 rounded'>
                        <ArrowLeft size={20} />
                    </button>
                    <h2 className='text-lg font-semibold'>Create Story</h2>
                    <span className='w-10'></span>
                </div>

                {/* Story Preview */}
                <div className='rounded-lg w-32 h-48 mx-auto flex items-center justify-center relative aspect-[3/4]' style={{ backgroundColor: background }}>
                    {mode === "text" && (
                        <textarea
                            className='bg-transparent text-white w-full h-full p-4 text-sm resize-none focus:outline-none text-center'
                            placeholder="What's on your mind?"
                            onChange={(e) => setText(e.target.value)}
                            value={text}
                        />
                    )}
                    {mode === 'media' && previewUrl && (
                        media?.type.startsWith('image') ? (
                            <img src={previewUrl} className='object-cover w-full h-full rounded-lg' alt="preview" />
                        ) : (
                            <video src={previewUrl} className='object-cover w-full h-full rounded-lg' autoPlay muted loop />
                        )
                    )}
                </div>

                {/* Color Palette */}
                <div className='flex gap-2 justify-center flex-wrap'>
                    {bgColor.map((color) => (
                        <button
                            key={color}
                            className='w-6 h-6 rounded-full ring-2 ring-offset-1 ring-offset-gray-900 cursor-pointer hover:ring-offset-2 transition'
                            style={{ backgroundColor: color }}
                            onClick={() => setBackground(color)}
                        />
                    ))}
                </div>

                {/* Mode Toggle */}
                <div className='flex gap-2'>
                    <button
                        onClick={() => { setMode('text'); setMedia(null); setPreviewUrl(null) }}
                        className={`flex-1 flex items-center justify-center gap-2 p-2 rounded cursor-pointer transition ${mode === 'text' ? "bg-white text-black font-medium" : "bg-zinc-800 hover:bg-zinc-700"}`}>
                        <TextIcon size={16} />
                        <span className='text-sm'>Text</span>
                    </button>
                    <label className={`flex-1 flex items-center justify-center gap-2 p-2 rounded cursor-pointer transition ${mode === 'media' ? "bg-white text-black font-medium" : "bg-zinc-800 hover:bg-zinc-700"}`}>
                        <input onChange={(e) => { handleMediaUpload(e); setMode('media') }} type="file" accept='image/*,video/*' className='hidden' />
                        <Upload size={16} />
                        <span className='text-sm'>Photo/video</span>
                    </label>
                </div>

                {/* Create Button */}
                <button
                    onClick={handleCreateStory}
                    className='flex items-center justify-center gap-2 text-white py-3 rounded bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 active:scale-95 transition font-medium'>
                    <Sparkle size={18} /> Create Story
                </button>
            </div>
        </div>
    )
}

export default StoryModal