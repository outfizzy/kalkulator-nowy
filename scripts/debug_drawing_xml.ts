
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as cp from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const XLSX_PATH = path.resolve(rootDir, 'imports', 'Aluxe Preisliste UPE 2026_DE.xlsx');

const run = async () => {
    // Unzip to temp
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aluxe-debug-xml-'));
    console.log(`Extracting to: ${tempDir}`);
    cp.execSync(`unzip -q "${XLSX_PATH}" -d "${tempDir}"`);

    // 1. Check valid sheets -> drawing mapping
    // usually in xl/worksheets/_rels/sheetX.xml.rels
    // Let's look at sheet1.xml.rels (assuming sheet1 is a Material sheet with images?)
    // Wait, audit showed "Materialien Orangeline" is sheet #??
    // Let's just look for ANY rels that point to drawings.

    const relsDir = path.join(tempDir, 'xl', 'worksheets', '_rels');
    if (fs.existsSync(relsDir)) {
        const rels = fs.readdirSync(relsDir);
        console.log(`Found ${rels.length} sheet relationships.`);
        // Inspect one
        const sampleRel = path.join(relsDir, rels[0]);
        console.log(`--- Content of ${rels[0]} ---`);
        console.log(fs.readFileSync(sampleRel, 'utf-8'));
    }

    // 2. Check Drawing XML
    // xl/drawings/drawing1.xml
    const drawingDir = path.join(tempDir, 'xl', 'drawings');
    if (fs.existsSync(drawingDir)) {
        const drawings = fs.readdirSync(drawingDir).filter(f => f.endsWith('.xml'));
        console.log(`\nFound ${drawings.length} drawing files.`);
        if (drawings.length > 0) {
            const sampleDrawing = path.join(drawingDir, drawings[0]);
            console.log(`--- Content of ${drawings[0]} (First 1000 chars) ---`);
            console.log(fs.readFileSync(sampleDrawing, 'utf-8').slice(0, 1000));
        }
    }

    // 3. Check Drawing Rels (to find image filename)
    // xl/drawings/_rels/drawing1.xml.rels
    const drawingRelsDir = path.join(drawingDir, '_rels');
    if (fs.existsSync(drawingRelsDir)) {
        const dRels = fs.readdirSync(drawingRelsDir);
        console.log(`\nFound ${dRels.length} drawing rels.`);
        if (dRels.length > 0) {
            const sampleDRel = path.join(drawingRelsDir, dRels[0]);
            console.log(`--- Content of ${dRels[0]} ---`);
            console.log(fs.readFileSync(sampleDRel, 'utf-8'));
        }
    }

    fs.rmSync(tempDir, { recursive: true, force: true });
};

run();
