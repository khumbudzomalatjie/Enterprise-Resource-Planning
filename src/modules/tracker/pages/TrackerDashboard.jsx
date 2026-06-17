import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useTrackerStore from '../store/trackerStore'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  Search, ArrowLeft, Sun, Moon, Sparkles, Activity,
  Briefcase, Building2, ShoppingCart, Package, Truck,
  Users, UserCheck, Clock, AlertCircle, CheckCircle2,
  Loader2, X, History, Plus, Edit, MoveRight, RefreshCw, CreditCard
} from 'lucide-react'

export default function TrackerDashboard() {
  const { summary, fetchSummary } = useTrackerStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  
  const [searchType, setSearchType] = useState('job')
  const [searchValue, setSearchValue] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResult, setSearchResult] = useState(null)
  const [searchError, setSearchError] = useState(null)
  const [selectedItem, setSelectedItem] = useState(null)
  const [itemHistory, setItemHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  useEffect(() => {
    fetchSummary()
    const interval = setInterval(fetchSummary, 30000)
    return () => clearInterval(interval)
  }, [])

  const getUserEmail = async (userId) => {
    if (!userId) return 'N/A'
    try {
      const { data } = await supabase.from('profiles').select('email, full_name').eq('id', userId).single()
      return data?.full_name || data?.email || 'Unknown'
    } catch { return 'Unknown' }
  }

  // ═══════════════════════════════════════════
  // FETCH COMPLETE HISTORY FROM SOURCE TABLES
  // ═══════════════════════════════════════════
  const fetchItemHistory = async (item, type) => {
    setLoadingHistory(true)
    try {
      let history = []
      const entityId = item.id

      // ═══ JOB HISTORY ═══
      if (type === 'Job') {
        // Get job data to see status changes
        const { data: jobData } = await supabase.from('jobs').select('*').eq('id', entityId).single()
        if (jobData) {
          // Job created
          history.push({
            id: 'created',
            action: 'created',
            user_email: await getUserEmail(jobData.created_by),
            created_at: jobData.created_at,
            icon: Plus,
            color: 'text-emerald-600 bg-emerald-100',
            details: `Job "${jobData.title}" was created with status "${jobData.status}"`
          })
          // If status changed from original
          if (jobData.status !== 'pending' && jobData.updated_at !== jobData.created_at) {
            history.push({
              id: 'status-change',
              action: 'status_change',
              user_email: 'System',
              created_at: jobData.updated_at,
              icon: RefreshCw,
              color: 'text-blue-600 bg-blue-100',
              details: `Status changed to "${jobData.status}"`
            })
          }
          // If actual start/end times exist
          if (jobData.actual_start_time) {
            history.push({
              id: 'started',
              action: 'job_started',
              user_email: 'System',
              created_at: jobData.actual_start_time,
              icon: Activity,
              color: 'text-amber-600 bg-amber-100',
              details: `Job started at ${new Date(jobData.actual_start_time).toLocaleString()}`
            })
          }
          if (jobData.actual_end_time) {
            history.push({
              id: 'completed',
              action: 'job_completed',
              user_email: 'System',
              created_at: jobData.actual_end_time,
              icon: CheckCircle2,
              color: 'text-emerald-600 bg-emerald-100',
              details: `Job completed at ${new Date(jobData.actual_end_time).toLocaleString()}`
            })
          }
        }

        // Get assignments
        const { data: assignments } = await supabase.from('job_assignments').select('*, employees(first_name, last_name)').eq('job_id', entityId).order('created_at', { ascending: true })
        if (assignments?.length > 0) {
          assignments.forEach(a => {
            history.push({
              id: `assign-${a.id}`,
              action: 'assignment',
              user_email: a.employees ? `${a.employees.first_name} ${a.employees.last_name}` : 'Unknown',
              created_at: a.created_at,
              icon: Users,
              color: 'text-indigo-600 bg-indigo-100',
              details: `Assigned to ${a.employees?.first_name || 'Unknown'} ${a.employees?.last_name || ''} (Status: ${a.status})`
            })
          })
        }

        // Get checklist completions
        const { data: checklists } = await supabase.from('job_checklist_items').select('*').eq('job_id', entityId).eq('is_completed', true).order('completed_at', { ascending: true })
        if (checklists?.length > 0) {
          checklists.forEach(c => {
            history.push({
              id: `check-${c.id}`,
              action: 'task_completed',
              user_email: await getUserEmail(c.completed_by),
              created_at: c.completed_at,
              icon: CheckCircle2,
              color: 'text-emerald-600 bg-emerald-100',
              details: `Task completed: "${c.description}"`
            })
          })
        }

        // Get photos
        const { data: photos } = await supabase.from('job_photos').select('*, employees(first_name, last_name)').eq('job_id', entityId).order('taken_at', { ascending: true })
        if (photos?.length > 0) {
          photos.forEach(p => {
            history.push({
              id: `photo-${p.id}`,
              action: 'photo_uploaded',
              user_email: p.employees ? `${p.employees.first_name} ${p.employees.last_name}` : 'Unknown',
              created_at: p.taken_at,
              icon: CreditCard,
              color: 'text-purple-600 bg-purple-100',
              details: `${p.photo_type} photo uploaded: ${p.caption || 'No caption'}`
            })
          })
        }

        // Get client signature
        const { data: signatures } = await supabase.from('client_signatures').select('*').eq('job_id', entityId)
        if (signatures?.length > 0) {
          signatures.forEach(s => {
            history.push({
              id: `sig-${s.id}`,
              action: 'client_signoff',
              user_email: s.signed_by || 'Client',
              created_at: s.signed_at,
              icon: CheckCircle2,
              color: 'text-emerald-600 bg-emerald-100',
              details: `Signed by: ${s.signed_by || 'Client'} | Rating: ${s.satisfaction_rating || 'N/A'}/5`
            })
          })
        }
      }

      // ═══ INVENTORY HISTORY ═══
      if (type === 'Inventory Item') {
        const { data: itemData } = await supabase.from('inventory_items').select('*').eq('id', entityId).single()
        if (itemData) {
          history.push({
            id: 'created',
            action: 'created',
            user_email: await getUserEmail(itemData.created_by),
            created_at: itemData.created_at,
            icon: Plus,
            color: 'text-emerald-600 bg-emerald-100',
            details: `Item "${itemData.name}" created with initial stock: ${itemData.current_stock}`
          })
        }

        const { data: movements } = await supabase.from('stock_movements').select('*').eq('item_id', entityId).order('created_at', { ascending: true }).limit(50)
        if (movements?.length > 0) {
          for (const m of movements) {
            history.push({
              id: `mov-${m.id}`,
              action: 'stock_movement',
              movement_type: m.movement_type,
              quantity: m.quantity,
              user_email: await getUserEmail(m.performed_by),
              created_at: m.created_at,
              icon: MoveRight,
              color: m.quantity > 0 ? 'text-emerald-600 bg-emerald-100' : 'text-red-600 bg-red-100',
              details: `${m.movement_type?.replace('_', ' ')}: ${m.quantity > 0 ? '+' : ''}${m.quantity} units | Ref: ${m.reference_number || 'N/A'} | Value: R${(m.quantity * (m.unit_cost || 0)).toFixed(2)}`
            })
          }
        }
      }

      // ═══ VEHICLE HISTORY ═══
      if (type === 'Vehicle') {
        const { data: vehData } = await supabase.from('vehicles').select('*').eq('id', entityId).single()
        if (vehData) {
          history.push({
            id: 'created',
            action: 'created',
            user_email: await getUserEmail(vehData.created_by || vehData.assigned_to),
            created_at: vehData.created_at,
            icon: Plus,
            color: 'text-emerald-600 bg-emerald-100',
            details: `Vehicle "${vehData.name}" (${vehData.plate_number}) added`
          })
        }

        const { data: fuelLogs } = await supabase.from('fuel_records').select('*').eq('vehicle_id', entityId).order('fuel_date', { ascending: true }).limit(20)
        if (fuelLogs?.length > 0) {
          fuelLogs.forEach(f => {
            history.push({
              id: `fuel-${f.id}`,
              action: 'fuel_log',
              user_email: await getUserEmail(f.recorded_by),
              created_at: f.fuel_date,
              icon: Activity,
              color: 'text-amber-600 bg-amber-100',
              details: `Fuel: ${f.quantity}L at ${f.fuel_station || 'Unknown'} - R${f.amount?.toFixed(2)} (Odometer: ${f.odometer_reading?.toLocaleString() || 'N/A'} km)`
            })
          })
        }

        const { data: expenses } = await supabase.from('vehicle_expenses').select('*').eq('vehicle_id', entityId).order('expense_date', { ascending: true }).limit(20)
        if (expenses?.length > 0) {
          expenses.forEach(e => {
            history.push({
              id: `exp-${e.id}`,
              action: 'expense',
              user_email: e.vendor || 'Unknown',
              created_at: e.expense_date,
              icon: CreditCard,
              color: 'text-red-600 bg-red-100',
              details: `${e.expense_type}: R${e.amount?.toFixed(2)} - ${e.vendor || 'N/A'} (Odometer: ${e.odometer_reading?.toLocaleString() || 'N/A'})`
            })
          })
        }

        const { data: meterReadings } = await supabase.from('meter_readings').select('*').eq('vehicle_id', entityId).order('reading_date', { ascending: true }).limit(20)
        if (meterReadings?.length > 0) {
          meterReadings.forEach(m => {
            history.push({
              id: `meter-${m.id}`,
              action: 'meter_reading',
              user_email: await getUserEmail(m.recorded_by),
              created_at: m.reading_date,
              icon: Activity,
              color: 'text-blue-600 bg-blue-100',
              details: `Odometer reading: ${m.odometer_reading?.toLocaleString()} km | Notes: ${m.notes || 'N/A'}`
            })
          })
        }

        const { data: reminders } = await supabase.from('fleet_reminders').select('*').eq('vehicle_id', entityId).order('created_at', { ascending: true })
        if (reminders?.length > 0) {
          reminders.forEach(r => {
            history.push({
              id: `rem-${r.id}`,
              action: 'reminder',
              user_email: 'System',
              created_at: r.created_at,
              icon: Clock,
              color: 'text-orange-600 bg-orange-100',
              details: `Reminder: ${r.reminder_name} | Next: ${r.next_date} | Status: ${r.status}`
            })
          })
        }
      }

      // ═══ EMPLOYEE HISTORY ═══
      if (type === 'Employee') {
        const { data: empData } = await supabase.from('employees').select('*').eq('id', entityId).single()
        if (empData) {
          history.push({
            id: 'created',
            action: 'hired',
            user_email: await getUserEmail(empData.created_by),
            created_at: empData.created_at,
            icon: Plus,
            color: 'text-emerald-600 bg-emerald-100',
            details: `${empData.first_name} ${empData.last_name} hired as ${empData.position || 'Staff'}`
          })
          if (empData.date_of_hire) {
            history.push({
              id: 'hire-date',
              action: 'start_date',
              user_email: 'HR System',
              created_at: empData.date_of_hire,
              icon: Calendar,
              color: 'text-blue-600 bg-blue-100',
              details: `Employment started on ${new Date(empData.date_of_hire).toLocaleDateString()}`
            })
          }
        }

        const { data: attendance } = await supabase.from('attendance_records').select('*').eq('employee_id', entityId).order('attendance_date', { ascending: false }).limit(30)
        if (attendance?.length > 0) {
          attendance.forEach(a => {
            const clockIn = a.clock_in_time ? new Date(a.clock_in_time).toLocaleTimeString() : 'N/A'
            const clockOut = a.clock_out_time ? new Date(a.clock_out_time).toLocaleTimeString() : 'Not clocked out'
            history.push({
              id: `att-${a.id}`,
              action: 'attendance',
              user_email: 'System',
              created_at: a.attendance_date,
              icon: Clock,
              color: a.clock_out_time ? 'text-emerald-600 bg-emerald-100' : 'text-amber-600 bg-amber-100',
              details: `Date: ${a.attendance_date} | In: ${clockIn} | Out: ${clockOut} | Status: ${a.status} | Hours: ${a.total_hours?.toFixed(1) || 'N/A'}`
            })
          })
        }

        const { data: leaveRequests } = await supabase.from('leave_requests').select('*, leave_types(name)').eq('employee_id', entityId).order('created_at', { ascending: false }).limit(10)
        if (leaveRequests?.length > 0) {
          leaveRequests.forEach(l => {
            history.push({
              id: `leave-${l.id}`,
              action: 'leave_request',
              user_email: 'Leave System',
              created_at: l.created_at,
              icon: Calendar,
              color: l.status === 'approved' ? 'text-emerald-600 bg-emerald-100' : l.status === 'rejected' ? 'text-red-600 bg-red-100' : 'text-amber-600 bg-amber-100',
              details: `${l.leave_types?.name || 'Leave'}: ${l.start_date} to ${l.end_date} (${l.total_days} days) | Status: ${l.status}`
            })
          })
        }
      }

      // ═══ VENDOR HISTORY ═══
      if (type === 'Vendor') {
        const { data: vendData } = await supabase.from('vendors').select('*').eq('id', entityId).single()
        if (vendData) {
          history.push({
            id: 'created',
            action: 'created',
            user_email: await getUserEmail(vendData.created_by),
            created_at: vendData.created_at,
            icon: Plus,
            color: 'text-emerald-600 bg-emerald-100',
            details: `Vendor "${vendData.company_name}" added with status "${vendData.status}"`
          })
          if (vendData.approved_at) {
            history.push({
              id: 'approved',
              action: 'approved',
              user_email: await getUserEmail(vendData.approved_by),
              created_at: vendData.approved_at,
              icon: CheckCircle2,
              color: 'text-emerald-600 bg-emerald-100',
              details: `Vendor approved`
            })
          }
          if (vendData.status === 'active' && vendData.updated_at !== vendData.created_at && vendData.updated_at !== vendData.approved_at) {
            history.push({
              id: 'updated',
              action: 'updated',
              user_email: 'System',
              created_at: vendData.updated_at,
              icon: Edit,
              color: 'text-blue-600 bg-blue-100',
              details: `Vendor details updated`
            })
          }
        }

        const { data: vendorPOs } = await supabase.from('purchase_orders').select('*').eq('vendor_id', entityId).order('created_at', { ascending: true }).limit(20)
        if (vendorPOs?.length > 0) {
          vendorPOs.forEach(po => {
            history.push({
              id: `vpo-${po.id}`,
              action: 'purchase_order',
              user_email: await getUserEmail(po.created_by),
              created_at: po.created_at,
              icon: ShoppingCart,
              color: 'text-purple-600 bg-purple-100',
              details: `PO ${po.po_number} created | Amount: R${po.total_amount?.toFixed(2)} | Status: ${po.status}`
            })
          })
        }
      }

      // ═══ CLIENT HISTORY ═══
      if (type === 'Client') {
        const { data: clientData } = await supabase.from('clients').select('*').eq('id', entityId).single()
        if (clientData) {
          history.push({
            id: 'created',
            action: 'created',
            user_email: await getUserEmail(clientData.created_by),
            created_at: clientData.created_at,
            icon: Plus,
            color: 'text-emerald-600 bg-emerald-100',
            details: `Client "${clientData.company_name}" added`
          })
        }

        const { data: interactions } = await supabase.from('client_interactions').select('*').eq('client_id', entityId).order('scheduled_date', { ascending: false }).limit(20)
        if (interactions?.length > 0) {
          interactions.forEach(inter => {
            history.push({
              id: `inter-${inter.id}`,
              action: 'interaction',
              user_email: await getUserEmail(inter.attended_by || inter.created_by),
              created_at: inter.scheduled_date || inter.created_at,
              icon: Users,
              color: 'text-blue-600 bg-blue-100',
              details: `${inter.interaction_type?.replace('_', ' ')}: ${inter.subject} | Status: ${inter.status}`
            })
          })
        }

        const { data: jobs } = await supabase.from('jobs').select('*').eq('client_id', entityId).order('created_at', { ascending: true }).limit(20)
        if (jobs?.length > 0) {
          jobs.forEach(job => {
            history.push({
              id: `cjob-${job.id}`,
              action: 'job_created',
              user_email: await getUserEmail(job.created_by),
              created_at: job.created_at,
              icon: Briefcase,
              color: 'text-indigo-600 bg-indigo-100',
              details: `Job ${job.job_number}: "${job.title}" | Status: ${job.status}`
            })
          })
        }

        const { data: invoices } = await supabase.from('invoices').select('*').eq('client_id', entityId).order('created_at', { ascending: true }).limit(20)
        if (invoices?.length > 0) {
          invoices.forEach(inv => {
            history.push({
              id: `cinv-${inv.id}`,
              action: 'invoice',
              user_email: 'System',
              created_at: inv.created_at,
              icon: CreditCard,
              color: inv.status === 'paid' ? 'text-emerald-600 bg-emerald-100' : 'text-amber-600 bg-amber-100',
              details: `Invoice ${inv.invoice_number}: R${inv.total_amount?.toFixed(2)} | Status: ${inv.status}`
            })
          })
        }
      }

      // ═══ PURCHASE ORDER HISTORY ═══
      if (type === 'Purchase Order') {
        const { data: poData } = await supabase.from('purchase_orders').select('*').eq('id', entityId).single()
        if (poData) {
          history.push({
            id: 'created',
            action: 'created',
            user_email: await getUserEmail(poData.created_by),
            created_at: poData.created_at,
            icon: Plus,
            color: 'text-emerald-600 bg-emerald-100',
            details: `PO ${poData.po_number} created | Amount: R${poData.total_amount?.toFixed(2)}`
          })
          if (poData.approved_by) {
            history.push({
              id: 'approved',
              action: 'approved',
              user_email: await getUserEmail(poData.approved_by),
              created_at: poData.approved_at || poData.updated_at,
              icon: CheckCircle2,
              color: 'text-emerald-600 bg-emerald-100',
              details: `PO approved`
            })
          }
        }

        const { data: receipts } = await supabase.from('goods_receipts').select('*').eq('purchase_order_id', entityId).order('created_at', { ascending: true })
        if (receipts?.length > 0) {
          for (const r of receipts) {
            history.push({
              id: `gr-${r.id}`,
              action: 'goods_received',
              user_email: await getUserEmail(r.received_by),
              created_at: r.receipt_date,
              icon: Package,
              color: 'text-emerald-600 bg-emerald-100',
              details: `GR ${r.gr_number} | Status: ${r.status} | Quality: ${r.quality_check_passed ? '✅ Passed' : '❌ Failed'}`
            })
          }
        }
      }

      // Sort newest first
      history.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      setItemHistory(history)
    } catch (error) {
      console.error('Error fetching history:', error)
      toast.error('Failed to load history')
    }
    setLoadingHistory(false)
  }

  const handleViewDetails = async (item, type) => {
    setSelectedItem({ ...item, type })
    setItemHistory([])
    await fetchItemHistory(item, type)
  }

  // ═══════════════════════════════════════════
  // UNIVERSAL SEARCH FUNCTION
  // ═══════════════════════════════════════════
  const handleSearch = async (e) => {
    e?.preventDefault()
    if (!searchValue.trim()) { toast.error('Please enter a search value'); return }
    setSearching(true)
    setSearchResult(null)
    setSearchError(null)

    try {
      let result = null
      switch (searchType) {
        case 'job': {
          const { data: jobs, error } = await supabase.from('jobs').select('*, clients(company_name, phone), job_categories(name)').ilike('job_number', `%${searchValue}%`).limit(5)
          if (error) throw error
          if (!jobs?.length) { setSearchError(`No job found`); break }
          const enriched = await Promise.all(jobs.map(async (j) => ({ ...j, created_by_email: await getUserEmail(j.created_by), assigned_to_email: j.assigned_supervisor ? await getUserEmail(j.assigned_supervisor) : null })))
          result = { type: 'job', data: enriched, count: enriched.length }
          break
        }
        case 'inventory': {
          const { data: items, error } = await supabase.from('inventory_items').select('*, item_categories(name), warehouses(name), suppliers(company_name)').or(`item_code.ilike.%${searchValue}%,barcode.ilike.%${searchValue}%,name.ilike.%${searchValue}%`).limit(10)
          if (error) throw error
          if (!items?.length) { setSearchError(`No item found`); break }
          const enriched = await Promise.all(items.map(async (i) => ({ ...i, created_by_email: await getUserEmail(i.created_by), supplier_name: i.suppliers?.company_name || 'N/A' })))
          result = { type: 'inventory', data: enriched, count: enriched.length }
          break
        }
        case 'fleet': {
          const { data: vehicles, error } = await supabase.from('vehicles').select('*, employees!vehicles_assigned_to_fkey(first_name, last_name)').or(`plate_number.ilike.%${searchValue}%,name.ilike.%${searchValue}%,vehicle_code.ilike.%${searchValue}%`).limit(5)
          if (error) throw error
          if (!vehicles?.length) { setSearchError(`No vehicle found`); break }
          const enriched = await Promise.all(vehicles.map(async (v) => ({ ...v, created_by_email: await getUserEmail(v.created_by || v.assigned_to), driver_name: v.employees ? `${v.employees.first_name} ${v.employees.last_name}` : 'Unassigned' })))
          result = { type: 'fleet', data: enriched, count: enriched.length }
          break
        }
        case 'employee': {
          const { data: employees, error } = await supabase.from('employees').select('*').or(`employee_code.ilike.%${searchValue}%,first_name.ilike.%${searchValue}%,last_name.ilike.%${searchValue}%,email.ilike.%${searchValue}%`).limit(10)
          if (error) throw error
          if (!employees?.length) { setSearchError(`No employee found`); break }
          const today = new Date().toISOString().split('T')[0]
          const ids = employees.map(e => e.id)
          const { data: att } = await supabase.from('attendance_records').select('*').eq('attendance_date', today).in('employee_id', ids)
          const attMap = {}; att?.forEach(a => { attMap[a.employee_id] = a })
          const enriched = await Promise.all(employees.map(async (e) => ({ ...e, created_by_email: await getUserEmail(e.created_by), today_attendance: attMap[e.id] || null, is_working: !!(attMap[e.id]?.clock_in_time && !attMap[e.id]?.clock_out_time) })))
          result = { type: 'employee', data: enriched, count: enriched.length }
          break
        }
        case 'vendor': {
          const { data: vendors, error } = await supabase.from('vendors').select('*').or(`vendor_code.ilike.%${searchValue}%,company_name.ilike.%${searchValue}%`).limit(10)
          if (error) throw error
          if (!vendors?.length) { setSearchError(`No vendor found`); break }
          const enriched = await Promise.all(vendors.map(async (v) => ({ ...v, created_by_email: await getUserEmail(v.created_by), approved_by_email: v.approved_by ? await getUserEmail(v.approved_by) : 'Not approved' })))
          result = { type: 'vendor', data: enriched, count: enriched.length }
          break
        }
        case 'client': {
          const { data: clients, error } = await supabase.from('clients').select('*').or(`client_code.ilike.%${searchValue}%,company_name.ilike.%${searchValue}%`).limit(10)
          if (error) throw error
          if (!clients?.length) { setSearchError(`No client found`); break }
          const enriched = await Promise.all(clients.map(async (c) => ({ ...c, created_by_email: await getUserEmail(c.created_by), account_manager_email: c.account_manager_id ? await getUserEmail(c.account_manager_id) : 'Not assigned' })))
          result = { type: 'client', data: enriched, count: enriched.length }
          break
        }
        case 'po': {
          const { data: pos, error } = await supabase.from('purchase_orders').select('*, vendors(company_name, vendor_code)').ilike('po_number', `%${searchValue}%`).limit(5)
          if (error) throw error
          if (!pos?.length) { setSearchError(`No PO found`); break }
          const enriched = await Promise.all(pos.map(async (p) => ({ ...p, created_by_email: await getUserEmail(p.created_by), approved_by_email: p.approved_by ? await getUserEmail(p.approved_by) : 'Not approved' })))
          result = { type: 'po', data: enriched, count: enriched.length }
          break
        }
      }
      if (result) { setSearchResult(result); toast.success(`Found ${result.count} result(s)`) }
    } catch (error) { setSearchError('Search failed: ' + error.message) }
    finally { setSearching(false) }
  }

  const clearSearch = () => { setSearchResult(null); setSearchError(null); setSearchValue('') }
  const formatCurrency = (a) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(a || 0)
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'
  const formatDateTime = (d) => d ? new Date(d).toLocaleString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'
  const getStatusBadge = (s) => ({ active: 'bg-emerald-100 text-emerald-700', in_use: 'bg-blue-100 text-blue-700', pending: 'bg-amber-100 text-amber-700', completed: 'bg-emerald-100 text-emerald-700', sent: 'bg-blue-100 text-blue-700', confirmed: 'bg-purple-100 text-purple-700', received: 'bg-emerald-100 text-emerald-700', pending_approval: 'bg-amber-100 text-amber-700', in_progress: 'bg-amber-100 text-amber-700', scheduled: 'bg-blue-100 text-blue-700', in_service: 'bg-orange-100 text-orange-700', draft: 'bg-slate-100 text-slate-600' }[s] || 'bg-slate-100 text-slate-600')

  // Import Calendar icon
  const Calendar = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />
      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
        <div className="neu-inset px-5 py-2 rounded-full flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-semibold tracking-wide text-emerald-800 dark:text-emerald-200 hidden sm:inline">ERP</span>
        </div>
        <button onClick={toggleTheme} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center hover:scale-110">{isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-600" />}</button>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <Link to="/dashboard" className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-emerald-600 mb-6"><ArrowLeft className="w-4 h-4 mr-1" /><span className="text-sm">Back to Main Dashboard</span></Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2"><Activity className="w-8 h-8 text-emerald-600" /><h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-white">ERP Tracker</h1></div>
          <p className="text-slate-500 dark:text-slate-400 ml-11">Track everything with full history from creation to present</p>
        </motion.div>

        {/* SEARCH BAR */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="neu-raised rounded-3xl p-6 mb-8 bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-600 text-white">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Search className="w-6 h-6" /> Quick Tracker Search</h2>
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <select value={searchType} onChange={(e) => { setSearchType(e.target.value); clearSearch() }} className="px-4 py-3 rounded-xl bg-white/20 text-white font-medium text-sm border border-white/30">
              <option value="job" className="text-slate-800">🔍 Job Number</option>
              <option value="inventory" className="text-slate-800">📦 Item Code / Barcode</option>
              <option value="fleet" className="text-slate-800">🚗 Plate Number</option>
              <option value="employee" className="text-slate-800">👤 Employee Code / Name</option>
              <option value="vendor" className="text-slate-800">🏢 Vendor Code / Name</option>
              <option value="client" className="text-slate-800">💼 Client Code / Name</option>
              <option value="po" className="text-slate-800">📋 PO Number</option>
            </select>
            <div className="flex-1 relative"><input type="text" value={searchValue} onChange={(e) => setSearchValue(e.target.value)} placeholder={`Enter ${searchType === 'job' ? 'job number' : searchType === 'inventory' ? 'item code or barcode' : searchType === 'fleet' ? 'plate number' : searchType === 'employee' ? 'employee code or name' : searchType === 'vendor' ? 'vendor code or name' : searchType === 'client' ? 'client code or name' : 'PO number'}...`} className="w-full px-4 py-3 rounded-xl bg-white/20 text-white placeholder-white/60 text-sm border border-white/30 focus:outline-none focus:bg-white/30" /></div>
            <button type="submit" disabled={searching} className="px-6 py-3 rounded-xl bg-white text-emerald-700 font-bold text-sm hover:bg-white/90 disabled:opacity-50 flex items-center gap-2">{searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}{searching ? 'Searching...' : 'Track'}</button>
            {(searchResult || searchError) && <button type="button" onClick={clearSearch} className="px-3 py-3 rounded-xl bg-white/20 hover:bg-white/30 text-white"><X className="w-4 h-4" /></button>}
          </form>
        </motion.div>

        {searchError && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="neu-raised rounded-3xl p-8 mb-8 text-center border-2 border-red-200"><AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" /><p className="text-red-600 font-semibold">{searchError}</p></motion.div>}

        {/* SEARCH RESULTS */}
        {searchResult && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="neu-raised rounded-3xl p-6 mb-8">
            <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-bold">Results: <span className="text-emerald-600 capitalize">{searchResult.type}</span> ({searchResult.count})</h3></div>
            <div className="space-y-3">
              {searchResult.data.map((item) => (
                <div key={item.id} className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      {searchResult.type === 'job' && <><div className="flex items-center gap-2"><span className="font-mono font-bold text-sm text-blue-600">{item.job_number}</span><span className={`px-2 py-0.5 rounded-full text-xs ${getStatusBadge(item.status)}`}>{item.status?.replace('_', ' ')}</span></div><p className="font-medium text-sm mt-1">{item.title}</p><div className="flex flex-wrap gap-3 text-xs text-slate-500 mt-2"><span>👤 {item.created_by_email}</span>{item.assigned_to_email && <span>👷 {item.assigned_to_email}</span>}<span>📅 {formatDate(item.created_at)}</span></div></>}
                      {searchResult.type === 'inventory' && <><div className="flex items-center gap-2"><span className="font-mono font-bold text-sm">{item.item_code}</span><span className="font-medium">{item.name}</span></div><div className="flex flex-wrap gap-3 text-xs text-slate-500 mt-2"><span>👤 {item.created_by_email}</span><span>🏭 {item.supplier_name}</span><span>📦 {item.current_stock} {item.unit}</span></div></>}
                      {searchResult.type === 'fleet' && <><div className="flex items-center gap-2"><Truck className="w-5 h-5 text-indigo-600" /><span className="font-bold">{item.name}</span><span className="font-mono text-sm">{item.plate_number}</span></div><div className="flex flex-wrap gap-3 text-xs text-slate-500 mt-2"><span>👤 {item.created_by_email}</span><span>🚗 {item.driver_name}</span></div></>}
                      {searchResult.type === 'employee' && <><div className="flex items-center gap-2"><span className="font-bold">{item.first_name} {item.last_name}</span><span className="text-xs text-slate-500">{item.employee_code}</span>{item.is_working && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>}</div><div className="flex flex-wrap gap-3 text-xs text-slate-500 mt-2"><span>👤 {item.created_by_email}</span><span>💼 {item.position || 'N/A'}</span><span className={item.is_working ? 'text-emerald-600 font-medium' : ''}>{item.is_working ? '🟢 Working' : '⚪ Off'}</span></div></>}
                      {searchResult.type === 'vendor' && <><div className="flex items-center gap-2"><Building2 className="w-5 h-5 text-amber-600" /><span className="font-bold">{item.company_name}</span></div><div className="flex flex-wrap gap-3 text-xs text-slate-500 mt-2"><span>👤 {item.created_by_email}</span><span>✅ {item.approved_by_email}</span></div></>}
                      {searchResult.type === 'client' && <><div className="flex items-center gap-2"><UserCheck className="w-5 h-5 text-teal-600" /><span className="font-bold">{item.company_name}</span></div><div className="flex flex-wrap gap-3 text-xs text-slate-500 mt-2"><span>👤 {item.created_by_email}</span><span>👔 {item.account_manager_email}</span></div></>}
                      {searchResult.type === 'po' && <><div className="flex items-center gap-2"><span className="font-mono font-bold text-sm text-purple-600">{item.po_number}</span><span className={`px-2 py-0.5 rounded-full text-xs ${getStatusBadge(item.status)}`}>{item.status}</span></div><div className="flex flex-wrap gap-3 text-xs text-slate-500 mt-2"><span>👤 {item.created_by_email}</span><span>✅ {item.approved_by_email}</span></div></>}
                    </div>
                    <button onClick={() => handleViewDetails(item, searchResult.type === 'job' ? 'Job' : searchResult.type === 'inventory' ? 'Inventory Item' : searchResult.type === 'fleet' ? 'Vehicle' : searchResult.type === 'employee' ? 'Employee' : searchResult.type === 'vendor' ? 'Vendor' : searchResult.type === 'client' ? 'Client' : 'Purchase Order')} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 flex items-center gap-2 flex-shrink-0"><History className="w-4 h-4" /> View Full History</button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Live Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="neu-raised rounded-3xl p-6 mb-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div><p className="text-3xl font-bold">{summary.activeJobs || 0}</p><p className="text-xs opacity-80">Active Jobs</p></div>
            <div><p className="text-3xl font-bold">{summary.cleanersWorking || 0}</p><p className="text-xs opacity-80">Working Now</p></div>
            <div><p className="text-3xl font-bold">{summary.activePOs || 0}</p><p className="text-xs opacity-80">Active POs</p></div>
            <div><p className="text-3xl font-bold">{summary.lowStockItems || 0}</p><p className="text-xs opacity-80">Low Stock</p></div>
            <div><p className="text-3xl font-bold">{summary.pendingVendors || 0}</p><p className="text-xs opacity-80">Pending Vendors</p></div>
          </div>
        </motion.div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[{ id: 'jobs', label: 'Jobs', icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },{ id: 'vendors', label: 'Vendors', icon: Building2, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },{ id: 'procurement', label: 'P.O.s', icon: ShoppingCart, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },{ id: 'inventory', label: 'Inventory', icon: Package, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },{ id: 'vehicles', label: 'Vehicles', icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },{ id: 'employees', label: 'Staff', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },{ id: 'clients', label: 'Clients', icon: UserCheck, color: 'text-teal-600', bg: 'bg-teal-100 dark:bg-teal-900/30' }].map((cat, i) => (
            <motion.div key={cat.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} onClick={() => { setSearchType(cat.id === 'procurement' ? 'po' : cat.id === 'employees' ? 'employee' : cat.id); setSearchValue(''); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="neu-raised rounded-2xl p-5 cursor-pointer hover:scale-[1.02] transition-all">
              <div className={`w-12 h-12 rounded-xl ${cat.bg} flex items-center justify-center mb-3`}><cat.icon className={`w-6 h-6 ${cat.color}`} /></div>
              <h3 className="font-bold text-lg">{cat.label}</h3>
              <p className="text-xs text-slate-500 mt-1">Click to search</p>
            </motion.div>
          ))}
        </div>
      </main>

      {/* HISTORY MODAL */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/60 z-50 overflow-y-auto" onClick={() => { setSelectedItem(null); setItemHistory([]) }}>
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex-shrink-0 p-4 border-b flex justify-between items-center">
                <h3 className="font-bold text-lg">{selectedItem.type} History {selectedItem.type === 'Job' && `- ${selectedItem.job_number}`}{selectedItem.type === 'Inventory Item' && `- ${selectedItem.item_code}`}{selectedItem.type === 'Vehicle' && `- ${selectedItem.plate_number}`}{selectedItem.type === 'Employee' && `- ${selectedItem.first_name} ${selectedItem.last_name}`}{selectedItem.type === 'Vendor' && `- ${selectedItem.company_name}`}{selectedItem.type === 'Client' && `- ${selectedItem.company_name}`}{selectedItem.type === 'Purchase Order' && `- ${selectedItem.po_number}`}</h3>
                <button onClick={() => { setSelectedItem(null); setItemHistory([]) }} className="p-2 rounded-xl bg-slate-200 hover:bg-slate-300"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4" style={{ maxHeight: 'calc(85vh - 70px)' }}>
                <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4 mb-4">
                  <p className="text-xs text-slate-500 mb-2 font-semibold">📋 Summary</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-slate-500">Status:</span> <span className="font-medium">{selectedItem.status}</span></div>
                    <div><span className="text-slate-500">Created:</span> <span className="font-medium">{formatDateTime(selectedItem.created_at)}</span></div>
                  </div>
                </div>
                <h4 className="font-semibold mb-3 flex items-center gap-2 sticky top-0 bg-white dark:bg-slate-800 py-2 z-10"><History className="w-5 h-5 text-emerald-600" /> Complete History ({itemHistory.length} events)</h4>
                {loadingHistory ? <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-3" /></div> : itemHistory.length > 0 ? (
                  <div className="relative pl-6 border-l-2 border-emerald-200 dark:border-emerald-800 space-y-4 pb-4">
                    {itemHistory.map((event, i) => {
                      const EventIcon = event.icon || RefreshCw
                      return (
                        <div key={event.id || i} className="relative">
                          <div className={`absolute -left-[25px] w-4 h-4 rounded-full border-2 border-white dark:border-slate-800 ${event.color.split(' ')[1] || 'bg-slate-400'}`}></div>
                          <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-3">
                            <div className="flex items-center gap-2 mb-1"><EventIcon className={`w-4 h-4 ${event.color.split(' ')[0] || 'text-slate-500'}`} /><span className="text-xs font-semibold capitalize">{event.action?.replace('_', ' ')}</span><span className="text-xs text-slate-400 ml-auto">{formatDateTime(event.created_at)}</span></div>
                            {event.details && <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{event.details}</p>}
                            {event.user_email && <p className="text-xs text-slate-500 mt-1">👤 <span className="font-medium">{event.user_email}</span></p>}
                          </div>
                        </div>
                      )
                    })}
                    <div className="text-center text-[10px] text-slate-400 pt-2">── End of history ──</div>
                  </div>
                ) : <div className="text-center py-12 text-slate-400"><History className="w-12 h-12 mx-auto mb-3 opacity-30" /><p className="text-sm">No history available</p></div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
