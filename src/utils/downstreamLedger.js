import { ACCOUNTING_SUB_NAV } from '../config/accountingNav.js'

export function parseDownstreamLedgerTypes(row) {
  if (!row || row.ledger_types == null || row.ledger_types === '') return ['funds']
  try {
    const p = typeof row.ledger_types === 'string' ? JSON.parse(row.ledger_types) : row.ledger_types
    return Array.isArray(p) && p.length ? p : ['funds']
  } catch {
    return ['funds']
  }
}

export function ledgerTypeLabel(id) {
  return ACCOUNTING_SUB_NAV.find(s => s.id === id)?.label ?? id
}
