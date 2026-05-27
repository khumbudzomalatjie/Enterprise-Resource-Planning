import { forwardRef } from 'react'

const QuotationPDF = forwardRef(({ quotation, items, companyInfo }, ref) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0)
  }

  const formatDate = (date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div 
      ref={ref}
      style={{
        width: '210mm',
        height: '297mm',
        padding: '12mm 15mm',
        backgroundColor: 'white',
        fontFamily: 'Inter, Arial, sans-serif',
        color: '#1e293b',
        position: 'relative',
        boxSizing: 'border-box',
        overflow: 'hidden',
        fontSize: '11px'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', borderBottom: '2px solid #2563eb', paddingBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img 
            src="/logo.png" 
            alt="Logo" 
            style={{ width: '55px', height: '55px', objectFit: 'contain', borderRadius: '8px' }}
            onError={(e) => { e.target.style.display = 'none' }}
          />
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e40af', margin: '0' }}>
              NDANDULENI GROUP
            </h1>
            <p style={{ fontSize: '10px', color: '#3b82f6', margin: '2px 0', fontStyle: 'italic' }}>
              Innovation Without End
            </p>
            <p style={{ fontSize: '9px', color: '#64748b', margin: '0' }}>
              2220 Manthata Str, Ivory Park
            </p>
            <p style={{ fontSize: '9px', color: '#64748b', margin: '1px 0' }}>
              Tel: 070 419 9457 | Email: accounts@ndandulenigroup.co.za
            </p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#1e293b', margin: '0', letterSpacing: '2px' }}>
            QUOTATION
          </h2>
          <p style={{ fontSize: '14px', color: '#2563eb', margin: '3px 0', fontWeight: 'bold' }}>
            {quotation?.quotation_number || 'Q-25-0001'}
          </p>
          <div style={{ marginTop: '8px', fontSize: '9px', color: '#64748b' }}>
            <p style={{ margin: '1px 0' }}>Date: {formatDate(quotation?.quotation_date || new Date())}</p>
            <p style={{ margin: '1px 0' }}>Valid Until: {formatDate(quotation?.valid_until)}</p>
          </div>
        </div>
      </div>

      {/* Client Info */}
      <div style={{ marginBottom: '10px', display: 'flex', gap: '30px' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
            Bill To:
          </h3>
          <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b', margin: '0' }}>
            {quotation?.client_name || 'Client Name'}
          </p>
          {quotation?.client_email && (
            <p style={{ fontSize: '10px', color: '#64748b', margin: '1px 0' }}>{quotation.client_email}</p>
          )}
          {quotation?.client_phone && (
            <p style={{ fontSize: '10px', color: '#64748b', margin: '1px 0' }}>{quotation.client_phone}</p>
          )}
          {quotation?.client_address && (
            <p style={{ fontSize: '10px', color: '#64748b', margin: '1px 0', whiteSpace: 'pre-line' }}>{quotation.client_address}</p>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
            Payment Terms:
          </h3>
          <p style={{ fontSize: '11px', color: '#1e293b', margin: '0' }}>{quotation?.payment_terms || '50% Deposit'}</p>
        </div>
      </div>

      {/* Items Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px' }}>
        <thead>
          <tr style={{ backgroundColor: '#1e40af', color: 'white' }}>
            <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: '10px', fontWeight: 'bold', width: '5%' }}>#</th>
            <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: '10px', fontWeight: 'bold', width: '50%' }}>Description</th>
            <th style={{ padding: '6px 8px', textAlign: 'center', fontSize: '10px', fontWeight: 'bold', width: '10%' }}>Qty</th>
            <th style={{ padding: '6px 8px', textAlign: 'right', fontSize: '10px', fontWeight: 'bold', width: '15%' }}>Unit Price</th>
            <th style={{ padding: '6px 8px', textAlign: 'right', fontSize: '10px', fontWeight: 'bold', width: '20%' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {(items || []).map((item, index) => (
            <tr key={item.id || index} style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '5px 8px', fontSize: '10px', color: '#64748b' }}>{index + 1}</td>
              <td style={{ padding: '5px 8px', fontSize: '10px', color: '#1e293b' }}>
                <p style={{ margin: '0', fontWeight: '500' }}>{item.description || 'Service'}</p>
              </td>
              <td style={{ padding: '5px 8px', fontSize: '10px', color: '#1e293b', textAlign: 'center' }}>{item.quantity || 1}</td>
              <td style={{ padding: '5px 8px', fontSize: '10px', color: '#1e293b', textAlign: 'right' }}>{formatCurrency(item.unit_price)}</td>
              <td style={{ padding: '5px 8px', fontSize: '10px', color: '#1e293b', textAlign: 'right', fontWeight: '500' }}>{formatCurrency(item.total_price || (item.quantity * item.unit_price))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
        <div style={{ width: '250px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #e2e8f0', fontSize: '10px' }}>
            <span style={{ color: '#64748b' }}>Subtotal (Excl. VAT):</span>
            <span style={{ color: '#1e293b', fontWeight: '500' }}>{formatCurrency(quotation?.subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #e2e8f0', fontSize: '10px' }}>
            <span style={{ color: '#64748b' }}>VAT (15%):</span>
            <span style={{ color: '#1e293b' }}>{formatCurrency(quotation?.tax_amount)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', fontSize: '14px', fontWeight: 'bold', backgroundColor: '#eff6ff', marginTop: '3px', borderRadius: '4px' }}>
            <span style={{ color: '#1e40af' }}>TOTAL (Incl. VAT):</span>
            <span style={{ color: '#1e40af', fontSize: '16px' }}>{formatCurrency(quotation?.total_amount)}</span>
          </div>
        </div>
      </div>

      {/* Terms & Conditions */}
      <div style={{ marginBottom: '6px' }}>
        <h3 style={{ fontSize: '10px', fontWeight: 'bold', color: '#1e40af', textTransform: 'uppercase', marginBottom: '3px', borderBottom: '1px solid #bfdbfe', paddingBottom: '2px' }}>
          Terms & Conditions
        </h3>
        <div style={{ fontSize: '8.5px', color: '#64748b', lineHeight: '1.4', display: 'flex', gap: '15px' }}>
          <div style={{ flex: 1 }}>
            <p style={{ margin: '0 0 3px 0', fontWeight: 'bold', color: '#1e293b' }}>Deposit & Payment:</p>
            <ul style={{ margin: '0', paddingLeft: '15px' }}>
              <li>50% deposit required to secure booking</li>
              <li>Balance payable upon completion</li>
              <li>Payment methods: EFT and card (no cash)</li>
            </ul>
            <p style={{ margin: '5px 0 3px 0', fontWeight: 'bold', color: '#1e293b' }}>Cancellation & Rescheduling:</p>
            <ul style={{ margin: '0', paddingLeft: '15px' }}>
              <li>24-hour notice required for full refund</li>
              <li>Rescheduling subject to availability</li>
            </ul>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: '0 0 3px 0', fontWeight: 'bold', color: '#1e293b' }}>Client Responsibilities:</p>
            <ul style={{ margin: '0', paddingLeft: '15px' }}>
              <li>Provide access to premises</li>
              <li>Ensure pets are secured or removed</li>
              <li>Remove clutter and obstacles</li>
            </ul>
            <p style={{ margin: '5px 0 3px 0', fontWeight: 'bold', color: '#1e40af' }}>
              ✓ 100% Satisfaction Guaranteed
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ position: 'absolute', bottom: '10mm', left: '15mm', right: '15mm', borderTop: '1px solid #e2e8f0', paddingTop: '6px', textAlign: 'center' }}>
        <p style={{ fontSize: '8px', color: '#94a3b8', margin: '0' }}>
          Ndanduleni Group (Pty) Ltd | 2220 Manthata Str, Ivory Park | Tel: 070 419 9457 | accounts@ndandulenigroup.co.za
        </p>
        <p style={{ fontSize: '8px', color: '#94a3b8', margin: '2px 0' }}>
          This quotation is valid for 30 days. All prices exclude VAT. VAT will be added at 15%.
        </p>
      </div>
    </div>
  )
})

QuotationPDF.displayName = 'QuotationPDF'

export default QuotationPDF
