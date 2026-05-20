const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ==================== ALUXE PROMPT ====================
const ALUXE_PROMPT = `You are an expert financial extraction AI for ALUXE GmbH supplier invoices.

## STEP 1 — UNDERSTAND THE TABLE LAYOUT

Aluxe invoices have a 4-column table: Produkt/Bezeichnung | Preis | Anzahl | Gesamt

- PRODUCT HEADER rows: **bold text**, price appears ONLY in the "Gesamt" column on the right. No "Preis" or "Anzahl" value.
- SUB-COMPONENT rows: indented/italic text, have Preis × Anzahl = Gesamt. ALWAYS include these in totalPrice.
- TEXT NOTE rows: sentences in plain text with NO price at all (e.g. "Die beigefügte Zeichnung...", "Schuifdeuren: 1x rechts...", "ausgewählte Tuchfarbe..."). These are informational — IGNORE THEM, but do NOT stop collecting sub-components for the current product.
- PACKAGING rows: lines starting with "Pfand:" or "Verpackungszuschlag:" — have a price but NO Anzahl. SKIP for totalPrice.
- GLOBAL SUMMARY rows at the very bottom (after all products): standalone "Pfand", "Transport", "Gesamtpreis exkl. MwSt."

## STEP 2 — NAME TRANSLATION (apply to every product name)

| Original in invoice          | Use in output                            |
|------------------------------|------------------------------------------|
| Topline Veranda ...          | Topstyle Terrassenüberdachung ...        |
| Trendline Veranda ...        | Trendstyle Terrassenüberdachung ...      |
| Orangeline ...               | Orangestyle Terrassenüberdachung ...     |
| Skyline ...                  | Skystyle Terrassenüberdachung ...        |
| Ultraline ...                | Ultrastyle Terrassenüberdachung ...      |
| Designline ...               | Designstyle Terrassenüberdachung ...     |
| Veranda - freistehend ...    | Freistehende Konstruktion ...            |
| Aluminum Seiten-Wand ...     | Aluminium-Seitenwand ...                 |
| Rahmen mit Schiebetüren ...  | Glasschiebetür-Rahmen ...               |
| Aufdachmarkise ZIP ...       | Aufdachmarkise mit ZIP ...              |
| Unterdachmarkise mit ZIP ... | Unterdachmarkise mit ZIP ...             |

Keep all dimensions (e.g. 5600x3467), RAL codes (e.g. 7016, 9010), directions (links/rechts).

## STEP 3 — CALCULATE totalPrice FOR EACH PRODUCT

totalPrice = value in "Gesamt" column on the BOLD product header line
           + sum of all "Gesamt" values from SUB-COMPONENT rows beneath it
           (do NOT include any "Pfand:" or "Verpackungszuschlag:" rows in this sum)

Example — "Topline Veranda - 5600x3467 (7016)":
  Bold header Gesamt: €2.799,07
  + VSG 8mm klar 7x Gesamt: €643,03
  + Verstärkung topline rinne Gesamt: €184,90
  + XL-Sparren 8x Gesamt: €144,00
  + Lochbohrer Gesamt: €7,88
  + Silikon Gesamt: €3,70
  + Bogen 90 Grad Gesamt: €4,52
  + extra lange Pfosten 2x Gesamt: €41,70
  = totalPrice: 3829.80
  SKIP: "Pfand: 1x Pallette €26,00" and "Pfand: 1x Glas kist €110,00"

Example — "Aluminum Seiten-Wand - 2284x3349x2800 (rechts) (7016)":
  Bold header Gesamt: €1.419,80
  + Iso Glas 33.1-10-33.1 23mm Gesamt: €723,40
  + Schraubenset Fenster Gesamt: €17,25
  = totalPrice: 2160.45
  SKIP: "Pfand: 1x Glas kist €110,00"

## STEP 4 — GLOBAL COSTS (bottom of document)

At the end of the document, find the standalone summary lines:
- "Verpackungszuschlag" or "Pfand" (global, not inside any product) → add to globalPackaging
- "Transport" → add to globalTransport
- "Gesamtpreis exkl. MwSt." → invoiceTotal

Combine globalPackaging + globalTransport into ONE entry in globalCosts named "Versand & Verpackung".

## STEP 5 — OUTPUT FORMAT (return ONLY valid JSON)

{
  "items": [
    {
      "name": "Topstyle Terrassenüberdachung 5600x3467 (RAL 7016)",
      "totalPrice": 3829.80,
      "components": "VSG 8mm klar 7x €643,03 | Verstärkung rinne €184,90 | XL-Sparren 8x €144,00 | Lochbohrer €7,88 | Silikon €3,70 | Bogen 90° €4,52 | Pfosten extra 2x €41,70"
    }
  ],
  "globalCosts": [
    { "name": "Versand & Verpackung", "price": 792.00 }
  ],
  "invoiceTotal": 12606.90
}

## STRICT RULES

1. Every BOLD product header = its own item. Never skip.
2. Apply name translation table to every product name.
3. "freistehend" structure = ALWAYS separate from main roof section.
4. Each Keilfenster (links) and (rechts) = separate items.
5. Each Panorama Schiebewand = separate item.
6. "Pfand:" and "Verpackungszuschlag:" rows inside product sections → SKIP for totalPrice.
7. Global Pfand + Transport at document bottom → ONE combined "Versand & Verpackung" entry in globalCosts.
8. invoiceTotal = read "Gesamtpreis exkl. MwSt." exactly.
9. Number format: "1.234,50" → 1234.50 (dot as decimal separator).
10. Pages with only drawings, delivery notes, or no price table → return { "items": [], "globalCosts": [], "invoiceTotal": 0 }.`;


// ==================== DEPONTI PROMPT ====================
const DEPONTI_PROMPT = `You are an expert financial extraction AI for Deponti GmbH supplier invoices (aluminum patio covers, glass sliding walls, pergolas).

## STEP 1 — UNDERSTAND THE TABLE LAYOUT

Deponti invoices have a FLAT LIST with 3 columns: Beschreibung | Anzahl | Ingesamt

Each row is independent — there is NO hierarchy (no bold headers with sub-components).
Below each product name there is an article code (e.g. "DPTA060X40ARHVZ") — IGNORE article codes.

Items with €0,00 price (e.g. "Führungsschienen") are FREE included accessories — still list them in components.

## STEP 2 — GROUP RELATED ITEMS

### Main products (each = its OWN item):
- "Bosco [dimensions] [color]" → standalone roof item
- "Pinela Glass [dimensions]" → standalone roof item
- "Giallo [dimensions]" → standalone roof item
- "Pinela [dimensions]" → standalone pergola item
- "Keilfenster [details]" → standalone item
- "Seitenwand [dimensions] [color]" → standalone item

### Fiano glass wall system — GROUP these together:

The document lists Fiano items in a REPEATING PATTERN for each wall:
  [Glasscheibe items] → [Führungsschienen] → [accessories: U-Profil, Mitnehmer, Bürstenprofil]

Each "Fiano Führungsschienen X Spuren" line is the ANCHOR of its group. A group contains:
1. The Glasscheibe items that appear BEFORE this Führungsschienen (but AFTER the previous group's accessories)
2. The Führungsschienen line itself
3. The accessory items (U-Profil, Mitnehmer, Bürstenprofil) that appear AFTER this Führungsschienen,
   UNTIL the next Glasscheibe item appears (which starts the next group).

### CRITICAL: Each Fiano line belongs to EXACTLY ONE group. NEVER count an item in two groups.

### WORKED EXAMPLE (this exact invoice):

Line sequence in the document:
  A) Fiano Glasscheibe 1040x2200 — 3x €391,50
  B) Fiano Glasscheibe 1040x2200 mit Eindrehgriff — 1x €175,50
  C) Fiano Führungsschienen 4 Spuren 4000mm — 1x €0,00
  D) Fiano U-Profil 4 Spuren 2500mm — 1x €38,88
  E) Fiano Mitnehmer (1x) — 4x €27,00
  F) Fiano Zugluft-Bürstenprofil 2500mm — 4x €48,96
  ---- boundary: next Glasscheibe starts new group ----
  G) Fiano Glasscheibe 980x2200 — 4x €522,00
  H) Fiano Glasscheibe 980x2200 mit Eindrehgriff — 2x €351,00
  I) Fiano Führungsschienen 3 Spuren 3000mm — 2x €0,00
  J) Fiano Zugluft-Bürstenprofil 2500mm — 6x €73,44
  K) Fiano Mitnehmer (1x) — 12x €81,00
  ---- boundary: next Glasscheibe starts new group ----
  L) Fiano Glasscheibe 980x2200 — 1x €130,50
  M) Fiano Glasscheibe 980x2200 mit Eindrehgriff — 1x €175,50
  N) Fiano Führungsschienen 2 Spuren 2000mm — 1x €0,00
  O) Fiano U-Profil 2 Spuren 2500mm — 1x €38,88

GROUP 1 = lines A+B+C+D+E+F → "Glasschiebewand Fiano 4-Spuren 4000mm (Anthrazit)"
  totalPrice = 391.50 + 175.50 + 0 + 38.88 + 27.00 + 48.96 = 681.84

GROUP 2 = lines G+H+I+J+K → "Glasschiebewand Fiano 3-Spuren 3000mm (Anthrazit)"
  totalPrice = 522.00 + 351.00 + 0 + 73.44 + 81.00 = 1027.44

GROUP 3 = lines L+M+N+O → "Glasschiebewand Fiano 2-Spuren 2000mm (Anthrazit)"
  totalPrice = 130.50 + 175.50 + 0 + 38.88 = 344.88

VERIFICATION: 1691.10 + 931.50 + 378.00 + 681.84 + 1027.44 + 344.88 + 313.20 = 5367.96 ✅

## STEP 3 — NAME TRANSLATION

| Deponti name              | Use in output                          |
|---------------------------|----------------------------------------|
| Bosco [dim] [color] ...   | Trendstyle Terrassenüberdachung [dim] ([color]) |
| Pinela Glass [dim] ...    | Skystyle Terrassenüberdachung [dim] ([color])   |
| Giallo [dim] [color] ...  | Trendstyle+ Terrassenüberdachung [dim] ([color])|
| Pinela [dim] [color] ...  | Pergola [dim] ([color])                         |
| Fiano group (X Spuren)    | Glasschiebewand Fiano X-Spuren [length] ([color]) |
| Seitenwand [dim] [color]  | Aluminium-Seitenwand [dim] ([color])            |
| Keilfenster ...           | Keilfenster [details]                           |

For colors: "Anthrazit" = "Anthrazit", "Weiß" = "Weiß", "Grau" = "Grau". Keep as-is.
For glass types: "Klar" = keep, "Opal" = keep.

## STEP 4 — GLOBAL COSTS

- "Versandkosten exkl. MwSt" → if > 0, add to globalCosts as "Versand & Verpackung"
- "Zwischensumme ohne MwSt." or "Gesamtbetrag inkl. MwSt." → use the NET value (ohne MwSt.) as invoiceTotal
- If Versandkosten = 0, set globalCosts = empty array []

## STEP 5 — OUTPUT FORMAT (return ONLY valid JSON)

{
  "items": [
    {
      "name": "Trendstyle Terrassenüberdachung 606x400 (Anthrazit)",
      "totalPrice": 1691.10,
      "components": ""
    },
    {
      "name": "Glasschiebewand Fiano 4-Spuren 4000mm (Anthrazit)",
      "totalPrice": 681.84,
      "components": "Glasscheibe 1040x2200 3x €391,50 | Glasscheibe 1040x2200 mit Griff 1x €175,50 | Führungsschienen 4 Spuren 4000mm €0,00 | U-Profil 4 Spuren 2500mm €38,88 | Mitnehmer 4x €27,00 | Bürstenprofil 4x €48,96"
    },
    {
      "name": "Glasschiebewand Fiano 3-Spuren 3000mm (Anthrazit)",
      "totalPrice": 1027.44,
      "components": "Glasscheibe 980x2200 4x €522,00 | Glasscheibe 980x2200 mit Griff 2x €351,00 | Führungsschienen 3 Spuren 3000mm €0,00 | Bürstenprofil 6x €73,44 | Mitnehmer 12x €81,00"
    },
    {
      "name": "Glasschiebewand Fiano 2-Spuren 2000mm (Anthrazit)",
      "totalPrice": 344.88,
      "components": "Glasscheibe 980x2200 1x €130,50 | Glasscheibe 980x2200 mit Griff 1x €175,50 | Führungsschienen 2 Spuren 2000mm €0,00 | U-Profil 2 Spuren 2500mm €38,88"
    }
  ],
  "globalCosts": [],
  "invoiceTotal": 5367.96
}

## STRICT RULES

1. Each main product (Bosco, Pinela, Giallo, Keilfenster, Seitenwand) = its own item.
2. Each Fiano group = ONE combined item. Each line belongs to EXACTLY ONE group (no double counting).
3. Apply name translation table.
4. totalPrice for Fiano groups = sum of ALL individual "Ingesamt" values in the group.
5. The sum of ALL item totalPrice values MUST equal the "Zwischensumme ohne MwSt." value. If it doesn't, recheck your grouping.
6. invoiceTotal = "Zwischensumme ohne MwSt." value exactly.
7. Number format: "€ 1691,10" or "€ 1.691,10" → 1691.10
8. Ignore article/product codes (alphanumeric strings like "DPTA060X40ARHVZ").
9. Ignore pages with no pricing data.`;


// ==================== TERANDA PROMPT ====================
const TERANDA_PROMPT = `You are an expert product extraction AI for Teranda GmbH configurator output (aluminum patio covers, glass sliding walls, sun protection).

## STEP 1 — UNDERSTAND THE INPUT FORMAT

The input is PLAIN TEXT copied from the Teranda online configurator. It is NOT a table — it is a structured configuration output with sections.

The text has this structure:
1. A MAIN PRODUCT header line like "TR20 GLAS 5000x3000 mm" — this is the roof/cover
2. Technical specs: Breite, Tiefe, Höhe, Gefälle, RAL color, glass type, number of fields/posts
3. Add-on references listed under the main product (e.g. "Plisseesonnenschutz (PL15 Mano)", "Schiebewand (SW450)")
4. SEPARATE SECTIONS for each sub-product, starting with a header like:
   - "SW450 (Links)" = Schiebewand (sliding glass wall)
   - "SW150 (Front Feld 1)" = Schiebewand (sliding glass wall)
   - "PL15 Mano" = Plisseesonnenschutz (pleated sun protection)
   - "FW300 Links" or "FW300 Rechts" = Festwand/Seitenwand (fixed wall / side wall)
   - "SK..." = Seitenkeil (side wedge)
5. Each sub-product section lists specs: Bestellbreite, Bestellhöhe, RAL color, glass type, etc.
6. At the bottom: "Nettopreis € X.XXX,XX" — this is the TOTAL NET PRICE for EVERYTHING.

## STEP 2 — SPLIT INTO ITEMS

Create SEPARATE items for:
1. **Main roof** (TR10/TR15/TR20/TR25 etc.): the terrace cover itself
2. **Each sliding wall** (SW...): separate item per wall
3. **Each fixed wall** (FW...): separate item per wall
4. **Each sun protection** (PL...): separate item per plissee system
5. **Each side wedge** (SK...): if present

### PRICE DISTRIBUTION:
Teranda provides only ONE total "Nettopreis" for everything. You CANNOT split individual prices.
Therefore: assign the FULL Nettopreis to the MAIN ROOF item, and set totalPrice = 0 for all sub-items.
The user will redistribute prices manually in the preview step.

## STEP 3 — NAMING CONVENTION

Use these naming patterns:

| Teranda code | Output name |
|---|---|
| TR10 [dim] | Trendstyle 10 Terrassenüberdachung [Breite]x[Tiefe] ([RAL color]) |
| TR15 [dim] | Trendstyle 15 Terrassenüberdachung [Breite]x[Tiefe] ([RAL color]) |
| TR20 [dim] | Trendstyle 20 Terrassenüberdachung [Breite]x[Tiefe] ([RAL color]) |
| TR25 [dim] | Trendstyle 25 Terrassenüberdachung [Breite]x[Tiefe] ([RAL color]) |
| SW450 (Links) | Glasschiebewand SW450 [Breite]x[Höhe] Links ([RAL color]) |
| SW150 (Front) | Glasschiebewand SW150 [Breite]x[Höhe] Front ([RAL color]) |
| FW300 Links | Seitenwand FW300 [Breite]x[H1] Links ([RAL color]) |
| FW300 Rechts | Seitenwand FW300 [Breite]x[H1] Rechts ([RAL color]) |
| PL15 Mano | Plisseesonnenschutz PL15 [Breite]x[Länge] ([RAL color]) |

For RAL colors: "RAL7016st (Anthrazit)" → use just "Anthrazit".

## STEP 4 — COMPONENTS / DESCRIPTION

For each item, create a pipe-separated components string listing the key specs:

**Main roof components example:**
"Wandmontage | 55.2 VSG KLAR | 5 Felder | 2 Pfosten 3000mm | Pfostenträger (verzinkter Stahl) | Einbaustrahler 12x 3W LED | AB-Trafo"

**Sliding wall components example:**
"ESG KLAR 10mm | Typ 3/3 (3 Schienen / 3 Elemente) | Hakenverschluss | Muschelgriff Edelstahl | Flache Bodenschiene | Staubschutzleisten"

**Fixed wall components example:**
"VSG 44.2 KLAR | 2 vertikale Sprossen | Fräsung TR20 | Anbindungsprofil 60x60mm"

**Plissee components example:**
"Light Grey | Bedienstab 1200mm | 5 Stück"

## STEP 5 — OUTPUT FORMAT (return ONLY valid JSON)

{
  "items": [
    {
      "name": "Trendstyle 20 Terrassenüberdachung 5000x3000 (Anthrazit)",
      "totalPrice": 8947.89,
      "components": "Wandmontage | 55.2 VSG KLAR | 5 Felder | 2 Pfosten 3000mm | Pfostenträger (verzinkter Stahl) | Einbaustrahler 12x 3W LED | AB-Trafo"
    },
    {
      "name": "Glasschiebewand SW450 2828x2070 Links (Anthrazit)",
      "totalPrice": 0,
      "components": "ESG KLAR 10mm | Typ 3/3 (3 Schienen / 3 Elemente) | Hakenverschluss | Muschelgriff Edelstahl | Flache Bodenschiene | Staubschutzleisten"
    },
    {
      "name": "Glasschiebewand SW150 4776x2198 Front (Anthrazit)",
      "totalPrice": 0,
      "components": "VSG 55.2 KLAR | Typ 2/4 (2 Schienen / 4 Elemente)"
    },
    {
      "name": "Plisseesonnenschutz PL15 927x2817 (Anthrazit)",
      "totalPrice": 0,
      "components": "Light Grey | Bedienstab 1200mm | 5 Stück"
    },
    {
      "name": "Seitenwand FW300 2826x430 Links (Anthrazit)",
      "totalPrice": 0,
      "components": "VSG 44.2 KLAR | Ohne vertikale Sprosse | Fräsung TR20 | Anbindungsprofil 60x60mm"
    },
    {
      "name": "Seitenwand FW300 2826x2498 Rechts (Anthrazit)",
      "totalPrice": 0,
      "components": "VSG 44.2 KLAR | 2 vertikale Sprossen | Fräsung TR20 | Anbindungsprofil 60x60mm"
    }
  ],
  "globalCosts": [],
  "invoiceTotal": 8947.89
}

## STRICT RULES

1. FULL Nettopreis goes on the MAIN ROOF item. All sub-items get totalPrice = 0.
2. Each SW/FW/PL/SK section = its own item.
3. globalCosts = always empty [] for Teranda.
4. invoiceTotal = the "Nettopreis" value exactly.
5. Number format: "€ 8.947,89" → 8947.89
6. Extract key specs into components. Skip redundant/obvious details.
7. If no Nettopreis found, set invoiceTotal = 0 and all prices = 0.`;


// ==================== ALIPLAST PROMPT ====================
const ALIPLAST_PROMPT = `You are an expert product extraction AI for Aliplast supplier screenshots (Polish aluminum pergola/patio cover manufacturer).

## STEP 1 — UNDERSTAND THE INPUT

The input is a SCREENSHOT of a Polish pricing table (web interface). The table has these columns:
- ArtNo (product code)
- Name (product name in POLISH)
- Cena bazowa netto (base net price PLN)
- Rabat % (discount percentage)
- Cena jednostkowa netto (unit net price PLN after discount)
- Liczba szt. (quantity)
- Cena netto (total net price PLN = unit price × quantity)
- Vat
- Cena brutto

IMPORTANT: Use the "Cena netto" column (total net price per item after discount × quantity) as the price.
The bottom row "Razem (PLN)" shows the total.

## STEP 2 — TRANSLATE NAMES TO GERMAN

Translate every product name from Polish to German:

| Polish | German |
|---|---|
| Pergola [dim] | Pergola [dim] |
| Zip Screen Eco [dim] | Zip Screen [dim] |
| SILIKON USZCZELNIAJĄCY | Silikon Dichtmasse |
| Czujnik deszczu | Regensensor |
| Czujnik wiatrowy przewodowy | Windsensor (verkabelt) |
| Słup dodatkowy | Zusatzpfosten |
| System oświetlenia - taśma LED, przewody, akcesoria | LED-Beleuchtungssystem (Band, Kabel, Zubehör) |
| Odbiornik do oświetlenia LED białego | LED-Empfänger (weißes Licht) |
| Zasilacz [spec] | Netzteil [spec] |
| Centrala sterująca - z odbiornikiem radiowym do sterowania silnikiem +zintegrowany czujnik temperatury | Steuerzentrale mit Funkempfänger (Motorsteuerung + Temperatursensor) |
| SIŁOWNIK MAESTRIA | Antrieb MAESTRIA |
| BUT DOLNY [dim] | Fußstück [dim] |
| Odwodnienia | Entwässerung |
| Pilot [X]-kanałowy | [X]-Kanal Fernbedienung |
| TaHoma Switch | TaHoma Switch |

If a name is not in the table, translate it sensibly to German. Keep brand names (MAESTRIA, TaHoma, Situo, Eolis, Ondeis) unchanged.
Keep dimensions and technical specs (IP67, 24V DC, 120X120) unchanged.

## STEP 3 — GROUPING

Each row in the table = its own item. Do NOT group items.
If "Liczba szt." > 1, include the quantity in the item name, e.g. "Fußstück 120x120 (6x)".
If the same item appears multiple times (same ArtNo), keep them as separate items.

## STEP 4 — PRICE

Use the "Cena netto" column value as totalPrice. This is already in PLN.
Do NOT convert to EUR — the frontend will handle conversion.

## STEP 5 — OUTPUT FORMAT (return ONLY valid JSON)

All prices in PLN (the frontend will convert to EUR).

{
  "items": [
    {
      "name": "Pergola 4000x7010x2200",
      "totalPrice": 29057.27,
      "components": ""
    },
    {
      "name": "Zip Screen 3759x1926",
      "totalPrice": 1980.43,
      "components": ""
    },
    {
      "name": "Fußstück 120x120 (6x)",
      "totalPrice": 341.96,
      "components": ""
    }
  ],
  "globalCosts": [],
  "invoiceTotal": 40678.64
}

## STRICT RULES

1. Each table row = its own item (no grouping).
2. Translate names to German. Keep brand names and technical specs.
3. Use "Cena netto" column for totalPrice (PLN, after discount × quantity).
4. invoiceTotal = "Razem (PLN)" value from the bottom row.
5. globalCosts = always empty [].
6. Number format: "29057.27" or "29 057,27" → 29057.27
7. If quantity > 1, append "(Nx)" to the name.
8. Ignore ArtNo codes in the output.`;


Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { image, images, text, supplier } = await req.json();

        if (!image && !text && (!images || images.length === 0)) {
            return new Response(
                JSON.stringify({ error: 'Missing required field: text, image, or images array (base64)' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const apiKey = Deno.env.get('OPENAI_API_KEY');
        if (!apiKey) {
            return new Response(
                JSON.stringify({ error: 'Missing OPENAI_API_KEY' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Select prompt based on supplier
        const PROMPTS: Record<string, string> = { aluxe: ALUXE_PROMPT, deponti: DEPONTI_PROMPT, teranda: TERANDA_PROMPT, aliplast: ALIPLAST_PROMPT };
        const LABELS: Record<string, string> = { aluxe: 'ALUXE', deponti: 'DEPONTI', teranda: 'TERANDA', aliplast: 'ALIPLAST' };
        const systemPrompt = PROMPTS[supplier || 'aluxe'] || ALUXE_PROMPT;
        const supplierLabel = LABELS[supplier || 'aluxe'] || 'ALUXE';

        console.log(`[scan-invoice] Processing ${supplierLabel} invoice...`);

        // Build message content based on input type
        let messageContent: any;

        if (text) {
            messageContent = `Extract all products from this ${supplierLabel} invoice text. Follow the system rules exactly. Return only valid JSON.\n\nINVOICE TEXT:\n${text}`;
        } else {
            const imagePayloads = images ? images : [image];
            messageContent = [
                {
                    type: 'text',
                    text: `Extract all products from this ${supplierLabel} invoice. Follow the system rules exactly. Return only valid JSON.`
                },
                ...imagePayloads.map((img: string) => ({
                    type: 'image_url',
                    image_url: {
                        url: img.startsWith('data:') ? img : `data:image/jpeg;base64,${img}`,
                        detail: 'high'
                    }
                }))
            ];
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: messageContent }
                ],
                temperature: 0.0,
                max_tokens: 10000
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[scan-invoice] OpenAI API Error:', response.status, errorText);
            return new Response(
                JSON.stringify({ error: `OpenAI API Error (${response.status})`, details: errorText }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content?.trim();

        console.log(`[scan-invoice] Raw AI response length: ${content?.length}`);

        let result;
        try {
            const cleanContent = content.replace(/^```json\n|\n```$/g, '').replace(/^```\n|\n```$/g, '').trim();
            result = JSON.parse(cleanContent);
        } catch (_e) {
            console.error('[scan-invoice] JSON Parse Error:', content);
            return new Response(
                JSON.stringify({ error: 'Failed to parse AI response', raw: content }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        console.log(`[scan-invoice] [${supplierLabel}] Extracted ${result.items?.length || 0} items. Invoice total: ${result.invoiceTotal}`);

        return new Response(
            JSON.stringify(result),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('[scan-invoice] Edge Function Error:', error);
        return new Response(
            JSON.stringify({ error: (error as Error).message || 'Unknown error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
