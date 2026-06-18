const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'DrumsList.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add parsePaymentDate
content = content.replace(
  `  const priceRaw = parsePriceRaw(drum.cena_netto_bebna || drum.CENA_NETTO_BEBNA);\n  const clientPrice = priceRaw > 0 ? priceRaw * 1.2 : null;\n\n  const handleSaveNote = async (e) => {`,
  `  const priceRaw = parsePriceRaw(drum.cena_netto_bebna || drum.CENA_NETTO_BEBNA);\n  const clientPrice = priceRaw > 0 ? priceRaw * 1.2 : null;\n\n  const parsePaymentDate = (dateStr) => {\n    if (!dateStr) return null;\n    const parts = dateStr.split('.');\n    if (parts.length === 3) {\n      return new Date(parts[2], parts[1] - 1, parts[0]);\n    }\n    return new Date(dateStr);\n  };\n  const paymentDeadline = parsePaymentDate(drum.termin_platnosci);\n  const now = new Date();\n  now.setHours(0,0,0,0);\n  const isUnpaidOverdue = drum.czy_zaplacona === 'Nie' && paymentDeadline && paymentDeadline < now;\n\n  const handleSaveNote = async (e) => {`
);

// 2. Change minHeight from 480px to 520px
content = content.replace(`minHeight: '480px'`, `minHeight: '520px'`);

// 3. Add fields to UI
content = content.replace(
  `            <div className="flex justify-between items-center">\n              <span className="text-sm text-gray-500">Ilość kabla</span>\n              <span className="text-sm font-medium text-gray-900">\n                {drum.ilosc_kabla ? \`\${drum.ilosc_kabla} m\` : 'Brak informacji'}\n              </span>\n            </div>\n\n            {isUnpaidOverdue && (`,
  `            <div className="flex justify-between items-center">\n              <span className="text-sm text-gray-500">Ilość kabla</span>\n              <span className="text-sm font-medium text-gray-900">\n                {drum.ilosc_kabla ? \`\${drum.ilosc_kabla} m\` : 'Brak informacji'}\n              </span>\n            </div>\n\n            <div className="flex justify-between items-center">\n              <span className="text-sm text-gray-500">Opłacony?</span>\n              <span className={\`text-sm font-bold \${drum.czy_zaplacona === 'Tak' ? 'text-emerald-600' : 'text-rose-600'}\`}>\n                {drum.czy_zaplacona || 'Nie'}\n              </span>\n            </div>\n\n            <div className="flex justify-between items-center">\n              <span className="text-sm text-gray-500">Termin płatności</span>\n              <span className="text-sm font-medium text-gray-900">\n                {drum.termin_platnosci || 'Brak'}\n              </span>\n            </div>\n\n            {isUnpaidOverdue && (`
);

// 4. Add filterPayment state
content = content.replace(
  `  const [filterSize, setFilterSize] = useState([]);\n  const [availableSizes, setAvailableSizes] = useState([]);`,
  `  const [filterSize, setFilterSize] = useState([]);\n  const [filterPayment, setFilterPayment] = useState([]);\n  const [availableSizes, setAvailableSizes] = useState([]);`
);

// 5. Update dropdown states
content = content.replace(
  `  const [isSizeDropdownOpen, setIsSizeDropdownOpen] = useState(false);\n  const sizeDropdownRef = useRef(null);\n\n  useEffect(() => {\n    const handleClickOutside = (event) => {\n      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {\n        setIsStatusDropdownOpen(false);\n      }\n      if (sizeDropdownRef.current && !sizeDropdownRef.current.contains(event.target)) {\n        setIsSizeDropdownOpen(false);\n      }\n    };`,
  `  const [isSizeDropdownOpen, setIsSizeDropdownOpen] = useState(false);\n  const sizeDropdownRef = useRef(null);\n\n  const [isPaymentDropdownOpen, setIsPaymentDropdownOpen] = useState(false);\n  const paymentDropdownRef = useRef(null);\n\n  useEffect(() => {\n    const handleClickOutside = (event) => {\n      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {\n        setIsStatusDropdownOpen(false);\n      }\n      if (sizeDropdownRef.current && !sizeDropdownRef.current.contains(event.target)) {\n        setIsSizeDropdownOpen(false);\n      }\n      if (paymentDropdownRef.current && !paymentDropdownRef.current.contains(event.target)) {\n        setIsPaymentDropdownOpen(false);\n      }\n    };`
);

// 6. Add handlePaymentToggle
content = content.replace(
  `  const handleSizeToggle = (value) => {\n    setFilterSize(prev => {\n      const newSize = prev.includes(value) \n        ? prev.filter(s => s !== value)\n        : [...prev, value];\n      setPage(1);\n      return newSize;\n    });\n  };`,
  `  const handleSizeToggle = (value) => {\n    setFilterSize(prev => {\n      const newSize = prev.includes(value) \n        ? prev.filter(s => s !== value)\n        : [...prev, value];\n      setPage(1);\n      return newSize;\n    });\n  };\n\n  const handlePaymentToggle = (value) => {\n    setFilterPayment(prev => {\n      const newPayment = prev.includes(value) \n        ? prev.filter(s => s !== value)\n        : [...prev, value];\n      setPage(1);\n      return newPayment;\n    });\n  };`
);

// 7. Add logic to fetchDrums
content = content.replace(
  `      // 2b. Filtrowanie po Rozmiarze\n      if (filterSize.length > 0) {\n        filtered = filtered.filter(d => filterSize.includes(d.rozmiar_bebna));\n      }\n\n      // 3. Sortowanie`,
  `      // 2b. Filtrowanie po Rozmiarze\n      if (filterSize.length > 0) {\n        filtered = filtered.filter(d => filterSize.includes(d.rozmiar_bebna));\n      }\n\n      // 2c. Filtrowanie po płatności\n      if (filterPayment.length > 0) {\n        filtered = filtered.filter(d => {\n          const isPaid = d.czy_zaplacona === 'Tak';\n          if (filterPayment.includes('Tak') && isPaid) return true;\n          if (filterPayment.includes('Nie') && !isPaid) return true;\n          return false;\n        });\n      }\n\n      // 3. Sortowanie`
);

// 8. Update useEffect dependency
content = content.replace(
  `  useEffect(() => {\n    fetchDrums();\n  }, [user?.nip, page, sortBy, sortOrder, filterStatus, filterSize]); // Debounce search term ideally`,
  `  useEffect(() => {\n    fetchDrums();\n  }, [user?.nip, page, sortBy, sortOrder, filterStatus, filterSize, filterPayment]); // Debounce search term ideally`
);

// 9. Update UI class for flex wrap
content = content.replace(
  `          <div className="bg-white/80 backdrop-blur-lg rounded-xl p-6 shadow-lg border border-gray-200 relative z-20">\n            <div className="flex flex-col md:flex-row gap-4">\n              <div className="flex-1 relative">`,
  `          <div className="bg-white/80 backdrop-blur-lg rounded-xl p-6 shadow-lg border border-gray-200 relative z-20">\n            <div className="flex flex-col md:flex-row flex-wrap gap-4">\n              <div className="flex-1 min-w-[250px] relative">`
);

// 10. Add UI filter dropdown
content = content.replace(
  `              <div className="flex gap-2">\n                <button\n                  onClick={() => handleSort('data_zwrotu_do_dostawcy')}`,
  `              <div className="relative min-w-[180px]" ref={paymentDropdownRef}>\n                <button\n                  type="button"\n                  onClick={() => setIsPaymentDropdownOpen(!isPaymentDropdownOpen)}\n                  className="w-full p-3 border border-gray-300 rounded-xl bg-white flex justify-between items-center focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm h-[46px]"\n                >\n                  <span className="truncate mr-2">\n                    {filterPayment.length === 0 \n                      ? 'Płatność (Wszystkie)' \n                      : \`Wybrano płatność: \${filterPayment.length}\`}\n                  </span>\n                  <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />\n                </button>\n\n                {isPaymentDropdownOpen && (\n                  <div className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-72 overflow-auto">\n                    {['Tak', 'Nie'].map(val => (\n                      <label \n                        key={val} \n                        className="flex items-center px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors"\n                      >\n                        <input\n                          type="checkbox"\n                          checked={filterPayment.includes(val)}\n                          onChange={() => handlePaymentToggle(val)}\n                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"\n                        />\n                        <span className="ml-3 text-sm text-gray-700">{val === 'Tak' ? 'Opłacone' : 'Nieopłacone'}</span>\n                      </label>\n                    ))}\n                    {filterPayment.length > 0 && (\n                      <div className="border-t border-gray-100 p-2">\n                        <button\n                          type="button"\n                          onClick={() => { setFilterPayment([]); setPage(1); setIsPaymentDropdownOpen(false); }}\n                          className="w-full text-center text-sm font-medium text-gray-500 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50 transition-colors"\n                        >\n                          Wyczyść filtry\n                        </button>\n                      </div>\n                    )}\n                  </div>\n                )}\n              </div>\n\n              <div className="flex gap-2">\n                <button\n                  onClick={() => handleSort('data_zwrotu_do_dostawcy')}`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done replacing strings.');
