# Instrukcja wdrożenia Dashboardu Statystyk

## 1. Dashboard jest gotowy

Dashboard pobiera dane automatycznie z:

- **Oferty** (`offers`) - liczba ofert, sprzedaż, marża
- **Raporty** (`reports`) - kilometry (z pola `totalKm`)

**Brak migracji SQL!** Dashboard działa od razu z istniejącymi danymi.

## 2. Przetestuj Dashboard

1. Zaloguj się jako Administrator na <https://polendach24.app>
2. Kliknij "Statystyki" w menu bocznym
3. Sprawdź:
   - Czy karty KPI pokazują dane (oferty, wartość, marża)
   - Czy kilometry są prawidłowo zliczane z raportów
   - Czy wykres się renderuje
   - Czy tabela wyświetla przedstawicieli

## Co nowego

- **Dashboard Statystyk** - `/admin/stats` (tylko dla Administratorów) z:
  - Filtrowaniem danych (Ten miesiąc, Poprzedni miesiąc, Ten rok)
  - Kartami KPI (Oferty, Wartość sprzedaży, Marża, **Kilometry z raportów**, Liczba przedstawicieli)
  - Wykresem słupkowym porównującym przedstawicieli
  - Szczegółową tabelą z metrykami dla każdego przedstawiciela:
    - Ilość ofert
    - Liczba sprzedanych
    - Conversion rate
    - Wartość sprzedaży
    - Marża (wartość i procent)
    - **Kilometry (zsumowane z raportów pomiarowych)**

- **Nowe pole w ofercie**: `distance` (dystans do klienta w km) - obecnie domyślnie 0, do dodania w formularzu oferty.

## Źródła danych

- **Oferty** → liczba ofert, wartość sprzedaży, marża, conversion rate
- **Raporty pomiarowe** → kilometry (`totalKm` z tabeli `reports`)

## Przyszłe ulepszenia

1. Szczegółowy widok per przedstawiciel (klinięcie w wiersz → rozwinięcie z ostatnimi ofertami).
2. Eksport danych do CSV/Excel.
3. Cele miesięczne i tracking postępów.
4. Porównanie rok do roku.
