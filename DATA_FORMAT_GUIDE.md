# Instrukcja Wprowadzania Danych Produktowych

Najlepszym formatem do przechowywania danych dla programu jest **JSON**. Jest to format tekstowy, który program może odczytać bezpośrednio.

Stworzyłem plik szablonu w: `src/data/catalog.json`.

## Jak uzupełnić dane?

Możesz edytować ten plik w dowolnym edytorze tekstu (Notatnik, VS Code).

### 1. Zadaszenia (Roofs)
Dla zadaszeń wprowadzamy listę dostępnych wymiarów i ich cen.
Jeśli klient wpisze szerokość "3450 mm", program poszuka najbliższego wyższego wymiaru (np. 4000 mm) i pobierze jego cenę.

```json
{
  "projection": 2500,  // Głębokość w mm
  "width": 3000,       // Szerokość w mm
  "price": 1200        // Cena w EUR
}
```

### 2. Oświetlenie LED i Dodatki (Accessories)
Tutaj wpisujemy po prostu cenę jednostkową.

```json
"led": {
  "pricePerUnit": 150  // Cena za sztukę
}
```

### 3. Szyby Przesuwne (Sliding Glass)
Tutaj definiujemy progi wymiarowe. Program sprawdzi wymiar otworu i dopasuje odpowiedni przedział cenowy.

```json
{
  "maxWidth": 3000,    // Maksymalna szerokość otworu
  "maxHeight": 2100,   // Maksymalna wysokość otworu
  "price": 1100        // Cena
}
```

## Alternatywa (Excel)
Jeśli wolisz pracować w Excelu, przygotuj arkusz z trzema zakładkami:
1. **Zadaszenia**: Kolumny `Głębokość`, `Szerokość`, `Cena`
2. **Dodatki**: Kolumny `Nazwa`, `Cena`
3. **Szyby**: Kolumny `Max Szerokość`, `Max Wysokość`, `Cena`

Następnie będziemy musieli zapisać to jako CSV lub przekonwertować do JSON. **Format JSON jest jednak zalecany**, ponieważ eliminuje błędy przy imporcie.
