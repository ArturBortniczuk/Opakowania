export const parsePriceRaw = (val) => {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/\s/g, '').replace(',', '.');
  let parsed = parseFloat(cleaned);
  if (isNaN(parsed)) return 0;
  if (parsed > 100000) parsed = parsed / 1000000;
  return parsed;
};

export const getClientPrice = (drum) => {
  if (!drum) return 0;
  
  const clientPriceField = drum.cena_netto_klienta || drum.CENA_NETTO_KLIENTA;
  
  if (clientPriceField !== undefined && clientPriceField !== null) {
    return parsePriceRaw(clientPriceField);
  }
  
  // Fallback dla starszych wpisów bez zdefiniowanej ceny klienta
  const netPrice = parsePriceRaw(drum.cena_netto_bebna || drum.CENA_NETTO_BEBNA || drum.cena_netto);
  return netPrice > 0 ? netPrice * 1.2 : 0;
};
