/**
 * Konfiguracja bloga Sploty oraz lista artykułów.
 *
 * Wątki tematyczne: Technologia, Muzyka, Filozofia, Język, Piastowie.
 * Aby dodać nowy wpis, dopisz kolejny obiekt na początku tablicy BLOG_POSTS.
 */

window.SITE_CONFIG = {
  siteName: 'Sploty',
  tagline: 'Technologia · Muzyka · Filozofia · Język · Północ · Piastowie',
  author: 'ᛖᚲᚹᛁᛗᚨᚾᚦᛟᚱᚾ',
  authorLabel: 'Equimanthorn',
  email: 'kontakt@example.com',
  intro:
    'Zapiski ze styku <em>technologii</em>, ekstremalnego <em>metalu</em>, <em>filozofii</em>, <em>języka</em>, <em>mitów północy</em> oraz <em>państwa Piastów i wczesnego polskiego średniowiecza</em>. Surowy indeks myśli — pod patronatem Huginna i Muninna.',
  footerLinks: [
    { label: 'GitHub', url: 'https://github.com/' },
    { label: 'Kontakt', url: 'mailto:kontakt@example.com' }
  ],
  miscellanea: {
    title: 'Miscellanea',
    lead: 'Rzeczy pomieszane, drobne znaleziska, odsłuchy, wypisy z kronik i lektur oraz glosy na marginesie.',
    etymologyLabel: 'Nota etymologiczna · łac.',
    etymologyText:
      'W języku łacińskim słowo <em>miscellanea</em> (rzeczy pomieszane, różności) jest urzeczownikowioną formą liczby mnogiej rodzaju nijakiego (<em>neutrum pluralis</em>) od przymiotnika <em>miscellaneus, -a, -um</em> (różnorodny, mieszany).'
  },
  about: {
    title: 'O Splotach',
    lead: 'Pozornie odległe dziedziny — od architektury kodu i dźwięku po grody pierwszych Piastów — które w praktyce zadają bardzo podobne pytania o formę, strukturę i trwałość.',
    avatar: 'images/equimanthorn.jpg',
    avatarCaption: 'ᛖᚲᚹᛁᛗᚨᚾᚦᛟᚱᚾ · Equimanthorn',
    content: `
**Sploty** to osobiste archiwum esejów i notatek wokół dziedzin, które najczęściej wracają w moich rozmowach, lekturach i odsłuchach.

## Główne wątki

- **Technologia (ᚲ Kenaz)** — narzędzia, prostota architektury, trwałość zwykłego tekstu i to, jak systemy cyfrowe kształtują naszą uwagę.
- **Muzyka (ᚦ Thurisaz)** — death metal i black metal czytane nie jako powierzchowna estetyka buntu, lecz jako laboratorium brzmienia, dysonansu, rytmu i przestrzeni.
- **Filozofia (ᛗ Mannaz)** — pytania o poznanie, granice racjonalności, tradycje symboliczne i sens pojęć, których używamy bez zastanowienia.
- **Język (ᚨ Ansuz)** — składnia, metafory, przekład i momenty, w których słowa zaczynają myśleć za nas.
- **Północ i Mity (ᛟ Othala)** — kultura nordycka, *Edda*, runy starszego futharku i motyw nici losu (*Urðr*), z którego wyrasta sama nazwa **Sploty**.
- **Piastowie i Wczesne Średniowiecze** — mechanizm budowy państwa Mieszka I i Bolesława Chrobrego, sieć wielkopolskich grodów (Gniezno, Poznań, Ostrów Lednicki, Giecz), konstrukcja dębowych wałów hakowych, najstarsze mennictwo, kroniki (Ibrahim ibn Jakub, Thietmar, *Dagome iudex*, Gall Anonim) oraz związki Piastów ze światem skandynawskim.

## Forma strony

Zrezygnowałem z wielkich zdjęć i wizualnego zgiełku. Strona działa w czystym **HTML, CSS i JavaScript** na **GitHub Pages** — jest zaprojektowana do spokojnego, wieczornego czytania.

Jeśli chcesz podyskutować o którymś z tekstów lub polecić płytę albo książkę, [napisz do mnie](mailto:kontakt@example.com).
`
  }
};

window.BLOG_POSTS = [
  {
    slug: 'architektura-wladzy-grody-waly-panstwo-piastow',
    title: 'Architektura władzy — grody, dębowe wały i narodziny państwa Piastów',
    date: '2026-11-22',
    category: 'Piastowie',
    excerpt:
      'Jak w ciągu dwóch pokoleń na nizinie wielkopolskiej wyrosła sprawna machina państwowa: dendrochronologia, wały hakowe, drużyna książęca i północne sploty.',
    content: `
Kiedy patrzymy na mapę Europy połowy X wieku, tempo, w jakim uformowało się władztwo pierwszych Piastów, wciąż budzi zdumienie historyków i archeologów. W ciągu zaledwie kilkudziesięciu lat dawne, rozproszone osadnictwo plemienne w Wielkopolsce zostało zastąpione spójną siecią potężnych ośrodków centralnych: **Gniezna, Poznania, Ostrowa Lednickiego, Giecza i Grzybowa**.

Co najważniejsze, wiemy o tym dziś nie tylko z późniejszych kronik, lecz z samych słojów drzewa. Badania dendrochronologiczne ściętych dębów pokazują bezprecedensową skalę logistycznej mobilizacji — na budowę jednego dużego grodu potrzeba było dziesiątek tysięcy metrów sześciennych drewna, wycinanego i transportowanego w precyzyjnym, narzuconym odgórnie rytmie.

## Wał hakowy jako inżynieria systemu

Symbolem wczesnopiastowskiej myśli technicznej stała się **konstrukcja hakowa** wałów obronnych. Pnie dębowe z pozostawionymi naturalnymi hakami gałęzi spinały kolejne warstwy skrzyń i rusztów wypełnionych ziemią oraz kamieniami, uniemożliwiając rozsuwanie się nasypu pod własnym ciężarem.

- Wały osiągały u podstawy kilkanaście, a miejscami nawet ponad dwadzieścia metrów szerokości.
- Chroniły nie tylko rezydencje książęce (*palatia*) i najstarsze kamienne kaplice, lecz także skarbce ze srebrem siekanym, zbrojownie i zapasy zboża.
- Sieć grodów tworzyła w praktyce pierwszą infrastrukturę administracyjną i fiskalną kraju — fizyczny szkielet państwa, zanim jeszcze pojawiła się rozbudowana kancelaria.

> Zanim państwo Piastów zostało opisane atramentem na pergaminie w regestach *Dagome iudex* i kronikach Thietmara, zostało zapisane w dębinie, kamieniu i srebrze.

## Drużyna, srebro i północny horyzont

Relacja kupca z Tortosy, **Ibrahima ibn Jakuba** (ok. 965/966), ukazuje państwo Mieszka I jako organizm zaskakująco uporządkowany: książę pobiera podatki w odważnikach handlowych, utrzymuje stałą, liczną drużynę zbrojnych i zaopatruje ją w konie, broń oraz odzież.

Jednocześnie wczesne polskie średniowiecze nie powstawało w izolacji. Na Ostrowie Lednickim, w Gieczu czy nad dolną Odrą w okolicach Wolina krzyżowały się wpływy cesarstwa ottońskiego, Czech i **świata skandynawskiego** — widoczne w typach uzbrojenia, srebrnych skarbach z dirhamami i dynastycznych sojuszach, z małżeństwem **Świętosławy** (córki Mieszka I) na czele.

---

Zjazd Gnieźnieński w roku 1000, wręczenie Bolesławowi Chrobremu kopii **Włóczni św. Maurycego** i wybicie denarów z napisem *Princes Polonie* nie były nagłym cudem politycznym, lecz zwieńczeniem żmudnej, niezwykle konsekwentnej budowy struktur władzy.
`
  },
  {
    slug: 'cisza-pod-sciana-dzwieku-black-metal',
    title: 'Cisza pod ścianą dźwięku — o przestrzeni w black metalu',
    date: '2026-11-21',
    category: 'Muzyka',
    excerpt:
      'Dlaczego najbardziej surowe, przesterowane nagrania black metalowe potrafią działać na słuchacza jak medytacja, a nie jak hałas.',
    content: `
Na pierwszy rzut ucha klasyczny black metal wydaje się całkowitym zaprzeczeniem ciszy. Tremolo gitarowe, jednostajny szum talerzy i surowa produkcja tworzą gęstą, nieprzepuszczalną ścianę dźwięku.

A jednak po kilku minutach słuchania zachodzi ciekawy paradoks percepcyjny: gdy wszystkie częstotliwości zlewają się w jednorodną fakturę, umysł przestaje śledzić pojedyncze uderzenia i zaczyna słyszeć **przestrzeń** — dokładnie tak samo, jak w jednostajnym szumie deszczu lub wiatru.

## Surowość jako świadomy minimalizm

W przeciwieństwie do sterylnej, przeprodukowanej muzyki mainstreamowej, surowy zapis nie ukrywa niedoskonałości. Zostawia ślad pomieszczenia, szum taśmy i fizyczny wysiłek muzyków.

> Ekstremalny metal jest bliski ascezie: odrzuca komfortową gładkość, żeby odsłonić sam szkielet napięcia i atmosfery.

## Dwie strony ekstremum: black i death

Jeśli black metal operuje często przestrzenią, chłodem i hipnotyczną powtarzalnością, to **death metal** skupia się na architekturze ciężaru — precyzyjnej rytmice, dysonansowej polifonii i fizycznej gęstości riffu. Oba gatunki spotykają się tam, gdzie forma przestaje być dekoracją, a staje się czystą strukturą.

---

Dobry album z obu tych światów wymaga tego samego, czego wymaga trudny esej filozoficzny: uwagi i gotowości na początkowy opór.
`
  },
  {
    slug: 'granice-opisu-i-urok-niejasnosci',
    title: 'Granice opisu — czego język formalny nie potrafi domknąć',
    date: '2026-11-16',
    category: 'Filozofia',
    excerpt:
      'Między precyzją traktatu a wieloznacznością potocznego zdania kryje się przestrzeń, z której biorą się najciekawsze pytania.',
    content: `
Od czasów wczesnego Wittgensteina kusi nas wizja języka doskonale przezroczystego — takiego, w którym każde zdanie odpowiada jasno określonemu stanowi rzeczy, a nieporozumienia znikają wraz z definicją pojęć.

Im częściej jednak próbujemy opisać doświadczenie estetyczne, zmianę kulturową albo intuicję moralną, tym szybciej okazuje się, że zbytnia precyzja potrafi **zgubić sam przedmiot opisu**.

## Jasność to nie to samo co prostota

Złożone myśli nie muszą być mętne, ale rzadko dają się zamknąć w jednym haśle. Rola filozofii polega często nie na dostarczaniu gotowych odpowiedzi, lecz na pokazywaniu, w którym miejscu nasze dotychczasowe pojęcia zaczynają pękać.

- Definicja porządkuje rozmowę, ale bywa też wygodną zasłoną.
- Dobre pytanie rozbija automatyzm myślenia.
- Niejasność bywa nie błędem tekstu, lecz śladem realnej złożoności świata.

> O czym nie można mówić wprost, o tym wciąż próbujemy mówić przez rytm, metaforę i dysonans.
`
  },
  {
    slug: 'slowa-ktore-mysla-za-nas',
    title: 'Słowa, które myślą za nas — metafory w języku technologii',
    date: '2026-11-10',
    category: 'Język',
    excerpt:
      '„Chmura”, „strumień”, „pamięć”, „halucynacja” — niewinne zapożyczenia, które po cichu narzucają sposób rozumienia maszyn.',
    content: `
Język technologii udaje chłodny i obiektywny, ale w rzeczywistości jest pełen martwych i żywych metafor. Kiedy mówimy o *chmurze*, zapominamy o tysiącach ton stali, kabli podmorskich i zużytej energii w centrach danych.

Kiedy mówimy, że model językowy *myśli* albo *halucynuje*, nieświadomie przenosimy na statystyczny mechanizm słownik ludzkiej psychologii.

## Dlaczego dobór słów ma znaczenie?

Metafora nie jest tylko ozdobą stylu — wyznacza granice tego, jakie pytania przychodzą nam do głowy.

1. Inaczej projektujemy narzędzie, gdy nazywamy je *asystentem*, a inaczej, gdy nazywamy je *kompilatorem*.
2. Inaczej oceniamy ryzyko, gdy mówimy o *wycieku*, a inaczej, gdy mówimy o *skopiowaniu cudzej prywatności*.
3. Uważna higiena językowa jest dziś jedną z najbardziej praktycznych umiejętności technicznych.

---

Zanim zaczniemy spierać się o rozwiązanie, warto przyjrzeć się słowom, w których postawiliśmy problem.
`
  },
  {
    slug: 'architektura-prostoty-i-trwalosc-tekstu',
    title: 'Architektura prostoty — dlaczego zwykły tekst przetrwa kolejne dekady',
    date: '2026-11-04',
    category: 'Technologia',
    excerpt:
      'Formaty zamknięte i rozbudowane platformy znikają co kilka lat. Czysty tekst, HTML i prosty system plików okazują się zadziwiająco odporne na czas.',
    content: `
Większość oprogramowania, którego używaliśmy piętnaście lat temu, dziś już nie istnieje albo nie da się go uruchomić bez emulatora. Tymczasem plik tekstowy zapisany w UTF-8 w 1998 roku otworzy się dzisiaj bez najmniejszego zgrzytu.

Ta asymetria powinna dawać do myślenia każdemu, kto buduje coś z myślą o dłuższym horyzoncie niż jeden kwartał.

## Entropia nowoczesnych narzędzi

Każda dodatkowa warstwa abstrakcji ma swoją cenę: zależności, aktualizacje, awarie łańcucha budowania. Minimalistyczna strona statyczna na **GitHub Pages** to świadomy krok w przeciwną stronę.

\`\`\`html
<!-- Forma, która nie wymaga serwera ani bazy danych -->
<article>
  <h1>Zwykły tekst przetrwa frameworki</h1>
</article>
\`\`\`

Prostota w technologii nie oznacza prymitywizmu — oznacza brak zbędnych punktów awarii.
`
  }
];

/**
 * Sekcja Miscellanea — krótkie notatki, cytaty, odsłuchy, etymologie i linki.
 * Aby dodać nowy wpis, dopisz kolejny obiekt na początku tablicy MISCELLANEA.
 */
window.MISCELLANEA = [
  {
    date: '2026-11-22',
    kind: 'Historia',
    title: 'Denar „Princes Polonie” i pierwsze imię kraju',
    text: 'Wybity na przełomie X i XI wieku srebrny denar Bolesława Chrobrego z legendą **PRINCES POLONIE** jest jednym z najstarszych materialnych świadectw nazwy naszego kraju — a jednocześnie manifestem suwerennej władzy wyrytym w metalu dla świata, który wciąż liczył wartość przede wszystkim na wadze srebra.',
    source: 'Numizmatyka wczesnopiastowska · ok. 1000 r.'
  },
  {
    date: '2026-11-21',
    kind: 'Historia',
    title: 'Ibrahim ibn Jakub o kraju Mieszka (965/966)',
    text: 'Relacja sefardyjskiego podróżnika z Tortosy jest jak okno otwarte prosto w środek X wieku: opisuje kraj rozległy, bogaty w żywność, miód i pola orne, chroniony bagnami i grodami, z podatkami pobieranymi w odważnikach handlowych na utrzymanie książęcej drużyny.',
    source: 'Relacja Ibrahima ibn Jakuba z podróży do krajów słowiańskich'
  },
  {
    date: '2026-11-21',
    kind: 'Mitologia',
    title: 'Huginn, Muninn i nici Urðr',
    text: 'Dwa kruki Odyna — **Huginn** (*Myśl*, runa ᚺ) i **Muninn** (*Pamięć*, runa ᛗ) — codziennie oblatują świat i wracają z wieściami. W *Grímnismál* Odyn wyznaje, że bardziej niż utraty Myśli obawia się, że nie wróci Pamięć. Każdy dziennik notatek jest próbą zatrzymania obu.',
    source: 'Edda poetycka · Grímnismál (zwrotka 20)'
  },
  {
    date: '2026-11-20',
    kind: 'Etymologia',
    title: 'Silva rerum i miscellanea',
    text: 'Staropolskie *silva rerum* („las rzeczy”) było domową księgą, do której wpisywano wszystko naraz: cytaty, receptury, komentarze polityczne i rodzinne zapiski. Współczesny blog personalny jest jej bezpośrednim spadkobiercą.',
    source: 'Notatka na marginesie'
  },
  {
    date: '2026-11-18',
    kind: 'Odsłuch',
    title: 'Dysonans jako architektura, nie efekt',
    text: 'Wracając do późnego death metalu i awangardowego black metalu, najlepiej słychać różnicę między dysonansem użytym dla samego szoku a dysonansem, który buduje napięcie harmoniczne na całej długości utworu.',
    source: 'Wieczorne odsłuchy'
  },
  {
    date: '2026-11-12',
    kind: 'Cytat',
    title: 'Granice mojego języka',
    text: '„Granice mego języka oznaczają granice mego świata.” — zdanie powtarzane tak często, że łatwo zapomnieć, jak bardzo dotyczy dziś również języków programowania i interfejsów.',
    source: 'Ludwig Wittgenstein, Tractatus Logico-Philosophicus (5.6)'
  },
  {
    date: '2026-11-06',
    kind: 'Technologia',
    title: 'Narzędzia, które nie krzyczą',
    text: 'Najlepsze narzędzia tekstowe znikają w chwili, gdy zaczynasz pisać. Im mniej przycisków walczy o wzrok na ekranie, tym dłużej utrzymuje się ciągłość myśli.',
    source: 'Zapiski warsztatowe'
  }
];
