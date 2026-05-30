import React from 'react'
import { assets } from '../assets/assets'
import { Star } from 'lucide-react'
import { SignIn } from '@clerk/react'
const Login = () => {
  return (
    <div className='min-h-screen flex flex-col md:flex-row relative'>
      {/* background image */}
      <img src={assets.bgImage} alt="background" className='absolute inset-0 w-full h-full object-cover -z-10' />

      {/* left side :branding */}
      <div className='flex-1 flex flex-col items-start justify-between p-6 md:p-10 lg:pl-40'>
         <h1 className='text-3xl font-bold text-green-600'>lilChat</h1>
        <div>
          <div className='flex item-center gap-3 mb-4 max-md:mt-10'>      
            <img src={assets.group_users} alt="group_users" className='h-8 md:h-10' />
           <div>
            <div className='flex'>
              {Array(5).fill().map((_, i) => (<Star key={i} className='size-4 md:size-4.5 text-transparent fill-amber-500' />))}
            </div>
            <p>Used by 15k developers</p>
           </div>
          </div>
          <h1 className='text-3xl md:text-6xl md:pb-2 font-bold bg-gradient-to-r from-green-950 to-green-800 bg-clip-text text-transparent'>More than just friends truly connect</h1>
          <p className='text-xl md:text-3xl text-green-900 max-w-72 md:max-w-md'>connect with global community on pingup.</p>
        </div>
        <span className='md:h-10'></span>
      </div>

      {/* right side :login form */}
      <div className='flex-1 flex items-center justify-center p-6 md:p-10'>
        <SignIn/>
      </div>

    </div>
  )
}

export default Login