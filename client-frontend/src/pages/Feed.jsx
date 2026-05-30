import React, { useCallback } from 'react'
import { useEffect, useState } from 'react'
import Loading from '../components/Loading'
import StoriesBar from '../components/StoriesBar'
import Postcard from '../components/Postcard'
import { postsAPI } from '../services/api'
import toast from 'react-hot-toast'
import { useUser } from '@clerk/react'

const Feed = () => {
  const { user: clerkUser } = useUser()
  const [feeds, setFeeds] = useState([])
  const [loading, setLoading] = useState(true)

  // silent=true → background refresh (no spinner), used after like/unlike
  const fetchFeeds = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      // Pass clerk_id so backend returns correct liked_by_current_user + liked-post ordering
      const response = await postsAPI.getPosts(clerkUser?.id ? { clerk_id: clerkUser.id } : {})
      setFeeds(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      console.error('Error fetching feed:', error)
      if (!silent) setFeeds([])
    } finally {
      if (!silent) setLoading(false)
    }
  }, [clerkUser?.id])

  useEffect(() => {
    fetchFeeds()
  }, [clerkUser?.id])

  if (loading) return <Loading />

  return (
    <div className='h-full overflow-y-scroll no-scrollbar py-10 flex items-start justify-center'>
      <div>
        <StoriesBar />
        <div className='p-4 space-y-6'>
          {feeds && feeds.length > 0 ? (
            feeds.map((post) => (
              <Postcard
                key={post.id}
                post={post}
                onPostUpdate={() => fetchFeeds(true)}
                onPostDeleted={(id) => setFeeds(prev => prev.filter(p => p.id !== id))}
              />
            ))
          ) : (
            <div className='text-center py-10' style={{ color: 'var(--text-muted)' }}>
              <p>No posts yet. Follow some users to see their posts!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Feed