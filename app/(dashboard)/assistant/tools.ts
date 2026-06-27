// Read-only AI assistant tools.
// Server-only — imported exclusively by actions.ts which has 'use server'.
// Zero mutations: no insert/update/delete/upsert/rpc/revalidatePath.

import { getCurrentRole } from '@/lib/current-user'
import { can } from '@/lib/permissions'
import { createAdminClient } from '@/lib/supabase/admin'

const CO = process.env.DEMO_COMPANY_ID!
const LIMIT = 50

// ─── Anthropic tool schemas ───────────────────────────────────────────────────

export const TOOL_SCHEMAS = [
  {
    name: 'get_products',
    description:
      'List active products with name, SKU, unit, category, sale price and minimum quantity. Use for questions about what products exist, their prices, units, or categories.',
    input_schema: {
      type: 'object' as const,
      properties: {
        search: {
          type: 'string',
          description: 'Optional: filter by product name or SKU (case-insensitive partial match)',
        },
      },
    },
  },
  {
    name: 'get_inventory',
    description:
      'Get available stock quantities by product and location. Use for "how many X do we have", "where is product Y", or warehouse-specific questions.',
    input_schema: {
      type: 'object' as const,
      properties: {
        product_name: {
          type: 'string',
          description: 'Optional: filter by product name (partial match)',
        },
        warehouse_name: {
          type: 'string',
          description: 'Optional: filter by warehouse name (partial match)',
        },
      },
    },
  },
  {
    name: 'get_low_stock',
    description:
      'List products whose available quantity is below their minimum quantity threshold. Use for "what needs restocking", "what is running low".',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'get_movements',
    description:
      'Get recent stock movement history (IN/OUT/TRANSFER). Use for "what movements did product X have", "recent stock activity", or movement audit questions.',
    input_schema: {
      type: 'object' as const,
      properties: {
        product_name: {
          type: 'string',
          description: 'Optional: filter by product name (partial match)',
        },
        movement_type: {
          type: 'string',
          enum: ['IN', 'OUT', 'TRANSFER'],
          description: 'Optional: filter by movement type',
        },
        limit: {
          type: 'number',
          description: 'Max rows to return (default 20, max 50)',
        },
      },
    },
  },
  {
    name: 'get_deliveries',
    description:
      'List incoming deliveries and their statuses. Use for "which deliveries are pending", "expected deliveries", or supplier delivery questions.',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: {
          type: 'string',
          description: 'Optional: filter by status (expected, partially_received, received, cancelled)',
        },
        supplier_name: {
          type: 'string',
          description: 'Optional: filter by supplier name (partial match)',
        },
      },
    },
  },
  {
    name: 'get_orders',
    description:
      'List outgoing orders and their statuses. Use for "which orders are open", "orders for customer X", or order fulfilment questions.',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: {
          type: 'string',
          description: 'Optional: filter by status (draft, open, fulfilled, cancelled)',
        },
        customer_name: {
          type: 'string',
          description: 'Optional: filter by customer name (partial match)',
        },
      },
    },
  },
  {
    name: 'get_customers',
    description:
      'List customers with contact and billing details. Use for "who are our customers", "customer details for X", or invoice recipient questions.',
    input_schema: {
      type: 'object' as const,
      properties: {
        search: {
          type: 'string',
          description: 'Optional: filter by customer name, email, or EIK (partial match)',
        },
        status: {
          type: 'string',
          enum: ['active', 'inactive'],
          description: 'Optional: filter by status',
        },
      },
    },
  },
  {
    name: 'get_invoices',
    description:
      'List invoices filtered by document status or payment status. Use for "unpaid invoices", "draft invoices", "issued invoices", or invoice payment questions.',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: {
          type: 'string',
          enum: ['draft', 'issued', 'cancelled'],
          description: 'Optional: filter by invoice document status',
        },
        payment_status: {
          type: 'string',
          enum: ['unpaid', 'partially_paid', 'paid'],
          description: 'Optional: filter by payment status',
        },
        customer_name: {
          type: 'string',
          description: 'Optional: filter by customer name (partial match)',
        },
      },
    },
  },
  {
    name: 'get_invoice_detail',
    description:
      'Get full detail of a single invoice: line items, totals, payments, and linked order. Use when asked about a specific invoice by number.',
    input_schema: {
      type: 'object' as const,
      properties: {
        invoice_number: {
          type: 'string',
          description: 'The invoice number to look up (exact match)',
        },
      },
      required: ['invoice_number'],
    },
  },
  {
    name: 'get_stock_value',
    description:
      'Calculate the estimated total inventory value (quantity × cost price). Use for "total stock value", "how much is our inventory worth".',
    input_schema: { type: 'object' as const, properties: {} },
  },
]

// ─── Tool execution dispatcher ────────────────────────────────────────────────

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
): Promise<unknown> {
  try {
    switch (name) {
      case 'get_products':
        return await getProducts(input.search as string | undefined)
      case 'get_inventory':
        return await getInventory(
          input.product_name as string | undefined,
          input.warehouse_name as string | undefined,
        )
      case 'get_low_stock':
        return await getLowStock()
      case 'get_movements':
        return await getMovements(
          input.product_name as string | undefined,
          input.movement_type as 'IN' | 'OUT' | 'TRANSFER' | undefined,
          typeof input.limit === 'number' ? Math.min(input.limit, LIMIT) : 20,
        )
      case 'get_deliveries':
        return await getDeliveries(
          input.status as string | undefined,
          input.supplier_name as string | undefined,
        )
      case 'get_orders':
        return await getOrders(
          input.status as string | undefined,
          input.customer_name as string | undefined,
        )
      case 'get_customers':
        return await getCustomers(
          input.search as string | undefined,
          input.status as 'active' | 'inactive' | undefined,
        )
      case 'get_invoices':
        return await getInvoices(
          input.status as string | undefined,
          input.payment_status as string | undefined,
          input.customer_name as string | undefined,
        )
      case 'get_invoice_detail':
        return await getInvoiceDetail(input.invoice_number as string)
      case 'get_stock_value':
        return await getStockValue()
      default:
        return { error: `Unknown tool: ${name}` }
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Tool execution failed' }
  }
}

// ─── Individual tool functions ────────────────────────────────────────────────

async function getProducts(search?: string) {
  const role = await getCurrentRole()
  if (!can(role, 'view_products')) throw new Error('Unauthorized: view_products required')

  const sb = createAdminClient()
  const { data, error } = await sb
    .from('products')
    .select('name, sku, unit, category, sale_price, min_quantity, status')
    .eq('company_id', CO)
    .eq('status', 'active')
    .order('name')
    .limit(LIMIT)

  if (error) throw new Error(error.message)

  let products = data ?? []
  if (search) {
    const q = search.toLowerCase()
    products = products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku ?? '').toLowerCase().includes(q),
    )
  }

  return {
    products: products.map((p) => ({
      name: p.name,
      sku: p.sku ?? null,
      unit: p.unit,
      category: p.category ?? null,
      sale_price: p.sale_price ?? null,
      min_quantity: p.min_quantity ?? 0,
    })),
    count: products.length,
    limited: (data?.length ?? 0) === LIMIT,
    limit: LIMIT,
  }
}

async function getInventory(product_name?: string, warehouse_name?: string) {
  const role = await getCurrentRole()
  if (!can(role, 'view_inventory')) throw new Error('Unauthorized: view_inventory required')

  const sb = createAdminClient()
  const { data, error } = await sb
    .from('inventory_balances')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .select('quantity_available, products(name, unit), locations(code, warehouses(name))' as any)
    .eq('company_id', CO)
    .gt('quantity_available', 0)
    .order('quantity_available', { ascending: false })
    .limit(LIMIT)

  if (error) throw new Error(error.message)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rows = (data ?? []) as any[]

  if (product_name) {
    const q = product_name.toLowerCase()
    rows = rows.filter((r) =>
      (r.products?.name ?? '').toLowerCase().includes(q),
    )
  }
  if (warehouse_name) {
    const q = warehouse_name.toLowerCase()
    rows = rows.filter((r) =>
      (r.locations?.warehouses?.name ?? '').toLowerCase().includes(q),
    )
  }

  return {
    inventory: rows.map((r) => ({
      product: r.products?.name ?? 'Unknown',
      unit: r.products?.unit ?? '',
      quantity_available: Number(r.quantity_available),
      location: r.locations?.code ?? 'Unknown',
      warehouse: r.locations?.warehouses?.name ?? 'Unknown',
    })),
    count: rows.length,
    limited: (data?.length ?? 0) === LIMIT,
    limit: LIMIT,
  }
}

async function getLowStock() {
  const role = await getCurrentRole()
  if (!can(role, 'view_inventory')) throw new Error('Unauthorized: view_inventory required')

  const sb = createAdminClient()

  // Fetch all products with min_quantity > 0
  const { data: products, error: pErr } = await sb
    .from('products')
    .select('id, name, unit, category, min_quantity')
    .eq('company_id', CO)
    .eq('status', 'active')
    .gt('min_quantity', 0)

  if (pErr) throw new Error(pErr.message)

  // Fetch inventory balances
  const { data: balances, error: bErr } = await sb
    .from('inventory_balances')
    .select('product_id, quantity_available')
    .eq('company_id', CO)

  if (bErr) throw new Error(bErr.message)

  // Aggregate available qty by product
  const qtyByProduct = new Map<string, number>()
  for (const b of balances ?? []) {
    qtyByProduct.set(
      b.product_id,
      (qtyByProduct.get(b.product_id) ?? 0) + Number(b.quantity_available),
    )
  }

  const lowStock = (products ?? [])
    .map((p) => ({
      name: p.name,
      unit: p.unit,
      category: p.category ?? null,
      available: qtyByProduct.get(p.id) ?? 0,
      min_quantity: Number(p.min_quantity),
      shortage: Number(p.min_quantity) - (qtyByProduct.get(p.id) ?? 0),
    }))
    .filter((p) => p.available < p.min_quantity)
    .sort((a, b) => b.shortage - a.shortage)
    .slice(0, LIMIT)

  return {
    low_stock_products: lowStock,
    count: lowStock.length,
  }
}

async function getMovements(
  product_name?: string,
  movement_type?: 'IN' | 'OUT' | 'TRANSFER',
  limit = 20,
) {
  const role = await getCurrentRole()
  if (!can(role, 'view_movements')) throw new Error('Unauthorized: view_movements required')

  const sb = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = sb
    .from('stock_movements')
    .select('movement_type, quantity, created_at, note, reference_type, products(name)')
    .eq('company_id', CO)
    .order('created_at', { ascending: false })
    .limit(Math.min(limit, LIMIT))

  if (movement_type) query = query.eq('movement_type', movement_type)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rows = (data ?? []) as any[]

  if (product_name) {
    const q = product_name.toLowerCase()
    rows = rows.filter((r) =>
      (r.products?.name ?? '').toLowerCase().includes(q),
    )
  }

  return {
    movements: rows.map((r) => ({
      type: r.movement_type,
      product: r.products?.name ?? 'Unknown',
      quantity: Number(r.quantity),
      date: r.created_at?.split('T')[0] ?? null,
      reference: r.reference_type ?? null,
      note: r.note ?? null,
    })),
    count: rows.length,
    limited: rows.length >= LIMIT,
    limit: LIMIT,
  }
}

async function getDeliveries(status?: string, supplier_name?: string) {
  // No dedicated view_deliveries permission — all authenticated roles can view deliveries
  await getCurrentRole() // ensures authentication

  const sb = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = sb
    .from('incoming_deliveries')
    .select('delivery_number, status, expected_date, received_date, note, suppliers(name)')
    .eq('company_id', CO)
    .order('created_at', { ascending: false })
    .limit(LIMIT)

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let deliveries = (data ?? []) as any[]

  if (supplier_name) {
    const q = supplier_name.toLowerCase()
    deliveries = deliveries.filter((d) =>
      (d.suppliers?.name ?? '').toLowerCase().includes(q),
    )
  }

  return {
    deliveries: deliveries.map((d) => ({
      delivery_number: d.delivery_number,
      status: d.status,
      supplier: d.suppliers?.name ?? null,
      expected_date: d.expected_date ?? null,
      received_date: d.received_date ?? null,
    })),
    count: deliveries.length,
    limited: (data?.length ?? 0) === LIMIT,
    limit: LIMIT,
  }
}

async function getOrders(status?: string, customer_name?: string) {
  // No dedicated view_orders permission — all authenticated roles can view orders
  await getCurrentRole() // ensures authentication

  const sb = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = sb
    .from('outgoing_orders')
    .select('order_number, customer_name, status, order_date, expected_date, issued_date')
    .eq('company_id', CO)
    .order('created_at', { ascending: false })
    .limit(LIMIT)

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let orders = (data ?? []) as any[]

  if (customer_name) {
    const q = customer_name.toLowerCase()
    orders = orders.filter((o) =>
      (o.customer_name ?? '').toLowerCase().includes(q),
    )
  }

  return {
    orders: orders.map((o) => ({
      order_number: o.order_number,
      customer: o.customer_name ?? null,
      status: o.status,
      order_date: o.order_date ?? null,
      expected_date: o.expected_date ?? null,
      issued_date: o.issued_date ?? null,
    })),
    count: orders.length,
    limited: (data?.length ?? 0) === LIMIT,
    limit: LIMIT,
  }
}

async function getCustomers(search?: string, status?: 'active' | 'inactive') {
  const role = await getCurrentRole()
  if (!can(role, 'view_customers')) throw new Error('Unauthorized: view_customers required')

  const sb = createAdminClient()
  const { data, error } = await sb
    .from('customers')
    .select('name, email, phone, address, eik, vat_number, mol, status')
    .eq('company_id', CO)
    .eq('status', status ?? 'active')
    .order('name')
    .limit(LIMIT)

  if (error) throw new Error(error.message)

  let customers = data ?? []
  if (search) {
    const q = search.toLowerCase()
    customers = customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q) ||
        (c.eik ?? '').toLowerCase().includes(q),
    )
  }

  return {
    customers: customers.map((c) => ({
      name: c.name,
      email: c.email ?? null,
      phone: c.phone ?? null,
      address: c.address ?? null,
      eik: c.eik ?? null,
      vat_number: c.vat_number ?? null,
      mol: c.mol ?? null,
      status: c.status,
    })),
    count: customers.length,
    limited: (data?.length ?? 0) === LIMIT,
    limit: LIMIT,
  }
}

async function getInvoices(
  status?: string,
  payment_status?: string,
  customer_name?: string,
) {
  const role = await getCurrentRole()
  if (!can(role, 'view_invoices')) throw new Error('Unauthorized: view_invoices required')

  const sb = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = sb
    .from('invoices')
    .select('invoice_number, status, payment_status, total, amount_paid, invoice_date, due_date, customers(name)')
    .eq('company_id', CO)
    .order('created_at', { ascending: false })
    .limit(LIMIT)

  if (status)         query = query.eq('status', status)
  if (payment_status) query = query.eq('payment_status', payment_status)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let invoices = (data ?? []) as any[]

  if (customer_name) {
    const q = customer_name.toLowerCase()
    invoices = invoices.filter((inv) =>
      (inv.customers?.name ?? '').toLowerCase().includes(q),
    )
  }

  return {
    invoices: invoices.map((inv) => ({
      invoice_number: inv.invoice_number,
      customer: inv.customers?.name ?? null,
      status: inv.status,
      payment_status: inv.payment_status,
      total: Number(inv.total),
      amount_paid: Number(inv.amount_paid ?? 0),
      balance_due: Math.max(0, Math.round((Number(inv.total) - Number(inv.amount_paid ?? 0)) * 100) / 100),
      invoice_date: inv.invoice_date ?? null,
      due_date: inv.due_date ?? null,
    })),
    count: invoices.length,
    limited: (data?.length ?? 0) === LIMIT,
    limit: LIMIT,
  }
}

async function getInvoiceDetail(invoice_number: string) {
  const role = await getCurrentRole()
  if (!can(role, 'view_invoices')) throw new Error('Unauthorized: view_invoices required')

  const sb = createAdminClient()

  const { data: inv, error: invErr } = await sb
    .from('invoices')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .select('*, customers(name), outgoing_orders(order_number)' as any)
    .eq('company_id', CO)
    .eq('invoice_number', invoice_number)
    .single()

  if (invErr || !inv) {
    return { error: `Invoice ${invoice_number} not found` }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const invoice = inv as any

  const [{ data: items }, { data: payments }] = await Promise.all([
    sb
      .from('invoice_items')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .select('description, quantity, unit_price, amount, products(name)' as any)
      .eq('invoice_id', invoice.id)
      .eq('company_id', CO)
      .order('created_at', { ascending: true }),
    sb
      .from('invoice_payments')
      .select('amount, payment_date, payment_method')
      .eq('invoice_id', invoice.id)
      .eq('company_id', CO)
      .order('payment_date', { ascending: true }),
  ])

  return {
    invoice_number: invoice.invoice_number,
    customer: invoice.customers?.name ?? null,
    status: invoice.status,
    payment_status: invoice.payment_status,
    invoice_date: invoice.invoice_date,
    due_date: invoice.due_date ?? null,
    subtotal: Number(invoice.subtotal),
    vat_rate: Number(invoice.vat_rate),
    vat_amount: Number(invoice.vat_amount),
    total: Number(invoice.total),
    amount_paid: Number(invoice.amount_paid ?? 0),
    balance_due: Math.max(0, Math.round((Number(invoice.total) - Number(invoice.amount_paid ?? 0)) * 100) / 100),
    linked_order: invoice.outgoing_orders?.order_number ?? null,
    note: invoice.note ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items: (items ?? []).map((item: any) => ({
      description: item.description,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      amount: Number(item.amount),
      product: item.products?.name ?? null,
    })),
    payments: (payments ?? []).map((p) => ({
      amount: Number(p.amount),
      date: p.payment_date,
      method: p.payment_method,
    })),
  }
}

async function getStockValue() {
  const role = await getCurrentRole()
  if (!can(role, 'view_inventory')) throw new Error('Unauthorized: view_inventory required')

  const sb = createAdminClient()
  const { data, error } = await sb
    .from('inventory_balances')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .select('quantity_available, products(name, cost_price)' as any)
    .eq('company_id', CO)

  if (error) throw new Error(error.message)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let totalValue = 0
  let itemsWithPrice = 0
  let itemsWithoutPrice = 0

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (data ?? []) as any[]) {
    const qty = Number(row.quantity_available ?? 0)
    const price = Number(row.products?.cost_price ?? 0)
    if (price > 0) {
      totalValue += qty * price
      itemsWithPrice++
    } else {
      itemsWithoutPrice++
    }
  }

  return {
    total_value: Math.round(totalValue * 100) / 100,
    currency: 'EUR',
    items_with_price: itemsWithPrice,
    items_without_price: itemsWithoutPrice,
    note: itemsWithoutPrice > 0
      ? `Estimate based on cost price × available quantity. ${itemsWithoutPrice} position(s) have no cost price and are excluded.`
      : 'Estimate based on cost price × available quantity.',
  }
}
