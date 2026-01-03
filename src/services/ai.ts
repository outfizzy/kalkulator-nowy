import type { Offer } from '../types';
import { translate } from '../utils/translations';

const SYSTEM_PROMPT = `
Jesteś doświadczonym, niemieckojęzycznym sprzedawcą zadaszeń tarasowych (Terrassenüberdachungen).
Twój styl jest: profesjonalny, uprzejmy, ale przekonujący (persuasive).
Twoim zadaniem jest napisanie spersonalizowanego wstępu do oferty (Anschreiben) w języku NIEMIECKIM.

Zasady:
1. Użyj zwrotów grzecznościowych dopasowanych do klienta (Sehr geehrte Frau X / Sehr geehrter Herr Y).
2. Odnieś się do konkretnych cech wybranego produktu (Model, wymiary, kolor), podkreślając ich zalety.
3. Jeśli klient wybrał poliwęglan IR-Gold, wspomnij o redukcji ciepła.
4. Jeśli klient wybrał szkło, wspomnij o elegancji i świetle.
5. Jeśli są dodatki (LED, ściany), wspomnij jak zwiększą komfort.
6. Tekst ma być zwięzły (max 3-4 zdania wstępu + 2 zdania o produkcie).
7. Nie zmyślaj faktów.
`;

export class AiService {
    private static async getApiKey(user: any): Promise<string | null> {
        // First check user profile settings
        if (user?.emailConfig?.openaiKey) return user.emailConfig.openaiKey;

        // Fallback to provided key (Temporary/Dev)
        // SECURITY ALERT: Removed hardcoded key. 
        // User must provide key in settings or use env var.
        return null; // import.meta.env.VITE_OPENAI_API_KEY || null;
    }

    static async generateOfferIntro(offer: Offer, user: any): Promise<string> {
        const apiKey = await this.getApiKey(user);

        if (!apiKey) {
            throw new Error("Brak klucza API OpenAI. Skonfiguruj go w ustawieniach profilu.");
        }

        // Construct context for AI
        const context = {
            customer: offer.customer,
            product: {
                model: translate(offer.product.modelId, 'models'),
                size: `${offer.product.width}mm x ${offer.product.projection}mm`,
                color: translate(offer.product.color, 'colors'),
                roof: translate(offer.product.roofType, 'roofTypes'),
                addons: offer.product.addons.map(a => a.name).join(', ')
            },
            snowZone: offer.snowZone.description
        };

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini', // or gpt-3.5-turbo for speed/cost
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        { role: 'user', content: `Napisz wstęp do oferty dla: ${JSON.stringify(context)}` }
                    ],
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error?.message || 'Błąd API OpenAI');
            }

            const data = await response.json();
            return data.choices[0]?.message?.content || '';
        } catch (error) {
            console.error("AI Generation Error", error);
            throw error;
        }
    }

    static async generateEmail(offer: Offer, user: any): Promise<string> {
        const apiKey = await this.getApiKey(user);

        if (!apiKey) {
            throw new Error("Brak klucza API OpenAI.");
        }

        const context = {
            customer: offer.customer,
            product: {
                model: translate(offer.product.modelId, 'models'),
                size: `${offer.product.width}mm x ${offer.product.projection}mm`,
                addons: offer.product.addons.map(a => a.name).join(', '),
                imageUrl: offer.product.imageUrl
            },
            salesRep: user ? `${user.firstName} ${user.lastName}` : 'PolenDach24 Team'
        };

        const EMAIL_PROMPT = `
        Napisz treść maila do klienta z ofertą na zadaszenie tarasu.
        Język: NIEMIECKI.
        Styl: Uprzejmy, zachęcający do zakupu, podkreślający jakość.
        
        Dane:
        Klient: ${JSON.stringify(context.customer)}
        Produkt: ${JSON.stringify(context.product)}
        Nadawca: ${context.salesRep}

        Struktura:
        1. Powitanie (po nazwisku).
        2. Podziękowanie za rozmowę/zainteresowanie.
        3. Krótkie wspomnienie o zaletach wybranego modelu (${context.product.model}).
        4. Zachęcenie do kontaktu w razie pytań.
        5. Jeśli dostępny jest URL zdjęcia (${context.product.imageUrl ? 'Dostępny' : 'Brak'}), wstaw go w treści jako link do wizualizacji/zdjęcia poglądowego ze słowami "Hier sehen Sie Ihr konfiguriertes Modell: [URL]".
        6. Stopka.
        `;

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: 'Jesteś asystentem sprzedaży.' },
                        { role: 'user', content: EMAIL_PROMPT }
                    ],
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                throw new Error('Błąd API OpenAI');
            }

            const data = await response.json();
            return data.choices[0]?.message?.content || '';
        } catch (error) {
            console.error("AI Email Generation Error", error);
            throw error;
        }
    }

    static async interpretVisualizerCommand(command: string, currentConfig: any, user: any): Promise<Partial<any>> {
        const apiKey = await this.getApiKey(user);

        if (!apiKey) {
            throw new Error("Brak klucza API OpenAI. Skonfiguruj go w ustawieniach profilu.");
        }

        const SYSTEM_PROMPT = `
        Jesteś inteligentnym kontrolerem konfiguratora zadaszeń 3D.
        Twoim zadaniem jest przetłumaczenie poleceń użytkownika (PL/DE/EN) na obiekt JSON aktualizujący konfigurację.
        
        SCHEMAT KONFIGURACJI:
        - modelId: 'trendstyle', 'trendstyle_plus', 'orangestyle', 'topstyle', 'topstyle_xl', 'skystyle'
        - width: liczba (3000-12000 mm)
        - projection: liczba (2000-5000 mm)
        - color: 'RAL 7016', 'RAL 9006', 'RAL 9010', 'RAL 9007', 'RAL 8014'
        - roofType: 'polycarbonate', 'glass'
        - installationType: 'wall-mounted', 'freestanding'
        
        LOGIKA ZMIAN:
        1. Jeśli komenda dotyczy dodania dodatku (np. "dodaj markizę"), zwróć: { "_action": "add_addon", "type": "awning" }
           Typy dodatków: 'awning', 'zipScreen', 'heater', 'lighting', 'wpc-floor', 'slidingWall'.
        2. Jeśli usunięcie: { "_action": "remove_addon", "type": "..." }
        3. Jeśli zmiana wymiarów/koloru/modelu: zwróć { "klucz": "wartość" }.
           Np. "Zmień na biały" -> { "color": "RAL 9010" }.
           "Szerokość 5 metrów" -> { "width": 5000 }.
        
        Zwróć TYLKO poprawny JSON.
        Aktualna konfiguracja (dla kontekstu): ${JSON.stringify(currentConfig)}
        `;

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        { role: 'user', content: command }
                    ],
                    temperature: 0.2,
                    response_format: { type: "json_object" }
                })
            });

            if (!response.ok) {
                throw new Error('Błąd API OpenAI');
            }

            const data = await response.json();
            const content = data.choices[0]?.message?.content;
            return content ? JSON.parse(content) : {};
        } catch (error) {
            console.error("AI Command Error", error);
            throw error;
        }
    }
}
