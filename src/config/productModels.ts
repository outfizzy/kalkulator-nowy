// Kanoniczna linia produktów — jedno źródło prawdy dla list modeli w umowach,
// karcie zamówienia i PDF. Zgodna z ofertą polendach24.de / zadaszto.pl
// (te same produkty producenta Aluxe + pergole; nazwy marek: *style).
//
// Mapowania nazw producenta/wariantów (Trendline→Trendstyle, ultraline→Ultrastyle,
// skyline→Skystyle, designline→Designstyle itd.) obsługują:
//   - src/utils/pdfGenerator.ts (translateForPDF)
//   - src/utils/translations.ts, src/utils/modelDisplayNames.ts
// Tu trzymamy KANONICZNE id (*style) używane przy tworzeniu/wyświetlaniu umów.

export interface ProductModel {
    id: string;
    label: string;
}

export const PRODUCT_MODELS: ProductModel[] = [
    { id: 'orangestyle', label: 'Orangestyle' },
    { id: 'trendstyle', label: 'Trendstyle' },
    { id: 'trendstyle_plus', label: 'Trendstyle Plus' },
    { id: 'topstyle', label: 'Topstyle' },
    { id: 'topstyle_xl', label: 'Topstyle XL' },
    { id: 'ultrastyle', label: 'Ultrastyle' },
    { id: 'designstyle', label: 'Designstyle' },
    { id: 'skystyle', label: 'Skystyle' },
    { id: 'carport', label: 'Carport' },
    { id: 'pergola', label: 'Pergola' },
    { id: 'pergola_deluxe', label: 'Pergola Deluxe' },
];
