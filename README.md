# Sploty

Powściągliwy, elegancki dziennik literacki poświęcony **technologii**, **muzyce death i black metalowej**, **filozofii**, **językowi**, **kulturze północy**, **państwu Piastów i wczesnemu polskiemu średniowieczu** oraz **miscellaneom**. Gotowy do darmowego hostowania na **GitHub Pages**.

## Estetyka i UX

- **Elegancja i umiar**: zdyscyplinowany zestaw krojów — **`IM Fell English SC`** (tytuł nagłówka), **`Cinzel`** (kapitała w nawigacji i numerach rzymskich) oraz **`EB Garamond`** (antykwa w tytułach i prozie), wsparty `Noto Sans Runic` dla dyskretnych akcentów runicznych.
- **Bezramkowy, pełnoszerokościowy nagłówek — symetryczny dyptyk rysowany wektorowo**:
  - Po lewej stronie **skrzydło słowiańsko-piastowskie** (lustrzany podwójny łuk z wczesnosłowiańskim fryzem falistym i rombami, *Gwiazda Peruna*, *Łunnica*, *Ręce Boga*, *Włócznia św. Maurycego* oraz medalion denara *Princes Polonie*), a po prawej **skrzydło nordyckie** (kamień runiczny *ormslinga* z wyrytymi runami Starszego Futharku, węzłem Urnes i krzyżem z Upplandu) — oba miękko wygaszone ku centrum dla idealnej czytelności i automatycznie adaptujące się do motywów (**Inkaust / Pergamin**),
  - **Cienkie, symetryczne linie kinetyczne** w tle nagłówka splatające oba skrzydła i delikatnie reagujące na ruch kursora,
  - **Obracające się astrolabium z cyklem 42 symboli (łagodne przenikanie + świetlisty blask co 360° lub po kliknięciu)**: mitologia nordycka, religia słowiańska (**Ręce Boga**, **Gwiazda Peruna**, **Kołowrót**, **Weles**, **Światowid**, **Łunnica**), państwo Piastów (**Włócznia św. Maurycego**, **Princes Polonie**, **Orzeł Piastowski**, **Szczerbiec**), Thelema (**Heksagram Jednokreślny**, **Gwiazda Babalon**, **Hadit**, **Krzyż Różany**, **Monada Hieroglificzna**) oraz systemy starożytne i filozoficzno-religijne (Mezopotamia, Egipt, wczesne chrześcijaństwo, kabała, alchemia, pitagoreizm, taoizm, buddyzm, hinduizm, zoroastryzm, filozofia chaosu),
  - Górny, bezramkowy pasek nawigacji z przełącznikiem **Pergamin / Inkaust** oraz tytuł **SPLOTY**.
- **Dwa dopasowane motywy (WCAG AA/AAA)**: **Inkaust** (domyślny, Pruski Inkaust `#171E29` z powierzchniami `#202938`, kością `#EAE4D8`, cynobrem `#D67D66` i złotem `#D4B46A`) oraz **Pergamin** (chłodny, nordycki papier `#F2F4F7` / `#E7ECF2` z pruskim atramentem `#171E29`, cynobrem `#9E3228` i złotem `#7A5912`), przełączane przyciskiem w nagłówku.
- **Komfort lektury i dodatkowe moduły**: indeks z numeracją rzymską (`V`, `IV`, `III`, `II`, `I`), filtrowanie po wątkach (`Piastowie`, `Muzyka`, `Filozofia`, `Język`, `Technologia`), wyszukiwarka, przycisk **Losuj wątek**, regulacja rozmiaru pisma (`A− / A / A+`), **tryb skupienia** (ukrywający nagłówek), ścieżki dźwiękowe do lektury (`soundtrack`), dymki z **glosami pojęć**, sekcja **Teraz** (*Słucham / Czytam / Badam*), interaktywny **Indeks 42 symboli z Astrolabium**, **Biblioteka i Płytoteka** (`#/biblioteka`), **Kronika Piastów i Północy** (`#/kronika`), **Miscellanea** (`#/miscellanea`), galerie zdjęć z **Lightboxem**, przycisk **↑ Do góry**, **Polityka prywatności** (`#/polityka-prywatnosci`) oraz kanał **RSS** (`feed.xml`).

## Struktura projektu

```text
.
├── index.html       # Główny plik strony (winieta kwartalnika + kolofon)
├── styles.css       # Elegancki minimalizm (motyw Inkaust i Pergamin)
├── app.js           # Indeks, wątki, Miscellanea i parser Markdown
├── data/
│   └── posts.js     # Konfiguracja bloga, wpisy (BLOG_POSTS) i Miscellanea
├── images/
│   └── equimanthorn.jpg # Pełnoekranowe tło strony w sekcji O mnie
├── 404.html         # Strona błędu dla GitHub Pages
└── .nojekyll        # Wyłącza przetwarzanie Jekyll
```

## Jak dodać nowy wpis, zdjęcia lub galerię?

Otwórz plik `data/posts.js` (na komputerze lub ikoną ołówka ✏️ na GitHubie):
- Dłuższe artykuły dopisuj na początku tablicy `BLOG_POSTS`.
- Krótkie różności, odsłuchy i cytaty dopisuj na początku tablicy `MISCELLANEA`.
- **Zdjęcia**: wrzuć pliki (`.jpg`, `.webp`, `.png`) do folderu `images/` (np. `images/grod-1.jpg`), a następnie:
  - w treści wpisu (`content`) dodaj `![Podpis](images/grod-1.jpg)` (pojedyncza rycina w ramie *passe-partout*),
  - wpisz kilka linii `![...](...)` jedna pod drugą bez pustego wiersza, aby utworzyć **galerię śródtekstową**,
  - lub dodaj do obiektu wpisu pole `gallery: [{ src: 'images/grod-1.jpg', caption: 'Opis' }, ...]` (oraz opcjonalnie `galleryTitle`), aby wyświetlić **redakcyjną galerię** pod tekstem.
  - Każde zdjęcie otwiera się w pełnoekranowym **Lightboxie** z obsługą klawiatury (`←`, `→`, `Esc`), miniaturek i gestów przesuwania na telefonie.
