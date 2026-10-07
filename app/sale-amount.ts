export function normalizeSaleAmount(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') throw new Error('Enter a valid sale amount.');
  const text = value.trim();
  if (!text) return null;
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(text)) throw new Error('Use a non-negative amount with up to two decimal places (maximum 999,999,999,999.99).');
  const [whole, fraction = ''] = text.split('.');
  return `${whole.replace(/^0+(?=\d)/, '')}.${fraction.padEnd(2, '0')}`;
}
export function formatSaleAmount(value: string | null | undefined, currency: string) {
  if (value === null || value === undefined || value === '') return 'Not set';
  return `${currency} ${new Intl.NumberFormat('en-US', {minimumFractionDigits: currency === 'USD' ? 2 : 0, maximumFractionDigits: 2}).format(Number(value))}`;
}
