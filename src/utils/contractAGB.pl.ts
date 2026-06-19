/**
 * Ogólne Warunki Umowy (OWU) zadaszto.pl — wersja polska.
 *
 * Lustro struktury niemieckich AGB (bestellscheinAGB.ts), dostosowane do polskiego
 * prawa (m.in. prawo odstąpienia konsumenta — 14 dni, rękojmia/gwarancja, RODO).
 *
 * ⚠️ WAŻNE: to profesjonalny SZABLON wyjściowy. Przed użyciem produkcyjnym
 *    wymaga akceptacji / przeglądu prawnego (radca prawny). Edytuj treść tutaj,
 *    bez ruszania layoutu PDF.
 */

export const AGB_SECTIONS_PL: Array<{ title: string; items: string[] }> = [
    {
        title: '§1. Postanowienia ogólne i zakres obowiązywania',
        items: [
            'Niniejsze Ogólne Warunki Umowy (OWU) mają zastosowanie do wszystkich umów zawieranych pomiędzy Polendach24 s.c. działającą pod marką zadaszto.pl (dalej „Wykonawca") a jej klientami (dalej „Zamawiający").',
            'OWU stanowią integralną część umowy. Zawierając umowę, Zamawiający potwierdza, że zapoznał się z ich treścią i ją akceptuje.',
            'Odmienne lub uzupełniające warunki Zamawiającego stają się częścią umowy wyłącznie wtedy, gdy zostały wyraźnie potwierdzone przez Wykonawcę w formie dokumentowej.',
        ],
    },
    {
        title: '§2. Zawarcie umowy i potwierdzenie zamówienia',
        items: [
            'Zamówienie złożone przez Zamawiającego stanowi ofertę zawarcia umowy. Umowa zostaje zawarta z chwilą jej podpisania przez obie strony lub wyraźnego potwierdzenia zamówienia przez Wykonawcę.',
            'Zamawiający zobowiązany jest niezwłocznie sprawdzić poprawność i kompletność potwierdzenia zamówienia, w szczególności w zakresie wymiarów, koloru i wybranego modelu. Wszelkie błędy i rozbieżności należy zgłosić Wykonawcy na piśmie przed rozpoczęciem produkcji. Późniejsze zmiany mogą wiązać się z dodatkowymi kosztami oraz wydłużeniem terminu realizacji.',
            'Ustalenia dodatkowe, zapewnienia lub zmiany zamówienia są wiążące wyłącznie po ich potwierdzeniu przez Wykonawcę w formie dokumentowej. Ekipa montażowa nie jest upoważniona do dokonywania zmian ani uzupełnień umowy.',
        ],
    },
    {
        title: '§3. Przedmiot umowy, zmiany techniczne i tytuł prawny do nieruchomości',
        items: [
            'Przedmiotem umowy są uzgodnione w zamówieniu świadczenia w zakresie projektowania, dostawy i montażu zadaszeń aluminiowych lub stalowych wraz z wyposażeniem dodatkowym.',
            'Wykonawca zastrzega sobie prawo do wprowadzania technicznie niezbędnych zmian lub ulepszeń, o ile nie pogarszają one funkcjonalności, bezpieczeństwa, jakości ani wyglądu produktu i nie powodują niekorzyści cenowej dla Zamawiającego.',
            'Zamawiający oświadcza, że jest właścicielem nieruchomości, której dotyczy montaż, albo posiada ważną zgodę właściciela na montaż konstrukcji. Wykonawca ma prawo żądać przedstawienia stosownego dokumentu przed rozpoczęciem montażu.',
        ],
    },
    {
        title: '§4. Ceny',
        items: [
            'Obowiązują ceny wskazane w umowie wraz z należnym podatkiem VAT, o ile nie zaznaczono inaczej.',
            'Jeżeli na życzenie Zamawiającego wprowadzone zostaną zmiany lub jeżeli z przyczyn niemożliwych do przewidzenia (np. dodatkowe wymagania urzędowe, przeszkody budowlane, niezgłoszone instalacje podziemne) powstaną dodatkowe koszty, ponosi je Zamawiający.',
            'Jeżeli realizacja zamówienia opóźni się o więcej niż sześć miesięcy z przyczyn nieleżących po stronie Wykonawcy, Wykonawca ma prawo dostosować ceny do aktualnych kosztów materiałów, robocizny i transportu. Jeżeli podwyżka przekroczy 10%, Zamawiającemu przysługuje prawo odstąpienia od umowy w terminie 7 dni od powiadomienia, bez kary umownej.',
        ],
    },
    {
        title: '§5. Warunki płatności i zastrzeżenie własności',
        items: [
            'O ile w umowie nie ustalono inaczej, zaliczka w wysokości uzgodnionej w umowie jest płatna przy jej zawarciu.',
            'Kolejna część wynagrodzenia płatna jest przy dostawie materiałów (przed rozpoczęciem montażu), a pozostała część — po zakończeniu montażu, najpóźniej przy odbiorze.',
            'Przy zamówieniach częściowych lub etapowej dostawie i montażu obowiązują odrębne warunki płatności ustalone w formie dokumentowej.',
            'W przypadku opóźnienia w płatności Wykonawca ma prawo wstrzymać dalszą realizację oraz naliczyć ustawowe odsetki za opóźnienie, a także koszty odzyskania należności zgodnie z obowiązującymi przepisami.',
            'Wszystkie dostarczone towary i zamontowane elementy pozostają własnością Wykonawcy do chwili pełnej zapłaty wszystkich należności (zastrzeżenie własności). Do tego czasu Zamawiający nie może ich zbywać, obciążać ani przekazywać osobom trzecim.',
        ],
    },
    {
        title: '§6. Obowiązki współdziałania Zamawiającego',
        items: [
            'Zamawiający zobowiązany jest przygotować teren montażu zgodnie z wymaganiami określonymi w umowie, w szczególności: uprzątnąć teren, zapewnić dostęp, zgłosić instalacje podziemne oraz zapewnić dostęp do energii elektrycznej i wody.',
            'W przypadku braku należytego przygotowania Wykonawca ma prawo przerwać prace lub ich nie rozpoczynać. Wszelkie wynikające z tego dodatkowe koszty, przestoje i dodatkowe dojazdy obciążają Zamawiającego.',
            'Dodatkowe prace wynikające z nieprzewidzianych przeszkód rozliczane są odrębnie według aktualnego cennika.',
        ],
    },
    {
        title: '§7. Odbiór, przejście ryzyka i ryzyko utraty',
        items: [
            'Odbiór następuje bezpośrednio po zakończeniu montażu, w obecności Zamawiającego i ekipy montażowej. Sporządza się protokół odbioru podpisywany przez obie strony.',
            'Wady nieistotne nie uprawniają Zamawiającego do odmowy odbioru.',
            'Jeżeli Zamawiający odmawia odbioru mimo ukończenia prac, ryzyko przypadkowej utraty lub pogorszenia rzeczy przechodzi na Zamawiającego.',
            'Po wydaniu lub po popadnięciu w zwłokę z odbiorem Zamawiający ponosi ryzyko oraz ciężary i pożytki związane z rzeczą.',
        ],
    },
    {
        title: '§8. Zakaz użytkowania przed odbiorem i zapłatą',
        items: [
            'Użytkowanie dostarczonej i/lub zamontowanej konstrukcji przed pełnym odbiorem i pełną zapłatą jest niedozwolone. Naruszenie tego zakazu skutkuje utratą uprawnień z tytułu gwarancji w zakresie powstałych szkód i może prowadzić do roszczeń odszkodowawczych.',
            'Ingerencje, samodzielne naprawy, demontaż lub zlecanie prac osobom trzecim bez wyraźnej zgody Wykonawcy powodują wygaśnięcie wszelkich uprawnień z tytułu rękojmi i gwarancji.',
        ],
    },
    {
        title: '§9. Rękojmia i warunki gwarancji',
        items: [
            'Wykonawca udziela od dnia odbioru następujących okresów gwarancji (o ile w umowie nie ustalono inaczej):\n  - 5 lat na stabilność konstrukcji i prawidłowy montaż,\n  - 10 lat na powłokę proszkową elementów aluminiowych,\n  - 2 lata na napędy mechaniczne, sterowniki, oświetlenie LED i akcesoria,\n  - 1 rok na promienniki grzewcze,\n  - do 10 lat na płyty poliwęglanowe (malejąco: 100% przez pierwsze 5 lat, następnie degresywnie zgodnie z danymi producenta), z wyłączeniem naturalnej kondensacji, uszkodzeń gradowych i wody w kanałach.',
            'Reklamacje należy zgłaszać w formie dokumentowej (z dokumentacją zdjęciową) niezwłocznie po stwierdzeniu wady.',
            'Gwarancja nie obejmuje szkód powstałych wskutek niewłaściwego użytkowania, nieprzestrzegania zaleceń pielęgnacyjnych, wyjątkowych warunków atmosferycznych, samowolnych ingerencji lub normalnego zużycia.',
            'Wykonawca ma prawo do naprawy lub wymiany. W razie dwukrotnej nieudanej naprawy Zamawiający może żądać odpowiedniego obniżenia ceny lub odstąpić od umowy.',
            'Za wady nie uznaje się: niewielkich odchyleń koloru, odchyleń optycznych mieszczących się w normach, tolerancji produkcyjnych (np. profili aluminiowych do 1,5 mm/m), dopuszczalnych zjawisk optycznych szkła i poliwęglanu oraz naturalnych reakcji materiału (np. odkształceń przy zmianach temperatury), jeżeli nie są widoczne z typowej odległości.',
            'Wszelkie świadczenia z tytułu rękojmi i gwarancji realizowane są wyłącznie przez Wykonawcę lub autoryzowanych partnerów.',
            'Za nieuzasadnione wezwania serwisowe naliczana jest opłata ryczałtowa wraz z kosztami dojazdu. Po upływie okresu gwarancji serwis może być wykonany odpłatnie.',
            'Powyższe postanowienia nie wyłączają, nie ograniczają ani nie zawieszają uprawnień Zamawiającego będącego konsumentem wynikających z bezwzględnie obowiązujących przepisów prawa.',
        ],
    },
    {
        title: '§10. Prawo odstąpienia konsumenta',
        items: [
            'Zamawiający będący konsumentem, który zawarł umowę poza lokalem przedsiębiorstwa lub na odległość, ma prawo odstąpić od umowy w terminie 14 dni bez podania przyczyny, składając stosowne oświadczenie.',
            'Prawo odstąpienia nie przysługuje m.in. w odniesieniu do umów, w których przedmiotem świadczenia jest rzecz nieprefabrykowana, wyprodukowana według specyfikacji konsumenta lub służąca zaspokojeniu jego zindywidualizowanych potrzeb (zadaszenia wykonywane na wymiar).',
            'Jeżeli konsument zażąda rozpoczęcia świadczenia usług przed upływem terminu na odstąpienie, a następnie odstąpi od umowy, zobowiązany jest zapłacić za świadczenia spełnione do chwili odstąpienia.',
        ],
    },
    {
        title: '§11. Ochrona danych osobowych',
        items: [
            'Wykonawca przetwarza dane osobowe Zamawiającego wyłącznie w celu realizacji umowy, zgodnie z RODO. Szczegóły określa odrębna klauzula informacyjna oraz polityka prywatności.',
        ],
    },
    {
        title: '§12. Siła wyższa',
        items: [
            'Obie strony są zwolnione z obowiązku wykonania umowy na czas i w zakresie zdarzeń siły wyższej (w szczególności klęski żywiołowe, pandemie, wojna, strajk).',
            'Strona, której dotyczy siła wyższa, niezwłocznie informuje o tym drugą stronę.',
            'Jeżeli zdarzenie trwa dłużej niż 60 dni, każda ze stron ma prawo wypowiedzieć umowę ze skutkiem na przyszłość. Rozliczone zostają wówczas wyłącznie koszty rzeczywiście poniesione do tego momentu.',
        ],
    },
    {
        title: '§13. Prawo właściwe i właściwość sądu',
        items: [
            'Do niniejszej umowy stosuje się prawo polskie.',
            'Sądem właściwym jest sąd właściwy dla siedziby Wykonawcy, o ile nie sprzeciwiają się temu bezwzględnie obowiązujące przepisy o ochronie konsumentów.',
            'Strony zobowiązują się w pierwszej kolejności dążyć do polubownego rozwiązania sporu przed wszczęciem postępowania sądowego.',
        ],
    },
    {
        title: '§14. Postanowienia końcowe',
        items: [
            'Zmiany lub uzupełnienia niniejszej umowy wymagają formy dokumentowej pod rygorem bezskuteczności.',
            'Jeżeli którekolwiek z postanowień niniejszych OWU okaże się nieważne, pozostałe postanowienia zachowują ważność. Strony zobowiązują się zastąpić nieważne postanowienie regulacją dopuszczalną prawnie, najbliższą celowi gospodarczemu postanowienia nieważnego.',
            'OWU wchodzą w życie z dniem ich publikacji i obowiązują dla wszystkich umów zawartych po tej dacie.',
        ],
    },
];

export const RODO_SECTION_PL = {
    title: 'Klauzula informacyjna RODO',
    items: [
        'Administratorem danych osobowych jest Polendach24 s.c. (marka zadaszto.pl), Kolonia Wałowice 221/33, 66-620 Gubin, NIP 9261695520.',
        'Dane osobowe udostępnione w związku z zawarciem i realizacją umowy przetwarzane są wyłącznie w celu realizacji zamówienia, kontaktu, obsługi klienta, rozliczeń finansowych oraz wypełnienia obowiązków prawnych (podstawa: art. 6 ust. 1 lit. b i c RODO).',
        'Dane mogą być przekazywane podmiotom trzecim wyłącznie w zakresie niezbędnym do realizacji umowy (np. firmy transportowe, biuro rachunkowe, dostawcy usług IT) lub gdy wymagają tego przepisy prawa.',
        'Każdej osobie, której dane dotyczą, przysługuje prawo dostępu do danych, ich sprostowania, usunięcia, ograniczenia przetwarzania, wniesienia sprzeciwu, przenoszenia danych oraz cofnięcia zgody w dowolnym momencie (jeżeli przetwarzanie odbywa się na podstawie zgody), a także prawo wniesienia skargi do Prezesa UODO.',
        'Dane przechowywane są przez okres niezbędny do realizacji umowy, rozliczeń i wypełnienia obowiązków prawnych, a następnie usuwane lub anonimizowane.',
        'Szczegółowe informacje o przetwarzaniu danych, prawach osób oraz danych kontaktowych administratora znajdują się w polityce prywatności na stronie zadaszto.pl.',
    ],
};
