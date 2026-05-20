// Verify exact text positions and compare with overlay coordinates
import { readFileSync } from 'fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const pdfPath = '/Users/tomaszfijolek/Desktop/Program do ofert /TR15_technical.pdf';
const data = new Uint8Array(readFileSync(pdfPath));

async function verify() {
    const doc = await getDocument({ data }).promise;
    const page = await doc.getPage(1);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();
    
    console.log(`Page: ${viewport.width.toFixed(1)} x ${viewport.height.toFixed(1)}\n`);
    
    // Focus on translatable items
    const nlLabels = [
        'Aanzicht', 'Vrijstaand', 'Dak type', 'Dakhoek', 'Dakvelden',
        'Voorstaanders', 'Achterstaanders', 'Kleur',
        'Breedte', 'Diepte', 'Onderkant muurprofiel', 'Onderkant gootprofiel',
        'Binnenmaat tussen staanders', 'Hart-op-hart liggers',
        'Binnenmaat staanders (diepte)', 'Bovenkant muurprofiel',
        'Staanderbreedte', 'Staanderdiepte',
        'Disclaimer', 'Eenheid', 'Schaal', 'Datum', 'Pagina', 'Titel',
        'Tekening is uitsluitend ter illustratie.',
        'Klant is verantwoordelijk voor alle maten.',
        'Orderbevestiging is leidend.',
        'Voor (buiten)', 'Rechts (buiten)',
    ];
    
    for (const item of textContent.items) {
        const ti = item;
        if (!ti.str || !ti.str.trim()) continue;
        
        const isTarget = nlLabels.includes(ti.str);
        if (!isTarget) continue;
        
        const x = ti.transform[4];
        const y = ti.transform[5];
        const w = ti.width || 0;
        const h = ti.height || 0;
        
        // Also extract the transform matrix components
        const scaleX = ti.transform[0];
        const scaleY = ti.transform[3];
        
        console.log(`"${ti.str}"`);
        console.log(`  pos: x=${x.toFixed(2)}, y=${y.toFixed(2)} (from bottom)`);
        console.log(`  size: w=${w.toFixed(2)}, h=${h.toFixed(2)}`);
        console.log(`  transform: [${ti.transform.map(v => v.toFixed(3)).join(', ')}]`);
        console.log(`  fontName: ${ti.fontName || '?'}`);
        console.log('');
    }
    
    doc.destroy();
}

verify().catch(console.error);
