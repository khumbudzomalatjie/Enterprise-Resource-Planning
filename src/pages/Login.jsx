import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'
import { Eye, EyeOff, LogIn } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const { signIn, loading } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!email || !password) {
      toast.error('Please fill in all fields')
      return
    }

    const result = await signIn(email, password)
    
    if (result.success) {
      toast.success('Welcome back!')
      navigate('/dashboard')
    } else {
      toast.error(result.error || 'Login failed')
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
            ">
              <div className="w-full h-full rounded-full bg-primary/20 flex items-center justify-center">
                <LogIn className="w-10 h-10 text-primary" />
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="text-center text-[25px] tracking-[2px]">
            <h1 className="font-bold text-white mb-1">NDANDULENI GROUP</h1>
            <p className="text-[15px] -mt-2 text-gray-400">Enterprise Resource Planning</p>
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
                  pr-12
                "
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#babecc] hover:text-primary transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* Forgot Password */}
            <div className="text-right -mt-2 mb-2">
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="
                  text-[#babecc] 
                  text-[14px] 
                  no-underline 
                  transition-all duration-300
                  hover:text-white
                  hover:[text-shadow:0_0_2px_#fff,0_0_5px_#99b9ff,0_0_10px_#99b9ff]
                  bg-transparent
                  p-0
                  m-0
                  w-auto
                "
              >
                Forgot Password?
              </button>
            </div>

            {/* Submit Button */}
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
              "
            >
              {loading ? 'Signing in...' : 'Log in'}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
