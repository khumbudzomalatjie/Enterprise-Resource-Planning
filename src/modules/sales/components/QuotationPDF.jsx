import { forwardRef } from 'react'

const QuotationPDF = forwardRef(({ quotation, items, companyInfo }, ref) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(amount || 0)
  }

  const formatDate = (date) => {
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
        minHeight: '297mm',
        padding: '20mm',
        backgroundColor: 'white',
        fontFamily: 'Inter, sans-serif',
        color: '#1e293b',
        position: 'relative'
      }}
      className="quotation-a4"
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', borderBottom: '2px solid #059669', paddingBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <img 
            src="/logo.png" 
            alt="Logo" 
            style={{ width: '80px', height: '80px', objectFit: 'contain' }}
            onError={(e) => { e.target.style.display = 'none' }}
          />
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669', margin: '0' }}>
              NDANDULENI GROUP
            </h1>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '5px 0' }}>
              Professional Cleaning & Hygiene Services
            </p>
            <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0' }}>
              {companyInfo?.address || '123 Main Street, Johannesburg, 2000'}
            </p>
            <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0' }}>
              Tel: {companyInfo?.phone || '+27 11 234 5678'} | Email: {companyInfo?.email || 'info@ndanduleni.co.za'}
            </p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e293b', margin: '0', letterSpacing: '2px' }}>
            QUOTATION
          </h2>
          <p style={{ fontSize: '16px', color: '#059669', margin: '5px 0', fontWeight: 'bold' }}>
            #{quotation?.quotation_number}
          </p>
          <div style={{ marginTop: '15px', fontSize: '11px', color: '#64748b' }}>
            <p style={{ margin: '2px 0' }}>Date: {formatDate(quotation?.quotation_date)}</p>
            <p style={{ margin: '2px 0' }}>Valid Until: {formatDate(quotation?.valid_until)}</p>
          </div>
        </div>
      </div>

      {/* Client Info */}
      <div style={{ marginBottom: '30px', display: 'flex', gap: '40px' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
            Bill To:
          </h3>
          <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e293b', margin: '0' }}>
            {quotation?.client_name || quotation?.clients?.company_name}
          </p>
          {quotation?.client_email && (
            <p style={{ fontSize: '12px', color: '#64748b', margin: '3px 0' }}>
              {quotation.client_email}
            </p>
          )}
          {quotation?.client_phone && (
            <p style={{ fontSize: '12px', color: '#64748b', margin: '3px 0' }}>
              {quotation.client_phone}
            </p>
          )}
          <p style={{ fontSize: '12px', color: '#64748b', margin: '3px 0', whiteSpace: 'pre-line' }}>
            {quotation?.client_address}
          </p>
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
            Prepared By:
          </h3>
          <p style={{ fontSize: '14px', color: '#1e293b', margin: '0' }}>
            {quotation?.prepared_by_name || 'Sales Department'}
          </p>
          <p style={{ fontSize: '12px', color: '#64748b', margin: '3px 0' }}>
            Payment Terms: {quotation?.payment_terms || '30 Days'}
          </p>
        </div>
      </div>

      {/* Items Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
        <thead>
          <tr style={{ backgroundColor: '#059669', color: 'white' }}>
            <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', width: '5%' }}>#</th>
            <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', width: '40%' }}>Description</th>
            <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 'bold', width: '10%' }}>Qty</th>
            <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 'bold', width: '10%' }}>Unit</th>
            <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 'bold', width: '15%' }}>Unit Price</th>
            <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 'bold', width: '20%' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {items?.map((item, index) => (
            <tr key={item.id || index} style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '10px 12px', fontSize: '12px', color: '#64748b' }}>{index + 1}</td>
              <td style={{ padding: '10px 12px', fontSize: '12px', color: '#1e293b' }}>
                <p style={{ margin: '0', fontWeight: '500' }}>{item.description}</p>
                {item.notes && <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: '#94a3b8' }}>{item.notes}</p>}
              </td>
              <td style={{ padding: '10px 12px', fontSize: '12px', color: '#1e293b', textAlign: 'center' }}>{item.quantity}</td>
              <td style={{ padding: '10px 12px', fontSize: '12px', color: '#64748b', textAlign: 'center' }}>{item.unit}</td>
              <td style={{ padding: '10px 12px', fontSize: '12px', color: '#1e293b', textAlign: 'right' }}>{formatCurrency(item.unit_price)}</td>
              <td style={{ padding: '10px 12px', fontSize: '12px', color: '#1e293b', textAlign: 'right', fontWeight: '500' }}>{formatCurrency(item.total_price)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '30px' }}>
        <div style={{ width: '300px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e2e8f0', fontSize: '12px' }}>
            <span style={{ color: '#64748b' }}>Subtotal:</span>
            <span style={{ color: '#1e293b', fontWeight: '500' }}>{formatCurrency(quotation?.subtotal)}</span>
          </div>
          {quotation?.discount_amount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e2e8f0', fontSize: '12px' }}>
              <span style={{ color: '#64748b' }}>Discount:</span>
              <span style={{ color: '#ef4444' }}>-{formatCurrency(quotation?.discount_amount)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e2e8f0', fontSize: '12px' }}>
            <span style={{ color: '#64748b' }}>Tax (15% VAT):</span>
            <span style={{ color: '#1e293b' }}>{formatCurrency(quotation?.tax_amount)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontSize: '16px', fontWeight: 'bold', backgroundColor: '#f0fdf4', marginTop: '5px', borderRadius: '4px', paddingLeft: '15px', paddingRight: '15px' }}>
            <span style={{ color: '#059669' }}>TOTAL:</span>
            <span style={{ color: '#059669', fontSize: '18px' }}>{formatCurrency(quotation?.total_amount)}</span>
          </div>
        </div>
      </div>

      {/* Terms & Conditions */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
          Terms & Conditions
        </h3>
        <div style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
          {quotation?.terms_and_conditions || `1. This quotation is valid for 30 days from the date of issue.
2. Payment terms: 30 days from invoice date.
3. All prices include VAT at 15% where applicable.
4. Services will be rendered as per the agreed schedule.
5. Cancellation requires 30 days written notice.
6. Ndanduleni Group reserves the right to adjust pricing for any changes in scope.`}
        </div>
      </div>

      {/* Notes */}
      {quotation?.notes && (
        <div style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>Notes:</h3>
          <p style={{ fontSize: '11px', color: '#64748b', margin: '0', whiteSpace: 'pre-line' }}>{quotation.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div style={{ position: 'absolute', bottom: '20mm', left: '20mm', right: '20mm', borderTop: '1px solid #e2e8f0', paddingTop: '15px', textAlign: 'center' }}>
        <p style={{ fontSize: '10px', color: '#94a3b8', margin: '0' }}>
          Ndanduleni Group (Pty) Ltd | Reg: 2020/123456/07 | VAT: 4567890123
        </p>
        <p style={{ fontSize: '10px', color: '#94a3b8', margin: '3px 0' }}>
          {companyInfo?.address || '123 Main Street, Johannesburg, 2000'} | 
          Tel: {companyInfo?.phone || '+27 11 234 5678'}
        </p>
        <p style={{ fontSize: '10px', color: '#94a3b8', margin: '3px 0' }}>
          Thank you for your business!
        </p>
      </div>

      {/* Watermark */}
      <div style={{ 
        position: 'absolute', 
        top: '50%', 
        left: '50%', 
        transform: 'translate(-50%, -50%) rotate(-45deg)',
        fontSize: '60px',
        color: 'rgba(5, 150, 105, 0.03)',
        fontWeight: 'bold',
        pointerEvents: 'none',
        whiteSpace: 'nowrap'
      }}>
        {quotation?.status === 'draft' ? 'DRAFT' : 'NDANDULENI GROUP'}
      </div>
    </div>
  )
})

QuotationPDF.displayName = 'QuotationPDF'

export default QuotationPDF
