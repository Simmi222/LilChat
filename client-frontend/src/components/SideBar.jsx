import React from 'react'
import MenuItem from './MenuItem'
import { Link, useNavigate } from 'react-router-dom'
import { assets } from '../assets/assets'
import { CirclePlus, LogOut } from 'lucide-react'
import { useClerk, UserButton, useUser } from '@clerk/react'

const SideBar = ({ sidebarOpen, setSidebarOpen }) => {
  const navigate = useNavigate()
  const { user: clerkUser } = useUser()
  const { signOut } = useClerk()
  return (
    <div
      className={`w-60 xl:w-72 flex flex-col justify-between items-center max-sm:absolute top-0 bottom-0 z-20 ${sidebarOpen ? 'translate-x-0' : 'max-sm:-translate-x-full'} transition-all duration-300 ease-in-out`}
      style={{ backgroundColor: 'var(--bg-sidebar)', borderRight: '1px solid var(--border-color)' }}
    >
      <div className='w-full'>
        <h1 onClick={() => navigate('/')} className='text-2xl font-bold text-green-600 ml-7 my-2 cursor-pointer'>lilChat</h1>
        <hr className='border-gray-300 mb-8' />

        <MenuItem setSidebarOpen={setSidebarOpen} />
        <Link to='/create-post' className='flex items-center justify-center gap-2 py-2.5 mt-6 mx-6 rounded-lg bg-gradient-to-r from-green-500 to-green-600 hover:from-green-700 hover:to-green-800 active:scale-95 transition text-white cursor-pointer'>
          <CirclePlus className='w-5 h=5' />
          Create Post
        </Link>
      </div>

      <div className='w-full p-4 px-7 flex items-center justify-between transition-colors duration-300' style={{ borderTop: '1px solid var(--border-color)' }}>
        <div className='flex gap-2 item-center cursor-pointer'>
          <UserButton 
            appearance={{
              elements: {
                userButtonAvatarBox: 'w-10 h-10',
                userButtonTrigger: 'focus-visible:ring-green-500',
              },
              variables: {
                colorPrimary: '#16a34a',
              }
            }}
          />
          <div>
            <h1 className='text-sm font-medium' style={{ color: 'var(--text-primary)' }}>{clerkUser?.fullName || clerkUser?.firstName + ' ' + (clerkUser?.lastName || '')}</h1>
            <p className='text-xs' style={{ color: 'var(--text-muted)' }}>@{clerkUser?.primaryEmailAddress?.emailAddress?.split('@')[0] || 'user'}</p>
          </div>
        </div>
        <LogOut onClick={signOut} className='w-4.5 hover:text-red-400 transition cursor-pointer' style={{ color: 'var(--text-muted)' }} />
      </div>
    </div>
  )
}

export default SideBar