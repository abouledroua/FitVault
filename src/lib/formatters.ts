export function formatDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '—';
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return '—';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (error) {
    return '—';
  }
}

export function formatTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '—';
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return '—';
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  } catch (error) {
    return '—';
  }
}

export function formatDateTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '—';
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return '—';
    const d = formatDate(dateInput);
    const t = formatTime(dateInput);
    if (d === '—' || t === '—') return '—';
    return `${d} ${t}`;
  } catch (error) {
    return '—';
  }
}

/**
 * Formats a monetary amount by grouping each three digits with a space.
 * Examples:
 *   formatAmount(1000) => "1 000"
 *   formatAmount(1500000.5) => "1 500 000.50" (or "1 500 000,50")
 *   formatAmount("2500") => "2 500"
 */
export function formatAmount(
  amount: number | string | null | undefined,
  decimals: number | 'auto' = 'auto',
  decimalSeparator: string = '.'
): string {
  if (amount === null || amount === undefined || amount === '') return '0';
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount));
  if (isNaN(num)) return '0';

  let formattedNumberStr: string;
  if (decimals === 'auto') {
    // If integer, don't force .00, but if decimal, format cleanly with up to 2 decimal places
    if (Number.isInteger(num)) {
      formattedNumberStr = num.toString();
    } else {
      formattedNumberStr = num.toFixed(2);
    }
  } else {
    formattedNumberStr = num.toFixed(decimals);
  }

  const [integerPart, decimalPart] = formattedNumberStr.split('.');
  // Add space separator every three digits from right to left
  const withSpaces = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  if (decimalPart !== undefined) {
    return `${withSpaces}${decimalSeparator}${decimalPart}`;
  }
  return withSpaces;
}

/**
 * Formats money with the "DA" currency symbol.
 * Example: formatCurrency(2500) => "2 500 DA"
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  decimals: number | 'auto' = 'auto'
): string {
  return `${formatAmount(amount, decimals)} DA`;
}

