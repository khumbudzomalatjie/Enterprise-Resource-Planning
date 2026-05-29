import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useFleetStore from '../store/fleetStore'
import useThemeStore from '../../../store/themeStore'
import toast from 'react-hot-toast'
import { 
  Truck, Car, Fuel, Wrench, Bell, Gauge, 
  DollarSign, Plus, Edit, Trash2, Eye, AlertCircle,
  Sun, Moon, ChevronRight, ArrowLeft, Calendar,
  BarChart3, Activity, Save, X, Sparkles, Upload, Image
} from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient'

export default function FleetDashboard() {
  const { 
    vehicles, stats, fuelRecords, expenses, reminders, meterReadings,
    fetchVehicles, fetchFuelRecords, fetchExpenses, fetchReminders, fetchMeterReadings, fetchFleetStats,
    createVehicle, updateVehicle, deleteVehicle,
    createFuelRecord, createExpense, createReminder, updateReminder,
    createMeterReading
  } = useFleetStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [activeTab, setActiveTab] = useState('vehicles')
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [uploading, setUploading] = useState(false)

  // Form visibility
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [showFuelForm, setShowFuelForm] = useState(false)
  const [showReminderForm, setShowReminderForm] = useState(false)
  const [showMeterForm, setShowMeterForm] = useState(false)

  // Form data
  const [vehicleForm, setVehicleForm] = useState({ 
    name: '', plate_number: '', make: '', model: '', vehicle_type: '', 
    seats: 4, notes: '', fuel_type: 'petrol', purchase_date: '', purchase_price: '',
    image_url: ''
  })
  const [expenseForm, setExpenseForm] = useState({ vehicle_id: '', expense_date: new Date().toISOString().split('T')[0], amount: '', expense_type: 'Maintenance', vendor: '', notes: '' })
  const [fuelForm, setFuelForm] = useState({ vehicle_id: '', fuel_date: new Date().toISOString().split('T')[0], amount: '', quantity: '', fuel_station: '', notes: '' })
  const [reminderForm, setReminderForm] = useState({ vehicle_id: '', reminder_name: '', next_date: '', frequency_days: 90, status: 'active', last_date: '' })
  const [meterForm, setMeterForm] = useState({ vehicle_id: '', reading_date: new Date().toISOString().split('T')[0], odometer_reading: '', notes: '' })

  // Dashboard filters
  const [dashVehicle, setDashVehicle] = useState('')
  const [dashFrom, setDashFrom] = useState(new Date().getFullYear() + '-01-01')
  const [dashTo, setDashTo] = useState(new Date().getFullYear() + '-12-31')

  // Filter states
  const [expFilterVehicle, setExpFilterVehicle] = useState('')
  const [expFilterType, setExpFilterType] = useState('')
  const [expSearch, setExpSearch] = useState('')
  const [fuelFilterVehicle, setFuelFilterVehicle] = useState('')

  useEffect(() => {
    fetchVehicles()
    fetchFuelRecords()
    fetchExpenses()
    fetchReminders()
    fetchMeterReadings()
    fetchFleetStats()
  }, [])

  useEffect(() => {
    if (vehicles.length > 0 && !selectedVehicle) {
      setSelectedVehicle(vehicles[0])
      loadVehicleForm(vehicles[0])
    }
  }, [vehicles])

  const loadVehicleForm = (v) => {
    if (!v) return
    setVehicleForm({
      name: v.name || '',
      plate_number: v.plate_number || '',
      make: v.make || '',
      model: v.model || '',
      vehicle_type: v.vehicle_type || '',
      seats: v.seats || 4,
      notes: v.notes || '',
      fuel_type: v.fuel_type || 'petrol',
      purchase_date: v.purchase_date || '',
      purchase_price: v.purchase_price || '',
      image_url: v.image_url || ''
    })
  }

  const handleSelectVehicle = (v) => {
    setSelectedVehicle(v)
    loadVehicleForm(v)
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)
  }

  const formatDate = (date) => {
    if (!date) return ''
    const d = new Date(date)
    return d.toLocaleDateString('en-ZA')
  }

  // Image Upload Handler
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }

    setUploading(true)

    try {
      // Create a unique file name
      const fileExt = file.name.split('.').pop()
      const fileName = `vehicle-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `vehicle-images/${fileName}`

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('fleet')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) {
        // If bucket doesn't exist, try creating it
        if (uploadError.message.includes('bucket') || uploadError.message.includes('not found')) {
          // Create bucket if it doesn't exist
          const { error: bucketError } = await supabase.storage.createBucket('fleet', {
            public: true,
            fileSizeLimit: 5242880 // 5MB
          })
          
          if (bucketError) {
            // If bucket creation fails, store as base64
            const reader = new FileReader()
            reader.onload = (event) => {
              setVehicleForm({...vehicleForm, image_url: event.target.result})
              toast.success('Image loaded locally')
            }
            reader.readAsDataURL(file)
            setUploading(false)
            return
          }
          
          // Retry upload after creating bucket
          const { data: retryData, error: retryError } = await supabase.storage
            .from('fleet')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: true
            })
            
          if (retryError) {
            // Fallback to base64
            const reader = new FileReader()
            reader.onload = (event) => {
              setVehicleForm({...vehicleForm, image_url: event.target.result})
              toast.success('Image loaded locally')
            }
            reader.readAsDataURL(file)
            setUploading(false)
            return
          }
          
          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('fleet')
            .getPublicUrl(filePath)
          
          setVehicleForm({...vehicleForm, image_url: publicUrl})
          toast.success('Image uploaded successfully!')
        } else {
          throw uploadError
        }
      } else {
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('fleet')
          .getPublicUrl(filePath)
        
        setVehicleForm({...vehicleForm, image_url: publicUrl})
        toast.success('Image uploaded successfully!')
      }
    } catch (error) {
      console.error('Upload error:', error)
      // Fallback to base64 for any error
      const reader = new FileReader()
      reader.onload = (event) => {
        setVehicleForm({...vehicleForm, image_url: event.target.result})
        toast.success('Image loaded locally')
      }
      reader.readAsDataURL(file)
    } finally {
      setUploading(false)
    }
  }

  const clearImage = () => {
    setVehicleForm({...vehicleForm, image_url: ''})
  }

  // Vehicle CRUD
  const handleSaveVehicle = async () => {
    if (!vehicleForm.name) { toast.error('Vehicle name is required'); return }
    if (selectedVehicle) {
      await updateVehicle(selectedVehicle.id, vehicleForm)
      toast.success('Vehicle updated!')
    } else {
      await createVehicle(vehicleForm)
      toast.success('Vehicle added!')
    }
    fetchVehicles()
  }

  const handleDeleteVehicle = async () => {
    if (!selectedVehicle) return
    if (window.confirm(`Delete ${selectedVehicle.name}?`)) {
      await deleteVehicle(selectedVehicle.id)
      toast.success('Vehicle deleted')
      setSelectedVehicle(null)
      fetchVehicles()
    }
  }

  const handleAddVehicle = async () => {
    const result = await createVehicle({ 
      name: 'New Vehicle', plate_number: '', make: '', model: '', 
      vehicle_type: 'sedan', seats: 4, notes: '', fuel_type: 'petrol',
      purchase_date: '', purchase_price: '', image_url: ''
    })
    if (result.success) {
      toast.success('Vehicle added — fill in details and save')
      setSelectedVehicle(result.data)
      loadVehicleForm(result.data)
    }
  }

  // Expense CRUD
  const handleSaveExpense = async () => {
    if (!expenseForm.vehicle_id || !expenseForm.amount) { toast.error('Vehicle and amount required'); return }
    await createExpense({ ...expenseForm, amount: parseFloat(expenseForm.amount) })
    toast.success('Expense saved!')
    setShowExpenseForm(false)
    fetchExpenses()
    fetchFleetStats()
  }

  // Fuel CRUD
  const handleSaveFuel = async () => {
    if (!fuelForm.vehicle_id || !fuelForm.amount) { toast.error('Vehicle and amount required'); return }
    await createFuelRecord({ ...fuelForm, amount: parseFloat(fuelForm.amount), quantity: parseFloat(fuelForm.quantity) || 0 })
    toast.success('Fuel log saved!')
    setShowFuelForm(false)
    fetchFuelRecords()
    fetchFleetStats()
  }

  // Reminder CRUD
  const handleSaveReminder = async () => {
    if (!reminderForm.vehicle_id || !reminderForm.reminder_name) { toast.error('Vehicle and name required'); return }
    await createReminder({ ...reminderForm, status: reminderForm.status || 'active' })
    toast.success('Reminder saved!')
    setShowReminderForm(false)
    fetchReminders()
  }

  // Meter CRUD
  const handleSaveMeter = async () => {
    if (!meterForm.vehicle_id || !meterForm.odometer_reading) { toast.error('Vehicle and reading required'); return }
    await createMeterReading({ ...meterForm, odometer_reading: parseInt(meterForm.odometer_reading) })
    toast.success('Reading saved!')
    setShowMeterForm(false)
    fetchMeterReadings()
  }

  const getReminderStatus = (r) => {
    const today = new Date().toISOString().split('T')[0]
    if (r.status === 'active' && r.next_date <= today) {
      return { class: 'bg-red-100 text-red-800', label: 'Overdue' }
    }
    if (r.status === 'active') {
      return { class: 'bg-green-100 text-green-800', label: 'Active' }
    }
    return { class: 'bg-yellow-100 text-yellow-800', label: r.status }
  }

  // Filtered data
  const filteredExpenses = expenses.filter(e => {
    if (expFilterVehicle && e.vehicle_id !== expFilterVehicle) return false
    if (expFilterType && e.expense_type !== expFilterType) return false
    if (expSearch && !(e.vendor || '').toLowerCase().includes(expSearch.toLowerCase()) && !(e.notes || '').toLowerCase().includes(expSearch.toLowerCase())) return false
    return true
  }).sort((a, b) => new Date(b.expense_date) - new Date(a.expense_date))

  const filteredFuel = fuelRecords.filter(f => {
    if (fuelFilterVehicle && f.vehicle_id !== fuelFilterVehicle) return false
    return true
  }).sort((a, b) => new Date(b.fuel_date) - new Date(a.fuel_date))

  // Dashboard calculations
  const dashExpenses = expenses.filter(e => (!dashVehicle || e.vehicle_id === dashVehicle) && e.expense_date >= dashFrom && e.expense_date <= dashTo)
  const dashFuel = fuelRecords.filter(f => (!dashVehicle || f.vehicle_id === dashVehicle) && f.fuel_date >= dashFrom && f.fuel_date <= dashTo)
  const totalExpenses = dashExpenses.reduce((s, e) => s + (e.amount || 0), 0)
  const totalFuel = dashFuel.reduce((s, f) => s + (f.amount || 0), 0)
  const totalFuelQty = dashFuel.reduce((s, f) => s + (f.quantity || 0), 0)
  const today = new Date().toISOString().split('T')[0]
  const overdueReminders = reminders.filter(r => r.status === 'active' && r.next_date <= today).length

  const expenseTypes = [...new Set(dashExpenses.map(e => e.expense_type).filter(Boolean))]
  const expenseByType = {}
  dashExpenses.forEach(e => { expenseByType[e.expense_type] = (expenseByType[e.expense_type] || 0) + (e.amount || 0) })
  const maxExpType = Math.max(...Object.values(expenseByType), 1)

  const fuelByVehicle = {}
  dashFuel.forEach(f => {
    const vname = vehicles.find(v => v.id === f.vehicle_id)?.name || 'Unknown'
    fuelByVehicle[vname] = (fuelByVehicle[vname] || 0) + (f.amount || 0)
  })
  const maxFuelVeh = Math.max(...Object.values(fuelByVehicle), 1)

  const upcomingReminders = reminders.filter(r => r.status === 'active').sort((a, b) => new Date(a.next_date) - new Date(b.next_date)).slice(0, 5)

  const barColors = ['#2e75b6', '#5b9bd5', '#1a5fa0', '#4472c4', '#70ad47', '#ed7d31', '#ffc000']

  const tabs = [
    { id: 'vehicles', label: 'Vehicles', icon: '🚗' },
    { id: 'expenses', label: 'Repairs', icon: '🔧' },
    { id: 'fuel', label: 'Fuel', icon: '⛽' },
    { id: 'reminders', label: 'Reminders', icon: '⏰' },
    { id: 'meter', label: 'Meter', icon: '🕹️' },
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  ]

  return (
    <div className={`min-h-screen font-[Calibri,Arial,sans-serif] text-[13px] transition-colors duration-300 ${isDark ? 'dark' : ''}`}
      style={{ backgroundColor: isDark ? '#1e293b' : '#c8d8e8' }}
    >
      {/* Theme Toggle + ERP Label */}
      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
        <div className="neu-inset px-5 py-2 rounded-full flex items-center gap-2"
          style={{
            background: isDark ? 'linear-gradient(145deg, #1e293b, #0f172a)' : 'linear-gradient(145deg, #e2e8f0, #eef2f8)',
            boxShadow: isDark ? 'inset 4px 4px 8px #020617, inset -4px -4px 8px #334155' : 'inset 4px 4px 8px #cbd5e1, inset -4px -4px 8px #ffffff'
          }}
        >
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-semibold tracking-wide text-emerald-800 dark:text-emerald-200 hidden sm:inline">
            Enterprise Resource Planning
          </span>
        </div>
        <button 
          onClick={toggleTheme}
          className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center hover:scale-110 transition-transform"
          style={{
            background: isDark ? 'linear-gradient(145deg, #1e293b, #0f172a)' : 'linear-gradient(145deg, #eef2f8, #e2e8f0)',
            boxShadow: isDark ? '8px 8px 16px #020617, -8px -8px 16px #334155' : '8px 8px 16px #cbd5e1, -8px -8px 16px #ffffff'
          }}
        >
          {isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-600" />}
        </button>
      </div>

      {/* Header */}
      <div className="bg-gradient-to-b from-[#5b9bd5] to-[#2e75b6] px-4 py-2 flex items-center gap-3.5 border-b-2 border-[#1a5fa0]">
        <span className="text-[32px]">🚗</span>
        <h1 className="text-white text-[22px] font-bold tracking-wider drop-shadow-md">VEHICLE EXPENSE TRACKER</h1>
        <div className="flex-1" />
        <Link to="/dashboard" className="text-white text-xs hover:underline flex items-center gap-1 opacity-90 hover:opacity-100">
          <ArrowLeft className="w-3 h-3" /> Main Dashboard
        </Link>
      </div>

      {/* Tab Bar - CENTERED */}
      <div className="bg-[#dce8f5] dark:bg-[#1e293b] border-b-2 border-[#9db8d8] dark:border-slate-600 flex justify-center px-2 pt-1">
        <div className="flex gap-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center px-5 py-1.5 min-w-[80px] border-[1.5px] border-[#9db8d8] dark:border-slate-600 border-b-0 rounded-t text-[11px] font-semibold gap-0.5 transition-colors ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-[#0f172a] text-[#1a5fa0] dark:text-[#5b9bd5] -mb-0.5 pb-1.5'
                  : 'bg-[#c0d4ea] dark:bg-[#334155] text-[#1a5fa0] dark:text-slate-300 hover:bg-[#d4e4f5] dark:hover:bg-[#475569]'
              }`}
              style={{ marginRight: '3px' }}
            >
              <span className="text-2xl leading-none">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex border-2 border-[#9db8d8] dark:border-slate-600 bg-[#dce8f5] dark:bg-[#0f172a] min-h-[calc(100vh-100px)]">
        {/* Left Panel - Vehicle List */}
        <div className="w-[140px] bg-[#dce8f5] dark:bg-[#1e293b] border-r-2 border-[#9db8d8] dark:border-slate-600 flex-shrink-0 flex flex-col">
          <div className="bg-[#2e75b6] dark:bg-[#1a5fa0] text-white font-bold text-center py-1.5 text-xs border-b border-[#1a5fa0] dark:border-[#0f172a]">
            Vehicle List
          </div>
          {vehicles.map(v => (
            <div
              key={v.id}
              onClick={() => handleSelectVehicle(v)}
              className={`px-2 py-1 cursor-pointer border-b border-[#b8ccdc] dark:border-slate-600 text-[#1a3a5a] dark:text-slate-300 text-xs whitespace-nowrap overflow-hidden text-ellipsis hover:bg-[#c8d8ec] dark:hover:bg-[#334155] ${
                selectedVehicle?.id === v.id ? 'bg-[#2e75b6] dark:bg-[#2563eb] text-white' : 'bg-[#dce8f5] dark:bg-[#1e293b]'
              }`}
            >
              {v.name}
            </div>
          ))}
          {Array.from({ length: Math.max(0, 10 - vehicles.length) }).map((_, i) => (
            <div key={`empty-${i}`} className="px-2 py-1 border-b border-[#b8ccdc] dark:border-slate-600 text-[#a0b8cc] dark:text-slate-500 bg-[#e8f0f8] dark:bg-[#1e293b] text-xs">&nbsp;</div>
          ))}
        </div>

        {/* Right Panel */}
        <div className="flex-1 flex flex-col p-2.5 gap-2.5">
          <AnimatePresence mode="wait">
            {/* ══ VEHICLES TAB ══ */}
            {activeTab === 'vehicles' && (
              <motion.div key="vehicles" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-2.5 w-full">
                <div className="bg-[#eef4fb] dark:bg-[#1e293b] border-[1.5px] border-[#9db8d8] dark:border-slate-600 rounded p-2.5">
                  <div className="flex justify-between items-center mb-2">
                    <button onClick={handleAddVehicle} className="inline-flex items-center gap-1.5 px-3 py-1 rounded border-[1.5px] border-[#3d8b3d] bg-[#5cb85c] text-white text-xs font-semibold hover:brightness-110 cursor-pointer">
                      ➕ Add Vehicle
                    </button>
                    <div className="flex-1 text-center text-[#1a5fa0] dark:text-[#5b9bd5] font-bold text-[13px] tracking-wide">VEHICLES</div>
                  </div>
                  
                  <div className="flex gap-3.5">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-[#1a3a5a] dark:text-slate-300 font-semibold text-xs text-right min-w-[48px]">Name</span>
                        <input className="bg-white dark:bg-slate-700 border-[1.5px] border-[#7a9ec0] dark:border-slate-500 rounded px-1.5 py-0.5 text-xs text-[#1a3a5a] dark:text-slate-200 outline-none focus:border-[#2e75b6] dark:focus:border-[#5b9bd5]" style={{width:'120px'}} value={vehicleForm.name} onChange={e => setVehicleForm({...vehicleForm, name: e.target.value})} />
                        <span className="text-[#1a3a5a] dark:text-slate-300 font-semibold text-xs text-right min-w-[52px]">Plate #</span>
                        <input className="bg-white dark:bg-slate-700 border-[1.5px] border-[#7a9ec0] dark:border-slate-500 rounded px-1.5 py-0.5 text-xs text-[#1a3a5a] dark:text-slate-200 outline-none focus:border-[#2e75b6] dark:focus:border-[#5b9bd5]" style={{width:'100px'}} value={vehicleForm.plate_number} onChange={e => setVehicleForm({...vehicleForm, plate_number: e.target.value})} />
                      </div>
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-[#1a3a5a] dark:text-slate-300 font-semibold text-xs text-right min-w-[48px]">Make</span>
                        <input className="bg-white dark:bg-slate-700 border-[1.5px] border-[#7a9ec0] dark:border-slate-500 rounded px-1.5 py-0.5 text-xs text-[#1a3a5a] dark:text-slate-200 outline-none focus:border-[#2e75b6] dark:focus:border-[#5b9bd5]" style={{width:'120px'}} value={vehicleForm.make} onChange={e => setVehicleForm({...vehicleForm, make: e.target.value})} />
                        <span className="text-[#1a3a5a] dark:text-slate-300 font-semibold text-xs text-right min-w-[52px]">Model</span>
                        <input className="bg-white dark:bg-slate-700 border-[1.5px] border-[#7a9ec0] dark:border-slate-500 rounded px-1.5 py-0.5 text-xs text-[#1a3a5a] dark:text-slate-200 outline-none focus:border-[#2e75b6] dark:focus:border-[#5b9bd5]" style={{width:'100px'}} value={vehicleForm.model} onChange={e => setVehicleForm({...vehicleForm, model: e.target.value})} />
                      </div>
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-[#1a3a5a] dark:text-slate-300 font-semibold text-xs text-right min-w-[48px]">Type</span>
                        <select className="bg-white dark:bg-slate-700 border-[1.5px] border-[#7a9ec0] dark:border-slate-500 rounded px-1.5 py-0.5 text-xs text-[#1a3a5a] dark:text-slate-200 outline-none focus:border-[#2e75b6] dark:focus:border-[#5b9bd5]" style={{width:'120px'}} value={vehicleForm.vehicle_type} onChange={e => setVehicleForm({...vehicleForm, vehicle_type: e.target.value})}>
                          <option value="">-- Select --</option>
                          <option value="sedan">Sedan</option>
                          <option value="suv">SUV</option>
                          <option value="truck">Truck</option>
                          <option value="van">Van</option>
                          <option value="bakkie">Bakkie</option>
                          <option value="other">Other</option>
                        </select>
                        <span className="text-[#1a3a5a] dark:text-slate-300 font-semibold text-xs text-right min-w-[52px]">Seats</span>
                        <input type="number" min="1" max="20" className="bg-white dark:bg-slate-700 border-[1.5px] border-[#7a9ec0] dark:border-slate-500 rounded px-1.5 py-0.5 text-xs text-[#1a3a5a] dark:text-slate-200 outline-none focus:border-[#2e75b6] dark:focus:border-[#5b9bd5]" style={{width:'60px'}} value={vehicleForm.seats} onChange={e => setVehicleForm({...vehicleForm, seats: parseInt(e.target.value) || 4})} />
                      </div>
                      {/* Purchase Date & Price */}
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-[#1a3a5a] dark:text-slate-300 font-semibold text-xs text-right min-w-[48px]">Purchased</span>
                        <input type="date" className="bg-white dark:bg-slate-700 border-[1.5px] border-[#7a9ec0] dark:border-slate-500 rounded px-1.5 py-0.5 text-xs text-[#1a3a5a] dark:text-slate-200 outline-none focus:border-[#2e75b6] dark:focus:border-[#5b9bd5]" style={{width:'130px'}} value={vehicleForm.purchase_date} onChange={e => setVehicleForm({...vehicleForm, purchase_date: e.target.value})} />
                        <span className="text-[#1a3a5a] dark:text-slate-300 font-semibold text-xs text-right min-w-[52px]">Price</span>
                        <input type="number" step="0.01" className="bg-white dark:bg-slate-700 border-[1.5px] border-[#7a9ec0] dark:border-slate-500 rounded px-1.5 py-0.5 text-xs text-[#1a3a5a] dark:text-slate-200 outline-none focus:border-[#2e75b6] dark:focus:border-[#5b9bd5]" style={{width:'100px'}} placeholder="R0.00" value={vehicleForm.purchase_price} onChange={e => setVehicleForm({...vehicleForm, purchase_price: e.target.value})} />
                      </div>
                      <div className="flex items-start gap-2 mb-1.5">
                        <span className="text-[#1a3a5a] dark:text-slate-300 font-semibold text-xs text-right min-w-[48px] pt-0.5">Notes</span>
                        <textarea className="bg-white dark:bg-slate-700 border-[1.5px] border-[#7a9ec0] dark:border-slate-500 rounded px-1.5 py-0.5 text-xs text-[#1a3a5a] dark:text-slate-200 outline-none focus:border-[#2e75b6] dark:focus:border-[#5b9bd5] resize-y min-h-[60px]" style={{width:'280px'}} value={vehicleForm.notes} onChange={e => setVehicleForm({...vehicleForm, notes: e.target.value})} />
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <button onClick={handleSaveVehicle} className="inline-flex items-center gap-1 px-3 py-1 rounded border-[1.5px] border-[#1a5fa0] dark:border-[#5b9bd5] bg-[#2e75b6] dark:bg-[#2563eb] text-white text-xs font-semibold hover:brightness-110 cursor-pointer">
                          💾 Save
                        </button>
                        <button onClick={handleDeleteVehicle} className="inline-flex items-center gap-1 px-3 py-1 rounded border-[1.5px] border-[#a02020] bg-[#d9534f] text-white text-xs font-semibold hover:brightness-110 cursor-pointer">
                          🗑 Delete
                        </button>
                      </div>
                    </div>
                    {/* Vehicle Picture Section */}
                    <div className="w-[200px] flex-shrink-0">
                      <div className="text-[11px] font-bold text-[#1a5fa0] dark:text-[#5b9bd5] text-center mb-1">Vehicle Picture</div>
                      <div 
                        className="bg-white dark:bg-slate-700 border-[1.5px] border-[#9db8d8] dark:border-slate-500 rounded flex items-center justify-center text-[#aac0d4] dark:text-slate-400 text-xs text-center overflow-hidden relative"
                        style={{height:'130px', cursor: 'pointer'}}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {vehicleForm.image_url ? (
                          <img src={vehicleForm.image_url} alt="Vehicle" className="w-full h-full object-contain" />
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <Upload className="w-6 h-6" />
                            <span>Click to upload</span>
                          </div>
                        )}
                        {uploading && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                          </div>
                        )}
                      </div>
                      <input 
                        ref={fileInputRef}
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleImageUpload}
                      />
                      <div className="flex gap-1.5 mt-1.5 justify-center">
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded border-[1.5px] border-[#3d8b3d] bg-[#5cb85c] text-white text-[11px] font-semibold hover:brightness-110 cursor-pointer"
                        >
                          <Upload className="w-3 h-3" /> Upload
                        </button>
                        {vehicleForm.image_url && (
                          <button 
                            onClick={clearImage}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded border-[1.5px] border-[#a02020] bg-[#d9534f] text-white text-[11px] font-semibold hover:brightness-110 cursor-pointer"
                          >
                            <X className="w-3 h-3" /> Clear
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ══ EXPENSES TAB ══ */}
            {activeTab === 'expenses' && (
              <motion.div key="expenses" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full">
                <div className="bg-[#eef4fb] dark:bg-[#1e293b] border-[1.5px] border-[#9db8d8] dark:border-slate-600 rounded p-2.5">
                  <div className="flex justify-between items-center mb-2">
                    <button onClick={() => { setShowExpenseForm(!showExpenseForm); setExpenseForm({...expenseForm, vehicle_id: selectedVehicle?.id || vehicles[0]?.id || '', expense_date: new Date().toISOString().split('T')[0], amount: '', vendor: '', notes: ''}) }} className="inline-flex items-center gap-1.5 px-3 py-1 rounded border-[1.5px] border-[#3d8b3d] bg-[#5cb85c] text-white text-xs font-semibold hover:brightness-110 cursor-pointer">
                      ➕ Add Expense
                    </button>
                    <div className="flex-1 text-center text-[#1a5fa0] dark:text-[#5b9bd5] font-bold text-[13px] tracking-wide">REPAIRS & EXPENSES</div>
                  </div>

                  {showExpenseForm && (
                    <div className="bg-[#dce8f5] dark:bg-[#0f172a] border-[1.5px] border-[#9db8d8] dark:border-slate-600 rounded p-2 mb-2">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-[#1a3a5a] dark:text-slate-300 font-semibold text-xs min-w-[48px] text-right">Vehicle</span>
                        <select className="bg-white dark:bg-slate-700 border-[1.5px] border-[#7a9ec0] dark:border-slate-500 rounded px-1.5 py-0.5 text-xs text-[#1a3a5a] dark:text-slate-200" style={{width:'120px'}} value={expenseForm.vehicle_id} onChange={e => setExpenseForm({...expenseForm, vehicle_id: e.target.value})}>
                          {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                        <span className="text-[#1a3a5a] dark:text-slate-300 font-semibold text-xs min-w-[40px] text-right">Date</span>
                        <input type="date" className="bg-white dark:bg-slate-700 border-[1.5px] border-[#7a9ec0] dark:border-slate-500 rounded px-1.5 py-0.5 text-xs text-[#1a3a5a] dark:text-slate-200" style={{width:'130px'}} value={expenseForm.expense_date} onChange={e => setExpenseForm({...expenseForm, expense_date: e.target.value})} />
                        <span className="text-[#1a3a5a] dark:text-slate-300 font-semibold text-xs min-w-[52px] text-right">Amount</span>
                        <input type="number" step="0.01" className="bg-white dark:bg-slate-700 border-[1.5px] border-[#7a9ec0] dark:border-slate-500 rounded px-1.5 py-0.5 text-xs text-[#1a3a5a] dark:text-slate-200" style={{width:'90px'}} placeholder="R0.00" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} />
                      </div>
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-[#1a3a5a] dark:text-slate-300 font-semibold text-xs min-w-[48px] text-right">Type</span>
                        <select className="bg-white dark:bg-slate-700 border-[1.5px] border-[#7a9ec0] dark:border-slate-500 rounded px-1.5 py-0.5 text-xs text-[#1a3a5a] dark:text-slate-200" style={{width:'120px'}} value={expenseForm.expense_type} onChange={e => setExpenseForm({...expenseForm, expense_type: e.target.value})}>
                          <option value="maintenance">Maintenance</option><option value="repair">Repair</option><option value="tyres">Tyres</option>
                          <option value="insurance">Insurance</option><option value="registration">Registration</option>
                          <option value="toll">Toll</option><option value="fine">Fine</option>
                          <option value="cleaning">Cleaning</option><option value="other">Other</option>
                        </select>
                        <span className="text-[#1a3a5a] dark:text-slate-300 font-semibold text-xs min-w-[40px] text-right">Vendor</span>
                        <input className="bg-white dark:bg-slate-700 border-[1.5px] border-[#7a9ec0] dark:border-slate-500 rounded px-1.5 py-0.5 text-xs text-[#1a3a5a] dark:text-slate-200" style={{width:'160px'}} placeholder="Vendor Name" value={expenseForm.vendor} onChange={e => setExpenseForm({...expenseForm, vendor: e.target.value})} />
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[#1a3a5a] dark:text-slate-300 font-semibold text-xs min-w-[48px] text-right">Notes</span>
                        <input className="bg-white dark:bg-slate-700 border-[1.5px] border-[#7a9ec0] dark:border-slate-500 rounded px-1.5 py-0.5 text-xs text-[#1a3a5a] dark:text-slate-200" style={{width:'320px'}} value={expenseForm.notes} onChange={e => setExpenseForm({...expenseForm, notes: e.target.value})} />
                        <button onClick={handleSaveExpense} className="inline-flex items-center gap-1 px-3 py-1 rounded border-[1.5px] border-[#1a5fa0] dark:border-[#5b9bd5] bg-[#2e75b6] dark:bg-[#2563eb] text-white text-xs font-semibold hover:brightness-110">💾 Save</button>
                        <button onClick={() => setShowExpenseForm(false)} className="inline-flex items-center gap-1 px-3 py-1 rounded border-[1.5px] border-[#9db8d8] dark:border-slate-500 bg-[#e8f0f8] dark:bg-slate-700 text-[#1a5fa0] dark:text-slate-300 text-xs font-semibold hover:brightness-110">Cancel</button>
                      </div>
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs">
                      <thead><tr className="bg-[#2e75b6] dark:bg-[#1a5fa0]"><th className="text-white px-2 py-1 text-left font-bold border-r border-[#5b9bd5]">Vehicle</th><th className="text-white px-2 py-1 text-left font-bold border-r border-[#5b9bd5]">Date</th><th className="text-white px-2 py-1 text-left font-bold border-r border-[#5b9bd5]">Amount</th><th className="text-white px-2 py-1 text-left font-bold border-r border-[#5b9bd5]">Type</th><th className="text-white px-2 py-1 text-left font-bold border-r border-[#5b9bd5]">Vendor</th><th className="text-white px-2 py-1 text-left font-bold border-r border-[#5b9bd5]">Notes</th><th className="text-white px-2 py-1 text-center font-bold">Del</th></tr></thead>
                      <tbody>
                        {filteredExpenses.map(e => (
                          <tr key={e.id} className="bg-[#eef4fb] dark:bg-[#1e293b] even:bg-[#dce8f5] dark:even:bg-[#0f172a] hover:bg-[#c8d8ec] dark:hover:bg-[#334155]">
                            <td className="px-2 py-1 border-b border-[#b8ccdc] dark:border-slate-600 text-[#1a3a5a] dark:text-slate-300">{vehicles.find(v => v.id === e.vehicle_id)?.name || 'N/A'}</td>
                            <td className="px-2 py-1 border-b border-[#b8ccdc] dark:border-slate-600 text-[#1a3a5a] dark:text-slate-300">{formatDate(e.expense_date)}</td>
                            <td className="px-2 py-1 border-b border-[#b8ccdc] dark:border-slate-600 text-[#1a3a5a] dark:text-slate-300 font-bold">{formatCurrency(e.amount)}</td>
                            <td className="px-2 py-1 border-b border-[#b8ccdc] dark:border-slate-600 text-[#1a3a5a] dark:text-slate-300 capitalize">{e.expense_type}</td>
                            <td className="px-2 py-1 border-b border-[#b8ccdc] dark:border-slate-600 text-[#1a3a5a] dark:text-slate-300">{e.vendor || '-'}</td>
                            <td className="px-2 py-1 border-b border-[#b8ccdc] dark:border-slate-600 text-[#1a3a5a] dark:text-slate-300">{e.notes || '-'}</td>
                            <td className="px-2 py-1 border-b border-[#b8ccdc] dark:border-slate-600 text-center"><button onClick={() => { if(window.confirm('Delete?')) { /* delete */ } }} className="px-2 py-0.5 rounded border-[1.5px] border-[#a02020] bg-[#d9534f] text-white text-xs hover:brightness-110">✕</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ══ FUEL TAB ══ */}
            {activeTab === 'fuel' && (
              <motion.div key="fuel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full">
                <div className="bg-[#eef4fb] dark:bg-[#1e293b] border-[1.5px] border-[#9db8d8] dark:border-slate-600 rounded p-2.5">
                  <div className="flex justify-between items-center mb-2">
                    <button onClick={() => { setShowFuelForm(!showFuelForm); setFuelForm({...fuelForm, vehicle_id: selectedVehicle?.id || vehicles[0]?.id || '', fuel_date: new Date().toISOString().split('T')[0], amount: '', quantity: '', fuel_station: '', notes: ''}) }} className="inline-flex items-center gap-1.5 px-3 py-1 rounded border-[1.5px] border-[#3d8b3d] bg-[#5cb85c] text-white text-xs font-semibold hover:brightness-110 cursor-pointer">➕ Add Fuel</button>
                    <div className="flex-1 text-center text-[#1a5fa0] dark:text-[#5b9bd5] font-bold text-[13px] tracking-wide">FUEL PURCHASES & TRACKING</div>
                  </div>
                  {showFuelForm && (
                    <div className="bg-[#dce8f5] dark:bg-[#0f172a] border-[1.5px] border-[#9db8d8] dark:border-slate-600 rounded p-2 mb-2">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-[#1a3a5a] dark:text-slate-300 font-semibold text-xs min-w-[48px] text-right">Vehicle</span>
                        <select className="bg-white dark:bg-slate-700 border-[1.5px] border-[#7a9ec0] dark:border-slate-500 rounded px-1.5 py-0.5 text-xs text-[#1a3a5a] dark:text-slate-200" style={{width:'120px'}} value={fuelForm.vehicle_id} onChange={e => setFuelForm({...fuelForm, vehicle_id: e.target.value})}>{vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select>
                        <span className="text-[#1a3a5a] dark:text-slate-300 font-semibold text-xs min-w-[40px] text-right">Date</span>
                        <input type="date" className="bg-white dark:bg-slate-700 border-[1.5px] border-[#7a9ec0] dark:border-slate-500 rounded px-1.5 py-0.5 text-xs text-[#1a3a5a] dark:text-slate-200" style={{width:'130px'}} value={fuelForm.fuel_date} onChange={e => setFuelForm({...fuelForm, fuel_date: e.target.value})} />
                        <span className="text-[#1a3a5a] dark:text-slate-300 font-semibold text-xs min-w-[52px] text-right">Amount</span>
                        <input type="number" step="0.01" className="bg-white dark:bg-slate-700 border-[1.5px] border-[#7a9ec0] dark:border-slate-500 rounded px-1.5 py-0.5 text-xs text-[#1a3a5a] dark:text-slate-200" style={{width:'90px'}} placeholder="R0.00" value={fuelForm.amount} onChange={e => setFuelForm({...fuelForm, amount: e.target.value})} />
                      </div>
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-[#1a3a5a] dark:text-slate-300 font-semibold text-xs min-w-[48px] text-right">Qty (L)</span>
                        <input type="number" step="0.1" className="bg-white dark:bg-slate-700 border-[1.5px] border-[#7a9ec0] dark:border-slate-500 rounded px-1.5 py-0.5 text-xs text-[#1a3a5a] dark:text-slate-200" style={{width:'80px'}} value={fuelForm.quantity} onChange={e => setFuelForm({...fuelForm, quantity: e.target.value})} />
                        <span className="text-[#1a3a5a] dark:text-slate-300 font-semibold text-xs min-w-[52px] text-right">Station</span>
                        <input className="bg-white dark:bg-slate-700 border-[1.5px] border-[#7a9ec0] dark:border-slate-500 rounded px-1.5 py-0.5 text-xs text-[#1a3a5a] dark:text-slate-200" style={{width:'140px'}} value={fuelForm.fuel_station} onChange={e => setFuelForm({...fuelForm, fuel_station: e.target.value})} />
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[#1a3a5a] dark:text-slate-300 font-semibold text-xs min-w-[48px] text-right">Notes</span>
                        <input className="bg-white dark:bg-slate-700 border-[1.5px] border-[#7a9ec0] dark:border-slate-500 rounded px-1.5 py-0.5 text-xs text-[#1a3a5a] dark:text-slate-200" style={{width:'280px'}} value={fuelForm.notes} onChange={e => setFuelForm({...fuelForm, notes: e.target.value})} />
                        <button onClick={handleSaveFuel} className="inline-flex items-center gap-1 px-3 py-1 rounded border-[1.5px] border-[#1a5fa0] dark:border-[#5b9bd5] bg-[#2e75b6] dark:bg-[#2563eb] text-white text-xs font-semibold hover:brightness-110">💾 Save</button>
                        <button onClick={() => setShowFuelForm(false)} className="inline-flex items-center gap-1 px-3 py-1 rounded border-[1.5px] border-[#9db8d8] dark:border-slate-500 bg-[#e8f0f8] dark:bg-slate-700 text-[#1a5fa0] dark:text-slate-300 text-xs font-semibold hover:brightness-110">Cancel</button>
                      </div>
                    </div>
                  )}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs">
                      <thead><tr className="bg-[#2e75b6] dark:bg-[#1a5fa0]"><th className="text-white px-2 py-1 text-left font-bold border-r border-[#5b9bd5]">Vehicle</th><th className="text-white px-2 py-1 text-left font-bold border-r border-[#5b9bd5]">Date</th><th className="text-white px-2 py-1 text-left font-bold border-r border-[#5b9bd5]">Amount</th><th className="text-white px-2 py-1 text-left font-bold border-r border-[#5b9bd5]">Qty (L)</th><th className="text-white px-2 py-1 text-left font-bold border-r border-[#5b9bd5]">Station</th><th className="text-white px-2 py-1 text-left font-bold border-r border-[#5b9bd5]">Notes</th><th className="text-white px-2 py-1 text-center font-bold">Del</th></tr></thead>
                      <tbody>
                        {filteredFuel.map(f => (
                          <tr key={f.id} className="bg-[#eef4fb] dark:bg-[#1e293b] even:bg-[#dce8f5] dark:even:bg-[#0f172a] hover:bg-[#c8d8ec] dark:hover:bg-[#334155]">
                            <td className="px-2 py-1 border-b border-[#b8ccdc] dark:border-slate-600 text-[#1a3a5a] dark:text-slate-300">{vehicles.find(v => v.id === f.vehicle_id)?.name || 'N/A'}</td>
                            <td className="px-2 py-1 border-b border-[#b8ccdc] dark:border-slate-600 text-[#1a3a5a] dark:text-slate-300">{formatDate(f.fuel_date)}</td>
                            <td className="px-2 py-1 border-b border-[#b8ccdc] dark:border-slate-600 text-[#1a3a5a] dark:text-slate-300 font-bold">{formatCurrency(f.amount)}</td>
                            <td className="px-2 py-1 border-b border-[#b8ccdc] dark:border-slate-600 text-[#1a3a5a] dark:text-slate-300">{f.quantity || 0}</td>
                            <td className="px-2 py-1 border-b border-[#b8ccdc] dark:border-slate-600 text-[#1a3a5a] dark:text-slate-300">{f.fuel_station || '-'}</td>
                            <td className="px-2 py-1 border-b border-[#b8ccdc] dark:border-slate-600 text-[#1a3a5a] dark:text-slate-300">{f.notes || '-'}</td>
                            <td className="px-2 py-1 border-b border-[#b8ccdc] dark:border-slate-600 text-center"><button onClick={() => { if(window.confirm('Delete?')) { /* delete */ } }} className="px-2 py-0.5 rounded border-[1.5px] border-[#a02020] bg-[#d9534f] text-white text-xs hover:brightness-110">✕</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ══ REMINDERS TAB ══ */}
            {activeTab === 'reminders' && (
              <motion.div key="reminders" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full">
                <div className="bg-[#eef4fb] dark:bg-[#1e293b] border-[1.5px] border-[#9db8d8] dark:border-slate-600 rounded p-2.5">
                  <div className="flex justify-between items-center mb-2">
                    <button onClick={() => { setShowReminderForm(!showReminderForm); setReminderForm({...reminderForm, vehicle_id: selectedVehicle?.id || vehicles[0]?.id || '', reminder_name: '', next_date: new Date().toISOString().split('T')[0], frequency_days: 90, status: 'active', last_date: ''}) }} className="inline-flex items-center gap-1.5 px-3 py-1 rounded border-[1.5px] border-[#3d8b3d] bg-[#5cb85c] text-white text-xs font-semibold hover:brightness-110 cursor-pointer">➕ Add Reminder</button>
                    <div className="flex-1 text-center text-[#1a5fa0] dark:text-[#5b9bd5] font-bold text-[13px] tracking-wide">REMINDERS</div>
                  </div>
                  {showReminderForm && (
                    <div className="bg-[#dce8f5] dark:bg-[#0f172a] border-[1.5px] border-[#9db8d8] dark:border-slate-600 rounded p-2 mb-2">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-[#1a3a5a] dark:text-slate-300 font-semibold text-xs min-w-[48px] text-right">Vehicle</span>
                        <select className="bg-white dark:bg-slate-700 border-[1.5px] border-[#7a9ec0] dark:border-slate-500 rounded px-1.5 py-0.5 text-xs text-[#1a3a5a] dark:text-slate-200" style={{width:'120px'}} value={reminderForm.vehicle_id} onChange={e => setReminderForm({...reminderForm, vehicle_id: e.target.value})}>{vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select>
                        <span className="text-[#1a3a5a] dark:text-slate-300 font-semibold text-xs min-w-[40px] text-right">Name</span>
                        <input className="bg-white dark:bg-slate-700 border-[1.5px] border-[#7a9ec0] dark:border-slate-500 rounded px-1.5 py-0.5 text-xs text-[#1a3a5a] dark:text-slate-200" style={{width:'160px'}} value={reminderForm.reminder_name} onChange={e => setReminderForm({...reminderForm, reminder_name: e.target.value})} />
                        <span className="text-[#1a3a5a] dark:text-slate-300 font-semibold text-xs min-w-[64px] text-right">Next Date</span>
                        <input type="date" className="bg-white dark:bg-slate-700 border-[1.5px] border-[#7a9ec0] dark:border-slate-500 rounded px-1.5 py-0.5 text-xs text-[#1a3a5a] dark:text-slate-200" style={{width:'130px'}} value={reminderForm.next_date} onChange={e => setReminderForm({...reminderForm, next_date: e.target.value})} />
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[#1a3a5a] dark:text-slate-300 font-semibold text-xs min-w-[48px] text-right">Every</span>
                        <input type="number" className="bg-white dark:bg-slate-700 border-[1.5px] border-[#7a9ec0] dark:border-slate-500 rounded px-1.5 py-0.5 text-xs text-[#1a3a5a] dark:text-slate-200" style={{width:'70px'}} value={reminderForm.frequency_days} onChange={e => setReminderForm({...reminderForm, frequency_days: parseInt(e.target.value) || 90})} />
                        <span className="text-xs text-[#1a3a5a] dark:text-slate-300 ml-0.5">days</span>
                        <span className="text-[#1a3a5a] dark:text-slate-300 font-semibold text-xs min-w-[52px] text-right ml-2">Status</span>
                        <select className="bg-white dark:bg-slate-700 border-[1.5px] border-[#7a9ec0] dark:border-slate-500 rounded px-1.5 py-0.5 text-xs text-[#1a3a5a] dark:text-slate-200" style={{width:'100px'}} value={reminderForm.status} onChange={e => setReminderForm({...reminderForm, status: e.target.value})}><option value="active">Active</option><option value="completed">Completed</option></select>
                        <span className="text-[#1a3a5a] dark:text-slate-300 font-semibold text-xs min-w-[64px] text-right">Last Done</span>
                        <input type="date" className="bg-white dark:bg-slate-700 border-[1.5px] border-[#7a9ec0] dark:border-slate-500 rounded px-1.5 py-0.5 text-xs text-[#1a3a5a] dark:text-slate-200" style={{width:'130px'}} value={reminderForm.last_date} onChange={e => setReminderForm({...reminderForm, last_date: e.target.value})} />
                        <button onClick={handleSaveReminder} className="inline-flex items-center gap-1 px-3 py-1 rounded border-[1.5px] border-[#1a5fa0] dark:border-[#5b9bd5] bg-[#2e75b6] dark:bg-[#2563eb] text-white text-xs font-semibold hover:brightness-110 ml-2">💾 Save</button>
                        <button onClick={() => setShowReminderForm(false)} className="inline-flex items-center gap-1 px-3 py-1 rounded border-[1.5px] border-[#9db8d8] dark:border-slate-500 bg-[#e8f0f8] dark:bg-slate-700 text-[#1a5fa0] dark:text-slate-300 text-xs font-semibold hover:brightness-110">Cancel</button>
                      </div>
                    </div>
                  )}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs">
                      <thead><tr className="bg-[#2e75b6] dark:bg-[#1a5fa0]"><th className="text-white px-2 py-1 text-left font-bold border-r border-[#5b9bd5]">Vehicle</th><th className="text-white px-2 py-1 text-left font-bold border-r border-[#5b9bd5]">Name</th><th className="text-white px-2 py-1 text-left font-bold border-r border-[#5b9bd5]">Next Date</th><th className="text-white px-2 py-1 text-left font-bold border-r border-[#5b9bd5]">Every</th><th className="text-white px-2 py-1 text-left font-bold border-r border-[#5b9bd5]">Status</th><th className="text-white px-2 py-1 text-left font-bold border-r border-[#5b9bd5]">Last Done</th><th className="text-white px-2 py-1 text-center font-bold">Del</th></tr></thead>
                      <tbody>
                        {reminders.map(r => {
                          const st = getReminderStatus(r)
                          return (<tr key={r.id} className="bg-[#eef4fb] dark:bg-[#1e293b] even:bg-[#dce8f5] dark:even:bg-[#0f172a] hover:bg-[#c8d8ec] dark:hover:bg-[#334155]"><td className="px-2 py-1 border-b border-[#b8ccdc] dark:border-slate-600 text-[#1a3a5a] dark:text-slate-300">{vehicles.find(v => v.id === r.vehicle_id)?.name || 'N/A'}</td><td className="px-2 py-1 border-b border-[#b8ccdc] dark:border-slate-600 text-[#1a3a5a] dark:text-slate-300">{r.reminder_name}</td><td className="px-2 py-1 border-b border-[#b8ccdc] dark:border-slate-600 text-[#1a3a5a] dark:text-slate-300">{formatDate(r.next_date)}</td><td className="px-2 py-1 border-b border-[#b8ccdc] dark:border-slate-600 text-[#1a3a5a] dark:text-slate-300">{r.frequency_days}d</td><td className="px-2 py-1 border-b border-[#b8ccdc] dark:border-slate-600"><span className={`inline-block px-1.5 py-0.5 rounded-full text-[11px] font-semibold ${st.class}`}>{st.label}</span></td><td className="px-2 py-1 border-b border-[#b8ccdc] dark:border-slate-600 text-[#1a3a5a] dark:text-slate-300">{formatDate(r.last_date)}</td><td className="px-2 py-1 border-b border-[#b8ccdc] dark:border-slate-600 text-center"><button onClick={() => { if(window.confirm('Delete?')) { updateReminder(r.id, { status: 'completed' }); fetchReminders() } }} className="px-2 py-0.5 rounded border-[1.5px] border-[#a02020] bg-[#d9534f] text-white text-xs hover:brightness-110">✕</button></td></tr>)
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ══ METER TAB ══ */}
            {activeTab === 'meter' && (
              <motion.div key="meter" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full">
                <div className="bg-[#eef4fb] dark:bg-[#1e293b] border-[1.5px] border-[#9db8d8] dark:border-slate-600 rounded p-2.5">
                  <div className="flex justify-between items-center mb-2">
                    <button onClick={() => { setShowMeterForm(!showMeterForm); setMeterForm({...meterForm, vehicle_id: selectedVehicle?.id || vehicles[0]?.id || '', reading_date: new Date().toISOString().split('T')[0], odometer_reading: '', notes: ''}) }} className="inline-flex items-center gap-1.5 px-3 py-1 rounded border-[1.5px] border-[#3d8b3d] bg-[#5cb85c] text-white text-xs font-semibold hover:brightness-110 cursor-pointer">➕ Add Reading</button>
                    <div className="flex-1 text-center text-[#1a5fa0] dark:text-[#5b9bd5] font-bold text-[13px] tracking-wide">METER TRACKING</div>
                  </div>
                  {showMeterForm && (
                    <div className="bg-[#dce8f5] dark:bg-[#0f172a] border-[1.5px] border-[#9db8d8] dark:border-slate-600 rounded p-2 mb-2">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-[#1a3a5a] dark:text-slate-300 font-semibold text-xs min-w-[48px] text-right">Vehicle</span>
                        <select className="bg-white dark:bg-slate-700 border-[1.5px] border-[#7a9ec0] dark:border-slate-500 rounded px-1.5 py-0.5 text-xs text-[#1a3a5a] dark:text-slate-200" style={{width:'120px'}} value={meterForm.vehicle_id} onChange={e => setMeterForm({...meterForm, vehicle_id: e.target.value})}>{vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select>
                        <span className="text-[#1a3a5a] dark:text-slate-300 font-semibold text-xs min-w-[40px] text-right">Date</span>
                        <input type="date" className="bg-white dark:bg-slate-700 border-[1.5px] border-[#7a9ec0] dark:border-slate-500 rounded px-1.5 py-0.5 text-xs text-[#1a3a5a] dark:text-slate-200" style={{width:'130px'}} value={meterForm.reading_date} onChange={e => setMeterForm({...meterForm, reading_date: e.target.value})} />
                        <span className="text-[#1a3a5a] dark:text-slate-300 font-semibold text-xs min-w-[60px] text-right">Reading</span>
                        <input type="number" className="bg-white dark:bg-slate-700 border-[1.5px] border-[#7a9ec0] dark:border-slate-500 rounded px-1.5 py-0.5 text-xs text-[#1a3a5a] dark:text-slate-200" style={{width:'110px'}} placeholder="Odometer" value={meterForm.odometer_reading} onChange={e => setMeterForm({...meterForm, odometer_reading: e.target.value})} />
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[#1a3a5a] dark:text-slate-300 font-semibold text-xs min-w-[48px] text-right">Notes</span>
                        <input className="bg-white dark:bg-slate-700 border-[1.5px] border-[#7a9ec0] dark:border-slate-500 rounded px-1.5 py-0.5 text-xs text-[#1a3a5a] dark:text-slate-200" style={{width:'280px'}} value={meterForm.notes} onChange={e => setMeterForm({...meterForm, notes: e.target.value})} />
                        <button onClick={handleSaveMeter} className="inline-flex items-center gap-1 px-3 py-1 rounded border-[1.5px] border-[#1a5fa0] dark:border-[#5b9bd5] bg-[#2e75b6] dark:bg-[#2563eb] text-white text-xs font-semibold hover:brightness-110">💾 Save</button>
                        <button onClick={() => setShowMeterForm(false)} className="inline-flex items-center gap-1 px-3 py-1 rounded border-[1.5px] border-[#9db8d8] dark:border-slate-500 bg-[#e8f0f8] dark:bg-slate-700 text-[#1a5fa0] dark:text-slate-300 text-xs font-semibold hover:brightness-110">Cancel</button>
                      </div>
                    </div>
                  )}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs">
                      <thead><tr className="bg-[#2e75b6] dark:bg-[#1a5fa0]"><th className="text-white px-2 py-1 text-left font-bold border-r border-[#5b9bd5]">Vehicle</th><th className="text-white px-2 py-1 text-left font-bold border-r border-[#5b9bd5]">Date</th><th className="text-white px-2 py-1 text-left font-bold border-r border-[#5b9bd5]">Reading (KM)</th><th className="text-white px-2 py-1 text-left font-bold border-r border-[#5b9bd5]">Notes</th><th className="text-white px-2 py-1 text-center font-bold">Del</th></tr></thead>
                      <tbody>
                        {[...meterReadings].sort((a, b) => new Date(b.reading_date) - new Date(a.reading_date)).map(m => (
                          <tr key={m.id} className="bg-[#eef4fb] dark:bg-[#1e293b] even:bg-[#dce8f5] dark:even:bg-[#0f172a] hover:bg-[#c8d8ec] dark:hover:bg-[#334155]"><td className="px-2 py-1 border-b border-[#b8ccdc] dark:border-slate-600 text-[#1a3a5a] dark:text-slate-300">{vehicles.find(v => v.id === m.vehicle_id)?.name || 'N/A'}</td><td className="px-2 py-1 border-b border-[#b8ccdc] dark:border-slate-600 text-[#1a3a5a] dark:text-slate-300">{formatDate(m.reading_date)}</td><td className="px-2 py-1 border-b border-[#b8ccdc] dark:border-slate-600 text-[#1a3a5a] dark:text-slate-300 font-bold">{Number(m.odometer_reading).toLocaleString()}</td><td className="px-2 py-1 border-b border-[#b8ccdc] dark:border-slate-600 text-[#1a3a5a] dark:text-slate-300">{m.notes || '-'}</td><td className="px-2 py-1 border-b border-[#b8ccdc] dark:border-slate-600 text-center"><button onClick={() => { if(window.confirm('Delete?')) { /* delete */ } }} className="px-2 py-0.5 rounded border-[1.5px] border-[#a02020] bg-[#d9534f] text-white text-xs hover:brightness-110">✕</button></td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ══ DASHBOARD TAB ══ */}
            {activeTab === 'dashboard' && (
              <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full">
                <div className="bg-[#eef4fb] dark:bg-[#1e293b] border-[1.5px] border-[#9db8d8] dark:border-slate-600 rounded p-2.5">
                  <div className="flex items-center gap-2.5 mb-2.5 flex-wrap">
                    <div className="text-[#1a5fa0] dark:text-[#5b9bd5] font-bold text-[13px]">VEHICLE DASHBOARD</div>
                    <select className="bg-white dark:bg-slate-700 border-[1.5px] border-[#7a9ec0] dark:border-slate-500 rounded px-1.5 py-0.5 text-xs" style={{width:'120px'}} value={dashVehicle} onChange={e => setDashVehicle(e.target.value)}><option value="">All Vehicles</option>{vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select>
                    <span className="text-xs text-[#1a3a5a] dark:text-slate-300">From</span>
                    <input type="date" className="bg-white dark:bg-slate-700 border-[1.5px] border-[#7a9ec0] dark:border-slate-500 rounded px-1.5 py-0.5 text-xs" style={{width:'130px'}} value={dashFrom} onChange={e => setDashFrom(e.target.value)} />
                    <span className="text-xs text-[#1a3a5a] dark:text-slate-300">To</span>
                    <input type="date" className="bg-white dark:bg-slate-700 border-[1.5px] border-[#7a9ec0] dark:border-slate-500 rounded px-1.5 py-0.5 text-xs" style={{width:'130px'}} value={dashTo} onChange={e => setDashTo(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-4 gap-2.5 mb-2.5">
                    <div className="bg-white dark:bg-slate-700 border-[1.5px] border-[#9db8d8] dark:border-slate-500 rounded p-2.5 text-center"><div className="text-[22px] font-bold text-[#2e75b6] dark:text-[#5b9bd5]">{formatCurrency(totalExpenses)}</div><div className="text-[11px] text-[#5b7fa0] dark:text-slate-400 mt-0.5">Total Expenses</div></div>
                    <div className="bg-white dark:bg-slate-700 border-[1.5px] border-[#9db8d8] dark:border-slate-500 rounded p-2.5 text-center"><div className="text-[22px] font-bold text-[#2e75b6] dark:text-[#5b9bd5]">{formatCurrency(totalFuel)}</div><div className="text-[11px] text-[#5b7fa0] dark:text-slate-400 mt-0.5">Fuel Cost · {totalFuelQty.toFixed(0)} L</div></div>
                    <div className="bg-white dark:bg-slate-700 border-[1.5px] border-[#9db8d8] dark:border-slate-500 rounded p-2.5 text-center"><div className="text-[22px] font-bold text-[#5cb85c]">{vehicles.length}</div><div className="text-[11px] text-[#5b7fa0] dark:text-slate-400 mt-0.5">Vehicles</div></div>
                    <div className="bg-white dark:bg-slate-700 border-[1.5px] border-[#9db8d8] dark:border-slate-500 rounded p-2.5 text-center"><div className={`text-[22px] font-bold ${overdueReminders > 0 ? 'text-[#d9534f]' : 'text-[#5cb85c]'}`}>{overdueReminders}</div><div className="text-[11px] text-[#5b7fa0] dark:text-slate-400 mt-0.5">Overdue</div></div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
