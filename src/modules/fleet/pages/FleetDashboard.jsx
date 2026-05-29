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
  BarChart3, Activity, Save, X
} from 'lucide-react'

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
  const [activeTab, setActiveTab] = useState('vehicles')
  const [selectedVehicle, setSelectedVehicle] = useState(null)

  // Form visibility
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [showFuelForm, setShowFuelForm] = useState(false)
  const [showReminderForm, setShowReminderForm] = useState(false)
  const [showMeterForm, setShowMeterForm] = useState(false)

  // Form data
  const [vehicleForm, setVehicleForm] = useState({ name: '', plate_number: '', make: '', model: '', vehicle_type: '', seats: 4, notes: '', fuel_type: 'petrol' })
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
      fuel_type: v.fuel_type || 'petrol'
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
    const result = await createVehicle({ name: 'New Vehicle', plate_number: '', make: '', model: '', vehicle_type: 'sedan', seats: 4, notes: '', fuel_type: 'petrol' })
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

  const handleDeleteExpense = async (id) => {
    if (window.confirm('Delete this expense?')) {
      await createExpense({ id, _delete: true })
      fetchExpenses()
      toast.success('Deleted')
    }
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

  const getStatusBadge = (status) => {
    const today = new Date().toISOString().split('T')[0]
    if (status === 'active' || status === 'Active') {
      return { class: 'bg-green-100 text-green-800', label: 'Active' }
    }
    return { class: 'bg-yellow-100 text-yellow-800', label: status }
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
    <div className="min-h-screen font-[Calibri,Arial,sans-serif] bg-[#c8d8e8] text-[13px]">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#5b9bd5] to-[#2e75b6] px-4 py-2 flex items-center gap-3.5 border-b-2 border-[#1a5fa0]">
        <span className="text-[32px]">🚗</span>
        <h1 className="text-white text-[22px] font-bold tracking-wider drop-shadow-md">VEHICLE EXPENSE TRACKER</h1>
        <div className="flex-1" />
        <Link to="/dashboard" className="text-white text-xs hover:underline flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Main Dashboard
        </Link>
      </div>

      {/* Tab Bar */}
      <div className="bg-[#dce8f5] border-b-2 border-[#9db8d8] flex gap-0 px-2 pt-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center px-5 py-1.5 min-w-[80px] border-[1.5px] border-[#9db8d8] border-b-0 rounded-t text-[11px] font-semibold gap-0.5 transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-[#1a5fa0] -mb-0.5 pb-1.5'
                : 'bg-[#c0d4ea] text-[#1a5fa0] hover:bg-[#d4e4f5]'
            }`}
            style={{ marginRight: '3px' }}
          >
            <span className="text-2xl leading-none">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex border-2 border-[#9db8d8] bg-[#dce8f5] min-h-[calc(100vh-100px)]">
        {/* Left Panel - Vehicle List */}
        <div className="w-[140px] bg-[#dce8f5] border-r-2 border-[#9db8d8] flex-shrink-0 flex flex-col">
          <div className="bg-[#2e75b6] text-white font-bold text-center py-1.5 text-xs border-b border-[#1a5fa0]">
            Vehicle List
          </div>
          {vehicles.map(v => (
            <div
              key={v.id}
              onClick={() => handleSelectVehicle(v)}
              className={`px-2 py-1 cursor-pointer border-b border-[#b8ccdc] text-[#1a3a5a] text-xs whitespace-nowrap overflow-hidden text-ellipsis hover:bg-[#c8d8ec] ${
                selectedVehicle?.id === v.id ? 'bg-[#2e75b6] text-white' : 'bg-[#dce8f5]'
              }`}
            >
              {v.name}
            </div>
          ))}
          {Array.from({ length: Math.max(0, 10 - vehicles.length) }).map((_, i) => (
            <div key={`empty-${i}`} className="px-2 py-1 border-b border-[#b8ccdc] text-[#a0b8cc] bg-[#e8f0f8] text-xs">&nbsp;</div>
          ))}
        </div>

        {/* Right Panel */}
        <div className="flex-1 flex flex-col p-2.5 gap-2.5">
          <AnimatePresence mode="wait">
            {/* ══ VEHICLES TAB ══ */}
            {activeTab === 'vehicles' && (
              <motion.div key="vehicles" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-2.5 w-full">
                <div className="bg-[#eef4fb] border-[1.5px] border-[#9db8d8] rounded p-2.5">
                  <div className="flex justify-between items-center mb-2">
                    <button onClick={handleAddVehicle} className="inline-flex items-center gap-1.5 px-3 py-1 rounded border-[1.5px] border-[#3d8b3d] bg-[#5cb85c] text-white text-xs font-semibold hover:brightness-110 cursor-pointer">
                      ➕ Add Vehicle
                    </button>
                    <div className="flex-1 text-center text-[#1a5fa0] font-bold text-[13px] tracking-wide">VEHICLES</div>
                  </div>
                  
                  <div className="flex gap-3.5">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-[#1a3a5a] font-semibold text-xs text-right min-w-[48px]">Name</span>
                        <input className="bg-white border-[1.5px] border-[#7a9ec0] rounded px-1.5 py-0.5 text-xs text-[#1a3a5a] outline-none focus:border-[#2e75b6]" style={{width:'120px'}} value={vehicleForm.name} onChange={e => setVehicleForm({...vehicleForm, name: e.target.value})} />
                        <span className="text-[#1a3a5a] font-semibold text-xs text-right min-w-[52px]">Plate #</span>
                        <input className="bg-white border-[1.5px] border-[#7a9ec0] rounded px-1.5 py-0.5 text-xs text-[#1a3a5a] outline-none focus:border-[#2e75b6]" style={{width:'100px'}} value={vehicleForm.plate_number} onChange={e => setVehicleForm({...vehicleForm, plate_number: e.target.value})} />
                      </div>
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-[#1a3a5a] font-semibold text-xs text-right min-w-[48px]">Make</span>
                        <input className="bg-white border-[1.5px] border-[#7a9ec0] rounded px-1.5 py-0.5 text-xs text-[#1a3a5a] outline-none focus:border-[#2e75b6]" style={{width:'120px'}} value={vehicleForm.make} onChange={e => setVehicleForm({...vehicleForm, make: e.target.value})} />
                        <span className="text-[#1a3a5a] font-semibold text-xs text-right min-w-[52px]">Model</span>
                        <input className="bg-white border-[1.5px] border-[#7a9ec0] rounded px-1.5 py-0.5 text-xs text-[#1a3a5a] outline-none focus:border-[#2e75b6]" style={{width:'100px'}} value={vehicleForm.model} onChange={e => setVehicleForm({...vehicleForm, model: e.target.value})} />
                      </div>
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-[#1a3a5a] font-semibold text-xs text-right min-w-[48px]">Type</span>
                        <select className="bg-white border-[1.5px] border-[#7a9ec0] rounded px-1.5 py-0.5 text-xs text-[#1a3a5a] outline-none focus:border-[#2e75b6]" style={{width:'120px'}} value={vehicleForm.vehicle_type} onChange={e => setVehicleForm({...vehicleForm, vehicle_type: e.target.value})}>
                          <option value="">-- Select --</option>
                          <option value="sedan">Sedan</option>
                          <option value="suv">SUV</option>
                          <option value="truck">Truck</option>
                          <option value="van">Van</option>
                          <option value="bakkie">Bakkie</option>
                          <option value="other">Other</option>
                        </select>
                        <span className="text-[#1a3a5a] font-semibold text-xs text-right min-w-[52px]">Seats</span>
                        <input type="number" min="1" max="20" className="bg-white border-[1.5px] border-[#7a9ec0] rounded px-1.5 py-0.5 text-xs text-[#1a3a5a] outline-none focus:border-[#2e75b6]" style={{width:'60px'}} value={vehicleForm.seats} onChange={e => setVehicleForm({...vehicleForm, seats: parseInt(e.target.value) || 4})} />
                      </div>
                      <div className="flex items-start gap-2 mb-1.5">
                        <span className="text-[#1a3a5a] font-semibold text-xs text-right min-w-[48px] pt-0.5">Notes</span>
                        <textarea className="bg-white border-[1.5px] border-[#7a9ec0] rounded px-1.5 py-0.5 text-xs text-[#1a3a5a] outline-none focus:border-[#2e75b6] resize-y min-h-[60px]" style={{width:'280px'}} value={vehicleForm.notes} onChange={e => setVehicleForm({...vehicleForm, notes: e.target.value})} />
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <button onClick={handleSaveVehicle} className="inline-flex items-center gap-1 px-3 py-1 rounded border-[1.5px] border-[#1a5fa0] bg-[#2e75b6] text-white text-xs font-semibold hover:brightness-110 cursor-pointer">
                          💾 Save
                        </button>
                        <button onClick={handleDeleteVehicle} className="inline-flex items-center gap-1 px-3 py-1 rounded border-[1.5px] border-[#a02020] bg-[#d9534f] text-white text-xs font-semibold hover:brightness-110 cursor-pointer">
                          🗑 Delete
                        </button>
                      </div>
                    </div>
                    <div className="w-[200px] flex-shrink-0">
                      <div className="text-[11px] font-bold text-[#1a5fa0] text-center mb-1">Vehicle Picture</div>
                      <div className="bg-white border-[1.5px] border-[#9db8d8] rounded flex items-center justify-center text-[#aac0d4] text-xs text-center overflow-hidden" style={{height:'130px'}}>
                        {selectedVehicle?.image_url ? (
                          <img src={selectedVehicle.image_url} alt="Vehicle" className="w-full h-full object-contain" />
                        ) : (
                          <span>No image</span>
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
                <div className="bg-[#eef4fb] border-[1.5px] border-[#9db8d8] rounded p-2.5">
                  <div className="flex justify-between items-center mb-2">
                    <button onClick={() => { setShowExpenseForm(!showExpenseForm); setExpenseForm({...expenseForm, vehicle_id: selectedVehicle?.id || vehicles[0]?.id || '', expense_date: new Date().toISOString().split('T')[0], amount: '', vendor: '', notes: ''}) }} className="inline-flex items-center gap-1.5 px-3 py-1 rounded border-[1.5px] border-[#3d8b3d] bg-[#5cb85c] text-white text-xs font-semibold hover:brightness-110 cursor-pointer">
                      ➕ Add Expense
                    </button>
                    <div className="flex-1 text-center text-[#1a5fa0] font-bold text-[13px] tracking-wide">REPAIRS & EXPENSES</div>
                  </div>

                  {showExpenseForm && (
                    <div className="bg-[#dce8f5] border-[1.5px] border-[#9db8d8] rounded p-2 mb-2">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-[#1a3a5a] font-semibold text-xs min-w-[48px] text-right">Vehicle</span>
                        <select className="bg-white border-[1.5px] border-[#7a9ec0] rounded px-1.5 py-0.5 text-xs" style={{width:'120px'}} value={expenseForm.vehicle_id} onChange={e => setExpenseForm({...expenseForm, vehicle_id: e.target.value})}>
                          {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                        <span className="text-[#1a3a5a] font-semibold text-xs min-w-[40px] text-right">Date</span>
                        <input type="date" className="bg-white border-[1.5px] border-[#7a9ec0] rounded px-1.5 py-0.5 text-xs" style={{width:'130px'}} value={expenseForm.expense_date} onChange={e => setExpenseForm({...expenseForm, expense_date: e.target.value})} />
                        <span className="text-[#1a3a5a] font-semibold text-xs min-w-[52px] text-right">Amount</span>
                        <input type="number" step="0.01" className="bg-white border-[1.5px] border-[#7a9ec0] rounded px-1.5 py-0.5 text-xs" style={{width:'90px'}} placeholder="R0.00" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} />
                      </div>
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-[#1a3a5a] font-semibold text-xs min-w-[48px] text-right">Type</span>
                        <select className="bg-white border-[1.5px] border-[#7a9ec0] rounded px-1.5 py-0.5 text-xs" style={{width:'120px'}} value={expenseForm.expense_type} onChange={e => setExpenseForm({...expenseForm, expense_type: e.target.value})}>
                          <option value="maintenance">Maintenance</option>
                          <option value="repair">Repair</option>
                          <option value="tyres">Tyres</option>
                          <option value="insurance">Insurance</option>
                          <option value="registration">Registration</option>
                          <option value="fuel">Fuel</option>
                          <option value="toll">Toll</option>
                          <option value="fine">Fine</option>
                          <option value="cleaning">Cleaning</option>
                          <option value="other">Other</option>
                        </select>
                        <span className="text-[#1a3a5a] font-semibold text-xs min-w-[40px] text-right">Vendor</span>
                        <input className="bg-white border-[1.5px] border-[#7a9ec0] rounded px-1.5 py-0.5 text-xs" style={{width:'160px'}} placeholder="Vendor Name" value={expenseForm.vendor} onChange={e => setExpenseForm({...expenseForm, vendor: e.target.value})} />
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[#1a3a5a] font-semibold text-xs min-w-[48px] text-right">Notes</span>
                        <input className="bg-white border-[1.5px] border-[#7a9ec0] rounded px-1.5 py-0.5 text-xs" style={{width:'320px'}} value={expenseForm.notes} onChange={e => setExpenseForm({...expenseForm, notes: e.target.value})} />
                        <button onClick={handleSaveExpense} className="inline-flex items-center gap-1 px-3 py-1 rounded border-[1.5px] border-[#1a5fa0] bg-[#2e75b6] text-white text-xs font-semibold hover:brightness-110">💾 Save</button>
                        <button onClick={() => setShowExpenseForm(false)} className="inline-flex items-center gap-1 px-3 py-1 rounded border-[1.5px] border-[#9db8d8] bg-[#e8f0f8] text-[#1a5fa0] text-xs font-semibold hover:brightness-110">Cancel</button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xs text-[#1a3a5a] font-semibold">Filter:</span>
                    <select className="bg-white border-[1.5px] border-[#7a9ec0] rounded px-1.5 py-0.5 text-xs" style={{width:'110px'}} value={expFilterVehicle} onChange={e => setExpFilterVehicle(e.target.value)}>
                      <option value="">All Vehicles</option>
                      {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                    <select className="bg-white border-[1.5px] border-[#7a9ec0] rounded px-1.5 py-0.5 text-xs" style={{width:'110px'}} value={expFilterType} onChange={e => setExpFilterType(e.target.value)}>
                      <option value="">All Types</option>
                      {[...new Set(expenses.map(e => e.expense_type).filter(Boolean))].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input className="bg-white border-[1.5px] border-[#7a9ec0] rounded px-1.5 py-0.5 text-xs" style={{width:'130px'}} placeholder="Search…" value={expSearch} onChange={e => setExpSearch(e.target.value)} />
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#2e75b6]">
                          <th className="text-white px-2 py-1 text-left font-bold whitespace-nowrap border-r border-[#5b9bd5]">Vehicle</th>
                          <th className="text-white px-2 py-1 text-left font-bold whitespace-nowrap border-r border-[#5b9bd5]">Date</th>
                          <th className="text-white px-2 py-1 text-left font-bold whitespace-nowrap border-r border-[#5b9bd5]">Amount</th>
                          <th className="text-white px-2 py-1 text-left font-bold whitespace-nowrap border-r border-[#5b9bd5]">Type</th>
                          <th className="text-white px-2 py-1 text-left font-bold whitespace-nowrap border-r border-[#5b9bd5]">Vendor</th>
                          <th className="text-white px-2 py-1 text-left font-bold whitespace-nowrap border-r border-[#5b9bd5]">Notes</th>
                          <th className="text-white px-2 py-1 text-center font-bold">Del</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredExpenses.map(e => (
                          <tr key={e.id} className="bg-[#eef4fb] even:bg-[#dce8f5] hover:bg-[#c8d8ec]">
                            <td className="px-2 py-1 border-b border-[#b8ccdc] text-[#1a3a5a]">{vehicles.find(v => v.id === e.vehicle_id)?.name || 'N/A'}</td>
                            <td className="px-2 py-1 border-b border-[#b8ccdc] text-[#1a3a5a]">{formatDate(e.expense_date)}</td>
                            <td className="px-2 py-1 border-b border-[#b8ccdc] text-[#1a3a5a] font-bold">{formatCurrency(e.amount)}</td>
                            <td className="px-2 py-1 border-b border-[#b8ccdc] text-[#1a3a5a] capitalize">{e.expense_type}</td>
                            <td className="px-2 py-1 border-b border-[#b8ccdc] text-[#1a3a5a]">{e.vendor || '-'}</td>
                            <td className="px-2 py-1 border-b border-[#b8ccdc] text-[#1a3a5a]">{e.notes || '-'}</td>
                            <td className="px-2 py-1 border-b border-[#b8ccdc] text-center">
                              <button onClick={() => handleDeleteExpense(e.id)} className="px-2 py-0.5 rounded border-[1.5px] border-[#a02020] bg-[#d9534f] text-white text-xs hover:brightness-110">✕</button>
                            </td>
                          </tr>
                        ))}
                        {filteredExpenses.length === 0 && (
                          <tr><td colSpan={7} className="text-center text-[#a0b8cc] py-3">No records</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ══ FUEL TAB ══ */}
            {activeTab === 'fuel' && (
              <motion.div key="fuel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full">
                <div className="bg-[#eef4fb] border-[1.5px] border-[#9db8d8] rounded p-2.5">
                  <div className="flex justify-between items-center mb-2">
                    <button onClick={() => { setShowFuelForm(!showFuelForm); setFuelForm({...fuelForm, vehicle_id: selectedVehicle?.id || vehicles[0]?.id || '', fuel_date: new Date().toISOString().split('T')[0], amount: '', quantity: '', fuel_station: '', notes: ''}) }} className="inline-flex items-center gap-1.5 px-3 py-1 rounded border-[1.5px] border-[#3d8b3d] bg-[#5cb85c] text-white text-xs font-semibold hover:brightness-110 cursor-pointer">
                      ➕ Add Fuel
                    </button>
                    <div className="flex-1 text-center text-[#1a5fa0] font-bold text-[13px] tracking-wide">FUEL PURCHASES & TRACKING</div>
                  </div>

                  {showFuelForm && (
                    <div className="bg-[#dce8f5] border-[1.5px] border-[#9db8d8] rounded p-2 mb-2">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-[#1a3a5a] font-semibold text-xs min-w-[48px] text-right">Vehicle</span>
                        <select className="bg-white border-[1.5px] border-[#7a9ec0] rounded px-1.5 py-0.5 text-xs" style={{width:'120px'}} value={fuelForm.vehicle_id} onChange={e => setFuelForm({...fuelForm, vehicle_id: e.target.value})}>
                          {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                        <span className="text-[#1a3a5a] font-semibold text-xs min-w-[40px] text-right">Date</span>
                        <input type="date" className="bg-white border-[1.5px] border-[#7a9ec0] rounded px-1.5 py-0.5 text-xs" style={{width:'130px'}} value={fuelForm.fuel_date} onChange={e => setFuelForm({...fuelForm, fuel_date: e.target.value})} />
                        <span className="text-[#1a3a5a] font-semibold text-xs min-w-[52px] text-right">Amount</span>
                        <input type="number" step="0.01" className="bg-white border-[1.5px] border-[#7a9ec0] rounded px-1.5 py-0.5 text-xs" style={{width:'90px'}} placeholder="R0.00" value={fuelForm.amount} onChange={e => setFuelForm({...fuelForm, amount: e.target.value})} />
                      </div>
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-[#1a3a5a] font-semibold text-xs min-w-[48px] text-right">Unit</span>
                        <select className="bg-white border-[1.5px] border-[#7a9ec0] rounded px-1.5 py-0.5 text-xs" style={{width:'100px'}} value="litres"><option>Litres</option></select>
                        <span className="text-[#1a3a5a] font-semibold text-xs min-w-[40px] text-right">Qty</span>
                        <input type="number" step="0.1" className="bg-white border-[1.5px] border-[#7a9ec0] rounded px-1.5 py-0.5 text-xs" style={{width:'80px'}} value={fuelForm.quantity} onChange={e => setFuelForm({...fuelForm, quantity: e.target.value})} />
                        <span className="text-[#1a3a5a] font-semibold text-xs min-w-[52px] text-right">Station</span>
                        <input className="bg-white border-[1.5px] border-[#7a9ec0] rounded px-1.5 py-0.5 text-xs" style={{width:'140px'}} value={fuelForm.fuel_station} onChange={e => setFuelForm({...fuelForm, fuel_station: e.target.value})} />
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[#1a3a5a] font-semibold text-xs min-w-[48px] text-right">Notes</span>
                        <input className="bg-white border-[1.5px] border-[#7a9ec0] rounded px-1.5 py-0.5 text-xs" style={{width:'280px'}} value={fuelForm.notes} onChange={e => setFuelForm({...fuelForm, notes: e.target.value})} />
                        <button onClick={handleSaveFuel} className="inline-flex items-center gap-1 px-3 py-1 rounded border-[1.5px] border-[#1a5fa0] bg-[#2e75b6] text-white text-xs font-semibold hover:brightness-110">💾 Save</button>
                        <button onClick={() => setShowFuelForm(false)} className="inline-flex items-center gap-1 px-3 py-1 rounded border-[1.5px] border-[#9db8d8] bg-[#e8f0f8] text-[#1a5fa0] text-xs font-semibold hover:brightness-110">Cancel</button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-[#1a3a5a] font-semibold">Filter:</span>
                    <select className="bg-white border-[1.5px] border-[#7a9ec0] rounded px-1.5 py-0.5 text-xs" style={{width:'120px'}} value={fuelFilterVehicle} onChange={e => setFuelFilterVehicle(e.target.value)}>
                      <option value="">All Vehicles</option>
                      {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#2e75b6]">
                          <th className="text-white px-2 py-1 text-left font-bold border-r border-[#5b9bd5]">Vehicle</th>
                          <th className="text-white px-2 py-1 text-left font-bold border-r border-[#5b9bd5]">Date</th>
                          <th className="text-white px-2 py-1 text-left font-bold border-r border-[#5b9bd5]">Amount</th>
                          <th className="text-white px-2 py-1 text-left font-bold border-r border-[#5b9bd5]">Qty (L)</th>
                          <th className="text-white px-2 py-1 text-left font-bold border-r border-[#5b9bd5]">Station</th>
                          <th className="text-white px-2 py-1 text-left font-bold border-r border-[#5b9bd5]">Notes</th>
                          <th className="text-white px-2 py-1 text-center font-bold">Del</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredFuel.map(f => (
                          <tr key={f.id} className="bg-[#eef4fb] even:bg-[#dce8f5] hover:bg-[#c8d8ec]">
                            <td className="px-2 py-1 border-b border-[#b8ccdc] text-[#1a3a5a]">{vehicles.find(v => v.id === f.vehicle_id)?.name || 'N/A'}</td>
                            <td className="px-2 py-1 border-b border-[#b8ccdc] text-[#1a3a5a]">{formatDate(f.fuel_date)}</td>
                            <td className="px-2 py-1 border-b border-[#b8ccdc] text-[#1a3a5a] font-bold">{formatCurrency(f.amount)}</td>
                            <td className="px-2 py-1 border-b border-[#b8ccdc] text-[#1a3a5a]">{f.quantity || 0}</td>
                            <td className="px-2 py-1 border-b border-[#b8ccdc] text-[#1a3a5a]">{f.fuel_station || '-'}</td>
                            <td className="px-2 py-1 border-b border-[#b8ccdc] text-[#1a3a5a]">{f.notes || '-'}</td>
                            <td className="px-2 py-1 border-b border-[#b8ccdc] text-center">
                              <button onClick={() => { if(window.confirm('Delete?')) { createFuelRecord({ id: f.id, _delete: true }); fetchFuelRecords() } }} className="px-2 py-0.5 rounded border-[1.5px] border-[#a02020] bg-[#d9534f] text-white text-xs hover:brightness-110">✕</button>
                            </td>
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
                <div className="bg-[#eef4fb] border-[1.5px] border-[#9db8d8] rounded p-2.5">
                  <div className="flex justify-between items-center mb-2">
                    <button onClick={() => { setShowReminderForm(!showReminderForm); setReminderForm({...reminderForm, vehicle_id: selectedVehicle?.id || vehicles[0]?.id || '', reminder_name: '', next_date: new Date().toISOString().split('T')[0], frequency_days: 90, status: 'active', last_date: ''}) }} className="inline-flex items-center gap-1.5 px-3 py-1 rounded border-[1.5px] border-[#3d8b3d] bg-[#5cb85c] text-white text-xs font-semibold hover:brightness-110 cursor-pointer">
                      ➕ Add Reminder
                    </button>
                    <div className="flex-1 text-center text-[#1a5fa0] font-bold text-[13px] tracking-wide">REMINDERS</div>
                  </div>

                  {showReminderForm && (
                    <div className="bg-[#dce8f5] border-[1.5px] border-[#9db8d8] rounded p-2 mb-2">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-[#1a3a5a] font-semibold text-xs min-w-[48px] text-right">Vehicle</span>
                        <select className="bg-white border-[1.5px] border-[#7a9ec0] rounded px-1.5 py-0.5 text-xs" style={{width:'120px'}} value={reminderForm.vehicle_id} onChange={e => setReminderForm({...reminderForm, vehicle_id: e.target.value})}>
                          {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                        <span className="text-[#1a3a5a] font-semibold text-xs min-w-[40px] text-right">Name</span>
                        <input className="bg-white border-[1.5px] border-[#7a9ec0] rounded px-1.5 py-0.5 text-xs" style={{width:'160px'}} value={reminderForm.reminder_name} onChange={e => setReminderForm({...reminderForm, reminder_name: e.target.value})} />
                        <span className="text-[#1a3a5a] font-semibold text-xs min-w-[64px] text-right">Next Date</span>
                        <input type="date" className="bg-white border-[1.5px] border-[#7a9ec0] rounded px-1.5 py-0.5 text-xs" style={{width:'130px'}} value={reminderForm.next_date} onChange={e => setReminderForm({...reminderForm, next_date: e.target.value})} />
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[#1a3a5a] font-semibold text-xs min-w-[48px] text-right">Every</span>
                        <input type="number" className="bg-white border-[1.5px] border-[#7a9ec0] rounded px-1.5 py-0.5 text-xs" style={{width:'70px'}} value={reminderForm.frequency_days} onChange={e => setReminderForm({...reminderForm, frequency_days: parseInt(e.target.value) || 90})} />
                        <span className="text-xs text-[#1a3a5a] ml-0.5">days</span>
                        <span className="text-[#1a3a5a] font-semibold text-xs min-w-[52px] text-right ml-2">Status</span>
                        <select className="bg-white border-[1.5px] border-[#7a9ec0] rounded px-1.5 py-0.5 text-xs" style={{width:'100px'}} value={reminderForm.status} onChange={e => setReminderForm({...reminderForm, status: e.target.value})}>
                          <option value="active">Active</option>
                          <option value="completed">Completed</option>
                        </select>
                        <span className="text-[#1a3a5a] font-semibold text-xs min-w-[64px] text-right">Last Done</span>
                        <input type="date" className="bg-white border-[1.5px] border-[#7a9ec0] rounded px-1.5 py-0.5 text-xs" style={{width:'130px'}} value={reminderForm.last_date} onChange={e => setReminderForm({...reminderForm, last_date: e.target.value})} />
                        <button onClick={handleSaveReminder} className="inline-flex items-center gap-1 px-3 py-1 rounded border-[1.5px] border-[#1a5fa0] bg-[#2e75b6] text-white text-xs font-semibold hover:brightness-110 ml-2">💾 Save</button>
                        <button onClick={() => setShowReminderForm(false)} className="inline-flex items-center gap-1 px-3 py-1 rounded border-[1.5px] border-[#9db8d8] bg-[#e8f0f8] text-[#1a5fa0] text-xs font-semibold hover:brightness-110">Cancel</button>
                      </div>
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#2e75b6]">
                          <th className="text-white px-2 py-1 text-left font-bold border-r border-[#5b9bd5]">Vehicle</th>
                          <th className="text-white px-2 py-1 text-left font-bold border-r border-[#5b9bd5]">Name</th>
                          <th className="text-white px-2 py-1 text-left font-bold border-r border-[#5b9bd5]">Next Date</th>
                          <th className="text-white px-2 py-1 text-left font-bold border-r border-[#5b9bd5]">Every (days)</th>
                          <th className="text-white px-2 py-1 text-left font-bold border-r border-[#5b9bd5]">Status</th>
                          <th className="text-white px-2 py-1 text-left font-bold border-r border-[#5b9bd5]">Last Done</th>
                          <th className="text-white px-2 py-1 text-center font-bold">Del</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reminders.map(r => {
                          const st = getReminderStatus(r)
                          return (
                            <tr key={r.id} className="bg-[#eef4fb] even:bg-[#dce8f5] hover:bg-[#c8d8ec]">
                              <td className="px-2 py-1 border-b border-[#b8ccdc] text-[#1a3a5a]">{vehicles.find(v => v.id === r.vehicle_id)?.name || 'N/A'}</td>
                              <td className="px-2 py-1 border-b border-[#b8ccdc] text-[#1a3a5a]">{r.reminder_name}</td>
                              <td className="px-2 py-1 border-b border-[#b8ccdc] text-[#1a3a5a]">{formatDate(r.next_date)}</td>
                              <td className="px-2 py-1 border-b border-[#b8ccdc] text-[#1a3a5a]">{r.frequency_days}</td>
                              <td className="px-2 py-1 border-b border-[#b8ccdc]"><span className={`inline-block px-1.5 py-0.5 rounded-full text-[11px] font-semibold ${st.class}`}>{st.label}</span></td>
                              <td className="px-2 py-1 border-b border-[#b8ccdc] text-[#1a3a5a]">{formatDate(r.last_date)}</td>
                              <td className="px-2 py-1 border-b border-[#b8ccdc] text-center">
                                <button onClick={() => { if(window.confirm('Delete?')) { updateReminder(r.id, { status: 'completed' }); fetchReminders() } }} className="px-2 py-0.5 rounded border-[1.5px] border-[#a02020] bg-[#d9534f] text-white text-xs hover:brightness-110">✕</button>
                              </td>
                            </tr>
                          )
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
                <div className="bg-[#eef4fb] border-[1.5px] border-[#9db8d8] rounded p-2.5">
                  <div className="flex justify-between items-center mb-2">
                    <button onClick={() => { setShowMeterForm(!showMeterForm); setMeterForm({...meterForm, vehicle_id: selectedVehicle?.id || vehicles[0]?.id || '', reading_date: new Date().toISOString().split('T')[0], odometer_reading: '', notes: ''}) }} className="inline-flex items-center gap-1.5 px-3 py-1 rounded border-[1.5px] border-[#3d8b3d] bg-[#5cb85c] text-white text-xs font-semibold hover:brightness-110 cursor-pointer">
                      ➕ Add Reading
                    </button>
                    <div className="flex-1 text-center text-[#1a5fa0] font-bold text-[13px] tracking-wide">METER TRACKING</div>
                  </div>

                  {showMeterForm && (
                    <div className="bg-[#dce8f5] border-[1.5px] border-[#9db8d8] rounded p-2 mb-2">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-[#1a3a5a] font-semibold text-xs min-w-[48px] text-right">Vehicle</span>
                        <select className="bg-white border-[1.5px] border-[#7a9ec0] rounded px-1.5 py-0.5 text-xs" style={{width:'120px'}} value={meterForm.vehicle_id} onChange={e => setMeterForm({...meterForm, vehicle_id: e.target.value})}>
                          {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                        <span className="text-[#1a3a5a] font-semibold text-xs min-w-[40px] text-right">Date</span>
                        <input type="date" className="bg-white border-[1.5px] border-[#7a9ec0] rounded px-1.5 py-0.5 text-xs" style={{width:'130px'}} value={meterForm.reading_date} onChange={e => setMeterForm({...meterForm, reading_date: e.target.value})} />
                        <span className="text-[#1a3a5a] font-semibold text-xs min-w-[60px] text-right">Reading</span>
                        <input type="number" className="bg-white border-[1.5px] border-[#7a9ec0] rounded px-1.5 py-0.5 text-xs" style={{width:'110px'}} placeholder="Odometer" value={meterForm.odometer_reading} onChange={e => setMeterForm({...meterForm, odometer_reading: e.target.value})} />
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[#1a3a5a] font-semibold text-xs min-w-[48px] text-right">Notes</span>
                        <input className="bg-white border-[1.5px] border-[#7a9ec0] rounded px-1.5 py-0.5 text-xs" style={{width:'280px'}} value={meterForm.notes} onChange={e => setMeterForm({...meterForm, notes: e.target.value})} />
                        <button onClick={handleSaveMeter} className="inline-flex items-center gap-1 px-3 py-1 rounded border-[1.5px] border-[#1a5fa0] bg-[#2e75b6] text-white text-xs font-semibold hover:brightness-110">💾 Save</button>
                        <button onClick={() => setShowMeterForm(false)} className="inline-flex items-center gap-1 px-3 py-1 rounded border-[1.5px] border-[#9db8d8] bg-[#e8f0f8] text-[#1a5fa0] text-xs font-semibold hover:brightness-110">Cancel</button>
                      </div>
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#2e75b6]">
                          <th className="text-white px-2 py-1 text-left font-bold border-r border-[#5b9bd5]">Vehicle</th>
                          <th className="text-white px-2 py-1 text-left font-bold border-r border-[#5b9bd5]">Date</th>
                          <th className="text-white px-2 py-1 text-left font-bold border-r border-[#5b9bd5]">Reading (KM)</th>
                          <th className="text-white px-2 py-1 text-left font-bold border-r border-[#5b9bd5]">Notes</th>
                          <th className="text-white px-2 py-1 text-center font-bold">Del</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...meterReadings].sort((a, b) => new Date(b.reading_date) - new Date(a.reading_date)).map(m => (
                          <tr key={m.id} className="bg-[#eef4fb] even:bg-[#dce8f5] hover:bg-[#c8d8ec]">
                            <td className="px-2 py-1 border-b border-[#b8ccdc] text-[#1a3a5a]">{vehicles.find(v => v.id === m.vehicle_id)?.name || 'N/A'}</td>
                            <td className="px-2 py-1 border-b border-[#b8ccdc] text-[#1a3a5a]">{formatDate(m.reading_date)}</td>
                            <td className="px-2 py-1 border-b border-[#b8ccdc] text-[#1a3a5a] font-bold">{Number(m.odometer_reading).toLocaleString()}</td>
                            <td className="px-2 py-1 border-b border-[#b8ccdc] text-[#1a3a5a]">{m.notes || '-'}</td>
                            <td className="px-2 py-1 border-b border-[#b8ccdc] text-center">
                              <button onClick={() => { if(window.confirm('Delete?')) { /* delete meter */ } }} className="px-2 py-0.5 rounded border-[1.5px] border-[#a02020] bg-[#d9534f] text-white text-xs hover:brightness-110">✕</button>
                            </td>
                          </tr>
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
                <div className="bg-[#eef4fb] border-[1.5px] border-[#9db8d8] rounded p-2.5">
                  <div className="flex items-center gap-2.5 mb-2.5 flex-wrap">
                    <div className="text-[#1a5fa0] font-bold text-[13px]">VEHICLE DASHBOARD</div>
                    <select className="bg-white border-[1.5px] border-[#7a9ec0] rounded px-1.5 py-0.5 text-xs" style={{width:'120px'}} value={dashVehicle} onChange={e => setDashVehicle(e.target.value)}>
                      <option value="">All Vehicles</option>
                      {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                    <span className="text-xs text-[#1a3a5a]">From</span>
                    <input type="date" className="bg-white border-[1.5px] border-[#7a9ec0] rounded px-1.5 py-0.5 text-xs" style={{width:'130px'}} value={dashFrom} onChange={e => setDashFrom(e.target.value)} />
                    <span className="text-xs text-[#1a3a5a]">To</span>
                    <input type="date" className="bg-white border-[1.5px] border-[#7a9ec0] rounded px-1.5 py-0.5 text-xs" style={{width:'130px'}} value={dashTo} onChange={e => setDashTo(e.target.value)} />
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-2.5 mb-2.5">
                    <div className="bg-white border-[1.5px] border-[#9db8d8] rounded p-2.5 text-center">
                      <div className="text-[22px] font-bold text-[#2e75b6]">{formatCurrency(totalExpenses)}</div>
                      <div className="text-[11px] text-[#5b7fa0] mt-0.5">Total Expenses ({dashExpenses.length} records)</div>
                    </div>
                    <div className="bg-white border-[1.5px] border-[#9db8d8] rounded p-2.5 text-center">
                      <div className="text-[22px] font-bold text-[#2e75b6]">{formatCurrency(totalFuel)}</div>
                      <div className="text-[11px] text-[#5b7fa0] mt-0.5">Fuel Cost · {totalFuelQty.toFixed(0)} L total</div>
                    </div>
                    <div className="bg-white border-[1.5px] border-[#9db8d8] rounded p-2.5 text-center">
                      <div className="text-[22px] font-bold text-[#5cb85c]">{vehicles.length}</div>
                      <div className="text-[11px] text-[#5b7fa0] mt-0.5">Vehicles Registered</div>
                    </div>
                    <div className="bg-white border-[1.5px] border-[#9db8d8] rounded p-2.5 text-center">
                      <div className={`text-[22px] font-bold ${overdueReminders > 0 ? 'text-[#d9534f]' : 'text-[#5cb85c]'}`}>{overdueReminders}</div>
                      <div className="text-[11px] text-[#5b7fa0] mt-0.5">Overdue Reminders</div>
                    </div>
                  </div>

                  {/* Charts Row */}
                  <div className="flex gap-3.5">
                    <div className="flex-1 bg-white border-[1.5px] border-[#9db8d8] rounded p-2.5">
                      <div className="text-xs font-bold text-[#1a5fa0] mb-1.5">Expenses by Type</div>
                      <div className="flex items-end gap-2 h-[100px] py-1">
                        {expenseTypes.map((t, i) => (
                          <div key={t} className="flex-1 flex flex-col items-center gap-0.5">
                            <span className="text-[10px] text-[#2e75b6] font-semibold">{formatCurrency(expenseByType[t] || 0).replace('R ','')}</span>
                            <div className="w-full rounded-t-sm min-h-[3px] transition-all" style={{height: `${Math.round((expenseByType[t] || 0) / maxExpType * 80)}px`, background: barColors[i % barColors.length]}}></div>
                            <span className="text-[10px] text-[#5b7fa0] text-center">{t}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex-1 bg-white border-[1.5px] border-[#9db8d8] rounded p-2.5">
                      <div className="text-xs font-bold text-[#1a5fa0] mb-1.5">Fuel Cost by Vehicle</div>
                      <div className="flex items-end gap-2 h-[100px] py-1">
                        {Object.keys(fuelByVehicle).map((v, i) => (
                          <div key={v} className="flex-1 flex flex-col items-center gap-0.5">
                            <span className="text-[10px] text-[#2e75b6] font-semibold">{formatCurrency(fuelByVehicle[v] || 0).replace('R ','')}</span>
                            <div className="w-full rounded-t-sm min-h-[3px] transition-all" style={{height: `${Math.round((fuelByVehicle[v] || 0) / maxFuelVeh * 80)}px`, background: barColors[i % barColors.length]}}></div>
                            <span className="text-[10px] text-[#5b7fa0] text-center">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Upcoming Reminders */}
                  <div className="mt-2.5 bg-white border-[1.5px] border-[#9db8d8] rounded p-2.5">
                    <div className="text-xs font-bold text-[#1a5fa0] mb-1.5">Upcoming Reminders</div>
                    {upcomingReminders.length > 0 ? (
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-[#2e75b6]">
                            <th className="text-white px-2 py-1 text-left">Vehicle</th>
                            <th className="text-white px-2 py-1 text-left">Name</th>
                            <th className="text-white px-2 py-1 text-left">Next Date</th>
                            <th className="text-white px-2 py-1 text-left">Every</th>
                            <th className="text-white px-2 py-1 text-left">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {upcomingReminders.map(r => {
                            const st = getReminderStatus(r)
                            return (
                              <tr key={r.id} className="bg-[#eef4fb] border-b border-[#b8ccdc]">
                                <td className="px-2 py-1">{vehicles.find(v => v.id === r.vehicle_id)?.name}</td>
                                <td className="px-2 py-1">{r.reminder_name}</td>
                                <td className="px-2 py-1">{formatDate(r.next_date)}</td>
                                <td className="px-2 py-1">{r.frequency_days}d</td>
                                <td className="px-2 py-1"><span className={`inline-block px-1.5 py-0.5 rounded-full text-[11px] font-semibold ${st.class}`}>{st.label}</span></td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <div className="text-center text-[#5cb85c] py-2.5 font-semibold text-xs">✓ All clear — no active reminders overdue</div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Toast Notification */}
      <div id="fleet-toast" className="fixed bottom-5 right-5 z-50 bg-[#2e75b6] text-white rounded px-4 py-2.5 text-[13px] font-semibold opacity-0 translate-y-5 transition-all pointer-events-none"></div>
    </div>
  )
}
