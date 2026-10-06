import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useInventoryStore from '../store/inventoryStore'
import useThemeStore from '../../../store/themeStore'
import toast from 'react-hot-toast'
import {
  Search, Package, ChevronRight, Sparkles, Sun, Moon,
  ArrowDown, ArrowUp, Sparkles as SparkleIcon, Tag,
  Briefcase, User, Calendar, Hash, Loader2, TrendingUp,
  DollarSign, BarChart3, Clock, UserCircle2
} from 'lucide-react'

export default function ItemTracker() {
  const { id: routeItemId } = useParams()
  const navigate = useNavigate()
  const { isDark, toggleTheme } = useThemeStore()
  const { items, fetchItems, fetchItemAuditTrail, itemAuditTrail, loading } = useInventoryStore()

  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(routeItemId || null)

  useEffect(() => {
    fetchItems()
  }, [])

  useEffect(() => {
    if (selectedId) {
      fetchItemAuditTrail(selectedId).then(r => {
        if (!r.success) toast.error(r.error || 'Failed to load audit trail')
      })
    }
  }, [selectedId])

  const filteredItems = items.filter(i => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      (i.name || '').toLowerCase().includes(s) ||
      (i.item_code || '').toLowerCase().includes(s) ||
      (i.barcode || '').toLowerCase().includes(s)
    )
  })

  const formatCurrency = (n) =>
    new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n || 0)

  const formatDateTime = (d) =>
    d ? new Date(d).toLocaleString('en-ZA', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }) : '—'

  const getEventStyle = (event) => {
    if (event.type === 'created')
      return { bg: 'bg-blue-100 dark:bg-blue-900/30', icon: <SparkleIcon className="w-4 h-4 text-blue-600" />, badge: 'bg-blue-100 text-blue-700' }
    if (event.type === 'batch')
      return { bg: 'bg-purple-100 dark:bg-purple-900/30', icon: <Package className="w-4 h-4 text-purple-600" />, badge: 'bg-purple-100 text-purple-700' }
    if (event.type === 'job_usage')
      return { bg: 'bg-amber-100 dark:bg-amber-900/30', icon: <Briefcase className="w-4 h-4 text-amber-600" />, badge: 'bg-amber-100 text-amber-700' }
    if (event.direction === 'in')
      return { bg: 'bg-emerald-100 dark:bg-emerald-900/30', icon: <ArrowDown className="w-4 h-4 text-emerald-600" />, badge: 'bg-emerald-100 text-emerald-700' }
    if (event.direction === 'out')
      return { bg: 'bg-red-100 dark:bg-red-900/30', icon: <ArrowUp className="w-4 h-4 text-red-600" />, badge: 'bg-red-100 text-red-700' }
    return { bg: 'bg-slate-100 dark:bg-slate-700/40', icon: <Tag className="w-4 h-4 text-slate-500" />, badge: 'bg-slate-100 text-slate-600' }
  }

  const item = itemAuditTrail?.item
  const stats = itemAuditTrail?.stats
  const events = itemAuditTrail?.events || []

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />

      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
        <div className="neu-inset px-5 py-2 rounded-full flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-semibold tracking-wide text-emerald-800 dark:text-emerald-200 hidden sm:inline">ERP</span>
        </div>
        <button onClick={toggleTheme} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center hover:scale-110 transition-transform">
          {isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-600" />}
        </button>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <div className="flex items-center gap-2 mb-6 text-sm flex-wrap">
          <Link to="/inventory" className="text-slate-500 hover:text-emerald-600">Inventory</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">Item Tracker</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <Clock className="w-8 h-8 text-emerald-600" />Item Tracker
          </h1>
          <p className="text-slate-500 mt-1">
            Full audit trail — every movement of an item from creation to today
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ITEM PICKER */}
          <div className="lg:col-span-1">
            <div className="neu-raised rounded-3xl p-4 sticky top-24">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search items..."
                  className="w-full pl-9 pr-3 py-2.5 neu-inset rounded-xl text-slate-700 dark:text-slate-300 text-sm"
                />
              </div>

              <p className="text-xs text-slate-500 mb-2 px-1">
                {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
              </p>

              <div className="max-h-[65vh] overflow-y-auto space-y-1">
                {filteredItems.map(i => {
                  const active = selectedId === i.id
                  return (
                    <button
                      key={i.id}
                      onClick={() => setSelectedId(i.id)}
                      className={`w-full text-left p-3 rounded-xl transition-colors ${
                        active
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 border-l-4 border-emerald-500'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-700/30 border-l-4 border-transparent'
                      }`}
                    >
                      <p className={`text-sm font-medium truncate ${active ? 'text-emerald-800 dark:text-emerald-200' : 'text-slate-800 dark:text-white'}`}>
                        {i.name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {i.item_code} · {i.current_stock} {i.unit}
                      </p>
                    </button>
                  )
                })}
                {filteredItems.length === 0 && (
                  <p className="text-center text-slate-500 py-6 text-sm">No items found</p>
                )}
              </div>
            </div>
          </div>

          {/* TIMELINE */}
          <div className="lg:col-span-2">
            {!selectedId ? (
              <div className="text-center py-20 neu-raised rounded-3xl">
                <Package className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <p className="text-slate-500 text-lg">Select an item to see its full audit trail</p>
                <p className="text-slate-400 text-sm mt-1">Every movement, since it was added, in one timeline</p>
              </div>
            ) : loading && !itemAuditTrail ? (
              <div className="text-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mx-auto" />
                <p className="text-slate-500 mt-3">Loading audit trail...</p>
              </div>
            ) : !item ? (
              <div className="text-center py-20 neu-raised rounded-3xl">
                <p className="text-slate-500">Item not found</p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Item header */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className="neu-raised rounded-3xl p-5 border-l-4 border-emerald-500"
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                        <Package className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">{item.name}</h2>
                        <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <Hash className="w-3 h-3" />{item.item_code}
                          {item.item_categories && (
                            <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-medium"
                              style={{ backgroundColor: (item.item_categories.color || '#10b981') + '20', color: item.item_categories.color || '#10b981' }}>
                              {item.item_categories.name}
                            </span>
                          )}
                        </p>
                        {item.barcode && <p className="text-xs text-slate-400 mt-1">Barcode: {item.barcode}</p>}
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/inventory/items/${item.id}`)}
                      className="neu-raised neu-btn px-4 py-2 rounded-xl bg-slate-600 text-white text-xs font-medium"
                    >
                      View Item
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/10">
                      <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 mb-1">
                        <TrendingUp className="w-3 h-3" />Total In
                      </div>
                      <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{stats.totalIn}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/10">
                      <div className="flex items-center gap-1.5 text-xs text-red-700 dark:text-red-400 mb-1">
                        <TrendingUp className="w-3 h-3 rotate-180" />Total Out
                      </div>
                      <p className="text-lg font-bold text-red-700 dark:text-red-400">{stats.totalOut}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/10">
                      <div className="flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-400 mb-1">
                        <Package className="w-3 h-3" />Current
                      </div>
                      <p className="text-lg font-bold text-blue-700 dark:text-blue-400">
                        {stats.currentStock} <span className="text-xs font-normal">{item.unit}</span>
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 mb-1">
                        <BarChart3 className="w-3 h-3" />Events
                      </div>
                      <p className="text-lg font-bold text-slate-700 dark:text-slate-300">{stats.eventCount}</p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 flex items-center justify-between flex-wrap gap-2">
                    <span>First event: <strong className="text-slate-700 dark:text-slate-300">{formatDateTime(stats.firstEvent)}</strong></span>
                    <span>Last event: <strong className="text-slate-700 dark:text-slate-300">{formatDateTime(stats.lastEvent)}</strong></span>
                  </div>
                </motion.div>

                {/* Timeline */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                  className="neu-raised rounded-3xl p-5"
                >
                  <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-emerald-600" />
                    Audit Timeline ({events.length})
                  </h3>

                  {events.length === 0 ? (
                    <p className="text-center text-slate-500 py-8">No events recorded yet</p>
                  ) : (
                    <div className="relative">
                      <div className="absolute left-5 top-2 bottom-2 w-px bg-slate-200 dark:bg-slate-700"></div>

                      <div className="space-y-3">
                        {events.map((event, idx) => {
                          const style = getEventStyle(event)
                          const actor = event.performedBy

                          return (
                            <motion.div
                              key={event.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.02 }}
                              className="relative flex gap-3 pl-0"
                            >
                              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center z-10 ring-4 ring-white dark:ring-slate-800 ${style.bg}`}>
                                {style.icon}
                              </div>

                              <div className="flex-1 bg-slate-50 dark:bg-slate-700/30 rounded-xl p-3 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                                <div className="flex items-start justify-between gap-2 flex-wrap">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="font-semibold text-slate-800 dark:text-white text-sm">
                                        {event.title}
                                      </p>
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${style.badge}`}>
                                        {event.type.replace(/_/g, ' ')}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                      {event.description}
                                    </p>
                                  </div>

                                  {event.quantity > 0 && event.direction !== 'neutral' && (
                                    <div className={`flex-shrink-0 px-2 py-1 rounded-lg text-xs font-bold ${
                                      event.direction === 'in'
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                    }`}>
                                      {event.direction === 'in' ? '+' : '-'}{event.quantity} {item.unit}
                                    </div>
                                  )}
                                </div>

                                {/* ✅ ACTOR ROW — prominently shows WHO did it */}
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  {actor ? (
                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                      actor.source === 'employee'
                                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                                        : actor.source === 'profile'
                                          ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'
                                          : 'bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400'
                                    }`}>
                                      <UserCircle2 className="w-3 h-3" />
                                      <span>{actor.name}</span>
                                      {actor.code && <span className="opacity-75">({actor.code})</span>}
                                      {actor.role && <span className="opacity-75">· {actor.role}</span>}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400">
                                      <UserCircle2 className="w-3 h-3" />System
                                    </span>
                                  )}

                                  <span className="flex items-center gap-1 text-[10px] text-slate-500">
                                    <Calendar className="w-3 h-3" />{formatDateTime(event.timestamp)}
                                  </span>

                                  {event.metadata?.job_number && (
                                    <span className="flex items-center gap-1 text-[10px] text-slate-500">
                                      <Briefcase className="w-3 h-3" />{event.metadata.job_number}
                                    </span>
                                  )}

                                  {event.metadata?.unit_cost != null && (
                                    <span className="flex items-center gap-1 text-[10px] text-slate-500">
                                      <DollarSign className="w-3 h-3" />{formatCurrency(event.metadata.unit_cost)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </motion.div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
