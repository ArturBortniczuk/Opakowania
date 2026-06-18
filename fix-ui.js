const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'DrumsList.js');
let lines = fs.readFileSync(filePath, 'utf8').split('\n');

const uiInsertIdx = lines.findIndex(l => l.includes('<div className="flex gap-2">'));
if (uiInsertIdx !== -1) {
  const uiCode = `              <div className="relative min-w-[240px]" ref={paymentDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsPaymentDropdownOpen(!isPaymentDropdownOpen)}
                  className="w-full p-3 border border-gray-300 rounded-xl bg-white flex justify-between items-center focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm h-[46px]"
                >
                  <span className="truncate mr-2">
                    {filterPayment.length === 0 
                      ? 'Płatność (Wszystkie)' 
                      : \`Wybrano płatność: \${filterPayment.length}\`}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </button>

                {isPaymentDropdownOpen && (
                  <div className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-72 overflow-auto">
                    {[
                      { val: 'paid', label: 'Opłacone' },
                      { val: 'unpaid', label: 'Nieopłacone' },
                      { val: 'overdue', label: 'Nieopłacone po terminie' }
                    ].map(opt => (
                      <label 
                        key={opt.val} 
                        className="flex items-center px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={filterPayment.includes(opt.val)}
                          onChange={() => handlePaymentToggle(opt.val)}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <span className="ml-3 text-sm text-gray-700">{opt.label}</span>
                      </label>
                    ))}
                    {filterPayment.length > 0 && (
                      <div className="border-t border-gray-100 p-2">
                        <button
                          type="button"
                          onClick={() => { setFilterPayment([]); setPage(1); setIsPaymentDropdownOpen(false); }}
                          className="w-full text-center text-sm font-medium text-gray-500 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                          Wyczyść filtry
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
`;
  lines.splice(uiInsertIdx, 0, ...uiCode.split('\n').slice(0, -1));
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  console.log('UI injected.');
} else {
  console.log('Target not found!');
}
