# Akademik+ — system zarządzania domem studenckim

[![Docker](https://img.shields.io/badge/Docker-Compose-blue)]() [![Node](https://img.shields.io/badge/Node.js-20-green)]() [![React](https://img.shields.io/badge/React-19-blue)]() [![License](https://img.shields.io/badge/license-akademicki-lightgrey)]()

Pełnowymiarowa aplikacja webowa wspierająca codzienne zarządzanie akademikiem — od logowania mieszkańców, przez przydzielanie pokoi i naliczanie miesięcznych opłat, po obsługę zgłoszeń usterek oraz czat w czasie rzeczywistym między administracją a studentami.

System został zaprojektowany jako **architektura wielokontenerowa** zgodna z zasadami konteneryzacji atomowej — każda baza danych, backend i frontend działają jako niezależne, izolowane usługi orkiestrowane przez Docker Compose.

---

## Spis treści

1. [Funkcjonalność](#funkcjonalność)
2. [Architektura](#architektura)
3. [Stack technologiczny](#stack-technologiczny)
4. [Uruchomienie](#uruchomienie)
5. [Konta testowe](#konta-testowe)
6. [Endpointy i diagnostyka](#endpointy-i-diagnostyka)
7. [Struktura projektu](#struktura-projektu)
8. [Bazy danych](#bazy-danych)
9. [Tryb deweloperski](#tryb-deweloperski)
10. [Reset i rekonfiguracja](#reset-i-rekonfiguracja)
11. [Bezpieczeństwo](#bezpieczeństwo)
12. [Troubleshooting](#troubleshooting)

---

## Funkcjonalność

### Panel studenta (`/student`)
- **Dashboard** — szybki podgląd przypisanego pokoju, statusu opłat i otwartych zgłoszeń
- **Płatności** — historia rozliczeń miesięcznych z informacją o zaległościach
- **Zgłoszenia usterek** — tworzenie nowych zgłoszeń (hydraulika, elektryka, meble, ogrzewanie, inne), korespondencja z administracją w wątku zgłoszenia
- **Czat z administracją** — wbudowany widget `ChatWidget` z powiadomieniami w czasie rzeczywistym
- **Ustawienia konta** — zmiana hasła

### Panel administratora (`/admin`)
- **Dashboard** — statystyki: zajętość pokoi, stan rozliczeń, otwarte zgłoszenia
- **Pokoje** — dodawanie, edycja, ustawianie statusu (`available`, `full`, `maintenance`), wyposażenie jako lista tagów
- **Studenci** — ewidencja mieszkańców, przydział do pokoi (z transakcyjnym zapisem do `Students`, `Rooms` i `ResidenceHistory`)
- **Płatności** — ręczne dodawanie pojedynczych opłat **oraz generowanie zbiorcze miesięcznych opłat** dla wszystkich studentów z przypisanym pokojem
- **Zgłoszenia** — pełen cykl życia (`open` → `in-progress` → `resolved` → `closed`), odpowiedzi na wiadomości studentów
- **Raporty** — generowanie raportów PDF (`src/lib/pdfGenerator.ts` + `jspdf`)
- **Czat** — odpowiadanie na wiadomości studentów we wszystkich aktywnych konwersacjach

### Funkcje cross-cutting
- **Autoryzacja sesyjna** — `session_id` jako ciasteczko HttpOnly (UUIDv4), middleware `authMiddleware`
- **Aktualizacje w czasie rzeczywistym** — Socket.IO emituje eventy `rooms:changed`, `students:changed`, `payments:changed`, `issues:changed`, `chat:new-message`, `conversations:changed`, `issue-messages:new`
- **Healthcheck** — endpoint `/api/health` zwraca status połączenia z obiema bazami danych

---

## Architektura

System składa się z **pięciu kontenerów** — atomowych, niezależnie wdrażalnych usług:

```
                           ┌────────────────────────────┐
                           │  użytkownik (przeglądarka) │
                           └─────────────┬──────────────┘
                                         │  HTTP / WebSocket
                                         ▼
                           ┌────────────────────────────┐
                           │   frontend                 │
                           │   nginx + SPA React        │
                           │   port 3000                │
                           │                            │
                           │   reverse proxy:           │
                           │     /api/* → api:4000      │
                           │     /socket.io/* → api     │
                           └─────────────┬──────────────┘
                                         │
                                         ▼
                           ┌────────────────────────────┐
                           │   api                      │
                           │   Node.js + Express        │
                           │   + Socket.IO              │
                           │   port 4000                │
                           └──────┬───────────────┬─────┘
                                  │               │
                          TDS:1433│               │27017
                                  ▼               ▼
                  ┌──────────────────┐  ┌──────────────────┐
                  │  sql-server      │  │  mongo-db        │
                  │  MSSQL 2022      │  │  MongoDB 7       │
                  │                  │  │                  │
                  │  Users           │  │  conversations   │
                  │  Rooms           │  │  chat_messages   │
                  │  Students        │  │  issues          │
                  │  ResidenceHistory│  │  issue_messages  │
                  │  Payments        │  │                  │
                  └────────▲─────────┘  └──────────────────┘
                           │
                           │ init.sql
                           │
                  ┌────────┴─────────┐
                  │  sql-init        │
                  │  jednorazowa     │
                  │  inicjalizacja   │
                  │  schematu        │
                  └──────────────────┘
```

### Dlaczego dwa rodzaje baz danych?

Zastosowano podejście **polyglot persistence** — każdy typ danych trafia do bazy, której charakterystyka mu odpowiada:

- **SQL Server** trzyma dane „twarde", silnie powiązane kluczami obcymi (`Students` → `Users`, `Students` → `Rooms`, `Payments` → `Students`, `ResidenceHistory` → `Students` + `Rooms`). Wszystkie operacje wieloetapowe — np. przypisanie studenta do pokoju jednocześnie aktualizujące `Students`, `Rooms` i `ResidenceHistory` — są wykonywane w **transakcji ACID** (`new sql.Transaction(pool)`).
- **MongoDB** trzyma dane bardziej dynamiczne: wiadomości czatu i zgłoszenia z historią korespondencji. Format dokumentowy świetnie pasuje do wiadomości, których struktura może się zmieniać (np. dodanie załączników, reakcji), a brak twardych schematów nie blokuje rozwoju funkcji.

### Dlaczego frontend pełni rolę reverse proxy?

W produkcyjnym buildzie kontener `frontend` używa **nginx**, który nie tylko serwuje pliki statyczne SPA, ale również przekazuje (proxy) ruch `/api/*` i `/socket.io/*` do kontenera `api`. Dzięki temu:

- przeglądarka rozmawia wyłącznie z portem `3000` (brak problemów z CORS),
- backend pozostaje schowany za frontendem (w produkcji można nie eksponować portu `4000` na zewnątrz),
- aplikacja działa identycznie w trybie deweloperskim (gdzie tę samą rolę pełni proxy Vite — patrz `vite.config.ts`).

---

## Stack technologiczny

Pełna lista technologii znajduje się w pliku [`TECHNOLOGIE.md`](TECHNOLOGIE.md). Tu skrótowo:

| Warstwa | Główne technologie |
|---|---|
| Frontend | React 19, TypeScript 5.8, Vite 6, Tailwind CSS 4, Radix UI / shadcn, React Router 7, socket.io-client |
| Backend | Node.js 20, Express 4, Socket.IO 4, helmet, cors, cookie-parser, uuid, mssql, mongodb |
| Bazy danych | Microsoft SQL Server 2022, MongoDB 7 |
| Konteneryzacja | Docker, Docker Compose, nginx |
| PDF | jspdf, jspdf-autotable |
| Wykresy | recharts |

---

## Uruchomienie

### Wymagania

- **Docker Desktop** (Windows/macOS) lub **Docker Engine + Docker Compose v2** (Linux)
- Co najmniej **4 GB RAM** wolnej pamięci (obraz MSSQL jest dość pamięciożerny)
- Wolne porty na maszynie hostującej: `3000`, `4000`, `1433`, `27017`

### Pierwszy start (jedna komenda)

```bash
cd projekt
docker compose up --build
```

Pierwsze uruchomienie trwa zwykle **2–4 minuty** — pobierane są obrazy bazowe (MSSQL ~1,5 GB, MongoDB ~250 MB, Node ~50 MB), kompilowany frontend, inicjalizowane bazy danych. Kolejne starty są już szybkie (zwykle 15–30 sekund).

### Co się dzieje przy pierwszym starcie

Sekwencja startu jest sterowana przez `depends_on` z warunkami `condition: service_healthy` / `service_completed_successfully` w pliku `docker-compose.yml`:

1. **`sql-server`** startuje pusty serwer MSSQL. Healthcheck `sqlcmd -d master -Q "SELECT 1"` próbuje co 15 sekund, aż serwer odpowie.
2. **`mongo-db`** startuje MongoDB i wykonuje skrypt `database/mongo-init.js` z `/docker-entrypoint-initdb.d/` (tworzy kolekcje, indeksy, wstawia seed zgłoszeń).
3. **`sql-init`** uruchamia się dopiero gdy `sql-server` jest zdrowy. Wykonuje `init.sql` (tworzy bazę `AkademikDB`, tabele i seed). Po zakończeniu kontener kończy działanie (`restart: "no"`).
4. **`api`** startuje gdy `sql-init` skończył się sukcesem i `mongo-db` jest zdrowy. Łączy się z obiema bazami z retry (do 30 prób co 3 sekundy), wystawia healthcheck na `/api/health`.
5. **`frontend`** czeka aż `api` przejdzie healthcheck, po czym nginx zaczyna serwować zbudowaną aplikację React.

Po zakończeniu aplikacja dostępna jest pod **<http://localhost:3000>**.

### Uruchomienie w tle

```bash
docker compose up --build -d        # start w trybie detached
docker compose logs -f api          # podgląd logów backendu
docker compose ps                   # status wszystkich kontenerów
docker compose down                 # zatrzymanie (dane zostają w wolumenach)
```

---

## Konta testowe

Skrypt `database/init.sql` wstawia poniższe konta. Hasła są przechowywane plain-text — to projekt akademicki, w produkcji należałoby użyć `bcrypt` lub `argon2`.

| Rola | Email | Hasło |
|---|---|---|
| Administrator | `admin@akademik.pl` | `admin` |
| Student | `jan.kowalski@student.pl` | `student` |
| Student | `anna.nowak@student.pl` | `student` |
| Student | `piotr.wisniewski@student.pl` | `student` |
| Student | `maria.lewandowska@student.pl` | `student` |
| Student | `tomasz.zielinski@student.pl` | `student` |
| Student | `katarzyna.szymanska@student.pl` | `student` |
| Student | `michal.wozniak@student.pl` | `student` |

Można też zarejestrować nowe konto studenta przez ekran `/register`.

---

## Endpointy i diagnostyka

### Adresy

| Co | Adres |
|---|---|
| Frontend (SPA) | <http://localhost:3000> |
| API (przez proxy frontendu) | <http://localhost:3000/api/> |
| API (bezpośrednio) | <http://localhost:4000/api/> |
| Healthcheck API | <http://localhost:4000/api/health> |
| Snapshot stanu (debug) | <http://localhost:4000/api/state> |
| SQL Server | `localhost:1433` (sa / `SuperSzK0lnaHaslo123!`) |
| MongoDB | `mongodb://localhost:27017/akademik` |

### Pełna specyfikacja REST API

Patrz plik [`openapi.json`](openapi.json) — można wkleić jego zawartość do <https://editor.swagger.io> aby przeglądać dokumentację interaktywnie.

### Eventy Socket.IO

Backend emituje (na klienta nasłuchującego pod `/socket.io/`):

| Event | Payload | Kiedy emitowany |
|---|---|---|
| `rooms:changed` | pełna tablica pokoi | po POST/PATCH na `/api/rooms*` lub przypisaniu/zwolnieniu pokoju |
| `students:changed` | pełna tablica studentów | po POST/PATCH na `/api/students*` i `/api/register` |
| `payments:changed` | pełna tablica opłat | po dodaniu/edycji opłaty lub generowaniu miesięcznych |
| `issues:changed` | pełna tablica zgłoszeń | po POST/PATCH na `/api/issues` |
| `issue-messages:new` | pojedyncza wiadomość | po POST na `/api/issues/:id/messages` |
| `conversations:changed` | pełna tablica konwersacji | po utworzeniu lub aktualizacji konwersacji |
| `chat:new-message` | pojedyncza wiadomość | po POST na `/api/chat/messages` |
| `chat:read` | `{ conversationId, readerId }` | po POST na `/api/chat/conversations/:id/read` |

Klient (`src/context/AppContext.tsx`) może też zainicjować zdarzenie `state:request` — wtedy serwer odsyła pełny snapshot stanu jako `state:snapshot`.

---

## Struktura projektu

```
projekt/
├── docker-compose.yml             ← orkiestracja: 5 usług (frontend, api, sql-server, sql-init, mongo-db)
├── openapi.json                   ← specyfikacja REST API w formacie OpenAPI 3.0
├── package.json                   ← zależności i skrypty npm
├── vite.config.ts                 ← konfiguracja bundlera + proxy dev
├── tsconfig.json
├── index.html                     ← punkt wejścia SPA
├── TECHNOLOGIE.md                 ← pełna lista użytych technologii
├── README.md                      ← ten plik
│
├── docker/
│   ├── api.Dockerfile             ← obraz backendu (Node 20 alpine)
│   └── frontend.Dockerfile        ← obraz frontendu (multi-stage: build Node → nginx)
│
├── database/
│   ├── init.sql                   ← schemat MSSQL + seed danych
│   └── mongo-init.js              ← kolekcje i indeksy MongoDB + seed
│
├── diagrams/
│   ├── dfd_context_diagram.mmd    ← DFD poziom 0 (kontekstowy)
│   ├── dfd_diagram.mmd            ← DFD poziom 1 (ogólny)
│   ├── std_diagram.mmd            ← State Transition Diagram cyklu życia zgłoszenia
│   └── diagrams_explanation.md    ← pełne objaśnienie diagramów
│
├── docs/
│   └── DOKUMENTACJA_DLA_PROWADZACEGO.md  ← opis działania systemu i Dockera
│
└── src/
    ├── main.tsx, App.tsx, routes.tsx       ← punkt wejścia React
    ├── index.css                           ← style globalne + Tailwind
    │
    ├── api/
    │   └── server.js               ← cały backend (Express + Socket.IO + mssql + mongodb)
    │
    ├── context/
    │   └── AppContext.tsx          ← centralny stan aplikacji + integracja REST/Socket.IO
    │
    ├── components/
    │   ├── AdminLayout.tsx         ← layout panelu administratora
    │   ├── StudentLayout.tsx       ← layout panelu studenta
    │   ├── ChatWidget.tsx          ← widget czatu (wspólny dla obu paneli)
    │   └── ui/                     ← komponenty shadcn / Radix
    │
    ├── pages/
    │   ├── Login.tsx, Register.tsx, Settings.tsx
    │   ├── admin/
    │   │   ├── Dashboard.tsx, Rooms.tsx, Students.tsx,
    │   │   ├── Payments.tsx, Issues.tsx, Reports.tsx
    │   └── student/
    │       ├── Dashboard.tsx, Payments.tsx, Issues.tsx
    │
    ├── lib/
    │   ├── pdfGenerator.ts         ← generowanie raportów PDF (jspdf)
    │   └── utils.ts                ← drobne helpery (cn, etc.)
    │
    └── hooks/
        └── use-mobile.ts           ← detekcja widoku mobilnego
```

---

## Bazy danych

### SQL Server (`AkademikDB`)

Definicja schematu w `database/init.sql`. Diagram relacji:

```
┌──────────┐         ┌──────────────────┐         ┌──────────┐
│  Users   │1 ─────┐ │     Students     │ ┌───── 1│  Rooms   │
│──────────│       └─│──────────────────│─┘       │──────────│
│ Id (PK)  │     1:1 │ UserId  (FK)     │    1:0..1 Id (PK)  │
│ Email    │         │ RoomId  (FK)     │         │ Number   │
│ Password │         │ ...              │         │ Capacity │
│ Role     │         └──────────────────┘         │ Occupied │
└──────────┘                 │                    │ Status   │
                             │                    └──────────┘
                             │ 1
                             │
                             │ N
                  ┌──────────┴──────────────┐
                  │                         │
                  ▼                         ▼
         ┌──────────────────┐     ┌──────────────────┐
         │ ResidenceHistory │     │     Payments     │
         │──────────────────│     │──────────────────│
         │ StudentId (FK)   │     │ StudentId (FK)   │
         │ RoomId    (FK)   │     │ Amount, DueDate  │
         │ CheckInDate      │     │ Status, Month    │
         │ CheckOutDate     │     │ Year             │
         └──────────────────┘     └──────────────────┘
```

### MongoDB (`akademik`)

Cztery kolekcje, każda z `_id` jako identyfikatorem czytelnym dla człowieka (np. `conv_s1`, `msg_1234567890_ab12cd`):

```javascript
// conversations
{ _id: "conv_s1", studentId: "s1", studentName: "Jan Kowalski",
  lastMessage: "...", lastMessageTime: "2026-05-11T...", unreadCount: 0 }

// chat_messages
{ _id: "msg_...", conversationId: "conv_s1", senderId: "s1",
  senderName: "Jan", senderRole: "student", message: "...",
  timestamp: "...", read: false }

// issues
{ _id: "i1", studentId: "s1", roomId: "1", title: "...",
  description: "...", category: "plumbing", status: "in-progress",
  priority: "medium", createdAt: "...", resolvedAt: null }

// issue_messages
{ _id: "issue_msg_...", issueId: "i1", senderId: "...",
  senderName: "...", senderRole: "admin", message: "...",
  timestamp: "..." }
```

### Podgląd zewnętrznymi klientami

**SQL Server** — DBeaver, Azure Data Studio, SSMS:
- Host: `localhost`, Port: `1433`, User: `sa`, Hasło: `SuperSzK0lnaHaslo123!`, Baza: `AkademikDB`

**MongoDB** — MongoDB Compass, Studio 3T:
- URI: `mongodb://localhost:27017`, Baza: `akademik`
- (Mongo działa bez autoryzacji — to projekt akademicki; w produkcji włącz `MONGO_INITDB_ROOT_USERNAME/PASSWORD`)

---

## Tryb deweloperski

W tym trybie frontend działa na Vite z **hot module replacement**, a backend, SQL i Mongo nadal w Dockerze.

```bash
# Terminal 1: bazy + api w Dockerze
cd projekt
docker compose up sql-server sql-init mongo-db api

# Terminal 2: frontend lokalnie z HMR
npm install
npm run dev:web
```

Vite ma już w `vite.config.ts` proxy `/api` i `/socket.io` na `localhost:4000` — wszystko działa od razu.

Alternatywnie pełny tryb dev (frontend + backend lokalnie, bazy w Dockerze):

```bash
docker compose up sql-server sql-init mongo-db
npm install
npm run dev          # uruchamia równolegle api + vite (concurrently)
```

---

## Reset i rekonfiguracja

### Reset danych do stanu fabrycznego

```bash
docker compose down -v        # -v kasuje wolumeny sql-data i mongo-data
docker compose up --build     # przy starcie znów wykonują się init.sql i mongo-init.js
```

### Zmiana hasła SA (SQL Server)

Hasło SA nie da się zmienić w istniejącym kontenerze MSSQL — trzeba zresetować wolumen.

1. Edytuj `docker-compose.yml` → zmień `MSSQL_SA_PASSWORD` ORAZ `SQL_PASSWORD` w sekcji `api` (te same wartości).
2. Pamiętaj o regule MSSQL: hasło ≥ 8 znaków, duża litera + mała + cyfra + znak specjalny.
3. `docker compose down -v && docker compose up --build`.

### Zmiana portów na hoście

Edytuj sekcję `ports:` w `docker-compose.yml`. Np. jeśli masz lokalny MSSQL na 1433:

```yaml
sql-server:
  ports:
    - "1434:1433"     # 1434 na hoście, kontener nadal słucha na 1433
```

Komunikacja **między kontenerami** (po sieci `dorm-net`) nadal idzie po porcie wewnętrznym — `api` łączy się z `sql-server:1433` niezależnie od mapowania na host.

---

## Bezpieczeństwo

### Stosowane mechanizmy

- **Helmet** ustawia bezpieczne nagłówki HTTP (X-Content-Type-Options, Referrer-Policy, X-Frame-Options itp.)
- **CORS** skonfigurowany z `credentials: true` — ciasteczka są przesyłane razem z requestami
- **Ciasteczko sesji** ma flagi `httpOnly: true` (niedostępne dla JS w przeglądarce) i `sameSite: 'lax'`; `secure: true` w trybie produkcyjnym (HTTPS)
- **Sesje w pamięci** — kasują się po restarcie serwera (intencjonalne dla projektu akademickiego)
- **Walidacja danych wejściowych** — backend sprawdza wymagane pola przed zapisem do bazy
- **Transakcje SQL** — operacje wieloetapowe (rejestracja, przydział pokoju) wykonywane w `BEGIN TRANSACTION` z `ROLLBACK` w razie błędu
- **Parametryzowane zapytania SQL** — wszystkie wartości użytkownika trafiają do MSSQL jako `request.input(...)`, co eliminuje SQL injection
- **Wewnętrzna sieć Dockera** — bazy są dostępne z hosta tylko dla wygody developmentu (przez zmapowane porty); między kontenerami komunikacja odbywa się przez sieć `dorm-net`

### Ograniczenia świadomie zaakceptowane (projekt akademicki)

- Hasła użytkowników są w plain-text w tabeli `Users.Password` — w produkcji `bcrypt`/`argon2`
- Brak rate limitingu (np. `express-rate-limit`) na endpointach logowania
- Brak HTTPS — kontenery nasłuchują czystego HTTP; produkcyjnie trzeba postawić nginx z certyfikatem TLS przed całym stosem
- MongoDB działa **bez autoryzacji** (`MONGO_INITDB_ROOT_*` zakomentowane) — produkcyjnie obowiązkowo z użytkownikiem i hasłem
- Hasło SA do MSSQL jest hardcoded w `docker-compose.yml` — produkcyjnie powinno trafić do `.env` poza repo

---

## Troubleshooting

### `api` ciągle się restartuje

Najczęstsza przyczyna: SQL Server wystał, ale jeszcze nie odpowiada. Backend ma 30 prób co 3 sekundy (łącznie do ~90 s).

```bash
docker compose logs sql-server   # zobacz czy są błędy
docker compose logs api          # sprawdź na jakim kroku stoi
```

### Hasło SA odrzucone przez MSSQL

MSSQL wymaga **silnego hasła**: min. 8 znaków, z dużą literą, małą, cyfrą i znakiem specjalnym. Domyślne `SuperSzK0lnaHaslo123!` to spełnia. Jeśli zmieniłeś — sprawdź, czy nadal jest zgodne.

### Port 1433 / 27017 / 3000 / 4000 zajęty

Masz coś już chodzące lokalnie. Albo wyłącz lokalną instancję, albo zmień mapowanie na hoście w `docker-compose.yml`:

```yaml
ports:
  - "1434:1433"     # zamiast 1433:1433
```

### Czat nie aktualizuje się real-time

Otwórz DevTools w przeglądarce → zakładka **Network** → filtr **WS**. Powinno być aktywne połączenie WebSocket do `/socket.io/` ze statusem 101.

Jeśli go nie ma:
- W trybie Docker: `docker compose logs frontend` — sprawdź czy nginx odpalił się bez błędów.
- W trybie dev: zrestartuj `vite` — czasem proxy WS się gubi po HMR.

### `sql-init` kończy się błędem

Najczęściej:
- SQL Server jeszcze nie odpalił — sprawdź `docker compose logs sql-server`.
- Złe hasło — wartość w `sql-init.entrypoint` musi być identyczna jak `MSSQL_SA_PASSWORD` w `sql-server`.

```bash
docker compose logs sql-init     # zobacz pełen output sqlcmd
```

### „Cannot connect to Docker daemon"

Docker Desktop nie jest uruchomiony albo trzeba dodać użytkownika do grupy `docker` (Linux):

```bash
sudo usermod -aG docker $USER
# wyloguj się i zaloguj ponownie
```

---

## Licencja i autorzy

Projekt akademicki — zachęcamy do eksploracji i nauki na bazie kodu.

W razie pytań lub błędów: otwórz issue na GitHubie repozytorium projektu.
