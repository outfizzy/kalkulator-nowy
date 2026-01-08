
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as cp from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const XLSX_PATH = path.resolve(rootDir, 'imports', 'Aluxe Preisliste UPE 2026_DE.xlsx');
const IMAGE_MAP_PATH = path.resolve(rootDir, 'scripts', 'image_map.json');

const run = async () => {
    console.log('--- Image Mapping ---');
    if (!fs.existsSync(IMAGE_MAP_PATH)) {
        console.error('image_map.json not found! Run extract_images.ts first.');
        process.exit(1);
    }
    const filenameToUrl = JSON.parse(fs.readFileSync(IMAGE_MAP_PATH, 'utf-8'));

    // Unzip to temp
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aluxe-map-'));
    console.log(`Extracting to: ${tempDir}`);
    cp.execSync(`unzip -q "${XLSX_PATH}" -d "${tempDir}"`);

    // --- Helpers ---
    const readFile = (p: string) => fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : null;

    // --- 1. Map Sheet Name -> rID (workbook.xml) ---
    const workbookXml = readFile(path.join(tempDir, 'xl', 'workbook.xml'));
    if (!workbookXml) throw new Error('workbook.xml not found');

    const sheetNameMap: Record<string, string> = {}; // rId -> SheetName
    const sheetMatches = workbookXml.matchAll(/<sheet [^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g);
    for (const m of sheetMatches) {
        sheetNameMap[m[2]] = m[1];
    }
    console.log(`Found ${Object.keys(sheetNameMap).length} sheets.`);

    // --- 2. Map rID -> Target File (workbook.xml.rels) ---
    const workbookRels = readFile(path.join(tempDir, 'xl', '_rels', 'workbook.xml.rels'));
    if (!workbookRels) throw new Error('workbook.xml.rels not found');

    const sheetFileMap: Record<string, string> = {}; // SheetName -> "worksheets/sheet1.xml"
    const relMatches = workbookRels.matchAll(/<Relationship [^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g);
    for (const m of relMatches) {
        const rId = m[1];
        const target = m[2];
        const name = sheetNameMap[rId];
        if (name) sheetFileMap[name] = target;
    }

    // --- 3. Process each Sheet ---
    const finalMap: Record<string, Record<number, string>> = {}; // SheetName -> RowIndex -> URL

    for (const [sheetName, sheetFileRaw] of Object.entries(sheetFileMap)) {
        // Target is typically "worksheets/sheet1.xml", but relative to xl/
        // If it starts with "/" strip it.
        const sheetFile = sheetFileRaw.startsWith('/') ? sheetFileRaw.substring(1) : sheetFileRaw;

        // Find sheet rels: xl/worksheets/_rels/sheet1.xml.rels
        const sheetFileName = path.basename(sheetFile);
        const sheetRelsPath = path.join(tempDir, 'xl', 'worksheets', '_rels', `${sheetFileName}.rels`);
        const sheetRelsXml = readFile(sheetRelsPath);

        if (!sheetRelsXml) continue; // No rels -> No drawings

        // Find Drawing Target
        // <Relationship ... Type=".../drawing" Target="../drawings/drawing1.xml" />
        const drawingMatch = sheetRelsXml.match(/<Relationship [^>]*Type="[^"]*\/drawing"[^>]*Target="([^"]+)"/);
        if (!drawingMatch) continue;

        const drawingTargetRaw = drawingMatch[1]; // "../drawings/drawing1.xml"
        const drawingFileName = path.basename(drawingTargetRaw);

        // --- 4. Process Drawing ---
        const drawingPath = path.join(tempDir, 'xl', 'drawings', drawingFileName);
        const drawingRelsPath = path.join(tempDir, 'xl', 'drawings', '_rels', `${drawingFileName}.rels`);

        const drawingXml = readFile(drawingPath);
        const drawingRelsXml = readFile(drawingRelsPath);

        if (!drawingXml || !drawingRelsXml) continue;

        // Map rId -> Image Filename (from Drawing Rels)
        const embedMap: Record<string, string> = {}; // rId -> "image1.png"
        const dRelMatches = drawingRelsXml.matchAll(/<Relationship [^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g);
        for (const m of dRelMatches) {
            const rId = m[1];
            const target = m[2]; // "../media/image1.png"
            embedMap[rId] = path.basename(target);
        }

        // Map Anchor -> Row -> EmbedId (from Drawing XML)
        // Structure: <xdr:twoCellAnchor> ... <xdr:from>...<xdr:row>ROW</xdr:row> ... <a:blip r:embed="rId" ... </xdr:twoCellAnchor>
        // Use regex carefully. Split by anchor to handle multiple.

        if (!finalMap[sheetName]) finalMap[sheetName] = {};

        const anchors = drawingXml.split('</xdr:twoCellAnchor>');
        // Note: split removes the closing tag, checking start tag is enough.

        let count = 0;
        for (const chunk of anchors) {
            if (!chunk.includes('<xdr:from>')) continue;

            const rowMatch = chunk.match(/<xdr:from>.*?<xdr:row>(\d+)<\/xdr:row>/s); // s flag for dotAll
            const embedMatch = chunk.match(/r:embed="([^"]+)"/);

            if (rowMatch && embedMatch) {
                const rowIndex = parseInt(rowMatch[1]);
                const rId = embedMatch[1];
                const filename = embedMap[rId];

                if (filename && filenameToUrl[filename]) {
                    // Match!
                    finalMap[sheetName][rowIndex] = filenameToUrl[filename];
                    count++;
                }
            }
        }
        if (count > 0) console.log(`[${sheetName}] Mapped ${count} images.`);
    }

    fs.rmSync(tempDir, { recursive: true, force: true });

    // Save
    const outPath = path.resolve(rootDir, 'scripts', 'sheet_image_map.json');
    fs.writeFileSync(outPath, JSON.stringify(finalMap, null, 2));
    console.log(`Mapping Complete. Saved to ${outPath}`);

    // Preview
    const firstSheet = Object.keys(finalMap)[0];
    if (firstSheet) {
        console.log(`Example (${firstSheet}):`, JSON.stringify(finalMap[firstSheet], null, 2).slice(0, 200) + '...');
    }
};

run().catch(console.error);
