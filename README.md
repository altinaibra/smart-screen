![Smart Screen](docs/banner.png)

# Smart Screen – Digital Signage për restorante dhe biznese

Sistem për shfaqjen e reklamave, fotove të ushqimeve, videove, menuve me çmime dhe njoftimeve në TV
(si ekranet në KFC, Hesburger, McDonald's). Punon në TV të markave dhe madhësive të ndryshme.

| Pjesa | Teknologjia | Dosja |
|---|---|---|
| **Backend / API** | ASP.NET Core 9, Entity Framework Core, JWT, Swagger | `backend/SmartScreen.Api` |
| **Databaza** | SQL Server (parazgjedhje) ose SQLite | `Smartscreen` / `smartscreen.db` |
| **Frontend** (paneli i menaxhimit) | React + TypeScript + Vite | `frontend/` |
| **Player për TV** | HTML/CSS/JS (ES5) – punon edhe në TV të vjetër | `backend/SmartScreen.Api/wwwroot/player` |
| **Aplikacione TV** | LG webOS, Samsung Tizen, Android TV / Sony | `tv-apps/` |

## Nisja e shpejtë

### 1. Backend-i (.NET)
Hapni `backend/SmartScreen.sln` në Visual Studio dhe shtypni **F5**, ose:
```bash
dotnet run --project backend/SmartScreen.Api
```
- Swagger: **http://localhost:5080/swagger**
- Databaza krijohet automatikisht bosh – vetëm me përdoruesin admin. Menunë, valutat, mënyrat e pagesës,
  playlistat dhe cilësimet i shtoni vetë nga paneli dhe ruhen në tabela.
- Hyrja: **admin / Admin123!** (ndryshojeni te Cilësimet).

### 2. Frontend-i (React)
```bash
cd frontend
npm install
npm start
```
Hapet **http://localhost:5173** (thirrjet `/api` shkojnë te backend-i në portin 5080).

Për prodhim: `npm run build` → frontend-i vendoset në `backend/SmartScreen.Api/wwwroot/app`
dhe shërbehet direkt nga .NET në **http://localhost:5080/**.

### 3. Lidhja e një TV-je
1. Në TV hapni `http://<IP-e-serverit>:5080/player/` (ose aplikacionin nga `tv-apps/`).
2. TV-ja shfaq një **kod 6-shifror**.
3. Në panel: **Ekranet → Shto ekran**, vendosni kodin dhe zgjidhni playlist-ën.

> TV-ja dhe serveri duhet të jenë në të njëjtin rrjet. Lejoni portin 5080 në Windows Firewall.

## Struktura e frontend-it
Të dhënat nga API merren me **TanStack Query** (`@tanstack/react-query`). Për çdo entitet ka një dosje
te `services/` me dy skedarë:
- `xMethods.ts` – thirrjet te API-ja (fetch), p.sh. `getCurrencies()`, `setMainCurrency(id)`
- `xQueries.ts` – hook-et e TanStack (`useQuery` / `useMutation`) dhe çelësat e cache-it, p.sh. `useCurrencies()`

```
frontend/src/
├── main.tsx              # Rrugët (routes) + QueryClientProvider
├── api.ts                # Klienti HTTP + token JWT
├── types.ts              # Tipet TypeScript (si DTO-të në .NET)
├── services/
│   ├── queryClient.ts
│   ├── Auth/             # authMethods.ts, authQueries.ts
│   ├── Currency/         # currencyMethods.ts, currencyQueries.ts
│   ├── Dashboard/
│   ├── Media/
│   ├── Menu/             # kategoritë dhe produktet
│   ├── PaymentMethod/
│   ├── Playlist/
│   ├── Screen/
│   └── Settings/
├── i18n/                 # useTranslation: locales/sq.json, locales/en.json
├── SVG/                  # ikonat si komponentë React (p.sh. LogOutIcon.tsx) – <Icon name="logout" />
├── styles.css
├── components/           # Layout, Modal, MediaPicker, ScreenPreview, Icon
└── pages/                # Dashboard, Screens, Media, Playlists, PlaylistEditor, Menu, Settings, Login
```

Përdorimi në një faqe:
```tsx
const { data: currencies, isLoading: currenciesLoading } = useCurrencies();
const { mutateAsync: setMainCurrency } = useSetMainCurrency();
```
**Gjuhët (shqip / anglisht):** tekstet janë te `src/i18n/locales/sq.json` dhe `en.json`; në komponentë
`const { t } = useTranslation();` → `t('menu.title')`. Gjuha zgjidhet te paneli (poshtë majtas), te
**Cilësimet → Paneli → Gjuha** ose në faqen e hyrjes, dhe ruhet në shfletues.

**Ikonat:** çdo ikonë është një komponent React te `src/SVG/` (p.sh. `SVG/LogOutIcon.tsx`, me SVG-në nga
https://www.svgrepo.com/) dhe regjistrohet te `SVG/index.ts`. Thirret me `<Icon name="logout" />` ose direkt
`<LogOutIcon size={20} color="#fff" />`; ngjyra ndjek tekstin. Ikonat që s'kanë ende komponent shfaqin
simbolin rezervë nga `components/Icon.tsx` (`iconFallbacks`).

Pas çdo ndryshimi (mutation) rifreskohen vetë query-t që varen prej tij (p.sh. ndërrimi i valutës kryesore
rifreskon çmimet te Menuja).

## Çfarë mund të bëni
- **Ekranet** – çiftim me kod, statusi online/offline, platforma dhe rezolucioni i zbuluar automatikisht,
  orientim horizontal/vertikal, rifreskim në distancë.
- **Orare** – p.sh. menuja e mëngjesit 07:00–11:00, oferta e drekës 12:00–15:00 (sipas ditëve të javës).
- **Foto & Video** – ngarkim me drag & drop (deri 1 GB, rekomandohet MP4 H.264).
- **Dizajni i TV-së** – kreu me logo, emër, orar (HAPUR/MBYLLUR) dhe progres; shirit poshtë me ◆; ngjyra kryesore,
  gjuha e TV-së dhe të dhënat e biznesit caktohen vetëm nga admini te **Cilësimet** (në TV nuk editohet asgjë).
- **Playlistat** – slide: Produkt/Ofertë, Ofertë me listë, Menu me çmime, Biznesi, Foto, Video, Tekst/Njoftim, Faqe web; renditje, kohëzgjatje,
  **preview live** në rezolucione të ndryshme (720p, 1080p, 4K, vertikal).
- **Menuja** – kategori, produkte, çmime, oferta (çmim i vjetër → % zbritje), "E mbaruar" me një klik.
- **Valutat** – kodi, emri, simboli, kursi, lloji fiskal; valuta kryesore (isMainCurrency) shfaqet te çmimet.
- **Mënyrat e pagesës** – kodi, emri, renditja, lloji fiskal, e parazgjedhura.
- **Cilësimet** – emri, logo, ngjyrat e markës, monedha, ora, shiriti i lajmeve, zona kohore, gjuha e panelit.

Player-i kontrollon serverin çdo 15 sekonda; ndryshimet shfaqen pa rinisur TV-në.

## Puna pa rrjet (offline)
TV-ja ruan gjithçka që i duhet për të luajtur pa internet, edhe pas rinisjes:

| Çfarë | Ku ruhet |
|---|---|
| Përmbajtja: playlist-at, menuja me çmime, cilësimet **dhe oraret** | `localStorage` i player-it |
| Foto & video | **Android/Sony/Fire TV:** në diskun e TV-së (aplikacioni). **PC/shfletues:** Service Worker (`player/sw.js`) |
| Faqja e player-it | njësoj si media |

- Media shkarkohet paraprakisht sapo TV-ja merr përmbajtje të re (jo vetëm kur shfaqet), dhe fshihet kur nuk përdoret më.
- Pa rrjet, oraret (p.sh. mëngjes 07–11, drekë 12–15) zbatohen nga vetë TV-ja me orën e saj.
- Kur kthehet rrjeti, TV-ja merr menjëherë ndryshimet e reja nga serveri.
- Slide-t "Faqe web" kanë nevojë për internet.

| Pajisja | Luan pa rrjet | Ndizet pa rrjet |
|---|---|---|
| Android TV / Sony / Google TV / Fire TV (APK) | Po | Po |
| PC me *Player për Windows* | Po | Po |
| Shfletues me server HTTPS ose `localhost` | Po | Po |
| LG / Samsung (aplikacioni ose shfletuesi) me server `http://` | Po, përmbajtja e ruajtur | Jo, pret serverin |

> Service Worker-i punon vetëm në "secure context" (HTTPS ose `localhost`). Për LG/Samsung, përdorni serverin me HTTPS
> (p.sh. online me domen) ose një Android box në HDMI.

## Databaza – SQL Server (Smartscreen)
Aplikacioni tani përdor **SQL Server** me databazën **`Smartscreen`** (Windows Authentication).
Te `backend/SmartScreen.Api/appsettings.json`:
```json
"Database": { "Provider": "SqlServer" },
"ConnectionStrings": { "SqlServer": "Server=localhost;Database=Smartscreen;Trusted_Connection=True;TrustServerCertificate=True" }
```

**Hapat:**
1. Në SSMS krijoni databazën `Smartscreen` (ose lëreni skriptin ta krijojë).
2. *(Opsionale)* Hapni `backend/Database/Smartscreen.sql` në SSMS dhe shtypni **Execute** – krijon tabelat.
   Nëse e kapërceni, aplikacioni i krijon tabelat vetë kur databaza është bosh.
3. Nisni backend-in – krijohet vetëm përdoruesi admin. Pastaj te paneli shtoni **Valutat** (e para bëhet kryesore),
   **Mënyrat e pagesës**, **Menunë** dhe **Cilësimet**.

- Nëse SQL Server është instancë me emër (p.sh. `SQLEXPRESS`), përdorni `Server=localhost\\SQLEXPRESS`.
- Në IIS, Application Pool-i lidhet me identitetin e vet: në SSMS shtoni login `IIS AppPool\SmartScreen`
  (Security → Logins) dhe i jepni rolin `db_owner` te `Smartscreen`.
- Për t'u kthyer te SQLite: `"Provider": "Sqlite"`.

**Çfarë ruhet në databazë:** të gjitha të dhënat – përdoruesit (admini), cilësimet, menuja me çmime,
playlistat, ekranet – dhe **vetë fotot e videot** që ngarkoni. Të dhënat e skedarit (emri, lloji, madhësia)
janë te `MediaAssets`, ndërsa përmbajtja te `MediaChunks` (copa 1 MB, që edhe videot e mëdha të luhen pa u
ngarkuar të gjitha në memorie). TV-të i marrin si më parë nga `/uploads/<emri>`.
Fotot/videot e vjetra në dosjen `uploads/` kopjohen automatikisht në databazë në nisjen e parë.


## Aplikacionet për TV (`tv-apps/`)
Nuk nevojitet asnjë pajisje shtesë për Smart TV (LG, Samsung, Sony, Android/Google TV). Një **Android TV Box / Fire TV Stick**
nevojitet vetëm për TV jo-smart ose shumë të vjetër (lidhet në HDMI).

Aplikacionet **nuk kanë më IP të shkruar në kod**: herën e parë TV-ja kërkon adresën e serverit
(p.sh. `192.168.1.10` → plotësohet vetë në `http://192.168.1.10:5080`), e ruan dhe pas çdo ndezjeje hap player-in.
Për ta ndryshuar më vonë: shtypni **OK** në telekomandë gjatë ekranit "Duke u lidhur...".
Adresa e saktë shfaqet te paneli → **Ekranet** (me udhëzime për çdo markë).

### Shkarkimi (pa Android Studio)
Aplikacionet e gatshme shërbehen nga vetë serveri dhe shkarkohen nga paneli → **Ekranet**:

| Skedari | Për | Instalimi |
|---|---|---|
| `/downloads/smart-screen-player.apk` | Android TV, Sony, Google TV, Fire TV, TV Box | Në TV: aplikacioni **Downloader** → `http://<IP>:5080/downloads/smart-screen-player.apk` |
| `/downloads/smart-screen-player-lg.ipk` | LG webOS | `ares-install` (Developer Mode) |
| `/downloads/smart-screen-player.cmd` | PC Windows te TV-ja | Klik i dyfishtë: hap player-in në ekran të plotë me Edge dhe e shton te Startup |

Skedarët ndodhen te `backend/SmartScreen.Api/wwwroot/downloads/`. Pas ndryshimeve në `tv-apps/`, rindërtojini:
Android Studio → Build APK (ose `gradle assembleDebug`), LG: `ares-package tv-apps/lg-webos`, dhe zëvendësoni skedarët.

> APK-ja është e nënshkruar me çelës *debug*. Për ta përditësuar në TV pa e çinstaluar, nënshkruajeni gjithmonë me
> të njëjtin çelës. Për prodhim krijoni një çelës *release* dhe **mos e vendosni në GitHub** (repo-ja është publike).

| TV | Si |
|---|---|
| **LG (webOS)** | Shpejt: aplikacioni *Web Browser* → `http://<IP>:5080/player/`. Si aplikacion: *Developer Mode* nga LG Content Store, pastaj `ares-package tv-apps/lg-webos` + `ares-install`. |
| **Samsung (Tizen)** | Shpejt: aplikacioni *Internet* → `http://<IP>:5080/player/`. Si aplikacion: *Apps* → `12345` → Developer mode, pastaj Tizen Studio → `tv-apps/samsung-tizen` → Run. Smart Signage: *URL Launcher*. |
| **Android TV / Sony Bravia / Google TV / TV Box / Fire TV** | `tv-apps/android-tv` – Android Studio → Build APK, instalohet me USB ose *Downloader*. Niset vetë kur ndizet TV-ja. |
| **Çdo TV tjetër / monitor me PC** | Hapni `http://<IP>:5080/player/` në shfletues në ekran të plotë (F11 / `chrome --kiosk`). |

> Launcher-i (`index.html`) është i njëjtë në `lg-webos/`, `samsung-tizen/` dhe `android-tv/app/src/main/assets/`.
> Kur e ndryshoni, kopjojeni në të tria.

## Logo dhe ikonat
- Burimi: `frontend/public/logo.svg` (vektor, shkallëzohet pa humbur cilësi).
- Ngjyrat: e kuqe `#c8102e`, e verdhë `#ffc72c`, sfond i errët `#121419`.

## Publikimi (Publish)
Backend-i dhe frontend-i publikohen **bashkë si një aplikacion**: gjatë publish ndërtohet automatikisht React-i
dhe vendoset në `wwwroot/app`.

```powershell
.\publish.ps1                    # -> .\publish  (serveri duhet të ketë ASP.NET Core 9 Runtime)
.\publish.ps1 -SelfContained     # përfshin .NET brenda (s'ka nevojë për instalim)
```
Ose në Visual Studio: klik i djathtë te **SmartScreen.Api → Publish → Folder**.

**Në IIS (Windows Server):**
1. Instaloni [ASP.NET Core 9 Hosting Bundle](https://dotnet.microsoft.com/download/dotnet/9.0) dhe rinisni IIS (`iisreset`).
2. Kopjoni dosjen `publish` në server (p.sh. `C:\inetpub\SmartScreen`).
3. IIS Manager → Add Website → Physical path = dosja, Port = 5080. Application Pool: **No Managed Code**.
4. I jepni Application Pool-it (`IIS AppPool\SmartScreen`) leje **Modify** mbi dosjen (vetëm nëse përdorni SQLite, për `smartscreen.db`).
5. Hapni portin në Firewall.

**Pa IIS:** në dosjen `publish` nisni `SmartScreen.Api.exe` (dëgjon në `http://0.0.0.0:5080`).

**Përditësimet:** kur publikoni sërish në të njëjtën dosje, të dhënat në SQL Server nuk preken (me SQLite: `smartscreen.db` nuk preket). Mos zgjidhni
"Delete all existing files" në Visual Studio, ose ruani një kopje të tyre para publikimit.

## Aplikacioni Desktop (Electron) – pa localhost, pa instalime
Dosja `electron/` e paketon **gjithë sistemin (backend .NET + frontend React) në një instalues**
`Smart Screen Setup 1.0.0.exe`. Përdoruesi e instalon, e hap nga Start Menu / Desktop dhe paneli hapet
në dritaren e vet – pa shfletues, pa `npm`, pa .NET e pa IIS.

Si punon: aplikacioni nis në sfond serverin .NET (i paketuar te `resources\server`), pret derisa të jetë
gati dhe e hap panelin në dritare. Kur mbyllet dritarja, mbyllet edhe serveri. TV-të lidhen si më parë te
`http://<IP-e-kompjuterit>:5080/player/` (derisa aplikacioni është i hapur).

Të dhënat (databaza, fotot/videot, `server.log`) ruhen te `%APPDATA%\Smart Screen` dhe nuk fshihen kur
përditësoni aplikacionin. Çelësi JWT krijohet automatikisht për çdo instalim.

**Kërkesat** (vetëm në kompjuterin ku ndërtoni): [.NET 9 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)
dhe [Node.js 18+](https://nodejs.org).

**Ndërtimi** (Command Prompt, nga dosja kryesore):
```cmd
publish-desktop.cmd
```
Instaluesi del te `electron\dist\Smart Screen Setup 1.0.0.exe`.

Ose hap pas hapi:
```cmd
dotnet publish backend\SmartScreen.Api -c Release -r win-x64 --self-contained true -o electron\server
cd electron
npm install
npm run dist
```
Për ta provuar pa instalues (pas `dotnet publish` më sipër): `cd electron && npm start`.

> Herën e parë Windows Firewall pyet për portin 5080 – zgjidhni **Allow**, që TV-të ta gjejnë serverin.

## Siguria në prodhim
- Ndryshoni `Jwt:Key` dhe fjalëkalimin e adminit te `appsettings.json`.
- Përdorni HTTPS (p.sh. pas IIS ose Nginx).
