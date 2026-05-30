import React, { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useUser } from '@clerk/react'
import Loading from '../components/Loading'
import SideBar from '../components/SideBar'
import { Menu, X } from 'lucide-react'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api'

const Layout = () => {
  const { user: clerkUser, isLoaded } = useUser()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [syncLoading, setSyncLoading] = useState(true)

  // Sync Clerk user with Django backend
  useEffect(() => {
    const syncUser = async () => {
      try {
        if (clerkUser) {
          await axios.post(`${API_BASE}/users/sync/`, {
            clerk_id: clerkUser.id,
            email: clerkUser.emailAddresses[0]?.emailAddress,
            first_name: clerkUser.firstName || '',
            last_name: clerkUser.lastName || '',
          })
        }
      } catch (error) {
        console.error('Error syncing user:', error)
      } finally {
        setSyncLoading(false)
      }
    }

    if (isLoaded && clerkUser) {
      syncUser()
    }
  }, [clerkUser, isLoaded])

  if (!isLoaded || syncLoading) return <Loading />

  return clerkUser ? (
    <div className='w-full flex h-screen'>
      <SideBar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className='flex-1 overflow-y-auto transition-colors duration-300' style={{ backgroundColor: 'var(--bg-primary)' }}>
        <Outlet />
      </div>

      {sidebarOpen ? (
        <X
          className='absolute top-3 right-3 p-2 z-[100] bg-white rounded-md shadow w-10 h-10 text-gray-600 sm:hidden'
          onClick={() => setSidebarOpen(false)}
        />
      ) : (
        <Menu
          className='absolute top-3 right-3 p-2 z-[100] bg-white rounded-md shadow w-10 h-10 text-gray-600 sm:hidden'
          onClick={() => setSidebarOpen(true)}
        />
      )}
    </div>
  ) : (
    <Loading />
  )
}

export default Layout