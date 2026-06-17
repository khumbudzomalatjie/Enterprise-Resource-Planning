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
  Loader2, X, History, Plus, Edit, Trash2, MoveRight, 
  RefreshCw, CreditCard, Calendar, Play, StopCircle, 
  Send, FileText, Eye, MapPin, Phone
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
  // FETCH COMPLETE HISTORY FROM ALL SOURCES
  // ═══════════════════════════════════════════
  const fetchItemHistory = async (item, type) => {
    setLoadingHistory(true)
    try {
      let history = []
      const entityId = item.id

      // ──── JOB HISTORY ────
      if (type === 'Job') {
        // 1. Job creation & updates from audit logs
        const { data: auditLogs } = await supabase
          .from('payroll_audit_logs')
          .select('*')
          .eq('entity_id', entityId)
          .order('created_at', { ascending: true })

        if (auditLogs?.length > 0) {
          const logs = await Promise.all(auditLogs.map(async (log) => ({
            id: `audit-${log.id}`,
            action: log.action,
            user_email: await getUserEmail(log.user_id),
            created_at: log.created_at,
            details: `${type} was ${log.action}`,
            icon: log.action === 'created' ? Plus : log.action === 'updated' ? Edit : log.action === 'deleted' ? Trash2 : RefreshCw,
            color: log.action === 'created' ? 'text-emerald-600 bg-emerald-100' : log.action === 'updated' ? 'text-blue-600 bg-blue-100' : 'text-red-600 bg-red-100'
          })))
          history = [...history, ...logs]
        }

        // 2. Status changes (tracked from the job itself)
        history.push({
          id: 'status-current',
          action: 'current_status',
          user_email: 'System',
          created_at: item.updated_at || item.created_at,
          details: `Current status: ${(item.status || 'unknown').replace(/_/g, ' ')} | Priority: ${item.priority || 'N/A'}`,
          icon: Activity,
          color: 'text-purple-600 bg-purple-100'
        })

        // 3. Job assignments
        const { data: assignments } = await supabase
          .from('job_assignments')
          .select('*, employees(first_name, last_name, employee_code)')
          .eq('job_id', entityId)
          .order('assigned_date', { ascending: true })

        if (assignments?.length > 0) {
          const assignLogs = assignments.map(a => ({
            id: `assign-${a.id}`,
            action: 'assignment',
            user_email: a.employees ? `${a.employees.first_name} ${a.employees.last_name} (${a.employees.employee_code})` : 'Unknown',
            created_at: a.assigned_date || a.created_at,
            details: `Assigned cleaner: ${a.employees?.first_name || 'Unknown'} ${a.employees?.last_name || ''} | Status: ${a.status}${a.check_in_time ? ` | Check-in: ${new Date(a.check_in_time).toLocaleTimeString()}` : ''}${a.check_out_time ? ` | Check-out: ${new Date(a.check_out_time).toLocaleTimeString()}` : ''}`,
            icon: Users,
            color: 'text-indigo-600 bg-indigo-100'
          }))
          history = [...history, ...assignLogs]
        }

        // 4. Job photos uploaded
        const { data: photos } = await supabase
          .from('job_photos')
          .select('*, employees(first_name, last_name)')
          .eq('job_id', entityId)
          .order('taken_at', { ascending: true })

        if (photos?.length > 0) {
          const photoLogs = await Promise.all(photos.map(async (p) => ({
            id: `photo-${p.id}`,
            action: 'photo_uploaded',
            user_email: p.employees ? `${p.employees.first_name} ${p.employees.last_name}` : await getUserEmail(p.employee_id),
            created_at: p.taken_at,
            details: `Photo uploaded: ${p.photo_type || 'general'}${p.caption ? ` - "${p.caption}"` : ''}`,
            icon: Camera,
            color: 'text-pink-600 bg-pink-100',
            photo_url: p.photo_url
          })))
          history = [...history, ...photoLogs]
        }

        // 5. Quality inspections
        const { data: inspections } = await supabase
          .from('quality_inspections')
          .select('*')
          .eq('job_id', entityId)
          .order('inspection_date', { ascending: true })

        if (inspections?.length > 0) {
          const inspLogs = await Promise.all(inspections.map(async (insp) => ({
            id: `insp-${insp.id}`,
            action: 'inspection',
            user_email: await getUserEmail(insp.inspector_id),
            created_at: insp.inspection_date,
            details: `Quality inspection | Rating: ${insp.overall_rating}/5 | Cleanliness: ${insp.cleanliness_score}/5 | Status: ${insp.status}`,
            icon: Eye,
            color: 'text-amber-600 bg-amber-100'
          })))
          history = [...history, ...inspLogs]
        }

        // 6. Client signatures
        const { data: signatures } = await supabase
          .from('client_signatures')
          .select('*')
          .eq('job_id', entityId)
          .order('signed_at', { ascending: true })

        if (signatures?.length > 0) {
          const sigLogs = signatures.map(s => ({
            id: `sig-${s.id}`,
            action: 'client_signoff',
            user_email: s.signed_by || 'Client',
            created_at: s.signed_at,
            details: `Client signed off${s.satisfaction_rating ? ` | Satisfaction: ${s.satisfaction_rating}/5` : ''}${s.comments ? ` | "${s.comments}"` : ''}`,
            icon: CheckCircle2,
            color: 'text-emerald-600 bg-emerald-100'
          }))
          history = [...history, ...sigLogs]
        }

        // 7. Checklist completions
        const { data: tasks } = await supabase
          .from('job_task_items')
          .select('*')
          .eq('job_id', entityId)
          .order('created_at', { ascending: true })

        if (tasks?.length > 0) {
          const completedTasks = tasks.filter(t => t.is_completed)
          const pendingTasks = tasks.filter(t => !t.is_completed)
          
          if (completedTasks.length > 0) {
            history.push({
              id: 'tasks-completed',
              action: 'tasks_completed',
              user_email: 'Cleaner',
              created_at: completedTasks[completedTasks.length - 1].completed_at || new Date().toISOString(),
              details: `${completedTasks.length} of ${tasks.length} tasks completed`,
              icon: CheckCircle2,
              color: 'text-emerald-600 bg-emerald-100'
            })
          }
        }
      }

      // ──── INVENTORY HISTORY ────
      if (type === 'Inventory Item') {
        // Creation info
        history.push({
          id: 'created',
          action: 'created',
          user_email: await getUserEmail(item.created_by),
          created_at: item.created_at,
          details: `Item created: ${item.name} (${item.item_code})`,
          icon: Plus,
          color: 'text-emerald-600 bg-emerald-100'
        })

        // Stock movements
        const { data: movements } = await supabase
          .from('stock_movements')
          .select('*')
          .eq('item_id', entityId)
          .order('created_at', { ascending: true })
          .limit(50)

        if (movements?.length > 0) {
          const moveLogs = await Promise.all(movements.map(async (m) => ({
            id: `mov-${m.id}`,
            action: 'stock_movement',
            movement_type: m.movement_type,
            quantity: m.quantity,
            user_email: await getUserEmail(m.performed_by),
            created_at: m.movement_date || m.created_at,
            details: `${(m.movement_type || 'movement').replace(/_/g, ' ')}: ${m.quantity > 0 ? '+' : ''}${m.quantity} units | Ref: ${m.reference_number || 'N/A'}${m.notes ? ` | Notes: ${m.notes}` : ''}`,
            icon: m.quantity > 0 ? MoveRight : MoveRight,
            color: m.movement_type === 'purchase' || m.movement_type === 'return' ? 'text-emerald-600 bg-emerald-100' : 'text-red-600 bg-red-100'
          })))
          history = [...history, ...moveLogs]
        }

        // Current stock status
        history.push({
          id: 'stock-current',
          action: 'current_stock',
          user_email: 'System',
          created_at: new Date().toISOString(),
          details: `Current stock: ${item.current_stock} ${item.unit} | Reorder point: ${item.reorder_point} | Status: ${item.current_stock <= 0 ? 'OUT OF STOCK' : item.current_stock <= item.reorder_point ? 'LOW STOCK' : 'In Stock'}`,
          icon: Package,
          color: item.current_stock <= 0 ? 'text-red-600 bg-red-100' : item.current_stock <= item.reorder_point ? 'text-amber-600 bg-amber-100' : 'text-emerald-600 bg-emerald-100'
        })
      }

      // ──── VEHICLE HISTORY ────
      if (type === 'Vehicle') {
        history.push({
          id: 'created',
          action: 'created',
          user_email: await getUserEmail(item.created_by),
          created_at: item.created_at,
          details: `Vehicle added: ${item.name} (${item.plate_number})`,
          icon: Plus,
          color: 'text-emerald-600 bg-emerald-100'
        })

        // Fuel records
        const { data: fuelLogs } = await supabase
          .from('fuel_records')
          .select('*')
          .eq('vehicle_id', entityId)
          .order('fuel_date', { ascending: true })
          .limit(20)

        if (fuelLogs?.length > 0) {
          const fuelHistory = fuelLogs.map(f => ({
            id: `fuel-${f.id}`,
            action: 'fuel_log',
            user_email: f.fuel_station || 'Fuel Record',
            created_at: f.fuel_date,
            details: `Fuel: ${f.quantity}L at ${f.fuel_station || 'Unknown Station'} | Amount: R${f.amount?.toFixed(2) || '0'} | Price/L: R${f.price_per_litre?.toFixed(2) || '0'}${f.notes ? ` | Notes: ${f.notes}` : ''}`,
            icon: Activity,
            color: 'text-amber-600 bg-amber-100'
          }))
          history = [...history, ...fuelHistory]
        }

        // Expenses
        const { data: expenses } = await supabase
          .from('vehicle_expenses')
          .select('*')
          .eq('vehicle_id', entityId)
          .order('expense_date', { ascending: true })
          .limit(20)

        if (expenses?.length > 0) {
          const expHistory = expenses.map(e => ({
            id: `exp-${e.id}`,
            action: 'expense',
            user_email: e.vendor || 'Unknown',
            created_at: e.expense_date,
            details: `${e.expense_type}: R${e.amount?.toFixed(2) || '0'} | Vendor: ${e.vendor || 'N/A'}${e.notes ? ` | Notes: ${e.notes}` : ''}`,
            icon: CreditCard,
            color: 'text-red-600 bg-red-100'
          }))
          history = [...history, ...expHistory]
        }

        // Maintenance records
        const { data: maintenance } = await supabase
          .from('maintenance_records')
          .select('*')
          .eq('vehicle_id', entityId)
          .order('service_date', { ascending: true })
          .limit(20)

        if (maintenance?.length > 0) {
          const maintHistory = maintenance.map(m => ({
            id: `maint-${m.id}`,
            action: 'maintenance',
            user_email: m.vendor || 'Service Record',
            created_at: m.service_date,
            details: `${m.service_type}: ${m.description}${m.cost ? ` | Cost: R${m.cost?.toFixed(2)}` : ''}${m.vendor ? ` | Vendor: ${m.vendor}` : ''}${m.odometer_reading ? ` | Odometer: ${m.odometer_reading}km` : ''}`,
            icon: RefreshCw,
            color: 'text-blue-600 bg-blue-100'
          }))
          history = [...history, ...maintHistory]
        })

        // Meter readings
        const { data: readings } = await supabase
          .from('meter_readings')
          .select('*')
          .eq('vehicle_id', entityId)
          .order('reading_date', { ascending: true })
          .limit(10)

        if (readings?.length > 0) {
          const readHistory = readings.map(r => ({
            id: `meter-${r.id}`,
            action: 'meter_reading',
            user_email: 'System',
            created_at: r.reading_date,
            details: `Odometer reading: ${r.odometer_reading?.toLocaleString()} km`,
            icon: Activity,
            color: 'text-indigo-600 bg-indigo-100'
          }))
          history = [...history, ...readHistory]
        }
      }

      // ──── EMPLOYEE HISTORY ────
      if (type === 'Employee') {
        history.push({
          id: 'created',
          action: 'hired',
          user_email: await getUserEmail(item.created_by),
          created_at: item.date_of_hire || item.created_at,
          details: `Employee hired: ${item.first_name} ${item.last_name} | Position: ${item.position || 'N/A'} | Department: ${item.department || 'N/A'}`,
          icon: Plus,
          color: 'text-emerald-600 bg-emerald-100'
        })

        // Attendance records
        const { data: attendance } = await supabase
          .from('attendance_records')
          .select('*')
          .eq('employee_id', entityId)
          .order('attendance_date', { ascending: false })
          .limit(30)

        if (attendance?.length > 0) {
          const attHistory = attendance.map(a => ({
            id: `att-${a.id}`,
            action: 'attendance',
            user_email: 'Attendance System',
            created_at: a.attendance_date,
            details: `${a.status === 'present' ? '✅ Present' : a.status === 'absent' ? '❌ Absent' : a.status === 'late' ? '⚠️ Late' : a.status} | In: ${a.clock_in_time ? new Date(a.clock_in_time).toLocaleTimeString() : 'N/A'} | Out: ${a.clock_out_time ? new Date(a.clock_out_time).toLocaleTimeString() : 'N/A'} | Hours: ${a.total_hours?.toFixed(1) || '0'}`,
            icon: Clock,
            color: a.status === 'present' ? 'text-emerald-600 bg-emerald-100' : a.status === 'absent' ? 'text-red-600 bg-red-100' : 'text-amber-600 bg-amber-100'
          }))
          history = [...history, ...attHistory]
        }

        // Leave requests
        const { data: leaves } = await supabase
          .from('leave_requests')
          .select('*, leave_types(name)')
          .eq('employee_id', entityId)
          .order('created_at', { ascending: false })
          .limit(10)

        if (leaves?.length > 0) {
          const leaveHistory = leaves.map(l => ({
            id: `leave-${l.id}`,
            action: 'leave_request',
            user_email: 'Employee',
            created_at: l.created_at,
            details: `${l.leave_types?.name || 'Leave'}: ${l.start_date} to ${l.end_date} (${l.total_days} days) | Status: ${l.status}`,
            icon: Calendar,
            color: l.status === 'approved' ? 'text-emerald-600 bg-emerald-100' : l.status === 'rejected' ? 'text-red-600 bg-red-100' : 'text-amber-600 bg-amber-100'
          }))
          history = [...history, ...leaveHistory]
        }
      }

      // ──── VENDOR HISTORY ────
      if (type === 'Vendor') {
        history.push({
          id: 'created',
          action: 'registered',
          user_email: await getUserEmail(item.created_by),
          created_at: item.created_at,
          details: `Vendor registered: ${item.company_name} (${item.vendor_code}) | Category: ${(item.vendor_category || 'N/A').replace(/_/g, ' ')}`,
          icon: Plus,
          color: 'text-emerald-600 bg-emerald-100'
        })

        if (item.approved_at) {
          history.push({
            id: 'approved',
            action: 'approved',
            user_email: await getUserEmail(item.approved_by),
            created_at: item.approved_at,
            details: `Vendor approved by management`,
            icon: CheckCircle2,
            color: 'text-emerald-600 bg-emerald-100'
          })
        }

        // Purchase orders from this vendor
        const { data: pos } = await supabase
          .from('purchase_orders')
          .select('*')
          .eq('vendor_id', entityId)
          .order('created_at', { ascending: false })
          .limit(10)

        if (pos?.length > 0) {
          const poHistory = pos.map(po => ({
            id: `po-${po.id}`,
            action: 'purchase_order',
            user_email: 'Procurement',
            created_at: po.created_at,
            details: `PO ${po.po_number} | Amount: R${po.total_amount?.toFixed(2) || '0'} | Status: ${po.status}`,
            icon: ShoppingCart,
            color: 'text-purple-600 bg-purple-100'
          }))
          history = [...history, ...poHistory]
        }
      }

      // ──── CLIENT HISTORY ────
      if (type === 'Client') {
        history.push({
          id: 'created',
          action: 'registered',
          user_email: await getUserEmail(item.created_by),
          created_at: item.created_at,
          details: `Client registered: ${item.company_name} (${item.client_code})`,
          icon: Plus,
          color: 'text-emerald-600 bg-emerald-100'
        })

        // Jobs for this client
        const { data: jobs } = await supabase
          .from('jobs')
          .select('*')
          .eq('client_id', entityId)
          .order('created_at', { ascending: false })
          .limit(10)

        if (jobs?.length > 0) {
          const jobHistory = jobs.map(j => ({
            id: `job-${j.id}`,
            action: 'job',
            user_email: 'Operations',
            created_at: j.created_at,
            details: `Job ${j.job_number}: ${j.title} | Status: ${j.status} | Amount: R${j.quoted_amount?.toFixed(2) || '0'}`,
            icon: Briefcase,
            color: 'text-blue-600 bg-blue-100'
          }))
          history = [...history, ...jobHistory]
        }

        // Invoices for this client
        const { data: invoices } = await supabase
          .from('invoices')
          .select('*')
          .eq('client_id', entityId)
          .order('created_at', { ascending: false })
          .limit(10)

        if (invoices?.length > 0) {
          const invHistory = invoices.map(inv => ({
            id: `inv-${inv.id}`,
            action: 'invoice',
            user_email: 'Finance',
            created_at: inv.created_at,
            details: `Invoice ${inv.invoice_number} | Amount: R${inv.total_amount?.toFixed(2) || '0'} | Status: ${inv.status}`,
            icon: FileText,
            color: 'text-teal-600 bg-teal-100'
          }))
          history = [...history, ...invHistory]
        }
      }

      // ──── PO HISTORY ────
      if (type === 'Purchase Order') {
        history.push({
          id: 'created',
          action: 'created',
          user_email: await getUserEmail(item.created_by),
          created_at: item.created_at,
          details: `PO created: ${item.po_number} | Amount: R${item.total_amount?.toFixed(2) || '0'} | Vendor: ${item.vendors?.company_name || 'N/A'}`,
          icon: Plus,
          color: 'text-emerald-600 bg-emerald-100'
        })

        // Goods receipts
        const { data: receipts } = await supabase
          .from('goods_receipts')
          .select('*, goods_receipt_items(*)')
          .eq('purchase_order_id', entityId)
          .order('created_at', { ascending: true })

        if (receipts?.length > 0) {
          const receiptHistory = await Promise.all(receipts.map(async (r) => ({
            id: `gr-${r.id}`,
            action: 'goods_receipt',
            user_email: await getUserEmail(r.received_by),
            created_at: r.receipt_date,
            details: `GR-${r.gr_number} | Status: ${r.status} | Items received: ${r.goods_receipt_items?.length || 0} | Quality: ${r.quality_check_passed ? '✅ Passed' : '❌ Failed'}${r.inspection_notes ? ` | Notes: ${r.inspection_notes}` : ''}`,
            icon: Package,
            color: 'text-emerald-600 bg-emerald-100'
          })))
          history = [...history, ...receiptHistory]
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

  const handleSearch = async (e) => {
    e?.preventDefault()
    if (!searchValue.trim()) { toast.error('Please enter a search value'); return }
    setSearching(true); setSearchResult(null); setSearchError(null)
    try {
      let result = null
      switch (searchType) {
        case 'job': {
          const { data: jobs, error } = await supabase.from('jobs').select('*, clients(company_name, phone), job_categories(name)').ilike('job_number', `%${searchValue}%`).limit(5)
          if (error) throw error
          if (!jobs?.length) { setSearchError(`No job found with number "${searchValue}"`); break }
          const enriched = await Promise.all(jobs.map(async (job) => ({ ...job, created_by_email: await getUserEmail(job.created_by), assigned_to_email: job.assigned_supervisor ? await getUserEmail(job.assigned_supervisor) : null })))
          result = { type: 'job', data: enriched, count: enriched.length }; break
        }
        case 'inventory': {
          const { data: items, error } = await supabase.from('inventory_items').select('*, item_categories(name), warehouses(name), suppliers(company_name)').or(`item_code.ilike.%${searchValue}%,barcode.ilike.%${searchValue}%,name.ilike.%${searchValue}%`).limit(10)
          if (error) throw error
          if (!items?.length) { setSearchError(`No inventory item found for "${searchValue}"`); break }
          const enriched = await Promise.all(items.map(async (item) => ({ ...item, created_by_email: await getUserEmail(item.created_by), supplier_name: item.suppliers?.company_name || 'N/A' })))
          result = { type: 'inventory', data: enriched, count: enriched.length }; break
        }
        case 'fleet': {
          const { data: vehicles, error } = await supabase.from('vehicles').select('*, employees!vehicles_assigned_to_fkey(first_name, last_name)').or(`plate_number.ilike.%${searchValue}%,name.ilike.%${searchValue}%,vehicle_code.ilike.%${searchValue}%`).limit(5)
          if (error) throw error
          if (!vehicles?.length) { setSearchError(`No vehicle found with plate "${searchValue}"`); break }
          const enriched = await Promise.all(vehicles.map(async (v) => ({ ...v, created_by_email: await getUserEmail(v.created_by || v.assigned_to), driver_name: v.employees ? `${v.employees.first_name} ${v.employees.last_name}` : 'Unassigned' })))
          result = { type: 'fleet', data: enriched, count: enriched.length }; break
        }
        case 'employee': {
          const { data: employees, error } = await supabase.from('employees').select('*').or(`employee_code.ilike.%${searchValue}%,first_name.ilike.%${searchValue}%,last_name.ilike.%${searchValue}%,email.ilike.%${searchValue}%`).limit(10)
          if (error) throw error
          if (!employees?.length) { setSearchError(`No employee found for "${searchValue}"`); break }
          const today = new Date().toISOString().split('T')[0]; const employeeIds = employees.map(e => e.id)
          const { data: attendance } = await supabase.from('attendance_records').select('*').eq('attendance_date', today).in('employee_id', employeeIds)
          const attendanceMap = {}; attendance?.forEach(a => { attendanceMap[a.employee_id] = a })
          const enriched = await Promise.all(employees.map(async (emp) => ({ ...emp, created_by_email: await getUserEmail(emp.created_by), today_attendance: attendanceMap[emp.id] || null, is_working: !!(attendanceMap[emp.id]?.clock_in_time && !attendanceMap[emp.id]?.clock_out_time) })))
          result = { type: 'employee', data: enriched, count: enriched.length }; break
        }
        case 'vendor': {
          const { data: vendors, error } = await supabase.from('vendors').select('*').or(`vendor_code.ilike.%${searchValue}%,company_name.ilike.%${searchValue}%`).limit(10)
          if (error) throw error
          if (!vendors?.length) { setSearchError(`No vendor found for "${searchValue}"`); break }
          const enriched = await Promise.all(vendors.map(async (v) => ({ ...v, created_by_email: await getUserEmail(v.created_by), approved_by_email: v.approved_by ? await getUserEmail(v.approved_by) : 'Not yet approved' })))
          result = { type: 'vendor', data: enriched, count: enriched.length }; break
        }
        case 'client': {
          const { data: clients, error } = await supabase.from('clients').select('*').or(`client_code.ilike.%${searchValue}%,company_name.ilike.%${searchValue}%`).limit(10)
          if (error) throw error
          if (!clients?.length) { setSearchError(`No client found for "${searchValue}"`); break }
          const enriched = await Promise.all(clients.map(async (c) => ({ ...c, created_by_email: await getUserEmail(c.created_by), account_manager_email: c.account_manager_id ? await getUserEmail(c.account_manager_id) : 'Not assigned' })))
          result = { type: 'client', data: enriched, count: enriched.length }; break
        }
        case 'po': {
          const { data: pos, error } = await supabase.from('purchase_orders').select('*, vendors(company_name, vendor_code)').ilike('po_number', `%${searchValue}%`).limit(5)
          if (error) throw error
          if (!pos?.length) { setSearchError(`No purchase order found with number "${searchValue}"`); break }
          const enriched = await Promise.all(pos.map(async (po) => ({ ...po, created_by_email: await getUserEmail(po.created_by), approved_by_email: po.approved_by ? await getUserEmail(po.approved_by) : 'Not yet approved' })))
          result = { type: 'po', data: enriched, count: enriched.length }; break
        }
      }
      if (result) { setSearchResult(result); toast.success(`Found ${result.count} ${searchType}${result.count > 1 ? 's' : ''}`) }
    } catch (error) { setSearchError('Search failed: ' + error.message) }
    finally { setSearching(false) }
  }

  const clearSearch = () => { setSearchResult(null); setSearchError(null); setSearchValue('') }
  const formatCurrency = (amount) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)
  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'
  const formatDateTime = (date) => date ? new Date(date).toLocaleString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'
  const getStatusBadge = (status) => {
    const badges = { active: 'bg-emerald-100 text-emerald-700', in_use: 'bg-blue-100 text-blue-700', pending: 'bg-amber-100 text-amber-700', completed: 'bg-emerald-100 text-emerald-700', sent: 'bg-blue-100 text-blue-700', confirmed: 'bg-purple-100 text-purple-700', received: 'bg-emerald-100 text-emerald-700', pending_approval: 'bg-amber-100 text-amber-700', in_progress: 'bg-amber-100 text-amber-700', scheduled: 'bg-blue-100 text-blue-700', in_service: 'bg-orange-100 text-orange-700', draft: 'bg-slate-100 text-slate-600' }
    return badges[status] || 'bg-slate-100 text-slate-600'
  }

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />
      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
        <div className="neu-inset px-5 py-2 rounded-full flex items-center gap-2"><Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /><span className="text-sm font-semibold tracking-wide text-emerald-800 dark:text-emerald-200 hidden sm:inline">ERP</span></div>
        <button onClick={toggleTheme} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center hover:scale-110">{isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-600" />}</button>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <Link to="/dashboard" className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-emerald-600 mb-6"><ArrowLeft className="w-4 h-4 mr-1" /><span className="text-sm">Back to Main Dashboard</span></Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2"><Activity className="w-8 h-8 text-emerald-600" /><h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-white">ERP Tracker</h1></div>
          <p className="text-slate-500 dark:text-slate-400 ml-11">Track everything with full history - who did what, when, and how</p>
        </motion.div>

        {/* Search Bar */}
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
            <div className="flex-1 relative"><input type="text" value={searchValue} onChange={(e) => setSearchValue(e.target.value)} placeholder="Enter search term..." className="w-full px-4 py-3 rounded-xl bg-white/20 text-white placeholder-white/60 text-sm border border-white/30 focus:outline-none focus:bg-white/30" /></div>
            <button type="submit" disabled={searching} className="px-6 py-3 rounded-xl bg-white text-emerald-700 font-bold text-sm hover:bg-white/90 disabled:opacity-50 flex items-center gap-2">{searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}{searching ? 'Searching...' : 'Track'}</button>
            {(searchResult || searchError) && <button type="button" onClick={clearSearch} className="px-3 py-3 rounded-xl bg-white/20 hover:bg-white/30 text-white"><X className="w-4 h-4" /></button>}
          </form>
        </motion.div>

        {/* Search Error */}
        {searchError && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="neu-raised rounded-3xl p-8 mb-8 text-center border-2 border-red-200"><AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" /><p className="text-red-600 font-semibold">{searchError}</p></motion.div>}

        {/* Search Results */}
        {searchResult && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="neu-raised rounded-3xl p-6 mb-8">
            <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-bold">Results: <span className="text-emerald-600 capitalize">{searchResult.type}</span> <span className="text-sm text-slate-500">({searchResult.count} found)</span></h3></div>
            <div className="space-y-3">
              {searchResult.data.map((item) => (
                <div key={item.id} className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      {searchResult.type === 'job' && <><div className="flex items-center gap-2"><span className="font-mono font-bold text-sm text-blue-600">{item.job_number}</span><span className={`px-2 py-0.5 rounded-full text-xs ${getStatusBadge(item.status)}`}>{item.status?.replace('_', ' ')}</span></div><p className="font-medium text-sm mt-1">{item.title}</p><div className="flex flex-wrap gap-3 text-xs text-slate-500 mt-2"><span>👤 Created: {item.created_by_email}</span>{item.assigned_to_email && <span>👷 Assigned: {item.assigned_to_email}</span>}</div></>}
                      {searchResult.type === 'inventory' && <><div className="flex items-center gap-2"><span className="font-mono font-bold text-sm">{item.item_code}</span><span className="font-medium">{item.name}</span></div><div className="flex flex-wrap gap-3 text-xs text-slate-500 mt-2"><span>👤 Added: {item.created_by_email}</span><span>🏭 Supplier: {item.supplier_name}</span><span>📦 Stock: {item.current_stock} {item.unit}</span></div></>}
                      {searchResult.type === 'fleet' && <><div className="flex items-center gap-2"><Truck className="w-5 h-5 text-indigo-600" /><span className="font-bold">{item.name}</span><span className="font-mono text-sm">{item.plate_number}</span></div><div className="flex flex-wrap gap-3 text-xs text-slate-500 mt-2"><span>👤 Added: {item.created_by_email}</span><span>🚗 Driver: {item.driver_name}</span></div></>}
                      {searchResult.type === 'employee' && <><div className="flex items-center gap-2"><span className="font-bold">{item.first_name} {item.last_name}</span><span className="text-xs text-slate-500">{item.employee_code}</span>{item.is_working && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>}</div><div className="flex flex-wrap gap-3 text-xs text-slate-500 mt-2"><span>👤 Added: {item.created_by_email}</span><span>💼 {item.position || 'No position'}</span><span className={item.is_working ? 'text-emerald-600 font-medium' : ''}>{item.is_working ? '🟢 Working' : '⚪ Off'}</span></div></>}
                      {searchResult.type === 'vendor' && <><div className="flex items-center gap-2"><Building2 className="w-5 h-5 text-amber-600" /><span className="font-bold">{item.company_name}</span></div><div className="flex flex-wrap gap-3 text-xs text-slate-500 mt-2"><span>👤 Created: {item.created_by_email}</span><span>✅ Approved: {item.approved_by_email}</span></div></>}
                      {searchResult.type === 'client' && <><div className="flex items-center gap-2"><UserCheck className="w-5 h-5 text-teal-600" /><span className="font-bold">{item.company_name}</span></div><div className="flex flex-wrap gap-3 text-xs text-slate-500 mt-2"><span>👤 Created: {item.created_by_email}</span><span>👔 Account Mgr: {item.account_manager_email}</span></div></>}
                      {searchResult.type === 'po' && <><div className="flex items-center gap-2"><span className="font-mono font-bold text-sm text-purple-600">{item.po_number}</span><span className={`px-2 py-0.5 rounded-full text-xs ${getStatusBadge(item.status)}`}>{item.status}</span></div><div className="flex flex-wrap gap-3 text-xs text-slate-500 mt-2"><span>👤 Created: {item.created_by_email}</span><span>✅ Approved: {item.approved_by_email}</span></div></>}
                    </div>
                    <button onClick={() => handleViewDetails(item, searchResult.type === 'job' ? 'Job' : searchResult.type === 'inventory' ? 'Inventory Item' : searchResult.type === 'fleet' ? 'Vehicle' : searchResult.type === 'employee' ? 'Employee' : searchResult.type === 'vendor' ? 'Vendor' : searchResult.type === 'client' ? 'Client' : 'Purchase Order')} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 flex items-center gap-2 flex-shrink-0"><History className="w-4 h-4" /> View Full History</button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Stats Banner */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="neu-raised rounded-3xl p-6 mb-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 text-center">
            <div><p className="text-3xl font-bold">{summary.activeJobs || 0}</p><p className="text-xs opacity-80">Active Jobs</p></div>
            <div><p className="text-3xl font-bold">{summary.cleanersWorking || 0}</p><p className="text-xs opacity-80">Cleaners Working</p></div>
            <div><p className="text-3xl font-bold">{summary.activePOs || 0}</p><p className="text-xs opacity-80">Active P.O.s</p></div>
            <div><p className="text-3xl font-bold">{summary.lowStockItems || 0}</p><p className="text-xs opacity-80">Low Stock Items</p></div>
            <div><p className="text-3xl font-bold">{summary.pendingVendors || 0}</p><p className="text-xs opacity-80">Pending Vendors</p></div>
          </div>
        </motion.div>

        {/* Category Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[{ id: 'jobs', label: 'Jobs', icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', active: summary.activeJobs, completed: summary.completedJobs },{ id: 'vendors', label: 'Vendors', icon: Building2, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30', pending: summary.pendingVendors },{ id: 'procurement', label: 'P.O.s', icon: ShoppingCart, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30', active: summary.activePOs },{ id: 'inventory', label: 'Inventory', icon: Package, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30', lowStock: summary.lowStockItems },{ id: 'vehicles', label: 'Vehicles', icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30', active: summary.activeVehicles, service: summary.vehiclesInService },{ id: 'employees', label: 'Staff', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30', active: summary.activeEmployees, working: summary.cleanersWorking },{ id: 'clients', label: 'Clients', icon: UserCheck, color: 'text-teal-600', bg: 'bg-teal-100 dark:bg-teal-900/30', active: summary.activeClients }].map((cat, i) => (
            <motion.div key={cat.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} onClick={() => { setSearchType(cat.id === 'procurement' ? 'po' : cat.id === 'employees' ? 'employee' : cat.id); setSearchValue(''); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="neu-raised rounded-2xl p-5 cursor-pointer hover:scale-[1.02] transition-all">
              <div className={`w-12 h-12 rounded-xl ${cat.bg} flex items-center justify-center mb-3`}><cat.icon className={`w-6 h-6 ${cat.color}`} /></div>
              <h3 className="font-bold text-lg text-slate-800 dark:text-white">{cat.label}</h3>
              <div className="flex gap-3 mt-3 flex-wrap">{cat.active !== undefined && <span className="text-xs font-medium text-blue-600">{cat.active} active</span>}{cat.completed !== undefined && <span className="text-xs font-medium text-emerald-600">{cat.completed} done</span>}{cat.pending !== undefined && <span className="text-xs font-medium text-amber-600">{cat.pending} pending</span>}{cat.lowStock !== undefined && <span className="text-xs font-medium text-red-600">{cat.lowStock} low</span>}{cat.service !== undefined && <span className="text-xs font-medium text-orange-600">{cat.service} in service</span>}{cat.working !== undefined && <span className="text-xs font-medium text-emerald-600">{cat.working} working</span>}</div>
            </motion.div>
          ))}
        </div>
      </main>

      {/* ═══════════════════════════════════════════ */}
      {/* HISTORY MODAL - SCROLLABLE */}
      {/* ═══════════════════════════════════════════ */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/60 z-50 overflow-y-auto" onClick={() => { setSelectedItem(null); setItemHistory([]) }}>
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex-shrink-0 p-4 border-b flex justify-between items-center">
                <h3 className="font-bold text-lg">{selectedItem.type} History{selectedItem.type === 'Job' && ` - ${selectedItem.job_number}`}{selectedItem.type === 'Inventory Item' && ` - ${selectedItem.item_code}`}{selectedItem.type === 'Vehicle' && ` - ${selectedItem.plate_number}`}{selectedItem.type === 'Employee' && ` - ${selectedItem.first_name} ${selectedItem.last_name}`}{selectedItem.type === 'Vendor' && ` - ${selectedItem.company_name}`}{selectedItem.type === 'Client' && ` - ${selectedItem.company_name}`}{selectedItem.type === 'Purchase Order' && ` - ${selectedItem.po_number}`}</h3>
                <button onClick={() => { setSelectedItem(null); setItemHistory([]) }} className="p-2 rounded-xl bg-slate-200 hover:bg-slate-300"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4" style={{ maxHeight: 'calc(85vh - 70px)' }}>
                <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4 mb-4">
                  <p className="text-xs text-slate-500 mb-2 font-semibold">📋 Summary</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-slate-500">Status:</span> <span className="font-medium">{selectedItem.status || 'N/A'}</span></div>
                    <div><span className="text-slate-500">Created:</span> <span className="font-medium">{formatDateTime(selectedItem.created_at)}</span></div>
                    <div><span className="text-slate-500">Updated:</span> <span className="font-medium">{formatDateTime(selectedItem.updated_at)}</span></div>
                  </div>
                </div>

                <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2 sticky top-0 bg-white dark:bg-slate-800 py-2 z-10"><History className="w-5 h-5 text-emerald-600" /> Timeline ({itemHistory.length} events)</h4>

                {loadingHistory ? (
                  <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-3" /><p className="text-slate-500 text-sm">Loading history...</p></div>
                ) : itemHistory.length > 0 ? (
                  <div className="relative pl-6 border-l-2 border-emerald-200 dark:border-emerald-800 space-y-4 pb-8">
                    {itemHistory.map((event, i) => {
                      const EventIcon = event.icon || RefreshCw
                      return (
                        <div key={event.id || i} className="relative">
                          <div className={`absolute -left-[25px] w-4 h-4 rounded-full border-2 border-white dark:border-slate-800 ${event.color?.split(' ')[1] || 'bg-slate-400'}`}></div>
                          <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <EventIcon className={`w-4 h-4 ${event.color?.split(' ')[0] || 'text-slate-500'}`} />
                              <span className="text-xs font-semibold capitalize">{event.action?.replace(/_/g, ' ')}</span>
                              <span className="text-xs text-slate-400 ml-auto">{formatDateTime(event.created_at)}</span>
                            </div>
                            {event.details && <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{event.details}</p>}
                            {event.user_email && <p className="text-xs text-slate-500 mt-1">👤 <span className="font-medium">{event.user_email}</span></p>}
                            {event.photo_url && (
                              <img src={event.photo_url} alt="Job photo" className="mt-2 rounded-lg w-full max-h-[200px] object-cover cursor-pointer" onClick={() => window.open(event.photo_url, '_blank')} />
                            )}
                            {event.movement_type && (
                              <div className="mt-2 flex gap-2">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] ${event.movement_type === 'purchase' || event.movement_type === 'return' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{event.movement_type?.replace('_', ' ')}</span>
                                {event.quantity && <span className="text-[10px] text-slate-500">Qty: {event.quantity}</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    <div className="text-center text-[10px] text-slate-400 pt-2">── End of history ──</div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400"><History className="w-12 h-12 mx-auto mb-3 opacity-30" /><p className="text-sm">No history available</p></div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
