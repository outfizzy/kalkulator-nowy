# Instrukcja Uzupełnienia Danych Cenowych z PDF

## Lokalizacja pliku
`src/utils/pricing.ts`

## Jak uzupełnić dane

1. Otwórz plik PDF: `aluxe_preisliste_202530950-2.pdf`

2. Znajdź tabelę z cenami dla zadaszenia (prawdopodobnie format: Szerokość x Głębokość = Cena)

3. W pliku `pricing.ts` znajdź obiekt `ROOF_PRICES`:

```typescript
const ROOF_PRICES: Record<string, Record<string, number>> = {
  '3000': {
    '2500': 1200,  // <- Zamień te wartości na rzeczywiste z PDF
    '3000': 1400,
    // ...
  },
  // ...
};
```

4. Zamień przykładowe wartości (1200, 1400, itd.) na rzeczywiste ceny z PDF w EUR.

5. Dla dodatków, zaktualizuj tablicę `AVAILABLE_ADDONS`:

```typescript
export const AVAILABLE_ADDONS: AddonConfig[] = [
  { id: 'glass_sliding', name: 'Szyby przesuwne', price: 450 }, // <- Zmień cenę
  // ...
];
```

## Format
- Ceny powinny być w EUR (bez VAT-u, netto)
- Szerokość i głębokość w mm jako stringi (np. '3000', '4000')
