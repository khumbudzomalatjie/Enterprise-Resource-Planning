import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useFleetStore from '../store/fleetStore'
import useThemeStore from '../../../store/themeStore'
import toast from 'react-hot-toast'
import { 
  Truck, Car, Fuel, Wrench, Bell, Gauge, 
  DollarSign, Plus, Edit, Trash2, Eye, AlertCircle,
  Sun, Moon, ChevronRight, ArrowLeft, Calendar,
  BarChart3, Activity
} from 'lucide-react'

export default function FleetDashboard() {
  const { vehicles, stats, fuelRecords, expenses, reminders, fetchVehicles, fetchFuelRecords, fetchExpenses, fetchReminders, fetchFleetStats, createVehicle, createFuelRecord, createExpense, createReminder, updateReminder, loading } = useFleetStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [activeMenu, setActiveMenu] = useState('dashboard')

  // Form states
  const [showAddVehicle, setShowAddVehicle] = useState(false)
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [showAddFuel, setShowAddFuel] = useState(false)
  const [showAddReminder, setShowAddReminder] = useState(false)

  const [newVehicle, setNewVehicle] = useState({ name: '', plate_number: '', make: '', model: '', vehicle_type: 'sedan', seats: 5, fuel_type: 'petrol', notes: '' })
  const [newExpense, setNewExpense] = useState({ vehicle_id: '', expense_date: new Date().toISOString().split('T')[0], amount: 0, expense_type: 'maintenance', vendor: '', notes: '' })
  const [newFuel, setNewFuel] = useState({ vehicle_id: '', fuel_date: new Date().toISOString().split('T')[0], amount: 0, quantity: 0, fuel_station: '', notes: '' })
  const [newReminder, setNewReminder] = useState({ vehicle_id: '', reminder_name: '', reminder_type: 'service', next_date: '', frequency_days: 90 })

  useEffect(() => {
    fetchVehicles()
    fetchFleetStats()
    fetchFuelRecords()
    fetchExpenses()
    fetchReminders()
  }, [])

  const formatCurrency = (amount) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)

  const handleAddVehicle = async () => {
    if (!newVehicle.name || !newVehicle.plate_number) { toast.error('Name and plate number required'); return }
    const result = await createVehicle(newVehicle)
    if (result.success) { toast.success('Vehicle added!'); setShowAddVehicle(false); setNewVehicle({ name: '', plate_number: '', make: '', model: '', vehicle_type: 'sedan', seats: 5, fuel_type: 'petrol', notes: '' }); fetchVehicles() }
  }

  const handleAddExpense = async () => {
    if (!newExpense.vehicle_id || !newExpense.amount) { toast.error('Vehicle and amount required'); return }
    await createExpense(newExpense)
    toast.success('Expense recorded!'); setShowAddExpense(false); fetchExpenses(); fetchFleetStats()
  }

  const handleAddFuel = async () => {
    if (!newFuel.vehicle_id || !newFuel.amount) { toast.error('Vehicle and amount required'); return }
    await createFuelRecord(newFuel)
    toast.success('Fuel log recorded!'); setShowAddFuel(false); fetchFuelRecords(); fetchFleetStats()
  }

  const handleAddReminder = async () => {
    if (!newReminder.vehicle_id || !newReminder.reminder_name || !newReminder.next_date) { toast.error('Fill all fields'); return }
    await createReminder({ ...newReminder, status: 'active' })
    toast.success('Reminder added!'); setShowAddReminder(false); fetchReminders()
  }

  const getStatusBadge = (status) => {
    const b = { active: 'bg-emerald-100 text-emerald-700', upcoming: 'bg-amber-100 text-amber-700', overdue: 'bg-red-100 text-red-700', completed: 'bg-blue-100 text-blue-700' }
    return b[status] || 'bg-slate-100 text-slate-700'
  }

  return (
    <div className={`min-h-screen font-['Poppins',sans-serif] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="w-[260px] bg-[#111827] text-white p-8 flex-shrink-0 hidden lg:block">
          <div className="mb-10">
            <h2 className="text-[22px] font-bold">🚗 Fleet Tracker</h2>
          </div>
          <ul className="list-none space-y-2">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: '📊' },
              { id: 'vehicles', label: 'Vehicles', icon: '🚛' },
              { id: 'expenses', label: 'Expenses', icon: '💰' },
              { id: 'fuel', label: 'Fuel Logs', icon: '⛽' },
              { id: 'reminders', label: 'Reminders', icon: '🔔' },
              { id: 'meter', label: 'Meter Tracking', icon: '📏' },
            ].map(item => (
              <li key={item.id} onClick={() => setActiveMenu(item.id)}
                className={`px-5 py-3.5 rounded-xl cursor-pointer transition-all duration-300 flex items-center gap-3 ${activeMenu === item.id ? 'bg-[#2563eb]' : 'hover:bg-white/10'}`}>
                <span>{item.icon}</span> {item.label}
              </li>
            ))}
          </ul>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 bg-[#f4f7fb] dark:bg-[#0f172a] overflow-y-auto max-h-screen">
          {/* Top Bar */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-[32px] font-bold text-slate-800 dark:text-white">VEHICLE EXPENSE TRACKER</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1.5">Manage vehicles, fuel, expenses and reminders</p>
            </div>
            <div className="flex gap-3">
              <Link to="/dashboard" className="text-sm text-slate-500 hover:text-emerald-600 flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> Main Dashboard</Link>
              <button onClick={toggleTheme} className="neu-raised neu-btn px-4 py-3 rounded-xl bg-[#111827] text-white hover:bg-[#1e293b]">
                {isDark ? '☀️ Light' : '🌙 Dark'}
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { icon: Truck, label: 'Total Vehicles', value: stats.totalVehicles || 0, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
              { icon: Fuel, label: 'Fuel Cost (30d)', value: formatCurrency(stats.totalFuelCost), color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
              { icon: Wrench, label: 'Expenses (30d)', value: formatCurrency(stats.totalExpenses), color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
              { icon: Bell, label: 'Overdue Reminders', value: stats.overdueReminders || 0, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' },
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-white dark:bg-[#1e293b] rounded-[22px] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
                <p className="text-lg font-bold text-slate-800 dark:text-white">{s.value}</p>
                <p className="text-xs text-slate-500 mt-1">{s.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Vehicles Section */}
          <div className="bg-white dark:bg-[#1e293b] rounded-[22px] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)] mb-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-white">🚛 VEHICLES</h2>
              <button onClick={() => setShowAddVehicle(!showAddVehicle)} className="bg-[#2563eb] text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add Vehicle
              </button>
            </div>

            {showAddVehicle && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <input type="text" placeholder="Name *" value={newVehicle.name} onChange={e => setNewVehicle({...newVehicle, name: e.target.value})} className="p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700" />
                <input type="text" placeholder="Plate Number *" value={newVehicle.plate_number} onChange={e => setNewVehicle({...newVehicle, plate_number: e.target.value})} className="p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700" />
                <input type="text" placeholder="Make" value={newVehicle.make} onChange={e => setNewVehicle({...newVehicle, make: e.target.value})} className="p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700" />
                <input type="text" placeholder="Model" value={newVehicle.model} onChange={e => setNewVehicle({...newVehicle, model: e.target.value})} className="p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700" />
                <select value={newVehicle.vehicle_type} onChange={e => setNewVehicle({...newVehicle, vehicle_type: e.target.value})} className="p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700">
                  <option value="sedan">Sedan</option><option value="suv">SUV</option><option value="bakkie">Bakkie</option><option value="truck">Truck</option><option value="van">Van</option>
                </select>
                <button onClick={handleAddVehicle} className="bg-emerald-600 text-white p-3 rounded-xl hover:bg-emerald-700">Save Vehicle</button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vehicles.slice(0, 6).map(v => (
                <div key={v.id} className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/fleet/vehicles/${v.id}`)}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-white">{v.name}</h3>
                      <p className="text-xs text-slate-500">{v.plate_number}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${v.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{v.status}</span>
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                    <p>{v.make} {v.model} · {v.vehicle_type}</p>
                    <p>Mileage: {v.current_mileage?.toLocaleString() || 0} km</p>
                    <p>Fuel: {v.fuel_type}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Expenses Section */}
          <div className="bg-white dark:bg-[#1e293b] rounded-[22px] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)] mb-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-white">💰 REPAIRS & EXPENSES</h2>
              <button onClick={() => setShowAddExpense(!showAddExpense)} className="bg-[#2563eb] text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add Expense
              </button>
            </div>
            {showAddExpense && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <select value={newExpense.vehicle_id} onChange={e => setNewExpense({...newExpense, vehicle_id: e.target.value})} className="p-2 border rounded-lg bg-white dark:bg-slate-700">
                  <option value="">Select Vehicle</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
                <input type="date" value={newExpense.expense_date} onChange={e => setNewExpense({...newExpense, expense_date: e.target.value})} className="p-2 border rounded-lg bg-white dark:bg-slate-700" />
                <input type="number" placeholder="Amount" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: parseFloat(e.target.value)})} className="p-2 border rounded-lg bg-white dark:bg-slate-700" />
                <select value={newExpense.expense_type} onChange={e => setNewExpense({...newExpense, expense_type: e.target.value})} className="p-2 border rounded-lg bg-white dark:bg-slate-700">
                  <option value="maintenance">Maintenance</option><option value="repair">Repair</option><option value="tyres">Tyres</option><option value="insurance">Insurance</option><option value="registration">Registration</option><option value="other">Other</option>
                </select>
                <input type="text" placeholder="Vendor" value={newExpense.vendor} onChange={e => setNewExpense({...newExpense, vendor: e.target.value})} className="p-2 border rounded-lg bg-white dark:bg-slate-700" />
                <button onClick={handleAddExpense} className="bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-700 col-span-2 md:col-span-1">Save Expense</button>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-200 dark:border-slate-700 text-left"><th className="py-3 px-4 text-slate-500">Vehicle</th><th className="py-3 px-4 text-slate-500">Date</th><th className="py-3 px-4 text-slate-500">Type</th><th className="py-3 px-4 text-slate-500">Vendor</th><th className="py-3 px-4 text-slate-500 text-right">Amount</th></tr></thead>
                <tbody>
                  {expenses.slice(0, 5).map(e => (
                    <tr key={e.id} className="border-b border-slate-100 dark:border-slate-700/50">
                      <td className="py-3 px-4">{e.vehicles?.name}</td>
                      <td className="py-3 px-4">{new Date(e.expense_date).toLocaleDateString()}</td>
                      <td className="py-3 px-4 capitalize">{e.expense_type}</td>
                      <td className="py-3 px-4">{e.vendor || '-'}</td>
                      <td className="py-3 px-4 text-right font-medium">{formatCurrency(e.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Fuel Section */}
          <div className="bg-white dark:bg-[#1e293b] rounded-[22px] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)] mb-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-white">⛽ FUEL PURCHASES & TRACKING</h2>
              <button onClick={() => setShowAddFuel(!showAddFuel)} className="bg-[#2563eb] text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add Fuel Log
              </button>
            </div>
            {showAddFuel && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <select value={newFuel.vehicle_id} onChange={e => setNewFuel({...newFuel, vehicle_id: e.target.value})} className="p-2 border rounded-lg bg-white dark:bg-slate-700">
                  <option value="">Select Vehicle</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
                <input type="date" value={newFuel.fuel_date} onChange={e => setNewFuel({...newFuel, fuel_date: e.target.value})} className="p-2 border rounded-lg bg-white dark:bg-slate-700" />
                <input type="number" placeholder="Amount (R)" value={newFuel.amount} onChange={e => setNewFuel({...newFuel, amount: parseFloat(e.target.value)})} className="p-2 border rounded-lg bg-white dark:bg-slate-700" />
                <input type="number" placeholder="Litres" value={newFuel.quantity} onChange={e => setNewFuel({...newFuel, quantity: parseFloat(e.target.value)})} className="p-2 border rounded-lg bg-white dark:bg-slate-700" />
                <input type="text" placeholder="Fuel Station" value={newFuel.fuel_station} onChange={e => setNewFuel({...newFuel, fuel_station: e.target.value})} className="p-2 border rounded-lg bg-white dark:bg-slate-700" />
                <button onClick={handleAddFuel} className="bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-700">Save Fuel Log</button>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-200 dark:border-slate-700 text-left"><th className="py-3 px-4 text-slate-500">Vehicle</th><th className="py-3 px-4 text-slate-500">Date</th><th className="py-3 px-4 text-slate-500">Litres</th><th className="py-3 px-4 text-slate-500">Price/L</th><th className="py-3 px-4 text-slate-500">Station</th><th className="py-3 px-4 text-slate-500 text-right">Amount</th></tr></thead>
                <tbody>
                  {fuelRecords.slice(0, 5).map(f => (
                    <tr key={f.id} className="border-b border-slate-100 dark:border-slate-700/50">
                      <td className="py-3 px-4">{f.vehicles?.name}</td>
                      <td className="py-3 px-4">{new Date(f.fuel_date).toLocaleDateString()}</td>
                      <td className="py-3 px-4">{f.quantity}L</td>
                      <td className="py-3 px-4">{formatCurrency(f.price_per_litre)}</td>
                      <td className="py-3 px-4">{f.fuel_station || '-'}</td>
                      <td className="py-3 px-4 text-right font-medium">{formatCurrency(f.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Reminders Section */}
          <div className="bg-white dark:bg-[#1e293b] rounded-[22px] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-white">🔔 REMINDERS</h2>
              <button onClick={() => setShowAddReminder(!showAddReminder)} className="bg-[#2563eb] text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add Reminder
              </button>
            </div>
            {showAddReminder && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <select value={newReminder.vehicle_id} onChange={e => setNewReminder({...newReminder, vehicle_id: e.target.value})} className="p-2 border rounded-lg bg-white dark:bg-slate-700">
                  <option value="">Select Vehicle</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
                <input type="text" placeholder="Reminder Name" value={newReminder.reminder_name} onChange={e => setNewReminder({...newReminder, reminder_name: e.target.value})} className="p-2 border rounded-lg bg-white dark:bg-slate-700" />
                <input type="date" value={newReminder.next_date} onChange={e => setNewReminder({...newReminder, next_date: e.target.value})} className="p-2 border rounded-lg bg-white dark:bg-slate-700" />
                <input type="number" placeholder="Frequency (Days)" value={newReminder.frequency_days} onChange={e => setNewReminder({...newReminder, frequency_days: parseInt(e.target.value)})} className="p-2 border rounded-lg bg-white dark:bg-slate-700" />
                <button onClick={handleAddReminder} className="bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-700">Save Reminder</button>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-200 dark:border-slate-700 text-left bg-slate-50 dark:bg-slate-800"><th className="py-3 px-4 text-slate-500">Vehicle</th><th className="py-3 px-4 text-slate-500">Name</th><th className="py-3 px-4 text-slate-500">Next Date</th><th className="py-3 px-4 text-slate-500">Frequency</th><th className="py-3 px-4 text-slate-500">Status</th><th className="py-3 px-4 text-slate-500">Last Date</th></tr></thead>
                <tbody>
                  {reminders.map(r => (
                    <tr key={r.id} className="border-b border-slate-100 dark:border-slate-700/50">
                      <td className="py-3 px-4">{r.vehicles?.name}</td>
                      <td className="py-3 px-4">{r.reminder_name}</td>
                      <td className="py-3 px-4">{new Date(r.next_date).toLocaleDateString()}</td>
                      <td className="py-3 px-4">{r.frequency_days} Days</td>
                      <td className="py-3 px-4"><span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(r.status)}`}>{r.status}</span></td>
                      <td className="py-3 px-4">{r.last_date ? new Date(r.last_date).toLocaleDateString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
