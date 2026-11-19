## Starta

Kräver Docker Desktop och Node.js med npm.
Starta Docker Desktop. Navigera till /backend inne i projektet, från root:

```powershell
cd backend
```

Skapa `server.env` från `.env.example`:

```powershell
Copy-Item .env.example server.env
```

`DB_NAME`, `DB_USER` och `DB_PASSWORD` behövs i `server.env`. Docker Compose sätter `DB_HOST`, `DB_PORT` och `PORT` för backend-instanserna.

Kör:
```powershell
docker compose --env-file server.env up --build -d --wait
```
Docker Compose startar PostgreSQL (`db`), tre backend-instanser (`api1`, `api2` och `api3`) och Nginx. Alla backend-instanser använder samma databas.

## Kör

Endpoints:

- http://localhost:8080/bookings
- http://localhost:8080/bookings/{id}
- http://localhost:8080/instance
- http://localhost:8080/health


## Verifiera

Kör från `backend`:

```powershell
npm run verify
```

Skriptet automatiserar och kontrollerar via compose:

- Skapa, lista, hämta, uppdatera och ta bort en bokning.
- Att `/instance` visar `api1`, `api2` och `api3` genom lastbalanseringen.
- Att requests och bokningsdata fungerar när `api2` stoppas, och att instansen fungerar igen efter återstart.
- Att bokningen finns kvar efter omstart av hela systemet.

Varje kontroll skriver `PASS` eller `FAIL`. Vid fel avslutas skriptet med ett felmeddelande. 
Endast skriptets egna bokningar tas bort. Volymerna bevaras och systemet lämnas igång.

### Testa manuellt

Anropa `GET /instance` flera gånger. Svaren ska visa `api1`, `api2` och `api3`.

```powershell
1..6 | ForEach-Object { (Invoke-RestMethod http://localhost:8080/instance).instance }
```

Stoppa `api2`:

```powershell
docker compose --env-file server.env stop api2
```

Anropa `GET /instance` flera gånger igen. Nu ska `api1` och `api3` svara. Starta sedan `api2` igen:

```powershell
docker compose --env-file server.env start api2
```

## Stäng av

```powershell
docker compose --env-file server.env down
```
