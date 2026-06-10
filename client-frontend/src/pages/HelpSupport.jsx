import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, HelpCircle, MessageCircle, Bug, BookOpen,
  Mail, ChevronDown, ChevronUp, Shield, X,
  Heart, Send, CheckCircle, ChevronRight,
  Lock, Eye, Database, UserCheck, AlertTriangle,
  Smartphone, Image, Users, MessageSquare, Settings,
  Bell, Search, Star, Zap, Camera, Video,
  Bot, User as UserIcon, Loader, Sparkles
} from 'lucide-react'
import toast from 'react-hot-toast'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`

const SYSTEM_PROMPT = `You are a helpful and friendly support assistant for lilChat — a social media app.
lilChat features: posts, stories (24hr), direct messaging, connections (followers/following), discover people, dark/light mode, profile editing.
Keep your answers short, friendly, and to the point. Use emojis occasionally. 
If asked something unrelated to lilChat or general tech/social media support, politely say you can only help with lilChat.
Always respond in the same language the user writes in (Hindi or English).`

/* ─────────────────────────────────────────────
   AI CHATBOT MODAL
───────────────────────────────────────────── */
const ChatBotModal = ({ onClose }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "Hi! 👋 I'm lilChat's AI assistant powered by Gemini. How can I help you today?"
    }
  ])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const messagesEndRef = React.useRef(null)
  const isSending = React.useRef(false)  // hard lock — prevents double/triple sends

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  React.useEffect(() => { scrollToBottom() }, [messages, thinking])

  const sendMessage = async (overrideText) => {
    const text = (overrideText !== undefined ? overrideText : input).trim()
    if (!text) return
    if (isSending.current) return  // hard lock — prevents triple sends
    isSending.current = true

    if (!GEMINI_API_KEY) {
      setMessages(prev => [...prev,
        { role: 'user', text },
        { role: 'assistant', text: '⚠️ AI is not configured. Please add VITE_GEMINI_API_KEY to your .env file.' }
      ])
      isSending.current = false
      return
    }

    setMessages(prev => [...prev, { role: 'user', text }])
    setInput('')
    setThinking(true)

    try {
      // Build Gemini contents array from full message history + new message
      // Gemini requires strictly alternating user/model roles
      const history = messages.slice(1) // drop the opening greeting
      const contents = []

      for (const m of history) {
        const geminiRole = m.role === 'assistant' ? 'model' : 'user'
        // Prepend system prompt to very first user message
        const msgText = (geminiRole === 'user' && contents.length === 0)
          ? `${SYSTEM_PROMPT}\n\n${m.text}`
          : m.text
        // Skip consecutive same-role messages (safety guard)
        if (contents.length > 0 && contents[contents.length - 1].role === geminiRole) continue
        contents.push({ role: geminiRole, parts: [{ text: msgText }] })
      }

      // Add current user message
      if (contents.length === 0) {
        // First ever message — include system prompt
        contents.push({ role: 'user', parts: [{ text: `${SYSTEM_PROMPT}\n\n${text}` }] })
      } else {
        // Must end with 'model' before adding new 'user'
        if (contents[contents.length - 1].role !== 'model') {
          // merge into last user if needed (shouldn't happen normally)
          contents[contents.length - 1].parts[0].text += '\n' + text
        } else {
          contents.push({ role: 'user', parts: [{ text }] })
        }
      }

      const response = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 600 }
        })
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        console.error('Gemini API error:', response.status, JSON.stringify(errData))
        if (response.status === 429) throw new Error('rate_limit')
        throw new Error(`API error ${response.status}`)
      }

      const data = await response.json()
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text
        || "I couldn't understand that. Please try again!"

      setMessages(prev => [...prev, { role: 'assistant', text: reply }])
    } catch (err) {
      console.error('Gemini error:', err.message)
      const errText = err.message === 'rate_limit'
        ? "I'm getting too many requests! Please wait a moment and try again. ⏳"
        : "Sorry, something went wrong. Please try again. 🙏"
      setMessages(prev => [...prev, { role: 'assistant', text: errText }])
    } finally {
      setThinking(false)
      isSending.current = false  // release lock
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const quickQuestions = [
    'How do I create a post?',
    'How to enable dark mode?',
    'My messages are not loading',
    'How do I follow someone?',
  ]

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4'
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
      <div className='w-full max-w-lg h-[85vh] flex flex-col rounded-2xl border overflow-hidden'
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>

        {/* Header */}
        <div className='flex items-center justify-between px-5 py-4 border-b flex-shrink-0'
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-xl flex items-center justify-center relative'
              style={{ background: 'linear-gradient(135deg, #22c55e, #6366f1)' }}>
              <Bot className='w-5 h-5 text-white' />
              {/* Live dot */}
              <span className='absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2'
                style={{ borderColor: 'var(--bg-card)' }} />
            </div>
            <div>
              <div className='flex items-center gap-1.5'>
                <h2 className='font-bold text-sm' style={{ color: 'var(--text-primary)' }}>lilChat AI Assistant</h2>
                <Sparkles className='w-3.5 h-3.5 text-yellow-400' />
              </div>
              <p className='text-xs' style={{ color: 'var(--accent)' }}>● Online</p>
            </div>
          </div>
          <button onClick={onClose}
            className='w-8 h-8 rounded-full flex items-center justify-center transition hover:opacity-70'
            style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-muted)' }}>
            <X className='w-4 h-4' />
          </button>
        </div>

        {/* Messages area */}
        <div className='flex-1 overflow-y-auto p-4 space-y-3' style={{ backgroundColor: 'var(--bg-primary)' }}>

          {/* Quick question chips (only shown at start) */}
          {messages.length === 1 && (
            <div className='flex flex-wrap gap-2 mb-2'>
              {quickQuestions.map(q => (
                <button key={q}
                  onClick={() => sendMessage(q)}
                  className='text-xs px-3 py-1.5 rounded-full border transition hover:opacity-80'
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {/* Bot avatar */}
              {msg.role === 'assistant' && (
                <div className='w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mb-0.5'
                  style={{ background: 'linear-gradient(135deg, #22c55e, #6366f1)' }}>
                  <Bot className='w-3.5 h-3.5 text-white' />
                </div>
              )}

              <div
                className='max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed'
                style={msg.role === 'user'
                  ? { backgroundColor: 'var(--accent)', color: '#fff', borderBottomRightRadius: 4 }
                  : { backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderBottomLeftRadius: 4 }
                }
              >
                {/* Render text with line breaks */}
                {msg.text.split('\n').map((line, j) => (
                  <span key={j}>{line}{j < msg.text.split('\n').length - 1 && <br />}</span>
                ))}
              </div>

              {/* User avatar */}
              {msg.role === 'user' && (
                <div className='w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mb-0.5'
                  style={{ backgroundColor: 'rgba(34,197,94,0.2)' }}>
                  <UserIcon className='w-3.5 h-3.5' style={{ color: 'var(--accent)' }} />
                </div>
              )}
            </div>
          ))}

          {/* Thinking indicator */}
          {thinking && (
            <div className='flex items-end gap-2 justify-start'>
              <div className='w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0'
                style={{ background: 'linear-gradient(135deg, #22c55e, #6366f1)' }}>
                <Bot className='w-3.5 h-3.5 text-white' />
              </div>
              <div className='px-4 py-3 rounded-2xl border flex items-center gap-1.5'
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderBottomLeftRadius: 4 }}>
                <span className='w-1.5 h-1.5 rounded-full animate-bounce' style={{ backgroundColor: 'var(--accent)', animationDelay: '0ms' }} />
                <span className='w-1.5 h-1.5 rounded-full animate-bounce' style={{ backgroundColor: 'var(--accent)', animationDelay: '150ms' }} />
                <span className='w-1.5 h-1.5 rounded-full animate-bounce' style={{ backgroundColor: 'var(--accent)', animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>



        {/* Input bar */}
        <div className='px-4 py-3 border-t flex-shrink-0 transition-colors duration-300'
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className='flex items-center gap-2 rounded-xl px-4 py-2 border transition-colors duration-300'
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)' }}>
            <input
              type='text'
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder='Ask me anything about lilChat...'
              disabled={thinking}
              className='flex-1 bg-transparent outline-none text-sm placeholder-gray-400'
              style={{ color: 'var(--text-primary)' }}
            />
            <button
              onClick={sendMessage}
              disabled={thinking || !input.trim()}
              className='w-8 h-8 rounded-lg flex items-center justify-center text-white transition active:scale-95 disabled:opacity-40'
              style={{ backgroundColor: 'var(--accent)' }}>
              {thinking
                ? <Loader className='w-3.5 h-3.5 animate-spin' />
                : <Send className='w-3.5 h-3.5' />
              }
            </button>
          </div>
          <p className='text-center text-[10px] mt-1.5' style={{ color: 'var(--text-muted)' }}>
            AI can make mistakes. For urgent issues, use Contact Us below.
          </p>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   PRIVACY POLICY MODAL
───────────────────────────────────────────── */
const PrivacyModal = ({ onClose }) => {
  const sections = [
    { icon: Database, color: '#6366f1', bg: 'rgba(99,102,241,0.12)', title: 'Information We Collect', content: ['Account details: name, email address, and profile picture provided during sign-up.', 'Content you create: posts, stories, messages, comments, and likes.', 'Usage data: pages you visit, features you use, and how you interact with the app.', 'Device information: browser type, operating system, and IP address for security purposes.'] },
    { icon: Eye, color: '#22c55e', bg: 'rgba(34,197,94,0.12)', title: 'How We Use Your Information', content: ['To provide and improve the lilChat experience.', 'To personalise your feed and suggest relevant people to follow.', 'To send important notifications about your account and activity.', 'To detect and prevent spam, fraud, and other harmful behaviour.'] },
    { icon: UserCheck, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', title: 'Who Can See Your Data', content: ['Your posts and profile are visible to all lilChat users by default.', 'Direct messages are only visible to you and the recipient.', 'Your email address is never shared with other users.', 'We do not sell your personal data to third parties.'] },
    { icon: Lock, color: '#ec4899', bg: 'rgba(236,72,153,0.12)', title: 'Data Security', content: ['All data is encrypted in transit using HTTPS/TLS.', 'Passwords are hashed and never stored in plain text.', 'We conduct regular security audits to protect your information.', 'You can delete your account and all associated data at any time.'] },
    { icon: Shield, color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', title: 'Your Rights', content: ['Access: you can request a copy of all data we hold about you.', 'Correction: you can update your personal information at any time from Settings.', 'Deletion: you can permanently delete your account and data.', 'Portability: you can export your posts and media data on request.'] },
  ]
  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4' style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
      <div className='w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border' style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div className='sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b' style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className='flex items-center gap-3'>
            <div className='w-9 h-9 rounded-xl flex items-center justify-center' style={{ backgroundColor: 'rgba(139,92,246,0.12)' }}><Shield className='w-4 h-4' style={{ color: '#8b5cf6' }} /></div>
            <div><h2 className='font-bold text-base' style={{ color: 'var(--text-primary)' }}>Privacy Policy</h2><p className='text-xs' style={{ color: 'var(--text-muted)' }}>Last updated: May 2025</p></div>
          </div>
          <button onClick={onClose} className='w-8 h-8 rounded-full flex items-center justify-center transition hover:opacity-70' style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-muted)' }}><X className='w-4 h-4' /></button>
        </div>
        <div className='p-6 space-y-4'>
          <p className='text-sm leading-relaxed' style={{ color: 'var(--text-secondary)' }}>At <strong style={{ color: 'var(--text-primary)' }}>lilChat</strong>, your privacy is our priority.</p>
          {sections.map(({ icon: Icon, color, bg, title, content }) => (
            <div key={title} className='rounded-xl p-4 border' style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
              <div className='flex items-center gap-2 mb-3'><div className='w-7 h-7 rounded-lg flex items-center justify-center' style={{ backgroundColor: bg }}><Icon className='w-3.5 h-3.5' style={{ color }} /></div><h3 className='font-semibold text-sm' style={{ color: 'var(--text-primary)' }}>{title}</h3></div>
              <ul className='space-y-1.5'>{content.map((item, i) => (<li key={i} className='flex items-start gap-2 text-xs leading-relaxed' style={{ color: 'var(--text-secondary)' }}><span className='mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0' style={{ backgroundColor: color }} />{item}</li>))}</ul>
            </div>
          ))}
          <p className='text-xs text-center' style={{ color: 'var(--text-muted)' }}>Questions? <span style={{ color: 'var(--accent)' }}>privacy@lilchat.app</span></p>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   USER GUIDE MODAL
───────────────────────────────────────────── */
const UserGuideModal = ({ onClose }) => {
  const [activeSection, setActiveSection] = useState(0)
  const guides = [
    { icon: UserCheck, color: '#22c55e', bg: 'rgba(34,197,94,0.12)', title: 'Getting Started', steps: [{ icon: Star, text: 'Sign up using your email or Google account.' }, { icon: Camera, text: 'Add a profile picture and fill in your bio from Profile → Edit Profile.' }, { icon: Search, text: 'Go to Discover to find and follow people you know.' }, { icon: Bell, text: 'Your feed will start showing posts from people you follow.' }] },
    { icon: Image, color: '#6366f1', bg: 'rgba(99,102,241,0.12)', title: 'Posts & Stories', steps: [{ icon: Zap, text: 'Click "Create Post" in the sidebar to share a text post, photo, or video.' }, { icon: Image, text: 'Add up to multiple images or a video to your post.' }, { icon: Camera, text: 'Create a Story from the "+" button in the Stories bar — stories expire in 24 hours.' }, { icon: Heart, text: 'Like and comment on posts from your feed to engage with others.' }] },
    { icon: MessageSquare, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', title: 'Messaging', steps: [{ icon: Users, text: 'Go to Connections → Connections tab to message mutual followers.' }, { icon: MessageSquare, text: "Click the Message button on any user's card to start a chat." }, { icon: ChevronRight, text: 'Reply to specific messages by hovering and clicking the reply icon.' }, { icon: Bell, text: 'New messages show a green badge count on the Messages tab.' }] },
    { icon: Users, color: '#ec4899', bg: 'rgba(236,72,153,0.12)', title: 'Connections', steps: [{ icon: Search, text: 'Use Discover to search for people by name, username, bio, or location.' }, { icon: UserCheck, text: 'Click Follow to follow someone. They will appear in your Following list.' }, { icon: Users, text: 'When someone follows you back, you become "Connections" (mutual followers).' }, { icon: Star, text: 'You can unfollow someone from Connections → Following tab.' }] },
    { icon: Settings, color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', title: 'Settings', steps: [{ icon: Camera, text: 'Edit your profile picture, name, bio, and location from your Profile page.' }, { icon: Shield, text: 'Switch between Light and Dark mode from Settings → Theme.' }, { icon: HelpCircle, text: 'Access Help & Support from Settings anytime you need assistance.' }, { icon: AlertTriangle, text: 'To log out, go to Settings and click Logout (requires confirmation).' }] },
  ]
  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4' style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
      <div className='w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border' style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div className='sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b' style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className='flex items-center gap-3'><div className='w-9 h-9 rounded-xl flex items-center justify-center' style={{ backgroundColor: 'rgba(99,102,241,0.12)' }}><BookOpen className='w-4 h-4' style={{ color: '#6366f1' }} /></div><div><h2 className='font-bold text-base' style={{ color: 'var(--text-primary)' }}>User Guide</h2><p className='text-xs' style={{ color: 'var(--text-muted)' }}>Everything you need to know</p></div></div>
          <button onClick={onClose} className='w-8 h-8 rounded-full flex items-center justify-center transition hover:opacity-70' style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-muted)' }}><X className='w-4 h-4' /></button>
        </div>
        <div className='p-6'>
          <div className='flex gap-2 flex-wrap mb-5'>{guides.map((g, i) => { const Icon = g.icon; return (<button key={i} onClick={() => setActiveSection(i)} className='flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all' style={{ backgroundColor: activeSection === i ? g.color : 'var(--bg-input)', color: activeSection === i ? '#fff' : 'var(--text-secondary)' }}><Icon className='w-3 h-3' />{g.title}</button>) })}</div>
          {(() => { const sec = guides[activeSection]; const SIcon = sec.icon; return (<div className='rounded-2xl p-5 border' style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}><div className='flex items-center gap-3 mb-4'><div className='w-10 h-10 rounded-xl flex items-center justify-center' style={{ backgroundColor: sec.bg }}><SIcon className='w-5 h-5' style={{ color: sec.color }} /></div><h3 className='font-bold' style={{ color: 'var(--text-primary)' }}>{sec.title}</h3></div><div className='space-y-3'>{sec.steps.map(({ icon: StepIcon, text }, idx) => (<div key={idx} className='flex items-start gap-3'><div className='w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5' style={{ backgroundColor: sec.bg }}><StepIcon className='w-3 h-3' style={{ color: sec.color }} /></div><div className='flex items-start gap-2 flex-1'><span className='text-xs font-bold mt-0.5 flex-shrink-0' style={{ color: sec.color }}>{String(idx + 1).padStart(2, '0')}</span><p className='text-sm leading-relaxed' style={{ color: 'var(--text-secondary)' }}>{text}</p></div></div>))}</div></div>) })()}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   BUG REPORT MODAL
───────────────────────────────────────────── */
const BugReportModal = ({ onClose }) => {
  const [category, setCategory] = useState('')
  const [severity, setSeverity] = useState('')
  const [description, setDescription] = useState('')
  const [steps, setSteps] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const categories = ['Login / Signup', 'Messaging', 'Posts & Stories', 'Profile', 'Connections', 'Dark Mode / Theme', 'Other']
  const severities = [{ label: 'Low', desc: 'Minor issue', color: '#22c55e' }, { label: 'Medium', desc: 'Affects features', color: '#f59e0b' }, { label: 'High', desc: 'App unusable', color: '#ef4444' }]
  const handleSubmit = () => {
    if (!category || !severity || !description.trim()) { toast.error('Please fill in all required fields'); return }
    setSubmitted(true); toast.success('Bug report submitted! Thank you 🙏')
  }
  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4' style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
      <div className='w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border' style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div className='sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b' style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className='flex items-center gap-3'><div className='w-9 h-9 rounded-xl flex items-center justify-center' style={{ backgroundColor: 'rgba(245,158,11,0.12)' }}><Bug className='w-4 h-4' style={{ color: '#f59e0b' }} /></div><div><h2 className='font-bold text-base' style={{ color: 'var(--text-primary)' }}>Report a Bug</h2><p className='text-xs' style={{ color: 'var(--text-muted)' }}>Help us fix what's broken</p></div></div>
          <button onClick={onClose} className='w-8 h-8 rounded-full flex items-center justify-center transition hover:opacity-70' style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-muted)' }}><X className='w-4 h-4' /></button>
        </div>
        {submitted ? (
          <div className='p-8 flex flex-col items-center gap-4'>
            <div className='w-16 h-16 rounded-full flex items-center justify-center' style={{ backgroundColor: 'rgba(34,197,94,0.12)' }}><CheckCircle className='w-8 h-8' style={{ color: 'var(--accent)' }} /></div>
            <h3 className='font-bold text-lg' style={{ color: 'var(--text-primary)' }}>Report Submitted!</h3>
            <p className='text-sm text-center' style={{ color: 'var(--text-secondary)' }}>Our team will investigate and work on a fix.</p>
            <div className='rounded-xl p-4 w-full' style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)' }}><p className='text-xs' style={{ color: 'var(--text-muted)' }}>Reference ID</p><p className='font-mono font-bold text-sm mt-0.5' style={{ color: 'var(--text-primary)' }}>BUG-{Date.now().toString().slice(-6)}</p></div>
            <button onClick={onClose} className='w-full py-3 rounded-xl font-semibold text-sm text-white' style={{ backgroundColor: 'var(--accent)' }}>Done</button>
          </div>
        ) : (
          <div className='p-6 space-y-5'>
            <div><label className='text-xs font-semibold mb-2 block' style={{ color: 'var(--text-secondary)' }}>Bug Category <span style={{ color: '#ef4444' }}>*</span></label><div className='flex flex-wrap gap-2'>{categories.map(cat => (<button key={cat} onClick={() => setCategory(cat)} className='px-3 py-1.5 rounded-full text-xs font-medium transition-all' style={{ backgroundColor: category === cat ? 'var(--accent)' : 'var(--bg-input)', color: category === cat ? '#fff' : 'var(--text-secondary)', border: `1px solid ${category === cat ? 'var(--accent)' : 'var(--border-color)'}` }}>{cat}</button>))}</div></div>
            <div><label className='text-xs font-semibold mb-2 block' style={{ color: 'var(--text-secondary)' }}>Severity <span style={{ color: '#ef4444' }}>*</span></label><div className='grid grid-cols-3 gap-2'>{severities.map(({ label, desc, color }) => (<button key={label} onClick={() => setSeverity(label)} className='rounded-xl p-3 text-left border-2 transition-all' style={{ borderColor: severity === label ? color : 'var(--border-color)', backgroundColor: severity === label ? `${color}15` : 'var(--bg-input)' }}><div className='w-2 h-2 rounded-full mb-1.5' style={{ backgroundColor: color }} /><p className='text-xs font-bold' style={{ color: severity === label ? color : 'var(--text-primary)' }}>{label}</p><p className='text-[10px] mt-0.5' style={{ color: 'var(--text-muted)' }}>{desc}</p></button>))}</div></div>
            <div><label className='text-xs font-semibold mb-1.5 block' style={{ color: 'var(--text-secondary)' }}>What happened? <span style={{ color: '#ef4444' }}>*</span></label><textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder='Describe the bug clearly...' className='w-full rounded-xl px-4 py-3 text-sm outline-none resize-none' style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} /></div>
            <div><label className='text-xs font-semibold mb-1.5 block' style={{ color: 'var(--text-secondary)' }}>Steps to reproduce <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label><textarea value={steps} onChange={e => setSteps(e.target.value)} rows={2} placeholder='1. Go to...  2. Click on...  3. See error...' className='w-full rounded-xl px-4 py-3 text-sm outline-none resize-none' style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} /></div>
            <button onClick={handleSubmit} className='w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 text-white transition active:scale-[0.99]' style={{ backgroundColor: '#f59e0b' }}><Bug className='w-4 h-4' />Submit Bug Report</button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   FAQs
───────────────────────────────────────────── */
const faqs = [
  { q: 'How do I send a message to someone?', a: 'Go to Connections tab, find the person you want to message, and click the message icon. You can also go to Messages tab and start a new conversation.' },
  { q: 'How do I create a post or story?', a: 'Click "Create Post" from the sidebar to make a post. For stories, look for the "+" icon in the Stories section at the top of your feed.' },
  { q: 'Why are my messages not loading?', a: 'Make sure you have a stable internet connection. Try refreshing the page. If the issue persists, log out and log back in.' },
  { q: 'How do I switch between light and dark mode?', a: 'Go to Settings → Theme and click on "Light" or "Dark" mode button. Your preference will be saved automatically.' },
  { q: 'Can I delete a post I created?', a: 'Yes! Open the post, click the three-dot menu (⋯) and select Delete. This action cannot be undone.' },
  { q: 'How do I connect with someone?', a: 'Go to the Discover tab to find people. Click "Follow" on their profile to send them a follow request.' },
]

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */
const HelpSupport = () => {
  const navigate = useNavigate()
  const [openFaq, setOpenFaq] = useState(null)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)
  const [modal, setModal] = useState(null)

  const handleSend = () => {
    if (!subject.trim() || !message.trim()) { toast.error('Please fill in both fields'); return }
    setSent(true)
    toast.success("Message sent! We'll get back to you soon.")
    setSubject(''); setMessage('')
    setTimeout(() => setSent(false), 4000)
  }

  const quickActions = [
    { icon: MessageCircle, label: 'Chat with Us',   sub: 'AI-powered instant help',  color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  badge: 'AI', action: () => setModal('chat') },
    { icon: Bug,           label: 'Report a Bug',   sub: 'Something not working?',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', badge: null, action: () => setModal('bug') },
    { icon: BookOpen,      label: 'User Guide',     sub: 'Learn how to use lilChat', color: '#6366f1', bg: 'rgba(99,102,241,0.12)', badge: null, action: () => setModal('guide') },
    { icon: Shield,        label: 'Privacy Policy', sub: 'How we protect your data', color: '#ec4899', bg: 'rgba(236,72,153,0.12)', badge: null, action: () => setModal('privacy') },
  ]

  return (
    <div className='min-h-screen transition-colors duration-300' style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className='max-w-2xl mx-auto px-4 py-8'>

        {/* Header */}
        <div className='flex items-center gap-3 mb-8'>
          <button onClick={() => navigate('/settings')}
            className='w-9 h-9 rounded-xl flex items-center justify-center transition hover:opacity-70'
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <ArrowLeft className='w-4 h-4' style={{ color: 'var(--text-primary)' }} />
          </button>
          <div>
            <h1 className='text-2xl font-bold' style={{ color: 'var(--text-primary)' }}>Help & Support</h1>
            <p className='text-xs' style={{ color: 'var(--text-secondary)' }}>We're here to help you</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className='grid grid-cols-2 gap-3 mb-8'>
          {quickActions.map(({ icon: Icon, label, sub, color, bg, badge, action }) => (
            <button key={label} onClick={action}
              className='rounded-2xl p-4 text-left transition-all duration-200 hover:opacity-80 active:scale-[0.98] border relative overflow-hidden'
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', boxShadow: '0 1px 8px var(--shadow-color)' }}>
              {badge && (
                <span className='absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white flex items-center gap-0.5'
                  style={{ background: 'linear-gradient(135deg,#22c55e,#6366f1)' }}>
                  <Sparkles className='w-2.5 h-2.5' />{badge}
                </span>
              )}
              <div className='w-10 h-10 rounded-xl flex items-center justify-center mb-3' style={{ backgroundColor: bg }}>
                <Icon className='w-5 h-5' style={{ color }} />
              </div>
              <p className='font-semibold text-sm' style={{ color: 'var(--text-primary)' }}>{label}</p>
              <p className='text-xs mt-0.5' style={{ color: 'var(--text-secondary)' }}>{sub}</p>
            </button>
          ))}
        </div>

        {/* FAQs */}
        <div className='mb-8'>
          <div className='flex items-center gap-2 mb-4'>
            <HelpCircle className='w-4 h-4' style={{ color: 'var(--accent)' }} />
            <h2 className='font-bold text-base' style={{ color: 'var(--text-primary)' }}>Frequently Asked Questions</h2>
          </div>
          <div className='space-y-2'>
            {faqs.map((faq, i) => (
              <div key={i} className='rounded-2xl border overflow-hidden transition-all duration-200'
                style={{ backgroundColor: 'var(--bg-card)', borderColor: openFaq === i ? 'var(--accent)' : 'var(--border-color)', boxShadow: '0 1px 6px var(--shadow-color)' }}>
                <button className='w-full flex items-center justify-between p-4 text-left gap-3' onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <p className='font-medium text-sm flex-1' style={{ color: 'var(--text-primary)' }}>{faq.q}</p>
                  {openFaq === i ? <ChevronUp className='w-4 h-4 flex-shrink-0' style={{ color: 'var(--accent)' }} /> : <ChevronDown className='w-4 h-4 flex-shrink-0' style={{ color: 'var(--text-muted)' }} />}
                </button>
                {openFaq === i && (
                  <div className='px-4 pb-4 text-sm leading-relaxed' style={{ color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)' }}>
                    <p className='pt-3'>{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contact Form */}
        <div className='rounded-2xl border p-6 mb-8' style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', boxShadow: '0 1px 8px var(--shadow-color)' }}>
          <div className='flex items-center gap-2 mb-5'>
            <Mail className='w-4 h-4' style={{ color: 'var(--accent)' }} />
            <h2 className='font-bold text-base' style={{ color: 'var(--text-primary)' }}>Contact Us</h2>
          </div>
          {sent ? (
            <div className='flex flex-col items-center py-6 gap-3'>
              <div className='w-14 h-14 rounded-full flex items-center justify-center' style={{ backgroundColor: 'rgba(34,197,94,0.12)' }}><CheckCircle className='w-7 h-7' style={{ color: 'var(--accent)' }} /></div>
              <p className='font-semibold' style={{ color: 'var(--text-primary)' }}>Message Sent!</p>
              <p className='text-sm text-center' style={{ color: 'var(--text-secondary)' }}>We'll get back to you within 24 hours.</p>
            </div>
          ) : (
            <div className='space-y-3'>
              <div><label className='text-xs font-medium mb-1 block' style={{ color: 'var(--text-secondary)' }}>Subject</label><input type='text' value={subject} onChange={e => setSubject(e.target.value)} placeholder='What do you need help with?' className='w-full rounded-xl px-4 py-3 text-sm outline-none transition' style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} /></div>
              <div><label className='text-xs font-medium mb-1 block' style={{ color: 'var(--text-secondary)' }}>Message</label><textarea value={message} onChange={e => setMessage(e.target.value)} placeholder='Describe your issue or question...' rows={4} className='w-full rounded-xl px-4 py-3 text-sm outline-none transition resize-none' style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} /></div>
              <button onClick={handleSend} className='w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99] text-white' style={{ backgroundColor: 'var(--accent)' }}><Send className='w-4 h-4' />Send Message</button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className='text-center space-y-1'>
          <p className='text-sm font-bold' style={{ color: 'var(--text-primary)' }}>lilChat</p>
          <p className='text-xs' style={{ color: 'var(--text-muted)' }}>Version 1.0.0 · Made with <Heart className='inline w-3 h-3 text-red-400' /> in India</p>
          <div className='flex items-center justify-center gap-4 mt-3'>
            {['Terms', 'Privacy', 'Cookies'].map(link => (
              <button key={link} className='text-xs underline underline-offset-2 transition hover:opacity-70' style={{ color: 'var(--text-muted)' }}
                onClick={() => link === 'Privacy' ? setModal('privacy') : toast(`${link} — coming soon!`)}>{link}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      {modal === 'chat'    && <ChatBotModal    onClose={() => setModal(null)} />}
      {modal === 'privacy' && <PrivacyModal    onClose={() => setModal(null)} />}
      {modal === 'guide'   && <UserGuideModal  onClose={() => setModal(null)} />}
      {modal === 'bug'     && <BugReportModal  onClose={() => setModal(null)} />}
    </div>
  )
}

export default HelpSupport
