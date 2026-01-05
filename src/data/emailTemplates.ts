export interface EmailTemplate {
    id: string;
    name: string;
    subject: string;
    body: string;
}

export const SALES_TEMPLATES: EmailTemplate[] = [
    {
        id: 'welcome_contact',
        name: 'Szybki Start (Powitanie)',
        subject: 'Pytanie dot. Państwa zapytania - PolenDach24',
        body: `Szanowny Panie / Szanowna Pani {{lastName}},

Dziękuję za kontakt z PolenDach24. Otrzymaliśmy Państwa zapytanie dotyczące zadaszenia.

Aby przygotować precyzyjną wycenę, chciałbym dopytać o kilka szczegółów technicznych (m.in. wymiary, rodzaj dachu). Czy moglibyśmy porozmawiać telefonicznie w dogodnym dla Państwa terminie?

Zależy nam na dobraniu rozwiązania idealnie dopasowanego do Państwa tarasu.

Z poważaniem,
{{signature}}`
    },
    {
        id: 'send_offer',
        name: 'Ekskluzywna Oferta (Wycena)',
        subject: 'Indywidualna oferta na zadaszenie tarasu - PolenDach24',
        body: `Szanowny Panie / Szanowna Pani {{lastName}},

W załączniku przesyłam przygotowaną indywidualną ofertę na zadaszenie tarasu.

Postawiliśmy na najwyższą jakość profilu aluminiowego oraz bezpieczeństwo konstrukcji, co jest standardem w naszych realizacjach na terenie Niemiec i Polski. Oferowane rozwiązanie to inwestycja na lata, gwarantująca spokój i komfort użytkowania.

Będę wdzięczny za informację zwrotną po zapoznaniu się z wyceną. W razie pytań pozostaję do dyspozycji.

Z poważaniem,
{{signature}}`
    },
    {
        id: 'follow_up_1',
        name: 'Follow-up (Brak odpowiedzi)',
        subject: 'Czy temat zadaszenia jest aktualny?',
        body: `Szanowny Panie / Szanowna Pani {{lastName}},

Wracam do Pana/Pani z pytaniem odnośnie przesłanej ostatnio oferty. Czy udało się już z nią zapoznać?

Chciałbym wiedzieć, czy projekt zadaszenia jest nadal aktualny, czy może zdecydowali się Państwo odłożyć realizację na później? Jeśli mają Państwo jakiekolwiek wątpliwości lub pytania co do specyfikacji, chętnie je wyjaśnię.

Zależy mi na tym, aby mieli Państwo pełny obraz możliwości.

Czekam na wieści.

Z poważaniem,
{{signature}}`
    }
];
