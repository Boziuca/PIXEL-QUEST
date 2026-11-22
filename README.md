# PixelQuest – Agenda eroului

Agendă / organizator personal sub forma unui joc RPG retro pixel-art. Totul rulează în browser, fără server de date: datele stau doar pe dispozitivul tău.

## Cum pornești aplicația (pe calculator)

1. Deschide PowerShell sau Command Prompt.
2. Rulează:
   ```
   node C:\Users\Boziuca\Gemeni\pixel-quest\serve.js
   ```
3. Deschide în browser: **http://localhost:8080**
4. Oprești serverul cu `Ctrl+C`.

> Nu merge cu dublu-clic pe `index.html`: browserele blochează modulele JavaScript și modul offline pentru fișierele deschise direct.

## Pe telefon

- **Rapid, pentru probă:** cu serverul pornit, deschide pe telefon adresa afișată în terminal („Din telefon …”, de forma `http://192.168.x.x:8080`). Telefonul trebuie să fie în aceeași rețea Wi-Fi. Pe o adresă fără HTTPS aplicația nu se poate instala și nu merge offline.
- **Ca aplicație instalată (PWA, offline):** urcă folderul `pixel-quest` pe un hosting cu HTTPS (de exemplu GitHub Pages sau Netlify). Apoi deschide site-ul pe telefon și alege „Adaugă pe ecranul de pornire” / „Instalează aplicația”.

## Ce conține

| Zonă pe hartă | Modul | Statistică |
|---|---|---|
| Arena | Pași | Agilitate |
| Fântâna | Apă | Mana |
| Taverna | Mâncare și valori nutriționale | Stamina |
| Cântarul | Greutate | Forță |
| Biblioteca | Cărți | Înțelepciune |
| Sala de forță | Antrenamente, PR-uri, progresie | Putere |
| Templul | Obiceiuri zilnice | Vitalitate |
| Turnul misiunilor | Sarcini / agendă | Disciplină |
| Scriptoriul | Jurnal | Spirit |
| Atelierul | Galerie foto | Memorie |
| Magazinul / Sala trofeelor | Cosmetice / realizări | |

Mecanici: XP și niveluri, misiuni zilnice și săptămânale, serii (streak), 26 de realizări, monede și magazin, 8 eroi cu câte 3 forme (nivelurile 1, 10 și 25) și deblocare prin progres sau cu monede.

Reguli importante:
- O zi e „câștigată” (contează pentru serie) când atingi cel puțin 2 obiective: pași, apă, kcal (80–110% din țintă), pagini, toate obiceiurile, un antrenament.
- Recordul personal folosește greutatea maximă și 1RM estimat (Epley: kg × (1 + repetări / 30)).
- Sugestia de progresie apare după 2 antrenamente la rând cu toate repetările țintă: +2,5 kg (corp superior) sau +5 kg (picioare).

## Backup

Profil → **Export JSON** salvează toate datele, inclusiv pozele. **Import JSON** le înlocuiește pe cele actuale. Fă export din când în când: dacă ștergi datele browserului, se pierd și datele aplicației.

## Structura codului

```
index.html, manifest.webmanifest, sw.js (offline), serve.js (server local)
css/style.css              stilul retro, teme întunecată/luminoasă și palete
js/app.js                  pornire, rute, bara de sus, notificări
js/store.js / db.js        localStorage (date) / IndexedDB (poze)
js/game.js                 XP, niveluri, misiuni, serii, realizări, deblocări
js/heroes.js               cei 8 eroi, desenați pixel cu pixel în cod
js/icons.js, pixel.js      iconițe pixel-art și randare SVG
js/audio.js                efecte chiptune (Web Audio API)
js/charts.js               grafice pixelate pe canvas
js/screens/*.js            câte un fișier pentru fiecare ecran
```

Dacă modifici fișierele aplicației, crește `VERSION` în `sw.js`, ca telefoanele să ia versiunea nouă.
