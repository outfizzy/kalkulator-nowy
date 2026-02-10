import XLSX from 'xlsx';
const wb = XLSX.readFile('AluxePreisliste.xlsx');
const sheetName = wb.SheetNames.find(s => s.includes('Schiebetür'));
if (!sheetName) {
    console.log('Sheet not found. Available:', wb.SheetNames.filter(s => s.toLowerCase().includes('schieb')));
    process.exit(1);
}
console.log('Found sheet:', sheetName);
const sheet = wb.Sheets[sheetName];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0, defval: null });
console.log('=== SchiebetürR Sheet Data ===');
rows.slice(0, 15).forEach((r, i) => console.log('Row', i, ':', JSON.stringify(r)));
