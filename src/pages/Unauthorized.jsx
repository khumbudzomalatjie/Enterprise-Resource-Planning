import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShieldOff, ArrowLeft, Home } from 'lucide-react'

export default function Unauthorized() {
  const navigate = useNavigate()

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
          <div className="flex justify-center mb-5">
            <div className="
              w-[90px] h-[90px] 
              rounded-full 
              flex items-center justify-center
              bg-[rgba(255,255,255,0.05)]
              shadow-[inset_2px_2px_5px_#111011,inset_-5px_-5px_10px_#575259]
              p-2.5
            ">
              <div className="w-full h-full rounded-full bg-red-500/20 flex items-center justify-center">
                <ShieldOff className="w-10 h-10 text-red-400" />
              </div>
            </div>
          </div>

          <div className="text-center text-[25px] tracking-[2px] mb-6">
            <h1 className="font-bold text-white mb-1">403</h1>
            <h2 className="font-semibold text-white text-lg mb-2">Access Denied</h2>
            <p className="text-[15px] text-gray-400">
              You don't have permission to access this page. Please contact your administrator if you believe this is a mistake.
            </p>
          </div>

          <div className="px-1 space-y-3">
            <motion.button
              onClick={() => navigate('/dashboard')}
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
                flex items-center justify-center space-x-2
              "
            >
              <Home className="w-5 h-5" />
              <span>Go to Dashboard</span>
            </motion.button>

            <motion.button
              onClick={() => navigate(-1)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="
                w-full 
                py-4 
                px-5 
                text-[16px] 
                text-gray-400 
                bg-transparent
                rounded-[25px]
                cursor-pointer
                transition-all duration-300
                hover:text-white
                flex items-center justify-center space-x-2
              "
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Go Back</span>
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
