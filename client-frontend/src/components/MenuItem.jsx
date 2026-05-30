import React from 'react'
import { NavLink } from 'react-router-dom'
import { menuItemsData } from '../assets/assets'

const MenuItem = ({ setSidebarOpen }) => {
  return (
  <div className='px-6 space-y-1 font-medium'>
      {menuItemsData.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          onClick={() => setSidebarOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 py-2 px-3 rounded-xl transition-all duration-150 ${isActive ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' : ''}`
          }
          style={({ isActive }) => isActive ? {} : { color: 'var(--text-secondary)' }}
        >
          <Icon className='w-5 h-5' />
          {label}
        </NavLink>
      ))}
    </div>
  )
}

export default MenuItem