# 🗺️ Aktywacja Google Maps JavaScript API

## ⚠️ WYMAGANE: Włącz Maps JavaScript API

Obecnie masz włączone tylko **Directions API**. Aby mapa działała, musisz włączyć **Maps JavaScript API**.

### Kroki

1. **Przejdź do Google Cloud Console:**
   <https://console.cloud.google.com/apis/library>

2. **Zaloguj się** na konto Google z projektem

3. **Wyszukaj:** "Maps JavaScript API"

4. **Kliknij** na "Maps JavaScript API"

5. **Kliknij "ENABLE" (WŁĄCZ)**

6. **Poczekaj** 1-2 minuty na aktywację

7. **Odśwież** stronę aplikacji

---

## ✅ Które API Są Potrzebne

| API | Status | Cel |
|-----|--------|-----|
| **Directions API** | ✅ Włączone | Obliczanie tras |
| **Maps JavaScript API** | ❌ **WYMAGANE** | Wyświetlanie mapy |
| **Geocoding API** | ⚪ Opcjonalne | Konwersja adresów na GPS |

---

## 🔑 Twój Klucz API

```
AIzaSyCbhKLr6dhJCDpo-YeWSPh32UQvGLf48_E
```

Ten sam klucz działa dla wszystkich API w projekcie.

---

## 🐛 Błędy Które Naprawiono

### 1. ✅ Async Loading Warning

**Przed:**

```html
<script src="https://maps.googleapis.com/maps/api/js?key=..."></script>
```

**Po:**

```html
<script async defer src="https://maps.googleapis.com/maps/api/js?key=...&loading=async"></script>
```

### 2. ⏳ Deprecated Marker Warning

Google zaleca użycie `AdvancedMarkerElement` zamiast `Marker`. To nie blokuje działania, ale możemy to zaktualizować później.

---

## 📝 Po Włączeniu API

1. Odśwież stronę (Ctrl+F5)
2. Zaloguj się do panelu
3. Przejdź do Kalendarza Pomiarów
4. Kliknij ikonę mapy 🗺️ przy wybranym dniu
5. Powinna otworzyć się mapa z trasami!

---

## 🆘 Jeśli Nadal Nie Działa

Sprawdź w konsoli przeglądarki (F12) czy widzisz:

- ❌ `ApiNotActivatedMapError` → API nie włączone
- ❌ `ApiKeyError` → Klucz nieprawidłowy
- ❌ `RefererNotAllowedMapError` → Ograniczenia domeny

Jeśli widzisz któryś z tych błędów, daj znać!
