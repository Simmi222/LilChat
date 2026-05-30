import React from 'react'
import { Routes, Route } from 'react-router-dom'
import ChatBox from './pages/ChatBox'
import Connections from './pages/Connections'
import CreatePost from './pages/CreatePost'
import CreateStory from './pages/CreateStory'
import Discover from './pages/Discover'
import Feed from './pages/Feed'
import Layout from './pages/Layout'
import Login from './pages/Login'
import Messages from './pages/Messages'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import HelpSupport from './pages/HelpSupport'
import { useUser } from '@clerk/react'
import { Toaster } from 'react-hot-toast'
function App() {
  const { user } = useUser()
  return (
    <>
      <Toaster/>
      <Routes>
        <Route path="/" element={!user ? <Login /> : <Layout />}>
          <Route index element={<Feed />} />
          <Route path='discover' element={<Discover />} />
          <Route path='messages' element={<Messages />} />
          <Route path='messages/:userId' element={<ChatBox />} />
          <Route path='connections' element={<Connections />} />
          <Route path='create-post' element={<CreatePost />} />
          <Route path='create-story' element={<CreateStory />} />
          <Route path='profile/:profileId' element={<Profile />} />
          <Route path='profile' element={<Profile />} />
          <Route path='settings' element={<Settings />} />
          <Route path='help-support' element={<HelpSupport />} />
        </Route>
      </Routes>
    </>
  )
}

export default App
