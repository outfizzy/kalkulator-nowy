# Interaktywna oferta Polendach24 — specyfikacja (v1)

Cel: klient ocenia różnice między pakietami w 10 sekund, czuje że oferta „żyje", i robi upsell sam — bez agresji.
Język klienta = NIEMIECKI. Notatki/logika = polski.

---

## 1. LOGIKA GENEROWANIA 4 PAKIETÓW (z dowolnego briefu)

Wejście (brief): `model`, `breite`, `tiefe`, `farbe(RAL)`, `dach(poly|glas)`, `extras_wprost[]`, `wymagania[]` (np. side-shield, zip, montaż), `budget_max?`, `preferencje`.

Zasada nadrzędna: **każdy wyższy pakiet = SUPERSET niższego** (klient widzi tylko to, co DOCHODZI). Wszystko, co klient podał wprost, jest w KAŻDYM pakiecie (od Basis).

- **Basis** = rdzeń o który prosił + minimalne bezpieczeństwo + montaż (jeśli w scope).
  rdzeń = model+wymiary+dach(wg życzenia, inaczej domyślnie poliwęglan=najtaniej) + Statik + Entwässerung + (extras_wprost) + Montage 1 dzień + Garantie.
- **Empfohlen** = Basis + JEDEN upgrade „największa wartość":
  - Terrassenüberdachung → poliwęglan➜**VSG-Glas** (jeśli klient nie narzucił), albo mocniejszy profil.
  - Pergola → **Somfy iO motor + LED (4 Lamellen)** (smart-baseline).
- **Komfort** = Empfohlen + dodatki użytkowe: **Senkrechtmarkise/ZIP (boki)**, pełne **LED**, ew. Heizung.
- **Premium** = Komfort + domknięcie: **Senkrechtmarkise Front (3 boki)**, **LED max + Steuerung (Somfy TaHoma)**, **Schiebeverglasung/Panorama**, **Keilfenster**.

Reguły dodatków (z czata/agenta): dodatki tylko jeśli klient wprost prosił → wtedy w Basis; reszta pokazana jako różnica w wyższych pakietach / w „Extras". Cena bazowa zawsze najniższa (konkurent często wysyła ofertę bez LED/ZIP).

---

## 2. PACKAGES — przykład: Pergola-Lamellendach 5,0 × 4,0 m, RAL 7016
(ceny = z silnika; tu przykładowe netto, brutto = ×1,19; przełącznik steruje którą widać)

### packages[0] — BASIS
- tagline: „Genau das, was Sie angefragt haben."
- preis: netto 6.290 € · brutto 7.485 €
- positions (7):
  - Pergola-Lamellendach 5,0 × 4,0 m — Aluminium 6063-T5, RAL 7016
  - Motorisierte Alu-Lamellen 0–135° (bei 0° = 100 % regendicht)
  - Schneelast bis 150 kg/m²
  - Integrierte Entwässerung (verdeckt über Pfosten)
  - Statik & Fundamentplanung nach DIN EN 1991
  - Montage 1 Tag inkl. Transport
  - 10 Jahre Herstellergarantie
- cta: „Paket wählen" → selected: „Gewählt ✓"

### packages[1] — EMPFOHLEN  ⭐ (badge)
- tagline: „Bestes Preis-Leistungs-Verhältnis — smart & komfortabel."
- preis: netto 7.190 € · brutto 8.556 €
- positions = Basis +:
  - Somfy iO Funkmotor & Steuerung (App + Fernbedienung)
  - LED-Beleuchtung (4 Lamellen, warmweiß, dimmbar)
- cta / selected jw.

### packages[2] — KOMFORT
- tagline: „Mehr Schutz, mehr Nutzung — Ihre Terrasse bei jedem Wetter."
- preis: netto 9.450 € · brutto 11.246 €
- positions = Empfohlen +:
  - Senkrechtmarkise 2× Seiten — Aliplast ZIP Screen, windstabil bis 100 km/h
  - LED-Beleuchtung erweitert (alle Lamellen)
- cta / selected jw.

### packages[3] — PREMIUM  👑
- tagline: „Das volle Erlebnis — rundum geschützt, voll automatisiert."
- preis: netto 12.900 € · brutto 15.351 €
- positions = Komfort +:
  - Senkrechtmarkise Front (3 Seiten geschlossen)
  - LED-Beleuchtung (8 Lamellen) + RGB-Option
  - Somfy TaHoma — Alexa / Google / HomeKit + Wind- & Sonnensensor
- cta / selected jw.

microcopy wyboru: „Paket gewählt ✓ — Schritt 1/3"

---

## 3. EXTRAS (opcjonalnie, poza pakietami — „Anfragen")
- Infrarot-Heizstrahler (dimmbar, fernsteuerbar) — ab 690 € · Richtpreis
- WPC-Terrassenboden (Holzoptik, rutschfest) — ab 95 €/m² · Richtpreis
- Schiebeverglasung ESG / Panorama (rahmenlos) — ab 3.200 € · Richtpreis
- Keilfenster (Dreiecksverglasung Seite) — ab 480 € · Richtpreis
- Sonderfarbe (jede RAL) — ab 350 € · Richtpreis
Każdy „Anfragen →" = otwiera formularz prefilled: „Ich interessiere mich für: {nazwa}".

---

## 4. COPY

### hero
- title: „Ihr persönliches Angebot, {Vorname}"
- sub: „4 maßgeschneiderte Pakete — alle Preise inkl. Montage & MwSt. Nehmen Sie sich Zeit."
- trust-strip (przy CTA): „10 Jahre Garantie · 500+ Montagen · Made in EU · 4,9 ★ Google"

### microcopy stanów
- wybór pakietu: „Speichere Auswahl …" → „Paket gewählt ✓"
- przełącznik Netto/Brutto: „Aktualisiere Preise …"
- send: „Sende an {Berater} …" → „Nachricht gesendet ✓ — {Berater} meldet sich."
- error: „Verbindung unterbrochen. Bitte später erneut senden."
- disabled send: „Bitte mind. 10 Zeichen eingeben"
- pending oferty: „Ihr Preis wird mit aktuellen Werten berechnet …"

### FAQ (z treścią)
- Wie lange dauert die Realisierung? → Aufmaß innerhalb 7 Tagen, Produktion 4–6 Wochen, Montage 1–2 Tage vor Ort.
- Welche Farben sind verfügbar? → Jede RAL-Farbe. Standard ohne Aufpreis: 7016 Anthrazit, 9016 Weiß, 9005 Schwarz, DB 703.
- Ist die Montage im Preis enthalten? → Ja — 1 Montagetag inkl. Transport ist im Preis. Weitere Tage günstiger; exakter Umfang nach Aufmaß.
- Gibt es eine Garantie? → 10 Jahre Herstellergarantie auf Konstruktion & Beschichtung.
- Ist der Preis verbindlich? → Es ist ein Richtpreis auf Basis Ihrer Angaben. Die verbindliche Bestätigung erhalten Sie nach dem kostenlosen Aufmaß.
- Finanzierung möglich? → Ja, auf Anfrage — sprechen Sie Ihren Berater an.

### timeline (4 kroki — widełki + kto co robi)
1. Aufmaßtermin — innerhalb 7 Tagen · Sie: Termin bestätigen · Polendach: Fachberater kommt mit Mustern.
2. Verbindliches Angebot — 1–2 Tage nach Aufmaß · Sie: prüfen & freigeben · Polendach: Festpreis fixieren.
3. Produktion — 4–6 Wochen · Sie: zurücklehnen · Polendach: Fertigung in EU.
4. Lieferung & Montage — 1–2 Tage vor Ort · Sie: Zugang ermöglichen · Polendach: fertige Überdachung übergeben.

---

## 5. FLOW (3 kroki)
- Schritt 1/3: „Paket wählen"
- Schritt 2/3: „Extras (optional)"
- Schritt 3/3: „Termin / Rückfrage"
Pasek postępu na górze; po wyborze pakietu auto-scroll do Extras.

---

## 6. STATES (komponenty)
- PackageCard: default · hover (lekkie uniesienie) · selected (ramka akcent + ✓ + CTA „Gewählt ✓") · recommended (badge) · disabled(powód).
- PriceToggle: idle · loading („Aktualisiere Preise …") · done.
- CTA: default · loading („Speichere …") · selected · error.
- MessageForm: empty(disabled, powód) · typing · sending(„Sende …") · sent(✓) · error(retry).
- ExtraCard: default · requested(„Angefragt ✓").
- StickyBar(mobile): hidden → visible po wyborze: {Paketname} · {Brutto} · „Weiter →".

---

## 7. MOBILE UX (must)
- Sticky bottom bar: wybrany pakiet + cena brutto + CTA „Weiter".
- Paketvergleich → karty one-by-one (swipe), różnice podświetlone; NIE tabela.
- Przyciski ≥48px, disabled zawsze z powodem.
- Karty pakietów: 1 kolumna, „Empfohlen" pierwsza/wyróżniona.

---

## 8. INNE DOPRACOWANIA (bugi + psychologia sprzedaży)
1. 🔴 BUG: mapować nazwy wewn./polskie → czyste niemieckie etykiety („Pergola Nuun ECO Pojedyncza/Modułowa" ➜ „Pergola-Lamellendach"). Słownik nazw.
2. Usunąć puste „TECHNISCHE DETAILS" (akordeony bez treści).
3. Domyślnie BRUTTO (klient prywatny myśli brutto); zapamiętać wybór.
4. Różnice: w wyższym pakiecie podświetlać tylko to, co DOCHODZI (zielony „+"), reszta wyszarzona.
5. Anchoring: Empfohlen wizualnie największa, blisko Komfort funkcjami, wyraźna różnica ceny (decoy).
6. „ab …/Monat" przy finansowaniu (opcjonalnie) — zmniejsza bariera ceny.
7. Trust przy CTA (nie tylko w stopce).
8. Miękka pilność: „Aufmaßtermin in 7 Tagen" — bez liczników/agresji.
9. „Anfragen" przy Extras → prefilled formularz (mniej tarcia).
10. „Vorläufige Kalkulation" zostaje — szczerość buduje zaufanie.
