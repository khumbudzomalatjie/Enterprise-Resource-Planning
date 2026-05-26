import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'
import { Eye, EyeOff } from 'lucide-react'

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
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#333',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: '"Quicksand", sans-serif'
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        style={{ width: '100%', maxWidth: '380px' }}
      >
        <div style={{
          color: '#babecc',
          width: '100%',
          padding: '35px',
          borderRadius: '2em',
          backgroundColor: '#333',
          boxShadow: '5px 5px 20px #575259, -5px -5px 20px #111011',
        }}>
          {/* Logo */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '20px'
          }}>
            <div style={{
              width: '90px',
              height: '90px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              boxShadow: 'inset 2px 2px 5px #111011, inset -5px -5px 10px #575259',
              padding: '10px'
            }}>
              <div style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                backgroundColor: 'rgba(153, 185, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span style={{ fontSize: '40px', color: '#99b9ff' }}>NG</span>
              </div>
            </div>
          </div>

          {/* Title */}
          <div style={{
            textAlign: 'center',
            fontSize: '25px',
            letterSpacing: '2px'
          }}>
            <h1 style={{
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '5px',
              margin: '0 0 5px 0'
            }}>
              NDANDULENI GROUP
            </h1>
            <p style={{
              fontSize: '15px',
              color: '#9CA3AF',
              marginTop: '0'
            }}>
              Enterprise Resource Planning
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ paddingTop: '20px', paddingBottom: '5px', paddingLeft: '5px', paddingRight: '5px' }}>
            <div style={{ marginBottom: '20px' }}>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Please enter your e-mail"
                style={{
                  width: '100%',
                  padding: '20px',
                  fontSize: '20px',
                  background: 'transparent',
                  color: '#babecc',
                  border: 'none',
                  borderRadius: '25px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  boxShadow: 'inset 2px 2px 5px #111011, inset -5px -5px 10px #575259',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                className="input-field"
              />
            </div>

            <div style={{ marginBottom: '20px', position: 'relative' }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                style={{
                  width: '100%',
                  padding: '20px',
                  fontSize: '20px',
                  background: 'transparent',
                  color: '#babecc',
                  border: 'none',
                  borderRadius: '25px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  boxShadow: 'inset 2px 2px 5px #111011, inset -5px -5px 10px #575259',
                  outline: 'none',
                  boxSizing: 'border-box',
                  paddingRight: '50px'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '15px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#babecc',
                  cursor: 'pointer',
                  padding: '5px'
                }}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* Forgot Password */}
            <div style={{ textAlign: 'right', marginBottom: '10px' }}>
              <Link
                to="/forgot-password"
                style={{
                  color: '#babecc',
                  fontSize: '14px',
                  textDecoration: 'none',
                  transition: 'all 0.3s'
                }}
              >
                Forgot Password?
              </Link>
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                width: '100%',
                padding: '20px',
                marginTop: '20px',
                fontSize: '20px',
                color: '#babecc',
                backgroundColor: '#333',
                border: 'none',
                borderRadius: '25px',
                boxShadow: '5px 5px 20px #575259, -5px -5px 20px #111011',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s',
                opacity: loading ? 0.5 : 1
              }}
            >
              {loading ? 'Signing in...' : 'Log in'}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
