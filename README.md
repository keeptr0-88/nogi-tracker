# SUB·LOG — No-Gi Grappling Tracker

PWA per registrare le sottomissioni messe a segno in allenamento (No-Gi / BJJ), con statistiche, trofei e sincronizzazione tra dispositivi. Nessun backend, nessun account: i dati restano nel browser (LocalStorage) e l'app funziona offline.

## Funzionalità

- **Log rapido** — cintura dell'avversario, tecnica, note e data (per registrare anche i roll dei giorni scorsi). Le tecniche custom si aggiungono dall'interfaccia.
- **Stats** — totale, signature move, distribuzione per cinture e categorie, mappa di attività a 18 settimane, stat card condivisibile (PNG 1080x1350).
- **Trofei** — 56 obiettivi (volumi, cacciatori di cinture, specialisti di tecnica, streak, varietà).
- **Storico** — cronologia con ricerca e filtro per cintura; ogni voce è modificabile o cancellabile.
- **Sync PC ⇄ telefono** — QR code generato in locale, senza server. Dataset piccoli: un QR solo. Dataset grandi: QR multipli in sequenza (`?syncpart=`, ~1100 caratteri l'uno, accumulati sul ricevente fino al completamento). Alternative: copia-link o backup JSON.
- **Backup** — export JSON o CSV (compatibile Excel), import JSON, o condivisione diretta via Web Share (AirDrop) con fallback al download.

## Uso in locale

Serve solo un server statico qualsiasi, ad esempio:

```bash
npx serve .
# oppure
python3 -m http http.server 8000
```

Poi apri `http://localhost:8000`. Aprire `index.html` via `file://` non è supportato (service worker e moduli richiedono HTTP).

## Deploy

Qualsiasi hosting statico va bene. Su GitHub Pages: Settings → Pages → Branch `main`, cartella `/ (root)`.

## Installazione su telefono

- **iPhone (Safari):** apri l'URL → Condividi → "Aggiungi alla schermata Home".
- **Android (Chrome):** apri l'URL → menu ⋮ → "Installa app" / "Aggiungi a schermata Home".

## Struttura

| File | Ruolo |
| --- | --- |
| `index.html` | Markup, viste, modali |
| `styles.css` | Stili (mobile-first) |
| `app.js` | Logica: log, stats, trofei, sync, backup |
| `sw.js` | Service worker (cache offline same-origin) |
| `manifest.json` | Manifest PWA |
| `icons/` | Icone SVG + PNG (192/512/maskable/180) |
| `qrcode.min.js` | Libreria QR (vendored, generazione in locale) |

## Note tecniche

- Storage: due chiavi LocalStorage (`sublog_nogi_logs_v1`, `sublog_custom_techs_v1`). I record non validi in import/sync vengono scartati, non bloccano.
- Il sync codifica il dataset in un URL (formato compatto v3: LZ-string + short ID; i link v1/v2 restano leggibili). Il singolo QR mostra al massimo ~1500 caratteri: oltre, il sync passa a QR multipli in sequenza; i frammenti in attesa vivono in LocalStorage (`sublog_parts_*`, scadenza 7 giorni).
- Cache PWA versionata (`sublog-nogi-vN` in `sw.js`): ad ogni cambio di asset cached, alzare la versione.
