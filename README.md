## Starta

Kräver Docker Desktop Node.js med npm. 
Starta Docker Desktop. Navigera till /backend inne i projektet, från root:

```powershell
cd backend
```

Skapa en `server.env` enligt formatet från .env.example genom att kopiera över variablerna.


Kör:
```powershell
docker compose --env-file server.env up --build -d --wait
```
för att skapa nödvändiga containrar med Docker Compose.

## Kör

```powershell
npm run start
```

Endpoints:
http://localhost:8080/bookings
http://localhost:8080/bookings/{id}
http://localhost:8080/instance
http://localhost:8080/health


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

## Stäng av

```powershell
docker compose --env-file server.env down
```
