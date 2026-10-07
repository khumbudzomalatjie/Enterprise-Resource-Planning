import { forwardRef } from 'react'

const InvoicePDF = forwardRef(({ invoice, items, companyInfo }, ref) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
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

  // Cap displayed items so the layout never spills to page 2
  const MAX_ITEMS = 6
  const displayItems = (items || []).slice(0, MAX_ITEMS)

  const statusLabel = (invoice?.status || 'draft')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())

  return (
    <div
      ref={ref}
      style={{
        width: '210mm',
        height: '297mm',
        padding: '10mm 12mm 12mm 12mm',
        background: '#ffffff',
        fontFamily: 'Inter, Arial, sans-serif',
        color: '#1e293b',
        position: 'relative',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}
    >
      {/* Top gradient bar */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: 'linear-gradient(90deg, #093047 0%, #0D5F89 50%, #0a8cc5 100%)'
      }}></div>

      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '8px',
        borderBottom: '1.5px solid #0D5F89',
        paddingBottom: '8px',
        paddingTop: '4px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '45px',
            height: '45px',
            borderRadius: '8px',
            border: '1.5px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            backgroundColor: '#ffffff',
            flexShrink: 0
          }}>
            <img
              src="/logo.png"
              alt="Logo"
              style={{ width: '37px', height: '37px', objectFit: 'contain' }}
              onError={(e) => {
                e.target.style.display = 'none'
                e.target.parentElement.innerHTML = '<span style="color:#1e293b;font-weight:bold;font-size:16px">NG</span>'
              }}
            />
          </div>
          <div>
            <h1 style={{ fontSize: '17px', fontWeight: 'bold', color: '#1e293b', margin: '0' }}>
              NDANDULENI GROUP
            </h1>
            <p style={{ fontSize: '9px', color: '#64748b', margin: '2px 0', fontStyle: 'italic' }}>
              Innovation Without End
            </p>
            <p style={{ fontSize: '8px', color: '#64748b', margin: '0', lineHeight: '1.3' }}>
              2220 Manthata Str, Ivory Park<br/>
              Tel: 070 419 9457 | accounts@ndandulenigroup.co.za
            </p>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#1e293b', margin: '0', letterSpacing: '2px' }}>
            INVOICE
          </h2>
          <div style={{
            marginTop: '4px',
            padding: '4px 12px',
            background: 'linear-gradient(135deg, #093047 0%, #0D5F89 100%)',
            borderRadius: '4px',
            display: 'inline-block'
          }}>
            <p style={{ fontSize: '13px', color: '#ffffff', margin: '0', fontWeight: 'bold' }}>
              {invoice?.invoice_number || 'INV-0001'}
            </p>
          </div>
          <div style={{ marginTop: '6px', fontSize: '8px', color: '#64748b' }}>
            <p style={{ margin: '1px 0' }}>Date: {formatDate(invoice?.invoice_date || new Date())}</p>
            <p style={{ margin: '1px 0' }}>Due: {formatDate(invoice?.due_date)}</p>
            {invoice?.status && (
              <p style={{ margin: '1px 0', fontWeight: 'bold', color: '#0D5F89', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {statusLabel}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Client Info + Bank Details */}
      <div style={{ marginBottom: '10px', display: 'flex', gap: '25px' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{
            fontSize: '9px',
            fontWeight: 'bold',
            color: '#093047',
            textTransform: 'uppercase',
            marginBottom: '3px',
            borderBottom: '1px solid #0D5F89',
            paddingBottom: '2px'
          }}>
            Bill To:
          </h3>
          <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e293b', margin: '0' }}>
            {invoice?.client_name || 'Client Name'}
          </p>
          {invoice?.client_email && (
            <p style={{ fontSize: '9px', color: '#64748b', margin: '1px 0' }}>{invoice.client_email}</p>
          )}
          {invoice?.client_phone && (
            <p style={{ fontSize: '9px', color: '#64748b', margin: '1px 0' }}>{invoice.client_phone}</p>
          )}
          {invoice?.client_address && (
            <p style={{ fontSize: '9px', color: '#64748b', margin: '1px 0', lineHeight: '1.3' }}>{invoice.client_address}</p>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{
            fontSize: '9px',
            fontWeight: 'bold',
            color: '#093047',
            textTransform: 'uppercase',
            marginBottom: '3px',
            borderBottom: '1px solid #0D5F89',
            paddingBottom: '2px'
          }}>
            Payment Details:
          </h3>
          <p style={{ fontSize: '10px', color: '#1e293b', margin: '0', fontWeight: '500' }}>
            EFT — Use invoice number as reference
          </p>
          <p style={{ fontSize: '8px', color: '#64748b', margin: '3px 0', lineHeight: '1.4' }}>
            <strong style={{ color: '#1e293b' }}>Bank:</strong> Capitec Business<br/>
            <strong style={{ color: '#1e293b' }}>Account:</strong> 1054498946<br/>
            <strong style={{ color: '#1e293b' }}>Branch:</strong> 450105<br/>
            <strong style={{ color: '#1e293b' }}>Ref:</strong> {invoice?.invoice_number || ''}
          </p>
        </div>
      </div>

      {/* Items Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px' }}>
        <thead>
          <tr style={{
            background: 'linear-gradient(90deg, #093047 0%, #0D5F89 100%)',
            color: 'white'
          }}>
            <th style={{ padding: '5px 8px', textAlign: 'left', fontSize: '9px', fontWeight: 'bold', borderRadius: '4px 0 0 0' }}>#</th>
            <th style={{ padding: '5px 8px', textAlign: 'left', fontSize: '9px', fontWeight: 'bold' }}>Description</th>
            <th style={{ padding: '5px 8px', textAlign: 'center', fontSize: '9px', fontWeight: 'bold' }}>Qty</th>
            <th style={{ padding: '5px 8px', textAlign: 'right', fontSize: '9px', fontWeight: 'bold' }}>Unit Price</th>
            <th style={{ padding: '5px 8px', textAlign: 'right', fontSize: '9px', fontWeight: 'bold', borderRadius: '0 4px 0 0' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {displayItems.length > 0 ? displayItems.map((item, index) => (
            <tr key={item.id || index} style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '4px 8px', fontSize: '9px', color: '#64748b' }}>{index + 1}</td>
              <td style={{ padding: '4px 8px', fontSize: '9px', color: '#1e293b', fontWeight: '500' }}>
                {item.description || 'Service'}
              </td>
              <td style={{ padding: '4px 8px', fontSize: '9px', color: '#1e293b', textAlign: 'center' }}>{item.quantity || 1}</td>
              <td style={{ padding: '4px 8px', fontSize: '9px', color: '#1e293b', textAlign: 'right' }}>{formatCurrency(item.unit_price)}</td>
              <td style={{ padding: '4px 8px', fontSize: '9px', color: '#1e293b', textAlign: 'right', fontWeight: '600' }}>
                {formatCurrency(item.total_price || (item.quantity * item.unit_price))}
              </td>
            </tr>
          )) : (
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '4px 8px', fontSize: '9px', color: '#64748b' }}>1</td>
              <td style={{ padding: '4px 8px', fontSize: '9px', color: '#1e293b', fontWeight: '500' }}>
                {invoice?.notes || 'Cleaning Service'}
              </td>
              <td style={{ padding: '4px 8px', fontSize: '9px', color: '#1e293b', textAlign: 'center' }}>1</td>
              <td style={{ padding: '4px 8px', fontSize: '9px', color: '#1e293b', textAlign: 'right' }}>{formatCurrency(invoice?.subtotal)}</td>
              <td style={{ padding: '4px 8px', fontSize: '9px', color: '#1e293b', textAlign: 'right', fontWeight: '600' }}>{formatCurrency(invoice?.subtotal)}</td>
            </tr>
          )}

          {(items || []).length > MAX_ITEMS && (
            <tr>
              <td colSpan="5" style={{ padding: '4px 8px', fontSize: '8px', color: '#64748b', textAlign: 'center', fontStyle: 'italic' }}>
                + {items.length - MAX_ITEMS} additional items on file
              </td>
            </tr>
          )}

          {/* Pad with empty rows so totals section stays anchored */}
          {displayItems.length < 3 && [...Array(3 - displayItems.length)].map((_, i) => (
            <tr key={`empty-${i}`} style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '4px 8px' }}>&nbsp;</td>
              <td style={{ padding: '4px 8px' }}></td>
              <td style={{ padding: '4px 8px' }}></td>
              <td style={{ padding: '4px 8px' }}></td>
              <td style={{ padding: '4px 8px' }}></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
        <div style={{ width: '230px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #e2e8f0', fontSize: '9px' }}>
            <span style={{ color: '#64748b' }}>Subtotal:</span>
            <span style={{ color: '#1e293b', fontWeight: '500' }}>{formatCurrency(invoice?.subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #e2e8f0', fontSize: '9px' }}>
            <span style={{ color: '#64748b' }}>VAT (15%):</span>
            <span style={{ color: '#1e293b' }}>{formatCurrency(invoice?.tax_amount)}</span>
          </div>
          {invoice?.amount_paid > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #e2e8f0', fontSize: '9px' }}>
              <span style={{ color: '#64748b' }}>Amount Paid:</span>
              <span style={{ color: '#0D5F89', fontWeight: '500' }}>-{formatCurrency(invoice.amount_paid)}</span>
            </div>
          )}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '8px 12px',
            fontSize: '13px',
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #093047 0%, #0D5F89 100%)',
            marginTop: '4px',
            borderRadius: '6px',
            color: 'white'
          }}>
            <span>{invoice?.amount_paid > 0 ? 'BALANCE DUE:' : 'TOTAL DUE:'}</span>
            <span style={{ fontSize: '15px' }}>
              {formatCurrency((invoice?.total_amount || 0) - (invoice?.amount_paid || 0))}
            </span>
          </div>
        </div>
      </div>

      {/* Notes (optional) */}
      {invoice?.notes && (
        <div style={{ marginTop: '8px' }}>
          <h3 style={{
            fontSize: '9px',
            fontWeight: 'bold',
            color: '#093047',
            textTransform: 'uppercase',
            marginBottom: '4px',
            borderBottom: '1px solid #0D5F89',
            paddingBottom: '2px'
          }}>
            Notes
          </h3>
          <p style={{ fontSize: '8px', color: '#475569', lineHeight: '1.5', margin: '0' }}>
            {invoice.notes}
          </p>
        </div>
      )}

      {/* Footer */}
      <div style={{
        position: 'absolute',
        bottom: '10mm',
        left: '12mm',
        right: '12mm',
        borderTop: '1px solid #e2e8f0',
        paddingTop: '5px',
        textAlign: 'center'
      }}>
        <p style={{ fontSize: '7px', color: '#64748b', margin: '0' }}>
          <strong style={{ color: '#1e293b' }}>Ndanduleni Group (Pty) Ltd</strong> | 2220 Manthata Str, Ivory Park | Tel: 070 419 9457 | accounts@ndandulenigroup.co.za
        </p>
        <p style={{ fontSize: '6.5px', color: '#94a3b8', margin: '1px 0' }}>
          Thank you for your business. Please reference the invoice number on all payments.
        </p>
      </div>

      {/* Bottom gradient bar */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '3px',
        background: 'linear-gradient(90deg, #093047 0%, #0D5F89 50%, #0a8cc5 100%)'
      }}></div>
    </div>
  )
})

InvoicePDF.displayName = 'InvoicePDF'

export default InvoicePDF
