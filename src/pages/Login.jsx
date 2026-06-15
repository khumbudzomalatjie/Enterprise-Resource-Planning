import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import useAuthStore from '../store/authStore'
import useThemeStore from '../store/themeStore'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Sun, Moon } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [logoError, setLogoError] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const { signIn, loading, profile, user } = useAuthStore()
  const { isDark, toggleTheme, initTheme } = useThemeStore()
  const navigate = useNavigate()

  useEffect(() => {
    initTheme()
  }, [initTheme])

  // If already logged in, redirect immediately
  useEffect(() => {
    if (!loading && user && profile && !isLoggingIn) {
      if (profile.role === 'cleaner') {
        window.location.href = '/mobile'
      } else {
        window.location.href = '/dashboard'
      }
    }
  }, [])

  // Redirect based on role AFTER profile is loaded
  useEffect(() => {
    if (isLoggingIn && profile && user && !loading) {
      console.log('✅ Login complete - Profile:', profile.role)
      
      // Force a small delay to ensure state is set, then hard redirect
      setTimeout(() => {
        if (profile.role === 'cleaner') {
          console.log('→ Redirecting cleaner to /mobile')
          window.location.href = '/mobile'
        } else {
          console.log('→ Redirecting to /dashboard')
          window.location.href = '/dashboard'
        }
      }, 500)
      
      setIsLoggingIn(false)
    }
  }, [isLoggingIn, profile, user, loading])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!email || !password) {
      toast.error('Please fill in all fields')
      return
    }

    setIsLoggingIn(true)
    const result = await signIn(email, password)
    
    if (!result.success) {
      setIsLoggingIn(false)
      toast.error(result.error || 'Login failed')
    }
    // If success, the useEffect above will handle the redirect
    // after the profile is loaded into the store
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 font-['Inter'] transition-colors duration-300 ${
      isDark 
        ? 'bg-gradient-to-br from-slate-900 to-slate-800' 
        : 'bg-gradient-to-br from-slate-100 to-slate-200'
    }`}>
      {/* Theme Toggle */}
      <div className="fixed top-4 right-4 z-50">
        <button 
          onClick={toggleTheme}
          className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center hover:scale-110 transition-transform"
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          style={{
            background: isDark ? 'linear-gradient(145deg, #1e293b, #0f172a)' : 'linear-gradient(145deg, #eef2f8, #e2e8f0)',
            boxShadow: isDark ? '8px 8px 16px #020617, -8px -8px 16px #334155' : '8px 8px 16px #cbd5e1, -8px -8px 16px #ffffff'
          }}
        >
          {isDark ? (
            <Sun className="w-6 h-6 text-amber-400" />
          ) : (
            <Moon className="w-6 h-6 text-slate-600" />
          )}
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[380px]"
      >
        <div className="
          neu-raised
          w-full 
          p-[35px] 
          rounded-[2em]
          transition-all duration-300
        ">
          {/* Logo */}
          <div className="flex justify-center mb-5">
            <div className="
              w-[90px] h-[90px] 
              rounded-full 
              flex items-center justify-center
              neu-inset
              p-2.5
              overflow-hidden
            ">
              {!logoError ? (
                <img 
                  src="/logo.png" 
                  alt="Ndanduleni Group Logo"
                  className="w-full h-full object-contain rounded-full"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div className="w-full h-full rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">NG</span>
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <div className="text-center text-[25px] tracking-[2px]">
            <h1 className="font-bold text-slate-800 dark:text-white mb-1">
              NDANDULENI GROUP
            </h1>
            <p className="text-[15px] -mt-2 text-slate-500 dark:text-slate-400">
              Enterprise Resource Planning
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="pt-5 pb-1 px-1">
            <div className="mb-5">
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Please enter your e-mail"
                className="
                  w-full 
                  px-5 
                  py-5 
                  text-[20px]
                  bg-transparent
                  text-slate-700 dark:text-slate-200
                  placeholder-slate-400 dark:placeholder-slate-500
                  rounded-[25px]
                  neu-inset
                  transition-all duration-300
                  focus:ring-2 focus:ring-emerald-500/50
                "
              />
            </div>

            <div className="mb-5 relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="
                  w-full 
                  px-5 
                  py-5 
                  text-[20px]
                  bg-transparent
                  text-slate-700 dark:text-slate-200
                  placeholder-slate-400 dark:placeholder-slate-500
                  rounded-[25px]
                  neu-inset
                  transition-all duration-300
                  pr-12
                  focus:ring-2 focus:ring-emerald-500/50
                "
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* Forgot Password */}
            <div className="text-right -mt-2 mb-2">
              <Link
                to="/forgot-password"
                className="
                  text-slate-500 dark:text-slate-400
                  text-[14px] 
                  no-underline 
                  transition-all duration-300
                  hover:text-emerald-600 dark:hover:text-emerald-400
                  inline-block
                "
              >
                Forgot Password?
              </Link>
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={loading || isLoggingIn}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="
                w-full 
                py-5 
                px-5 
                mt-5 
                text-[20px]
                font-medium
                text-white
                bg-gradient-to-br from-emerald-700 to-emerald-800
                rounded-[25px]
                neu-btn
                shadow-lg
                transition-all duration-300
                hover:from-emerald-600 hover:to-emerald-700
                disabled:opacity-50
                disabled:cursor-not-allowed
              "
            >
              {loading || isLoggingIn ? 'Signing in...' : 'Log in'}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
