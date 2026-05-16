/**
 * Normalizes an email address for lookups and uniqueness.
 */
export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
})

export function formatCurrency(amount: number) {
  return inr.format(amount)
}

export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso))
}
