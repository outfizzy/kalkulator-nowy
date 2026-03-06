// Preset prompts library for AI Assistant - integrated with real product data
export interface PresetPrompt {
    id: string;
    category: string;
    title: string;
    prompt: string;
    icon: string;
    description?: string;
    requiresData?: boolean; // If true, will fetch real data before sending
}

export const PRESET_CATEGORIES = [
    { id: 'visualizations', name: 'Wizualizacje', icon: '🏗️', color: 'blue' },
    { id: 'calculations', name: 'Kalkulacje', icon: '🧮', color: 'green' },
    { id: 'technical', name: 'Pomoc Techniczna', icon: '🔧', color: 'purple' },
    { id: 'customer', name: 'Obsługa Klienta', icon: '👥', color: 'orange' },
    { id: 'documentation', name: 'Dokumentacja', icon: '📄', color: 'slate' },
];

export const PRESET_PROMPTS: PresetPrompt[] = [
    // Wizualizacje
    {
        id: 'viz-topline-standard',
        category: 'visualizations',
        title: 'Topstyle - Wizualizacja',
        icon: '🏗️',
        description: 'Pergola aluminiowa Topstyle',
        prompt: `Wygeneruj profesjonalną wizualizację 3D pergoli aluminiowej Topstyle:
- Wymiary: 4x3 metry
- Kolor: antracyt (RAL 7016)
- Lamele regulowane
- Oświetlenie LED zintegrowane
- Nowoczesne patio, słoneczny dzień
- Styl: fotorealistyczny rendering architektoniczny
- Widok: perspektywa 3/4

Topstyle to pergola z regulowanymi lamelami, dostępna w rozmiarach od 3x2m do 7x4m.`
    },
    {
        id: 'viz-trendline-zip',
        category: 'visualizations',
        title: 'Trendstyle z ZIP',
        icon: '🏗️',
        description: 'Trendstyle z roletami ZIP',
        prompt: `Wizualizuj pergolę Trendstyle z systemem ZIP:
- Model: Trendstyle 4x3m
- Rolety ZIP na wszystkich stronach
- Kolor konstrukcji: antracyt (RAL 7016)
- Kolor tkaniny: szary
- Jedna roleta opuszczona, jedna w połowie
- Nowoczesny ogród, popołudnie
- Podkreślić funkcjonalność i ochronę

Trendstyle to model z możliwością pełnego zamknięcia roletami ZIP.`
    },
    {
        id: 'viz-skyline-glass',
        category: 'visualizations',
        title: 'Skystyle - Szkło',
        icon: '🏗️',
        description: 'Zadaszenie szklane Skystyle',
        prompt: `Stwórz wizualizację premium zadaszenia Skystyle:
- Wymiary: 5x4 metry
- Szkło: hartowane, przezroczyste
- Konstrukcja: aluminium biały (RAL 9016)
- Oświetlenie: LED w profilu
- Otoczenie: nowoczesny taras, wieczór
- Styl: luksusowy, elegancki
- Pokaż przezroczystość i grę światła

Skystyle to system szklanego zadaszenia bez słupów pośrednich.`
    },
    {
        id: 'viz-designline',
        category: 'visualizations',
        title: 'Designstyle Premium',
        icon: '🏗️',
        description: 'Wizualizacja Designstyle',
        prompt: `Wygeneruj wizualizację pergoli Designstyle:
- Wymiary: 5x4 metry
- Kolor: biały (RAL 9016)
- Lamele premium z podświetleniem
- LED RGB zintegrowane
- Luksusowy taras, zmierzch
- Styl: ultra-nowoczesny, premium
- Widok: pokazujący elegancję i detale

Designstyle to najwyższa linia pergoli z dodatkowymi funkcjami premium.`
    },
    {
        id: 'viz-carport',
        category: 'visualizations',
        title: 'Carport',
        icon: '🚗',
        description: 'Wiata garażowa',
        prompt: `Wizualizacja carportu aluminiowego:
- Wymiary: 6x3 metry (2 samochody)
- Konstrukcja: aluminium antracyt (RAL 7016)
- Dach: poliwęglan lub pełny
- Samochody: nowoczesne
- Otoczenie: dom jednorodzinny
- Widok: z przodu i z boku
- Styl: minimalistyczny, czysty`
    },

    // Kalkulacje - z dostępem do prawdziwych cen
    {
        id: 'calc-topline-basic',
        category: 'calculations',
        title: 'Kalkulacja Topstyle',
        icon: '🧮',
        description: 'Cena podstawowej pergoli',
        requiresData: true,
        prompt: 'Oblicz cenę pergoli Topstyle o wymiarach 4x3 metry w kolorze antracyt. Podaj cenę netto i brutto (VAT 23%). Użyj aktualnych cen z bazy danych.'
    },
    {
        id: 'calc-compare-models',
        category: 'calculations',
        title: 'Porównanie Modeli',
        icon: '⚖️',
        description: 'Topstyle vs Trendstyle vs Designstyle',
        requiresData: true,
        prompt: 'Porównaj ceny i parametry dla rozmiaru 4x3m: Topstyle, Trendstyle, Designstyle, Orangestyle. Przedstaw w tabeli z cenami netto, różnicami funkcjonalnymi i rekomendacją dla różnych budżetów.'
    },
    {
        id: 'calc-with-extras',
        category: 'calculations',
        title: 'Kalkulacja z Dodatkami',
        icon: '💡',
        description: 'Cena z LED, ogrzewaniem, ZIP',
        requiresData: true,
        prompt: 'Oblicz cenę pergoli Topstyle 4x3m z dodatkami: oświetlenie LED, ogrzewanie podczerwienią (2 promienniki), rolety ZIP na 2 ścianach. Podaj szczegółowe zestawienie kosztów każdego elementu.'
    },
    {
        id: 'calc-compare-sizes',
        category: 'calculations',
        title: 'Porównanie Rozmiarów',
        icon: '📊',
        description: 'Różne wymiary tego samego modelu',
        requiresData: true,
        prompt: 'Porównaj ceny pergoli Topstyle w rozmiarach: 3x3m, 4x3m, 5x4m, 6x4m. Przedstaw w tabeli z cenami netto, brutto i różnicą procentową względem najmniejszego rozmiaru.'
    },
    {
        id: 'calc-skyline-vs-pergola',
        category: 'calculations',
        title: 'Skyline vs Pergola',
        icon: '⚖️',
        description: 'Szkło vs lamele',
        requiresData: true,
        prompt: 'Porównaj cenę i funkcjonalność: Skystyle 4x3m (szkło) vs Topstyle 4x3m (lamele). Jakie są różnice w cenie, zastosowaniu, zaletach i wadach każdego rozwiązania?'
    },

    // Pomoc Techniczna
    {
        id: 'tech-topline-specs',
        category: 'technical',
        title: 'Specyfikacja Topstyle',
        icon: '📐',
        description: 'Parametry techniczne',
        requiresData: true,
        prompt: 'Podaj pełną specyfikację techniczną pergoli Topstyle: dostępne wymiary, grubość profili, maksymalne rozpiętości, obciążenie śniegiem i wiatrem, dostępne kolory RAL, typ lameli.'
    },
    {
        id: 'tech-models-comparison',
        category: 'technical',
        title: 'Różnice Między Modelami',
        icon: '🔍',
        description: 'Topstyle, Trendstyle, Designstyle, Orangestyle',
        prompt: 'Wyjaśnij szczegółowo różnice techniczne między modelami: Topstyle, Trendstyle, Designstyle, Orangestyle. Kiedy polecić który model? Jakie są zalety i wady każdego? Dla jakiego klienta?'
    },
    {
        id: 'tech-colors-ral',
        category: 'technical',
        title: 'Kolory RAL',
        icon: '🎨',
        description: 'Dostępne kolory',
        prompt: 'Jakie kolory RAL są dostępne dla konstrukcji aluminiowych? Podaj najpopularniejsze: RAL 7016 (antracyt), RAL 9016 (biały), RAL 9006 (srebrny). Czy dostępne są wykończenia drewnopodobne? Jakie są dopłaty za kolory specjalne?'
    },
    {
        id: 'tech-installation-process',
        category: 'technical',
        title: 'Proces Montażu',
        icon: '🔨',
        description: 'Instalacja krok po kroku',
        prompt: 'Opisz proces montażu pergoli aluminiowej: czas realizacji, liczba osób, wymagane przygotowania, fundamenty, pozwolenia budowlane, gwarancja. Jakie są najczęstsze problemy podczas montażu?'
    },
    {
        id: 'tech-zip-system',
        category: 'technical',
        title: 'System ZIP',
        icon: '📐',
        description: 'Rolety ZIP - specyfikacja',
        prompt: 'Wyjaśnij system rolet ZIP: jak działa, jakie są dostępne tkaniny, kolory, sterowanie (manualne/elektryczne/smart), maksymalne wymiary, odporność na wiatr, konserwacja.'
    },

    // Obsługa Klienta
    {
        id: 'customer-email-offer',
        category: 'customer',
        title: 'Email z Ofertą',
        icon: '📧',
        description: 'Profesjonalny email',
        prompt: 'Napisz profesjonalny email do klienta z ofertą na pergolę Topstyle 4x3m w kolorze antracyt z oświetleniem LED. Dołącz: krótki opis produktu, kluczowe zalety, cenę, zachętę do kontaktu, informację o darmowym pomiarze.'
    },
    {
        id: 'customer-presentation-points',
        category: 'customer',
        title: 'Prezentacja dla Klienta',
        icon: '📊',
        description: 'Punkty do rozmowy',
        prompt: 'Przygotuj punkty do prezentacji pergoli dla klienta: zalety aluminium, funkcjonalność lameli, dostępne dodatki (LED, ogrzewanie, ZIP), proces realizacji, gwarancja, referencje, zwrot z inwestycji.'
    },
    {
        id: 'customer-faq',
        category: 'customer',
        title: 'FAQ - Najczęstsze Pytania',
        icon: '❓',
        description: 'Odpowiedzi na pytania',
        prompt: 'Przygotuj odpowiedzi na FAQ: Jak długo trwa montaż? Czy potrzebne są pozwolenia? Jaka jest gwarancja? Czy można montować zimą? Jak wygląda konserwacja? Czy można dodać ZIP później? Jakie są koszty eksploatacji?'
    },
    {
        id: 'customer-objections',
        category: 'customer',
        title: 'Obsługa Obiekcji',
        icon: '💬',
        description: 'Odpowiedzi na wątpliwości',
        prompt: 'Jak odpowiedzieć na obiekcje klienta: "To za drogie", "Drewno jest ładniejsze", "Nie potrzebuję lameli", "Wolę markizę", "Obawiam się o trwałość". Podaj argumenty i alternatywy.'
    },
    {
        id: 'customer-upsell',
        category: 'customer',
        title: 'Sprzedaż Dodatkowa',
        icon: '⭐',
        description: 'Jak sprzedać więcej',
        prompt: 'Jakie dodatki zaproponować do pergoli aby zwiększyć wartość zamówienia? LED, ogrzewanie, ZIP, ściany szklane, automatyka smart home. Jak argumentować wartość każdego dodatku?'
    },

    // Dokumentacja
    {
        id: 'doc-technical-spec',
        category: 'documentation',
        title: 'Specyfikacja Techniczna',
        icon: '📋',
        description: 'Dokument dla klienta',
        requiresData: true,
        prompt: 'Wygeneruj pełną specyfikację techniczną dla pergoli Topstyle 4x3m z LED. Uwzględnij: wymiary dokładne, materiały, grubości profili, kolory, dodatki, parametry techniczne, normy, gwarancję, certyfikaty.'
    },
    {
        id: 'doc-installation-guide',
        category: 'documentation',
        title: 'Instrukcja Montażu',
        icon: '📖',
        description: 'Przewodnik instalacji',
        prompt: 'Stwórz instrukcję montażu pergoli: przygotowanie podłoża, fundamenty, montaż konstrukcji, instalacja lameli, podłączenie LED, regulacja, testy. Narzędzia, środki bezpieczeństwa, czas realizacji.'
    },
    {
        id: 'doc-maintenance',
        category: 'documentation',
        title: 'Konserwacja',
        icon: '🧹',
        description: 'Pielęgnacja produktu',
        prompt: 'Instrukcja konserwacji pergoli aluminiowej: czyszczenie konstrukcji (jak często, czym), pielęgnacja lameli, smarowanie mechanizmów, sprawdzanie śrub, czyszczenie rynien, przygotowanie do zimy, co robić po gradzie/burzy.'
    },
    {
        id: 'doc-warranty',
        category: 'documentation',
        title: 'Warunki Gwarancji',
        icon: '📜',
        description: 'Dokument gwarancyjny',
        prompt: 'Przygotuj dokument warunków gwarancji: okres gwarancji (konstrukcja, powłoka, mechanizmy, elektronika), co obejmuje gwarancja, wyłączenia, procedura reklamacji, serwis pogwarancyjny, części zamienne.'
    },
];

// Helper function to get prompts by category
export const getPromptsByCategory = (category: string): PresetPrompt[] => {
    return PRESET_PROMPTS.filter(p => p.category === category);
};

// Helper function to search prompts
export const searchPrompts = (query: string): PresetPrompt[] => {
    const lowerQuery = query.toLowerCase();
    return PRESET_PROMPTS.filter(p =>
        p.title.toLowerCase().includes(lowerQuery) ||
        p.description?.toLowerCase().includes(lowerQuery) ||
        p.prompt.toLowerCase().includes(lowerQuery)
    );
};

// Get prompts that require real data
export const getDataRequiredPrompts = (): PresetPrompt[] => {
    return PRESET_PROMPTS.filter(p => p.requiresData);
};
