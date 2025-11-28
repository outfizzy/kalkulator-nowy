# 📋 Przewodnik: Jak Dodać Dane Cenowe do Kalkulatora

## 📍 Plik z Danymi Cenowymi

**Lokalizacja:** `src/data/catalog.json`

To jest **główny plik konfiguracyjny** zawierający wszystkie dane cenowe aplikacji.

---

## 🏗️ Struktura Danych - Podział

Dane w pliku `catalog.json` są podzielone na **2 główne sekcje**:

### 1. **`models`** - Modele Pergoli (Klasy Śniegowe)
### 2. **`addons`** - Produkty Dodatkowe

---

## 📦 1. MODELE PERGOLI (`models`)

Każdy model to osobny obiekt w tablicy `models`. Struktura pojedynczego modelu:

```json
{
    "id": "nazwa_modelu",              // Unikalny identyfikator (np. "orangestyle")
    "name": "Nazwa Wyświetlana",       // Np. "Orangestyle"
    "description": "Opis modelu",
    "image": "/images/model.jpg",      // Ścieżka do obrazka
    "roofTypes": [                     // Dostępne typy dachu
        "polycarbonate",               // Poliwęglan
        "glass"                        // Szkło
    ],
    "maxSnowLoad": 1.5,                // Klasa śniegowa (kN/m²)
    "pricing": {                       // ← TU WKLEJASZ CENY
        "3000": {                      // Szerokość w mm
            "2500": 1200,              // Głębokość: cena
            "3000": 1400
        },
        "4000": {
            "2500": 1500,
            "3000": 1700
        }
    }
}
```

### ✅ Jak Dodać Ceny dla Modelu?

**Krok 1:** Znajdź model w pliku (szukaj po `"id"`lub `"name"`)

**Krok 2:** Edytuj sekcję `"pricing"`:

```json
"pricing": {
    "szerokość_mm": {
        "głębokość_mm": cena_bazowa_EUR,
        "inna_głębokość": cena
    },
    "inna_szerokość": {
        "głębokość": cena
    }
}
```

**Przykład - Pełny Model z Cenami:**

```json
{
    "id": "orangestyle",
    "name": "Orangestyle",
    "description": "Klasyczny design, idealny do każdego ogrodu.",
    "image": "/images/orangestyle.jpg",
    "roofTypes": ["polycarbonate", "glass"],
    "maxSnowLoad": 1.5,
    "pricing": {
        "2000": { "2000": 950, "2500": 1100, "3000": 1250 },
        "2500": { "2000": 1050, "2500": 1200, "3000": 1350 },
        "3000": { "2000": 1150, "2500": 1300, "3000": 1450 },
        "3500": { "2000": 1250, "2500": 1400, "3000": 1550 },
        "4000": { "2000": 1350, "2500": 1500, "3000": 1650 },
        "4500": { "2000": 1450, "2500": 1600, "3000": 1750 },
        "5000": { "2000": 1550, "2500": 1700, "3000": 1850 }
    }
}
```

---

## 🎨 2. PRODUKTY DODATKOWE (`addons`)

### A) **Oświetlenie (`lighting`)**

```json
"lighting": {
    "spots": {
        "name": "LED Spots",
        "unit": "szt.",              // Jednostka sprzedaży
        "price": 150                 // Cena za jednostkę (EUR)
    },
    "strip": {
        "name": "LED Listwa",
        "unit": "mb",                // Metry bieżące
        "price": 80
    }
}
```

### B) **Szyby Przesuwne (`slidingWalls`)**

```json
"slidingWalls": {
    "description": "Systemy szyb przesuwnych",
    "models": [
        {
            "id": "AL23",
            "name": "AL23 (Hoch)",
            "description": "System wysoki",
            "image": "/images/al23.jpg",
            "pricing": [                    // Tablica z gotowymi wymiarami
                {
                    "width": 2000,          // Szerokość w mm
                    "height": 2100,         // Wysokość w mm
                    "price": 800            // Cena kompletu (EUR)
                },
                {
                    "width": 3000,
                    "height": 2100,
                    "price": 1100
                }
            ]
        }
    ]
}
```

### C) **Markizy (`awnings`)**

```json
"awnings": {
    "roof": {
        "name": "Markiza Dachowa (Aufdach)",
        "pricePerSqM": 250              // Cena za m² (EUR)
    },
    "under": {
        "name": "Markiza Poddachowa (Unterdach)",
        "pricePerSqM": 200
    }
}
```

### D) **ZIP Screen**

```json
"zipScreen": {
    "name": "ZIP Screen",
    "pricePerSqM": 180                  // Cena za m²
}
```

### E) **Promiennik Ciepła (`heater`)**

```json
"heater": {
    "name": "Promiennik Ciepła",
    "price": 450                        // Cena za sztukę
}
```

### F) **Okno Klinowe (`keilfenster`)**

```json
"keilfenster": {
    "name": "Keilfenster (Okno klinowe)",
    "price": 600
}
```

### G) **Ściany Aluminiowe (`aluminumWall`)**

```json
"aluminumWall": {
    "side": {
        "name": "Ściana boczna aluminiowa",
        "pricePerSqM": 300              // Cena za m²
    },
    "front": {
        "name": "Ściana frontowa aluminiowa",
        "pricePerSqM": 300
    }
}
```

---

## 🔧 Jak Kalkulator Oblicza Ceny?

### Dla Modeli Pergoli:
1. Sprawdza wybraną szerokość i głębokość
2. Znajduje **najbliższą większą** zdefiniowaną kombinację w `pricing`
3. Jeśli wymiary przekraczają maksymalne - używa największego zestawu

**Przykład:**
- Klient wybiera: **3200mm x 2700mm**
- W`pricing` masz: `"3000"`, `"4000"`
- System użyje: **"4000"** (pierwsza większa od 3200)
- Dla głębokości analogicznie

### Dla Produktów Dodatkowych:
- **Cena stała** (`price`) - mnożona przez ilość sztuk
- **Cena za m²** (`pricePerSqM`) - mnożona przez pole powierzchni
- **Cena za mb** (w `unit: "mb"`) - mnożona przez długość

---

## 📝 SZABLON DO WYPEŁNIENIA

Skopiuj i wypełnij poniższy szablon swoimi danymi:

```json
{
    "models": [
        {
            "id": "twoj_model_1",
            "name": "Nazwa Modelu 1",
            "description": "Opis twojego pierwszego modelu",
            "image": "/images/model1.jpg",
            "roofTypes": ["polycarbonate", "glass"],
            "maxSnowLoad": 1.5,
            "pricing": {
                "2000": { "2000": 0, "2500": 0, "3000": 0 },
                "2500": { "2000": 0, "2500": 0, "3000": 0 },
                "3000": { "2000": 0, "2500": 0, "3000": 0 }
            }
        }
    ],
    "addons": {
        "lighting": {
            "spots": { "name": "LED Spots", "unit": "szt.", "price": 0 },
            "strip": { "name": "LED Listwa", "unit": "mb", "price": 0 }
        },
        "heater": {
            "name": "Promiennik Ciepła",
            "price": 0
        }
    }
}
```

---

## ⚠️ WAŻNE ZASADY

1. **Zawsze używaj przecinków** między elementami JSON (ale nie po ostatnim!)
2. **Ceny w EUR** - bez symboli waluty, tylko liczby
3. **Wymiary w mm** - jako liczby (nie tekst)
4. **ID modeli** - tylko małe litery i podkreślniki (np. `"trendstyle_plus"`)
5. **Sprawdź składnię JSON** - możesz użyć narzędzia online: https://jsonlint.com/

---

## 🚀 Jak Zastosować Zmiany?

1. Otwórz plik: `src/data/catalog.json`
2. Edytuj dane według powyższych wzorców
3. **Zapisz plik**
4. Aplikacja automatycznie załaduje nowe ceny!
5. Nie musisz restartować serwera - hot reload działa

---

## 📊 Przykład: Kompletny Model z Wszystkimi Cenami

```json
{
    "id": "premiumstyle",
    "name": "PremiumStyle",
    "description": "Najwyższa jakość dla wymagających klientów",
    "image": "/images/premiumstyle.jpg",
    "roofTypes": ["glass"],
    "maxSnowLoad": 3.0,
    "pricing": {
        "2000": {
            "2000": 1500,
            "2500": 1650,
            "3000": 1800,
            "3500": 1950,
            "4000": 2100
        },
        "2500": {
            "2000": 1700,
            "2500": 1850,
            "3000": 2000,
            "3500": 2150,
            "4000": 2300
        },
        "3000": {
            "2000": 1900,
            "2500": 2050,
            "3000": 2200,
            "3500": 2350,
            "4000": 2500
        },
        "3500": {
            "2000": 2100,
            "2500": 2250,
            "3000": 2400,
            "3500": 2550,
            "4000": 2700
        },
        "4000": {
            "2000": 2300,
            "2500": 2450,
            "3000": 2600,
            "3500": 2750,
            "4000": 2900
        },
        "4500": {
            "2000": 2500,
            "2500": 2650,
            "3000": 2800,
            "3500": 2950,
            "4000": 3100
        },
        "5000": {
            "2000": 2700,
            "2500": 2850,
            "3000": 3000,
            "3500": 3150,
            "4000": 3300
        }
    }
}
```

---

## 💡 Wskazówki

- **Zacznij od 1 modelu** - wypełnij ceny dla jednego, przetestuj, potem dodawaj kolejne
- **Kopiuj struktury** - dla nowych modeli skopiuj istniejący i zmień wartości
- **Testuj w aplikacji** - po każdej zmianie sprawdź czy kalkulator działa poprawnie
- **Backup** - zrób kopię oryginalnego `catalog.json` przed edycją!

---

## 📞 Potrzebujesz Pomocy?

Jeśli masz konkretne dane cenowe do wklejenia, podeślij mi je, a pomogę Ci je sformatować!
