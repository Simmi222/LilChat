import React, { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import moment from 'moment'
import StoryModal from './StoryModal'
import StoryViewer from '../components/StoryViewer'
import { storiesAPI } from '../services/api'
import toast from 'react-hot-toast'
const StoriesBar = () => {
    const [stories, setStories] = useState([])
    const [showModal, setShowModal] = useState(false)
    const [viewStory, setViewStory] = useState(null)

    const fetchStories = async () => {
        try {
            const response = await storiesAPI.getFollowingStories()
            setStories(Array.isArray(response.data) ? response.data : [])
        } catch (error) {
            console.error('Error fetching stories:', error)
            // toast.error('Failed to load stories')
            setStories([])
        }
    }
    useEffect(() => {
        fetchStories()
    }, [])
    return (
        <div className='w-screen sm:w-[calc(100vw-240px)] lg:max-w-2xl no-scrollbar overflow-x-auto px-4'>
            <div className='flex gap-4 pb-5'>
                {/* add story card */}
                <div onClick={() => setShowModal(true)} className='rounded-lg shadow-sm min-w-30 max-w-30 max-h-40 aspect-[3/4] cursor-pointer hover:shadow-lg transition-all duration-200 border-2 border-dashed border-green-300 bg-gradient-to-b from-green-50 to-white'>
                    <div className='h-full flex flex-col items-center justify-center p-4'>
                        <div className='size-10 bg-green-500 rounded-full flex items-center justify-center mb-3'>
                            <Plus className='w-5 h-5 text-white' />
                        </div>
                        <p className='text-sm font-medium text-slate-700'> Create Story</p>
                    </div>
                </div>
                {/* story card */}
                {
                    stories.map((story, index) => (
                        <div key={index} onClick={() => setViewStory(story)} className={`relative rounded-lg overflow-hidden shadow-sm min-w-30 max-w-30 h-40 aspect-[3/4] cursor-pointer hover:shadow-lg transition-all duration-200 bg-gradient-to-b from-green-500 to-green-600 hover:from-green-700 hover:to-green-800 active:scale-95`}>
                            {/* Profile Pic */}
                            <img src={story.user.profile_picture} alt="" className='absolute size-8 top-3 left-3 z-20 rounded-full ring ring-gray-100 shadow' />

                            {/* Content */}
                            {story.media_type === 'text' && (
                                <p className='absolute top-14 left-3 right-3 text-white/90 text-sm line-clamp-3 z-20'>{story.content}</p>
                            )}

                            {/* Timestamp */}
                            <p className='text-white absolute bottom-1 right-2 z-20 text-xs drop-shadow-md'>{moment(story.createdAt).fromNow()}</p>

                            {/* Media Background */}
                            {
                                story.media_type !== 'text' && (
                                    <div className='absolute inset-0 z-0 bg-black'></div>
                                )
                            }

                            {/* Media Layer */}
                            {
                                story.media_type === 'image' && (
                                    <img src={story.media_url} alt="" className='absolute inset-0 z-10 w-full h-full object-cover hover:scale-110 transition-all duration-500 opacity-70 hover:opacity-80' />
                                )
                            }
                            {
                                story.media_type === 'video' && (
                                    <video src={story.media_url} autoPlay muted loop playsInline className='absolute inset-0 z-10 w-full h-full object-cover hover:scale-110 transition-all duration-500 opacity-70 hover:opacity-80'></video>
                                )
                            }
                        </div>
                    ))
                }
            </div>

            {/* add story modal */}
            {showModal && <StoryModal setShowModal={setShowModal} fetchStories={fetchStories} />}
            
            {/* story viewer */}
            {viewStory && <StoryViewer viewStory={viewStory} setViewStory={setViewStory} />}
        </div>
    )
}

export default StoriesBar