import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useFleetStore from '../store/fleetStore'
import useThemeStore from '../../../store/themeStore'
import toast from 'react-hot-toast'
import { supabase } from '../../../lib/supabaseClient'
import {
  Truck, Fuel, Wrench, Plus, Trash2, Sun, Moon,
  Sparkles, ArrowLeft, Upload, X, Save,
  Car, Gauge, Bell, BarChart3, AlertCircle, RefreshCw
} from 'lucide-react'

export default function FleetDashboard() {
  const {
    vehicles, stats, fuelRecords, expenses, reminders, meterReadings,
    fetchVehicles, fetchFuelRecords, fetchExpenses, fetchReminders, fetchMeterReadings, fetchFleetStats,
    createVehicle, updateVehicle, deleteVehicle,
    createFuelRecord, createExpense, createReminder, updateReminder, createMeterReading
  } = useFleetStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [activeTab, setActiveTab] = useState('vehicles')
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [uploading, setUploading] = useState(false)

  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [showFuelForm, setShowFuelForm] = useState(false)
  const [showReminderForm, setShowReminderForm] = useState(false)
  const [showMeterForm, setShowMeterForm] = useState(false)

  const [vehicleForm, setVehicleForm] = useState({
    name: '', plate_number: '', make: '', model: '', vehicle_type: '',
    seats: 4, notes: '', fuel_type: 'petrol', purchase_date: '', purchase_price: '', image_url: ''
  })
  const [expenseForm, setExpenseForm] = useState({ vehicle_id: '', expense_date: new Date().toISOString().split('T')[0], amount: '', expense_type: 'maintenance', vendor: '', notes: '' })
  const [fuelForm, setFuelForm] = useState({ vehicle_id: '', fuel_date: new Date().toISOString().split('T')[0], amount: '', quantity: '', fuel_station: '', notes: '' })
  const [reminderForm, setReminderForm] = useState({ vehicle_id: '', reminder_name: '', next_date: '', frequency_days: 90, status: 'active', last_date: '' })
  const [meterForm, setMeterForm] = useState({ vehicle_id: '', reading_date: new Date().toISOString().split('T')[0], odometer_reading: '', notes: '' })

  useEffect(() => {
    loadAll()
  }, [])

  useEffect(() => {
    if (vehicles.length > 0 && !selectedVehicle) {
      setSelectedVehicle(vehicles[0])
      loadVehicleForm(vehicles[0])
    }
  }, [vehicles])

  const loadAll = async () => {
    await Promise.all([
      fetchVehicles(),
      fetchFuelRecords(),
      fetchExpenses(),
      fetchReminders(),
      fetchMeterReadings(),
      fetchFleetStats()
    ])
  }

  const loadVehicleForm = (v) => {
    if (!v) return
    setVehicleForm({
      name: v.name || '', plate_number: v.plate_number || '', make: v.make || '',
      model: v.model || '', vehicle_type: v.vehicle_type || '', seats: v.seats || 4,
      notes: v.notes || '', fuel_type: v.fuel_type || 'petrol',
      purchase_date: v.purchase_date || '', purchase_price: v.purchase_price || '',
      image_url: v.image_url || ''
    })
  }

  const handleSelectVehicle = (v) => {
    setSelectedVehicle(v)
    loadVehicleForm(v)
  }

  const formatCurrency = (amount) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)
  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-ZA') : ''

  // ============================================
  // IMAGE UPLOAD
  // ============================================
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Please select an image'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5MB'); return }
    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `vehicle-${Date.now()}.${fileExt}`
      const filePath = `vehicle-images/${fileName}`
      const { error: uploadError } = await supabase.storage.from('fleet').upload(filePath, file, { upsert: true })
      if (uploadError) {
        const reader = new FileReader()
        reader.onload = (event) => { setVehicleForm({ ...vehicleForm, image_url: event.target.result }); toast.success('Image loaded') }
        reader.readAsDataURL(file)
      } else {
        const { data: { publicUrl } } = supabase.storage.from('fleet').getPublicUrl(filePath)
        setVehicleForm({ ...vehicleForm, image_url: publicUrl })
        toast.success('Uploaded!')
      }
    } catch (err) {
      toast.error('Upload failed')
    } finally { setUploading(false) }
  }

  // ============================================
  // VEHICLE SAVE
  // ============================================
  const handleSaveVehicle = async () => {
    if (!vehicleForm.name) { toast.error('Vehicle name is required'); return }
    if (selectedVehicle) {
      const result = await updateVehicle(selectedVehicle.id, vehicleForm)
      if (result.success) toast.success('Vehicle updated!')
      else toast.error('Failed to update')
    } else {
      const result = await createVehicle(vehicleForm)
      if (result.success) toast.success('Vehicle added!')
      else toast.error('Failed to add')
    }
    await fetchVehicles()
  }

  // ============================================
  // ✅ HARD DELETE with verbose logging
  // ============================================
  const handleDeleteVehicle = async () => {
    if (!selectedVehicle) { toast.error('Select a vehicle first'); return }
    if (!window.confirm(`Delete ${selectedVehicle.name}? This will PERMANENTLY remove it and all its records.`)) return

    console.log('🚨 DELETING VEHICLE:', selectedVehicle.id, selectedVehicle.name)
    toast.loading('Deleting...', { id: 'delete-vehicle' })

    const result = await deleteVehicle(selectedVehicle.id)
    toast.dismiss('delete-vehicle')

    if (result.success) {
      toast.success('✅ Vehicle deleted')
      setSelectedVehicle(null)
      setVehicleForm({ name: '', plate_number: '', make: '', model: '', vehicle_type: '', seats: 4, notes: '', fuel_type: 'petrol', purchase_date: '', purchase_price: '', image_url: '' })
      await loadAll()
    } else {
      console.error('❌ Delete failed:', result.error)
      toast.error('Delete failed: ' + (result.error || 'Unknown'))
    }
  }

  const handleAddVehicle = () => {
    setSelectedVehicle(null)
    setVehicleForm({ name: '', plate_number: '', make: '', model: '', vehicle_type: '', seats: 4, notes: '', fuel_type: 'petrol', purchase_date: '', purchase_price: '', image_url: '' })
    toast.success('Fill in details and save')
  }

  const handleSaveExpense = async () => {
    if (!expenseForm.vehicle_id || !expenseForm.amount) { toast.error('Vehicle and amount required'); return }
    await createExpense({ ...expenseForm, amount: parseFloat(expenseForm.amount) })
    toast.success('Expense saved!')
    setShowExpenseForm(false)
    fetchExpenses()
    fetchFleetStats()
  }

  const handleSaveFuel = async () => {
    if (!fuelForm.vehicle_id || !fuelForm.amount) { toast.error('Vehicle and amount required'); return }
    await createFuelRecord({ ...fuelForm, amount: parseFloat(fuelForm.amount), quantity: parseFloat(fuelForm.quantity) || 0 })
    toast.success('Fuel log saved!')
    setShowFuelForm(false)
    fetchFuelRecords()
    fetchFleetStats()
  }

  const handleSaveReminder = async () => {
    if (!reminderForm.vehicle_id || !reminderForm.reminder_name) { toast.error('Required fields missing'); return }
    await createReminder(reminderForm)
    toast.success('Reminder saved!')
    setShowReminderForm(false)
    fetchReminders()
  }

  const handleSaveMeter = async () => {
    if (!meterForm.vehicle_id || !meterForm.odometer_reading) { toast.error('Vehicle and reading required'); return }
    await createMeterReading({ ...meterForm, odometer_reading: parseInt(meterForm.odometer_reading) })
    toast.success('Reading saved!')
    setShowMeterForm(false)
    fetchMeterReadings()
  }

  const getReminderStatus = (r) => {
    const today = new Date().toISOString().split('T')[0]
    if (r.status === 'active' && r.next_date <= today) return { class: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', label: 'Overdue' }
    if (r.status === 'active') return { class: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400', label: 'Active' }
    return { class: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300', label: r.status }
  }

  const tabs = [
    { id: 'vehicles', label: 'Vehicles', icon: Car },
    { id: 'expenses', label: 'Expenses', icon: Wrench },
    { id: 'fuel', label: 'Fuel', icon: Fuel },
    { id: 'reminders', label: 'Reminders', icon: Bell },
    { id: 'meter', label: 'Meter', icon: Gauge },
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  ]

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />

      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
        <div className="neu-inset px-5 py-2 rounded-full flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-semibold tracking-wide text-emerald-800 dark:text-emerald-200 hidden sm:inline">Enterprise Resource Planning</span>
        </div>
        <button onClick={toggleTheme} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center hover:scale-110 transition-transform">
          {isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-600" />}
        </button>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <Link to="/dashboard" className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-emerald-600 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /><span className="text-sm">Back to Main Dashboard</span>
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Truck className="w-8 h-8 text-emerald-600" />
              <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Fleet Management</h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 ml-11">Vehicles, fuel, expenses, reminders and meter tracking</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={handleAddVehicle} className="neu-raised neu-btn px-6 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2">
              <Plus className="w-5 h-5" /><span>New Vehicle</span>
            </button>
            <button onClick={loadAll} className="neu-raised neu-btn px-4 py-3 rounded-2xl bg-slate-600 text-white hover:bg-slate-700 flex items-center gap-2">
              <RefreshCw className="w-5 h-5" /><span>Refresh</span>
            </button>
          </div>
        </motion.div>

        <div className="neu-raised rounded-2xl p-2 mb-6 flex gap-2 flex-wrap overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[120px] py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white shadow-lg'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-64 flex-shrink-0">
            <div className="neu-raised rounded-3xl p-4">
              <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase mb-3 px-2">Vehicles ({vehicles.length})</h3>
              <div className="space-y-1 max-h-[500px] overflow-y-auto">
                {vehicles.map(v => (
                  <button
                    key={v.id}
                    onClick={() => handleSelectVehicle(v)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-all ${
                      selectedVehicle?.id === v.id
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div className="font-medium truncate">{v.name}</div>
                    <div className={`text-xs ${selectedVehicle?.id === v.id ? 'text-emerald-100' : 'text-slate-500 dark:text-slate-400'}`}>
                      {v.plate_number || 'No plate'}
                    </div>
                  </button>
                ))}
                {vehicles.length === 0 && (
                  <p className="text-center text-slate-400 text-xs py-8">No vehicles yet</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1">
            <AnimatePresence mode="wait">

              {activeTab === 'vehicles' && (
                <motion.div key="vehicles" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="neu-raised rounded-3xl p-6">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
                    {selectedVehicle ? `Edit: ${selectedVehicle.name}` : 'Add New Vehicle'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-slate-500">Name *</label>
                          <input value={vehicleForm.name} onChange={e => setVehicleForm({ ...vehicleForm, name: e.target.value })}
                            className="w-full p-3 neu-inset rounded-xl mt-1 text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-slate-500">Plate #</label>
                          <input value={vehicleForm.plate_number} onChange={e => setVehicleForm({ ...vehicleForm, plate_number: e.target.value })}
                            className="w-full p-3 neu-inset rounded-xl mt-1 text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-slate-500">Make</label>
                          <input value={vehicleForm.make} onChange={e => setVehicleForm({ ...vehicleForm, make: e.target.value })}
                            className="w-full p-3 neu-inset rounded-xl mt-1 text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-slate-500">Model</label>
                          <input value={vehicleForm.model} onChange={e => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                            className="w-full p-3 neu-inset rounded-xl mt-1 text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-slate-500">Type</label>
                          <select value={vehicleForm.vehicle_type} onChange={e => setVehicleForm({ ...vehicleForm, vehicle_type: e.target.value })}
                            className="w-full p-3 neu-inset rounded-xl mt-1 text-sm">
                            <option value="">-- Select --</option>
                            <option value="sedan">Sedan</option>
                            <option value="suv">SUV</option>
                            <option value="truck">Truck</option>
                            <option value="van">Van</option>
                            <option value="bakkie">Bakkie</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-slate-500">Seats</label>
                          <input type="number" value={vehicleForm.seats} onChange={e => setVehicleForm({ ...vehicleForm, seats: parseInt(e.target.value) || 4 })}
                            className="w-full p-3 neu-inset rounded-xl mt-1 text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-slate-500">Purchase Date</label>
                          <input type="date" value={vehicleForm.purchase_date} onChange={e => setVehicleForm({ ...vehicleForm, purchase_date: e.target.value })}
                            className="w-full p-3 neu-inset rounded-xl mt-1 text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-slate-500">Purchase Price</label>
                          <input type="number" value={vehicleForm.purchase_price} onChange={e => setVehicleForm({ ...vehicleForm, purchase_price: e.target.value })}
                            className="w-full p-3 neu-inset rounded-xl mt-1 text-sm" placeholder="R0.00" />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">Notes</label>
                        <textarea value={vehicleForm.notes} onChange={e => setVehicleForm({ ...vehicleForm, notes: e.target.value })} rows={3}
                          className="w-full p-3 neu-inset rounded-xl mt-1 text-sm resize-none" />
                      </div>
                      <div className="flex gap-3 pt-2 flex-wrap">
                        <button onClick={handleSaveVehicle} className="neu-raised neu-btn px-6 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2">
                          <Save className="w-4 h-4" /> {selectedVehicle ? 'Update' : 'Save'}
                        </button>
                        {selectedVehicle && (
                          <button onClick={handleDeleteVehicle} className="neu-raised neu-btn px-6 py-3 rounded-2xl bg-red-600 text-white hover:bg-red-700 flex items-center gap-2">
                            <Trash2 className="w-4 h-4" /> Delete Vehicle
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-slate-500 mb-2 block">Vehicle Image</label>
                      <div onClick={() => fileInputRef.current?.click()}
                        className="neu-inset rounded-2xl h-[200px] flex items-center justify-center cursor-pointer overflow-hidden relative">
                        {vehicleForm.image_url ? (
                          <img src={vehicleForm.image_url} alt="Vehicle" className="w-full h-full object-contain" />
                        ) : (
                          <div className="text-center text-slate-400">
                            <Upload className="w-8 h-8 mx-auto mb-2" />
                            <p className="text-xs">Click to upload</p>
                          </div>
                        )}
                        {uploading && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                          </div>
                        )}
                      </div>
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      {vehicleForm.image_url && (
                        <button onClick={() => setVehicleForm({ ...vehicleForm, image_url: '' })}
                          className="mt-2 w-full py-2 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-medium">
                          <X className="w-3 h-3 inline mr-1" /> Remove Image
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'expenses' && (
                <motion.div key="expenses" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="neu-raised rounded-3xl p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Repairs & Expenses</h3>
                    <button onClick={() => setShowExpenseForm(!showExpenseForm)}
                      className="neu-raised neu-btn px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm flex items-center gap-2">
                      <Plus className="w-4 h-4" /> Add Expense
                    </button>
                  </div>
                  {showExpenseForm && (
                    <div className="neu-inset rounded-2xl p-4 mb-4 space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <select value={expenseForm.vehicle_id} onChange={e => setExpenseForm({ ...expenseForm, vehicle_id: e.target.value })}
                          className="p-3 neu-inset rounded-xl text-sm">
                          <option value="">Vehicle</option>
                          {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                        <input type="date" value={expenseForm.expense_date} onChange={e => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
                          className="p-3 neu-inset rounded-xl text-sm" />
                        <input type="number" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                          placeholder="Amount" className="p-3 neu-inset rounded-xl text-sm" />
                        <select value={expenseForm.expense_type} onChange={e => setExpenseForm({ ...expenseForm, expense_type: e.target.value })}
                          className="p-3 neu-inset rounded-xl text-sm">
                          <option value="maintenance">Maintenance</option>
                          <option value="repair">Repair</option>
                          <option value="tyres">Tyres</option>
                          <option value="insurance">Insurance</option>
                          <option value="registration">Registration</option>
                          <option value="toll">Toll</option>
                          <option value="fine">Fine</option>
                          <option value="cleaning">Cleaning</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <input value={expenseForm.vendor} onChange={e => setExpenseForm({ ...expenseForm, vendor: e.target.value })}
                        placeholder="Vendor" className="w-full p-3 neu-inset rounded-xl text-sm" />
                      <input value={expenseForm.notes} onChange={e => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                        placeholder="Notes" className="w-full p-3 neu-inset rounded-xl text-sm" />
                      <div className="flex gap-2">
                        <button onClick={handleSaveExpense} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium">Save</button>
                        <button onClick={() => setShowExpenseForm(false)} className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-sm font-medium">Cancel</button>
                      </div>
                    </div>
                  )}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                          <th className="text-left py-3 px-3 text-slate-500">Vehicle</th>
                          <th className="text-left py-3 px-3 text-slate-500">Date</th>
                          <th className="text-left py-3 px-3 text-slate-500">Amount</th>
                          <th className="text-left py-3 px-3 text-slate-500">Type</th>
                          <th className="text-left py-3 px-3 text-slate-500">Vendor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenses.map(e => (
                          <tr key={e.id} className="border-b border-slate-100 dark:border-slate-700/50">
                            <td className="py-3 px-3 text-slate-800 dark:text-white">{vehicles.find(v => v.id === e.vehicle_id)?.name || 'N/A'}</td>
                            <td className="py-3 px-3 text-slate-600 dark:text-slate-400">{formatDate(e.expense_date)}</td>
                            <td className="py-3 px-3 font-medium text-slate-800 dark:text-white">{formatCurrency(e.amount)}</td>
                            <td className="py-3 px-3 capitalize text-slate-600 dark:text-slate-400">{e.expense_type}</td>
                            <td className="py-3 px-3 text-slate-600 dark:text-slate-400">{e.vendor || '-'}</td>
                          </tr>
                        ))}
                        {expenses.length === 0 && (
                          <tr><td colSpan="5" className="text-center py-8 text-slate-400">No expenses recorded</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {activeTab === 'fuel' && (
                <motion.div key="fuel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="neu-raised rounded-3xl p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Fuel Purchases</h3>
                    <button onClick={() => setShowFuelForm(!showFuelForm)}
                      className="neu-raised neu-btn px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm flex items-center gap-2">
                      <Plus className="w-4 h-4" /> Add Fuel
                    </button>
                  </div>
                  {showFuelForm && (
                    <div className="neu-inset rounded-2xl p-4 mb-4 space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <select value={fuelForm.vehicle_id} onChange={e => setFuelForm({ ...fuelForm, vehicle_id: e.target.value })}
                          className="p-3 neu-inset rounded-xl text-sm">
                          <option value="">Vehicle</option>
                          {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                        <input type="date" value={fuelForm.fuel_date} onChange={e => setFuelForm({ ...fuelForm, fuel_date: e.target.value })}
                          className="p-3 neu-inset rounded-xl text-sm" />
                        <input type="number" value={fuelForm.amount} onChange={e => setFuelForm({ ...fuelForm, amount: e.target.value })}
                          placeholder="Amount" className="p-3 neu-inset rounded-xl text-sm" />
                        <input type="number" value={fuelForm.quantity} onChange={e => setFuelForm({ ...fuelForm, quantity: e.target.value })}
                          placeholder="Litres" className="p-3 neu-inset rounded-xl text-sm" />
                      </div>
                      <input value={fuelForm.fuel_station} onChange={e => setFuelForm({ ...fuelForm, fuel_station: e.target.value })}
                        placeholder="Fuel station" className="w-full p-3 neu-inset rounded-xl text-sm" />
                      <div className="flex gap-2">
                        <button onClick={handleSaveFuel} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium">Save</button>
                        <button onClick={() => setShowFuelForm(false)} className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-sm font-medium">Cancel</button>
                      </div>
                    </div>
                  )}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                          <th className="text-left py-3 px-3 text-slate-500">Vehicle</th>
                          <th className="text-left py-3 px-3 text-slate-500">Date</th>
                          <th className="text-left py-3 px-3 text-slate-500">Amount</th>
                          <th className="text-left py-3 px-3 text-slate-500">Qty (L)</th>
                          <th className="text-left py-3 px-3 text-slate-500">Station</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fuelRecords.map(f => (
                          <tr key={f.id} className="border-b border-slate-100 dark:border-slate-700/50">
                            <td className="py-3 px-3 text-slate-800 dark:text-white">{vehicles.find(v => v.id === f.vehicle_id)?.name || 'N/A'}</td>
                            <td className="py-3 px-3 text-slate-600 dark:text-slate-400">{formatDate(f.fuel_date)}</td>
                            <td className="py-3 px-3 font-medium text-slate-800 dark:text-white">{formatCurrency(f.amount)}</td>
                            <td className="py-3 px-3 text-slate-600 dark:text-slate-400">{f.quantity || 0}</td>
                            <td className="py-3 px-3 text-slate-600 dark:text-slate-400">{f.fuel_station || '-'}</td>
                          </tr>
                        ))}
                        {fuelRecords.length === 0 && (
                          <tr><td colSpan="5" className="text-center py-8 text-slate-400">No fuel records</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {activeTab === 'reminders' && (
                <motion.div key="reminders" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="neu-raised rounded-3xl p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Reminders</h3>
                    <button onClick={() => setShowReminderForm(!showReminderForm)}
                      className="neu-raised neu-btn px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm flex items-center gap-2">
                      <Plus className="w-4 h-4" /> Add Reminder
                    </button>
                  </div>
                  {showReminderForm && (
                    <div className="neu-inset rounded-2xl p-4 mb-4 space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <select value={reminderForm.vehicle_id} onChange={e => setReminderForm({ ...reminderForm, vehicle_id: e.target.value })}
                          className="p-3 neu-inset rounded-xl text-sm">
                          <option value="">Vehicle</option>
                          {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                        <input value={reminderForm.reminder_name} onChange={e => setReminderForm({ ...reminderForm, reminder_name: e.target.value })}
                          placeholder="Reminder name" className="p-3 neu-inset rounded-xl text-sm" />
                        <input type="date" value={reminderForm.next_date} onChange={e => setReminderForm({ ...reminderForm, next_date: e.target.value })}
                          className="p-3 neu-inset rounded-xl text-sm" />
                        <input type="number" value={reminderForm.frequency_days} onChange={e => setReminderForm({ ...reminderForm, frequency_days: parseInt(e.target.value) || 90 })}
                          placeholder="Every X days" className="p-3 neu-inset rounded-xl text-sm" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={handleSaveReminder} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium">Save</button>
                        <button onClick={() => setShowReminderForm(false)} className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-sm font-medium">Cancel</button>
                      </div>
                    </div>
                  )}
                  <div className="space-y-3">
                    {reminders.map(r => {
                      const st = getReminderStatus(r)
                      return (
                        <div key={r.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/30 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-slate-800 dark:text-white">{r.reminder_name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {vehicles.find(v => v.id === r.vehicle_id)?.name} • Due {formatDate(r.next_date)} • Every {r.frequency_days}d
                            </p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${st.class}`}>{st.label}</span>
                        </div>
                      )
                    })}
                    {reminders.length === 0 && (
                      <p className="text-center py-8 text-slate-400">No reminders</p>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'meter' && (
                <motion.div key="meter" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="neu-raised rounded-3xl p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Meter Readings</h3>
                    <button onClick={() => setShowMeterForm(!showMeterForm)}
                      className="neu-raised neu-btn px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm flex items-center gap-2">
                      <Plus className="w-4 h-4" /> Add Reading
                    </button>
                  </div>
                  {showMeterForm && (
                    <div className="neu-inset rounded-2xl p-4 mb-4 space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <select value={meterForm.vehicle_id} onChange={e => setMeterForm({ ...meterForm, vehicle_id: e.target.value })}
                          className="p-3 neu-inset rounded-xl text-sm">
                          <option value="">Vehicle</option>
                          {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                        <input type="date" value={meterForm.reading_date} onChange={e => setMeterForm({ ...meterForm, reading_date: e.target.value })}
                          className="p-3 neu-inset rounded-xl text-sm" />
                        <input type="number" value={meterForm.odometer_reading} onChange={e => setMeterForm({ ...meterForm, odometer_reading: e.target.value })}
                          placeholder="Odometer" className="p-3 neu-inset rounded-xl text-sm" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={handleSaveMeter} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium">Save</button>
                        <button onClick={() => setShowMeterForm(false)} className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-sm font-medium">Cancel</button>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    {[...meterReadings].sort((a, b) => new Date(b.reading_date) - new Date(a.reading_date)).map(m => (
                      <div key={m.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 flex justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-800 dark:text-white">{vehicles.find(v => v.id === m.vehicle_id)?.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(m.reading_date)}</p>
                        </div>
                        <p className="text-sm font-bold text-slate-800 dark:text-white">{Number(m.odometer_reading).toLocaleString()} km</p>
                      </div>
                    ))}
                    {meterReadings.length === 0 && (
                      <p className="text-center py-8 text-slate-400">No readings yet</p>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'dashboard' && (
                <motion.div key="dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="neu-raised rounded-2xl p-4">
                      <Car className="w-6 h-6 text-emerald-600 mb-2" />
                      <p className="text-2xl font-bold text-slate-800 dark:text-white">{vehicles.length}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Total Vehicles</p>
                    </div>
                    <div className="neu-raised rounded-2xl p-4">
                      <Fuel className="w-6 h-6 text-emerald-600 mb-2" />
                      <p className="text-2xl font-bold text-slate-800 dark:text-white">{formatCurrency(stats.totalFuelCost)}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Fuel Spend</p>
                    </div>
                    <div className="neu-raised rounded-2xl p-4">
                      <Wrench className="w-6 h-6 text-emerald-600 mb-2" />
                      <p className="text-2xl font-bold text-slate-800 dark:text-white">{formatCurrency(stats.totalExpenses)}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Expenses</p>
                    </div>
                    <div className="neu-raised rounded-2xl p-4">
                      <AlertCircle className="w-6 h-6 text-red-600 mb-2" />
                      <p className="text-2xl font-bold text-slate-800 dark:text-white">{stats.overdueReminders || 0}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Overdue Reminders</p>
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  )
}
