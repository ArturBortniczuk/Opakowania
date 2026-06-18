const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'DrumsList.js');
let lines = fs.readFileSync(filePath, 'utf8').split('\n');

// 1. Add state for payment dropdown
const sizeRefIdx = lines.findIndex(l => l.includes('const sizeDropdownRef = useRef(null);'));
if (sizeRefIdx !== -1 && !lines[sizeRefIdx + 1].includes('isPaymentDropdownOpen')) {
  lines.splice(sizeRefIdx + 1, 0, 
    '  const [isPaymentDropdownOpen, setIsPaymentDropdownOpen] = useState(false);',
    '  const paymentDropdownRef = useRef(null);'
  );
}

// 2. Add handleClickOutside for payment dropdown
const clickOutsideEndIdx = lines.findIndex(l => l.includes('if (sizeDropdownRef.current && !sizeDropdownRef.current.contains(event.target)) {'));
if (clickOutsideEndIdx !== -1) {
  // It spans 3 lines, so we insert after clickOutsideEndIdx + 3
  const insertIdx = clickOutsideEndIdx + 3;
  if (!lines[insertIdx].includes('paymentDropdownRef')) {
    lines.splice(insertIdx, 0,
      '      if (paymentDropdownRef.current && !paymentDropdownRef.current.contains(event.target)) {',
      '        setIsPaymentDropdownOpen(false);',
      '      }'
    );
  }
}

// 3. Add handlePaymentToggle
const handleSizeEndIdx = lines.findIndex(l => l.includes('const handleSizeToggle = (value) => {'));
if (handleSizeEndIdx !== -1) {
  // Finds the end of the handleSizeToggle block
  let endIdx = handleSizeEndIdx;
  let braces = 0;
  for (let i = handleSizeEndIdx; i < lines.length; i++) {
    if (lines[i].includes('{')) braces += (lines[i].match(/{/g) || []).length;
    if (lines[i].includes('}')) braces -= (lines[i].match(/}/g) || []).length;
    if (braces === 0 && i > handleSizeEndIdx) {
      endIdx = i;
      break;
    }
  }
  
  if (endIdx !== handleSizeEndIdx && !lines[endIdx + 2].includes('handlePaymentToggle')) {
    const code = `
  const handlePaymentToggle = (value) => {
    setFilterPayment(prev => {
      const newPayment = prev.includes(value) 
        ? prev.filter(s => s !== value)
        : [...prev, value];
      setPage(1);
      return newPayment;
    });
  };`;
    lines.splice(endIdx + 1, 0, ...code.split('\n'));
  }
}

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('Fixed missing bindings.');
