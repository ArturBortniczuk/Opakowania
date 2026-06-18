const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'DrumsList.js');
let content = fs.readFileSync(filePath, 'utf8');

// Ensure filterPayment state exists
if (!content.includes('const [filterPayment, setFilterPayment]')) {
  content = content.replace(
    /const \[filterSize, setFilterSize\] = useState\(\[\]\);/g,
    'const [filterSize, setFilterSize] = useState([]);\n  const [filterPayment, setFilterPayment] = useState([]);'
  );
}

// Ensure filterPayment is in useEffect
if (!content.includes('filterPayment]')) {
  content = content.replace(
    /\[user\?\.nip, page, sortBy, sortOrder, filterStatus, filterSize\]/g,
    '[user?.nip, page, sortBy, sortOrder, filterStatus, filterSize, filterPayment]'
  );
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed undefined variables.');
