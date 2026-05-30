import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Settings as SettingsIcon,
  Moon, Sun, HelpCircle, LogOut,
  ChevronRight, Palette, Check
} from 'lucide-react'
import { useClerk } from '@clerk/react'
import { useTheme } from '../context/ThemeContext'
import toast from 'react-hot-toast'

const Settings = () => {
  const { signOut } = useClerk()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [logoutConfirm, setLogoutConfirm] = useState(false)

  const handleLogout = async () => {
    if (!logoutConfirm) {
      setLogoutConfirm(true)
      setTimeout(() => setLogoutConfirm(false), 3000)
      return
    }
    try {
      await signOut()
      toast.success('Logged out successfully')
    } catch {
      toast.error('Failed to logout')
    }
  }

  const isDark = theme === 'dark'

  return (
    <div
      className='min-h-screen transition-colors duration-300'
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <div className='max-w-2xl mx-auto px-4 py-8'>

        {/* ── Header ── */}
        <div className='mb-8'>
          <div className='flex items-center gap-3 mb-1'>
            <div
              className='w-10 h-10 rounded-xl flex items-center justify-center'
              style={{ backgroundColor: 'var(--accent)', opacity: 0.15 }}
            />
            <div
              className='w-10 h-10 rounded-xl flex items-center justify-center absolute'
              style={{ backgroundColor: 'rgba(34,197,94,0.15)' }}
            >
              <SettingsIcon className='w-5 h-5' style={{ color: 'var(--accent)' }} />
            </div>
            <h1 className='text-3xl font-bold' style={{ color: 'var(--text-primary)' }}>
              Settings
            </h1>
          </div>
          <p className='text-sm ml-0 mt-1' style={{ color: 'var(--text-secondary)' }}>
            Manage your preferences
          </p>
        </div>

        <div className='space-y-3'>

          {/* ── APPEARANCE SECTION ── */}
          <p className='text-xs font-semibold uppercase tracking-widest px-1 mb-2' style={{ color: 'var(--text-muted)' }}>
            Appearance
          </p>

          {/* Theme Card */}
          <div
            className='rounded-2xl p-5 border transition-all duration-300'
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-color)',
              boxShadow: '0 1px 8px var(--shadow-color)'
            }}
          >
            <div className='flex items-center gap-3 mb-4'>
              <div className='w-9 h-9 rounded-xl flex items-center justify-center' style={{ backgroundColor: 'rgba(34,197,94,0.12)' }}>
                <Palette className='w-4 h-4' style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <h2 className='font-semibold text-base' style={{ color: 'var(--text-primary)' }}>Theme</h2>
                <p className='text-xs' style={{ color: 'var(--text-secondary)' }}>Choose your display mode</p>
              </div>
            </div>

            {/* Theme Toggle */}
            <div className='grid grid-cols-2 gap-3'>
              {/* Light Mode */}
              <button
                onClick={() => toggleTheme('light')}
                className='relative rounded-xl p-4 border-2 transition-all duration-200 flex flex-col items-center gap-2 group'
                style={{
                  borderColor: !isDark ? 'var(--accent)' : 'var(--border-color)',
                  backgroundColor: !isDark ? 'rgba(34,197,94,0.08)' : 'var(--bg-input)',
                }}
              >
                <div className='w-10 h-10 rounded-full bg-gradient-to-br from-yellow-300 to-orange-400 flex items-center justify-center shadow-md'>
                  <Sun className='w-5 h-5 text-white' />
                </div>
                <span className='text-sm font-semibold' style={{ color: 'var(--text-primary)' }}>Light</span>
                {!isDark && (
                  <span className='absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center' style={{ backgroundColor: 'var(--accent)' }}>
                    <Check className='w-3 h-3 text-white' />
                  </span>
                )}
              </button>

              {/* Dark Mode */}
              <button
                onClick={() => toggleTheme('dark')}
                className='relative rounded-xl p-4 border-2 transition-all duration-200 flex flex-col items-center gap-2 group'
                style={{
                  borderColor: isDark ? 'var(--accent)' : 'var(--border-color)',
                  backgroundColor: isDark ? 'rgba(34,197,94,0.08)' : 'var(--bg-input)',
                }}
              >
                <div className='w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shadow-md'>
                  <Moon className='w-5 h-5 text-indigo-300' />
                </div>
                <span className='text-sm font-semibold' style={{ color: 'var(--text-primary)' }}>Dark</span>
                {isDark && (
                  <span className='absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center' style={{ backgroundColor: 'var(--accent)' }}>
                    <Check className='w-3 h-3 text-white' />
                  </span>
                )}
              </button>
            </div>
          </div>


          {/* ── SUPPORT SECTION ── */}
          <p className='text-xs font-semibold uppercase tracking-widest px-1 mt-5 mb-2' style={{ color: 'var(--text-muted)' }}>
            Support
          </p>

          {/* Help & Support */}
          <button
            onClick={() => navigate('/help-support')}
            className='w-full rounded-2xl border transition-all duration-200 hover:opacity-80 active:scale-[0.99]'
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-color)',
              boxShadow: '0 1px 8px var(--shadow-color)'
            }}
          >
            <div className='flex items-center gap-4 p-5'>
              <div className='w-9 h-9 rounded-xl flex items-center justify-center' style={{ backgroundColor: 'rgba(16,185,129,0.12)' }}>
                <HelpCircle className='w-4 h-4 text-emerald-500' />
              </div>
              <div className='flex-1 text-left'>
                <p className='font-semibold text-sm' style={{ color: 'var(--text-primary)' }}>Help & Support</p>
                <p className='text-xs mt-0.5' style={{ color: 'var(--text-secondary)' }}>FAQs, contact us & report issues</p>
              </div>
              <ChevronRight className='w-4 h-4' style={{ color: 'var(--text-muted)' }} />
            </div>
          </button>

          {/* ── LOGOUT ── */}
          <div className='pt-4'>
            <button
              onClick={handleLogout}
              className='w-full rounded-2xl p-5 font-semibold flex items-center justify-center gap-3 transition-all duration-200 active:scale-[0.99]'
              style={{
                backgroundColor: logoutConfirm ? '#dc2626' : 'rgba(220,38,38,0.1)',
                color: logoutConfirm ? '#ffffff' : '#dc2626',
                border: '1px solid rgba(220,38,38,0.3)'
              }}
            >
              <LogOut className='w-4 h-4' />
              {logoutConfirm ? 'Click again to confirm logout' : 'Logout'}
            </button>
          </div>

        </div>

        {/* Footer */}
        <p className='text-center text-xs mt-8' style={{ color: 'var(--text-muted)' }}>
          lilChat · Version 1.0.0
        </p>
      </div>
    </div>
  )
}

export default Settings
