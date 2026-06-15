import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { Truck, Download, Calendar, ArrowLeft, Sun, Moon, Sparkles, Fuel } from 'lucide-react'

export default function FleetReports() {
  const { isDark, toggleTheme } = useThemeStore()
  const [dateFrom, setDateFrom] = useState(new Date().getFullYear() + '-01-01')
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)

  const formatCurrency = (amount) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)

  const loadReport = async () => {
    setLoading(true)
    try {
      const { data: fuel } = await supabase.from('fuel_records').select('*, vehicles(name)').gte('fuel_date', dateFrom).lte('fuel_date', dateTo)
      const { data: expenses } = await supabase.from('vehicle_expenses').select('*, vehicles(name)').gte('expense_date', dateFrom).lte('expense_date', dateTo)
      const { count: vehicleCount } = await supabase.from('vehicles').select('*', { count: 'exact', head: true })

      const totalFuelCost = fuel?.reduce((s, f) => s + (f.amount || 0), 0) || 0
      const totalFuelLitres = fuel?.reduce((s, f) => s + (f.quantity || 0), 0) || 0
      const totalMaintenance = expenses?.reduce((s, e) => s + (e.amount || 0), 0) || 0

      const vehicleCosts = {}
      expenses?.forEach(e => {
        const vname = e.vehicles?.name || 'Unknown'
        vehicleCosts[vname] = (vehicleCosts[vname] || 0) + (e.amount || 0)
      })

      setReport({
        totalFuelCost, totalFuelLitres, totalMaintenance,
        averageFuelPrice: totalFuelLitres > 0 ? totalFuelCost / totalFuelLitres : 0,
        vehicleCount: vehicleCount || 0,
        vehicleCostBreakdown: Object.entries(vehicleCosts).map(([vehicle, cost]) => ({ vehicle, cost })),
        fuelLogs: fuel?.slice(0, 10) || [],
        expenseLogs: expenses?.slice(0, 10) || []
      })
    } catch (error) { toast.error('Failed to load report') }
    setLoading(false)
  }

  useEffect(() => { loadReport() }, [])

  const handleExportCSV = () => {
    if (!report) return
    const csv = 'Vehicle,Total Cost\n' + report.vehicleCostBreakdown.map(v => `${v.vehicle},${v.cost}`).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'Fleet_Report.csv'; a.click()
    toast.success('Report downloaded!')
  }

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />
      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
        <div className="neu-inset px-5 py-2 rounded-full flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-semibold tracking-wide text-emerald-800 dark:text-emerald-200 hidden sm:inline">ERP</span>
        </div>
        <button onClick={toggleTheme} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center hover:scale-110">
          {isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-600" />}
        </button>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <Link to="/reports" className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-emerald-600 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /><span className="text-sm">Back to Reports</span>
        </Link>

        <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3 mb-8">
          <Truck className="w-8 h-8 text-indigo-600" />Fleet Report
        </h1>

        <div className="neu-raised rounded-2xl p-4 mb-6 flex items-center gap-4 flex-wrap">
          <Calendar className="w-5 h-5 text-indigo-600" />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="p-2 neu-inset rounded-lg text-sm" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="p-2 neu-inset rounded-lg text-sm" />
          <button onClick={loadReport} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm">Generate</button>
          {report && <button onClick={handleExportCSV} className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm flex items-center gap-1"><Download className="w-4 h-4" /> CSV</button>}
        </div>

        {loading && <div className="text-center py-8"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div></div>}

        {report && !loading && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              {[
                { label: 'Vehicles', value: report.vehicleCount },
                { label: 'Fuel Cost', value: formatCurrency(report.totalFuelCost) },
                { label: 'Fuel (L)', value: report.totalFuelLitres.toFixed(0) + 'L' },
                { label: 'Avg Price/L', value: formatCurrency(report.averageFuelPrice) },
                { label: 'Maintenance', value: formatCurrency(report.totalMaintenance) },
              ].map(s => (
                <div key={s.label} className="neu-raised rounded-2xl p-4 text-center">
                  <p className="text-2xl font-bold text-indigo-600">{s.value}</p>
                  <p className="text-xs text-slate-500 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="neu-raised rounded-3xl p-6">
                <h2 className="text-xl font-semibold mb-4">Cost by Vehicle</h2>
                {report.vehicleCostBreakdown.map((v, i) => {
                  const maxCost = Math.max(...report.vehicleCostBreakdown.map(x => x.cost), 1)
                  const colors = ['#6366f1','#8b5cf6','#a855f7','#d946ef','#ec4899']
                  return (
                    <div key={v.vehicle} className="mb-3">
                      <div className="flex justify-between text-sm mb-1"><span>{v.vehicle}</span><span className="font-bold">{formatCurrency(v.cost)}</span></div>
                      <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(v.cost/maxCost)*100}%`, backgroundColor: colors[i%colors.length] }}></div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="neu-raised rounded-3xl p-6">
                <h2 className="text-xl font-semibold mb-4">Recent Fuel Logs</h2>
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-slate-50"><th className="text-left py-2 px-3">Vehicle</th><th className="text-left py-2 px-3">Date</th><th className="text-right py-2 px-3">Litres</th><th className="text-right py-2 px-3">Cost</th></tr></thead>
                  <tbody>{report.fuelLogs.map(f => (
                    <tr key={f.id} className="border-b"><td className="py-2 px-3">{f.vehicles?.name || 'N/A'}</td><td className="py-2 px-3 text-xs">{f.fuel_date}</td><td className="py-2 px-3 text-right">{f.quantity}L</td><td className="py-2 px-3 text-right">{formatCurrency(f.amount)}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
