import React, { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import StoryModal from './StoryModal'
import StoryViewer from './StoryViewer'
import { storiesAPI } from '../services/api'
import { useUser } from '@clerk/react'

const StoriesBar = () => {
    const { user: clerkUser } = useUser()
    const [stories, setStories] = useState([])
    const [showModal, setShowModal] = useState(false)
    // { stories: [...], index: 0 }
    const [viewing, setViewing] = useState(null)

    const fetchStories = async () => {
        try {
            const response = await storiesAPI.getFollowingStories(clerkUser?.id)
            setStories(Array.isArray(response.data) ? response.data : [])
        } catch (error) {
            console.error('Error fetching stories:', error)
            setStories([])
        }
    }

    useEffect(() => { fetchStories() }, [clerkUser?.id])

    // ── Group stories by user (Instagram style) ──
    // Result: [{ user, stories: [...], latestStory }]
    const grouped = React.useMemo(() => {
        const map = new Map()
        stories.forEach(story => {
            const uid = story.user?.id
            if (!uid) return
            if (!map.has(uid)) {
                map.set(uid, { user: story.user, stories: [], latestStory: story })
            }
            map.get(uid).stories.push(story)
        })
        return Array.from(map.values())
    }, [stories])

    return (
        <div className='w-screen sm:w-[calc(100vw-240px)] lg:max-w-2xl no-scrollbar overflow-x-auto px-4'>
            <div className='flex gap-4 pb-5 pt-1 items-start'>

                {/* ── Create Story bubble ── */}
                <div
                    onClick={() => setShowModal(true)}
                    className='flex flex-col items-center gap-1.5 cursor-pointer flex-shrink-0'
                    style={{ width: 68 }}
                >
                    <div
                        className='w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95'
                        style={{
                            border: '2.5px dashed #22c55e',
                            backgroundColor: 'var(--bg-card)',
                        }}
                    >
                        <Plus className='w-6 h-6 text-green-500' />
                    </div>
                    <span className='text-[11px] font-medium text-center leading-tight' style={{ color: 'var(--text-secondary)' }}>
                        Your Story
                    </span>
                </div>

                {/* ── One bubble per user ── */}
                {grouped.map(({ user, stories: userStories, latestStory }) => {
                    const isOwn = user?.clerk_id === clerkUser?.id
                    const hasMultiple = userStories.length > 1
                    const name = user?.full_name || user?.first_name || 'User'
                    const shortName = name.split(' ')[0]

                    return (
                        <div
                            key={user?.id}
                            onClick={() => setViewing({ stories: userStories, index: 0 })}
                            className='flex flex-col items-center gap-1.5 cursor-pointer flex-shrink-0 group'
                            style={{ width: 68 }}
                        >
                            {/* Avatar ring */}
                            <div className='relative'>
                                {/* Gradient ring = has stories */}
                                <div
                                    className='w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 group-hover:scale-105 active:scale-95'
                                    style={{
                                        background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                        padding: 2.5,
                                    }}
                                >
                                     <div
                                        className='w-full h-full rounded-full overflow-hidden'
                                        style={{ border: '2px solid var(--bg-primary)' }}
                                    >
                                        {/* Show story preview image for image-type stories, else profile pic */}
                                        <img
                                            src={
                                                (latestStory?.media_type === 'image' && latestStory?.media_url)
                                                    ? latestStory.media_url
                                                    : (user?.profile_picture ||
                                                        `https://ui-avatars.com/api/?name=${name}&background=16a34a&color=fff&size=80`)
                                            }
                                            alt={name}
                                            className='w-full h-full object-cover'
                                        />
                                    </div>
                                </div>

                                {/* "You" badge */}
                                {isOwn && (
                                    <span
                                        className='absolute -bottom-0.5 -right-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white'
                                        style={{ backgroundColor: 'var(--accent)', border: '1.5px solid var(--bg-primary)' }}
                                    >
                                        You
                                    </span>
                                )}

                                {/* Multiple stories count badge */}
                                {hasMultiple && !isOwn && (
                                    <span
                                        className='absolute -bottom-0.5 -right-0.5 text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center text-white'
                                        style={{ backgroundColor: '#6366f1', border: '1.5px solid var(--bg-primary)' }}
                                    >
                                        {userStories.length}
                                    </span>
                                )}
                            </div>

                            {/* Username */}
                            <span
                                className='text-[11px] font-medium text-center leading-tight max-w-full truncate'
                                style={{ color: 'var(--text-secondary)', maxWidth: 64 }}
                            >
                                {isOwn ? 'You' : shortName}
                            </span>
                        </div>
                    )
                })}
            </div>

            {/* add story modal */}
            {showModal && <StoryModal setShowModal={setShowModal} fetchStories={fetchStories} />}

            {/* View story — passes full list for prev/next navigation */}
            {viewing && (
                <StoryViewer
                    stories={viewing.stories}
                    initialIndex={viewing.index}
                    onClose={() => setViewing(null)}
                    currentClerkId={clerkUser?.id}
                    onDelete={fetchStories}
                />
            )}
        </div>
    )
}

export default StoriesBar