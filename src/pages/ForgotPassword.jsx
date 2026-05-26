import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'
import { ArrowLeft, Mail, Send } from 'lucide-react'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [logoError, setLogoError] = useState(false)
  const { forgotPassword, loading } = useAuthStore()

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!email) {
      toast.error('Please enter your email')
      return
    }

    const result = await forgotPassword(email)
    
    if (result.success) {
      setSent(true)
      toast.success('Password reset link sent to your email')
    } else {
      toast.error(result.error || 'Failed to send reset link')
    }
  }

  return (
    <div className="min-h-screen bg-[#333] flex items-center justify-center p-4 font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[380px]"
      >
        <div className="
          text-[#babecc] 
          w-full 
          p-[35px] 
          rounded-[2em] 
          bg-[#333]
          transition-all duration-400
          shadow-[5px_5px_20px_#575259,-5px_-5px_20px_#111011]
          hover:text-white
          hover:shadow-[-5px_-5px_20px_#111011,5px_5px_10px_#b2caff,6px_6px_30px_#99b9ff,-5px_-5px_25px_#111011]
          hover:[text-shadow:0_0_2px_#fff,0_0_2px_#fff,0_0_2px_#fff,0_0_5px_#99b9ff,0_0_10px_#99b9ff,0_0_20px_#99b9ff,0_0_30px_#99b9ff,0_0_50px_#99b9ff]
        ">
          {/* Logo */}
          <div className="flex justify-center mb-5">
            <div className="
              w-[90px] h-[90px] 
              rounded-full 
              flex items-center justify-center
              bg-[rgba(255,255,255,0.05)]
              shadow-[inset_2px_2px_5px_#111011,inset_-5px_-5px_10px_#575259]
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
                <div className="w-full h-full rounded-full bg-primary/20 flex items-center justify-center">
                  <Mail className="w-10 h-10 text-primary" />
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <div className="text-center text-[25px] tracking-[2px] mb-4">
            <h1 className="font-bold text-white mb-1">Forgot Password?</h1>
            <p className="text-[15px] text-gray-400">
              {sent ? 'Check your email for reset instructions' : 'Enter your email to reset password'}
            </p>
          </div>

          {!sent ? (
            <form onSubmit={handleSubmit} className="pt-5 pb-1 px-1">
              <div className="mb-5">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Please enter your e-mail"
                  className="
                    w-full 
                    px-5 
                    py-5 
                    text-[20px]
                    bg-transparent
                    text-[#babecc]
                    placeholder-[#babecc]
                    rounded-[25px]
                    bg-[rgba(255,255,255,0.05)]
                    shadow-[inset_2px_2px_5px_#111011,inset_-5px_-5px_10px_#575259]
                    transition-all duration-300
                    hover:text-white
                    hover:placeholder-white
                    focus:text-white
                    focus:[text-shadow:0_0_2px_#fff,0_0_2px_#fff,0_0_2px_#99b9ff,0_0_5px_#99b9ff,0_0_5px_#99b9ff]
                  "
                />
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="
                  w-full 
                  py-5 
                  px-5 
                  mt-5 
                  text-[20px] 
                  text-[#babecc] 
                  bg-[#333] 
                  rounded-[25px]
                  shadow-[5px_5px_20px_#575259,-5px_-5px_20px_#111011]
                  cursor-pointer
                  transition-all duration-300
                  hover:text-white
                  hover:shadow-[-5px_-5px_25px_#111011,3px_3px_10px_#b2caff,4px_4px_20px_#99b9ff,-5px_-5px_25px_#111011]
                  hover:[text-shadow:0_0_2px_#fff,0_0_2px_#fff,0_0_2px_#fff,0_0_5px_#99b9ff,0_0_10px_#99b9ff,0_0_20px_#99b9ff,0_0_30px_#99b9ff,0_0_50px_#99b9ff]
                  active:shadow-[inset_2px_2px_5px_#111011,inset_-5px_-5px_10px_#575259]
                  active:text-[#7fa8ff]
                  active:[text-shadow:0_0_2px_#99b9ff,0_0_2px_#99b9ff,0_0_2px_#99b9ff,0_0_5px_#99b9ff,0_0_10px_#99b9ff,0_0_20px_#99b9ff,0_0_30px_#99b9ff,0_0_50px_#99b9ff]
                  disabled:opacity-50
                  disabled:cursor-not-allowed
                  flex items-center justify-center space-x-2
                "
              >
                <Send className="w-5 h-5" />
                <span>{loading ? 'Sending...' : 'Send Reset Link'}</span>
              </motion.button>
            </form>
          ) : (
            <div className="text-center pt-5">
              <div className="mb-6 p-4 bg-green-500/10 rounded-[25px] border border-green-500/20">
                <p className="text-green-400 text-sm">
                  We've sent a password reset link to <strong className="text-primary">{email}</strong>
                </p>
                <p className="text-gray-400 text-xs mt-2">
                  Please check your inbox and follow the instructions.
                </p>
              </div>
              
              <motion.button
                type="button"
                onClick={() => setSent(false)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="
                  w-full 
                  py-5 
                  px-5 
                  text-[20px] 
                  text-[#babecc] 
                  bg-[#333] 
                  rounded-[25px]
                  shadow-[5px_5px_20px_#575259,-5px_-5px_20px_#111011]
                  cursor-pointer
                  transition-all duration-300
                  hover:text-white
                  hover:shadow-[-5px_-5px_25px_#111011,3px_3px_10px_#b2caff,4px_4px_20px_#99b9ff,-5px_-5px_25px_#111011]
                  hover:[text-shadow:0_0_2px_#fff,0_0_2px_#fff,0_0_2px_#fff,0_0_5px_#99b9ff,0_0_10px_#99b9ff,0_0_20px_#99b9ff,0_0_30px_#99b9ff,0_0_50px_#99b9ff]
                  active:shadow-[inset_2px_2px_5px_#111011,inset_-5px_-5px_10px_#575259]
                  active:text-[#7fa8ff]
                "
              >
                Send Again
              </motion.button>
            </div>
          )}

          {/* Back to Login */}
          <div className="text-center mt-6">
            <Link
              to="/login"
              className="
                inline-flex items-center space-x-2
                text-[#babecc] 
                text-[14px] 
                no-underline 
                transition-all duration-300
                hover:text-white
                hover:[text-shadow:0_0_2px_#fff,0_0_5px_#99b9ff,0_0_10px_#99b9ff]
              "
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Login</span>
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
