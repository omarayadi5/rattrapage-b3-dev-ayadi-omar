# Task Manager

API de gestion de tâches (Django + DRF, JWT) avec un client TypeScript (Vite).

## Démo

- Frontend : https://rattrapage-b3-dev-ayadi-omar.vercel.app
- API : https://rattrapage-b3-dev-ayadi-omar.onrender.com/api/

Backend hébergé sur Render (plan gratuit), premier appel après inactivité un peu lent (30-50s).

## Stack

Django 5, DRF, SimpleJWT, PostgreSQL/SQLite, TypeScript + Vite, Docker.

## Structure

```
backend/     projet Django (app tasks : model, serializers, views, tests)
frontend/    client TypeScript (Vite)
docker-compose.yml
```

## Lancer avec Docker

```bash
docker compose up --build
```

- Backend : http://localhost:8000
- Frontend : http://localhost:5173

## Lancer sans Docker

Backend :

```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python main.py migrate
python main.py runserver
```

Frontend :

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## Endpoints

| Méthode | URL | Auth |
|---|---|---|
| POST | /api/auth/register/ | non |
| POST | /api/token/ | non |
| POST | /api/token/refresh/ | non |
| GET, POST | /api/tasks/ | oui |
| GET, PATCH, PUT, DELETE | /api/tasks/{id}/ | oui |

Chaque utilisateur ne voit et ne modifie que ses propres tâches.

Exemple :

```bash
curl -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "email": "alice@example.com", "password": "supersecret1"}'

curl -X POST http://localhost:8000/api/token/ \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "password": "supersecret1"}'

curl http://localhost:8000/api/tasks/ -H "Authorization: Bearer <access_token>"
```

## Tests

```bash
cd backend
python main.py test
```

13 tests : register, login, CRUD tâches, isolation entre utilisateurs.

## Variables d'environnement (backend)

Voir `backend/.env.example`.

- `SECRET_KEY`
- `DEBUG`
- `ALLOWED_HOSTS`
- `DATABASE_URL` (absent = SQLite)
- `CORS_ALLOWED_ORIGINS`

## Déploiement

Sans `DATABASE_URL`, le backend tourne sur SQLite, donc aucune base à créer.

**Backend (Render)** : New Web Service, connecter le repo, root directory `backend` (Dockerfile détecté automatiquement), plan Free. Variables : `SECRET_KEY`, `DEBUG=False`, `ALLOWED_HOSTS=<app>.onrender.com`, `CORS_ALLOWED_ORIGINS=<url-frontend>`.

**Frontend (Vercel)** : Add New Project, connecter le repo, root directory `frontend`. Variable : `VITE_API_URL=<url-backend>/api`.

## Sécurité

- JWT (access court, refresh avec rotation)
- Permissions DRF : accès restreint à l'utilisateur authentifié et propriétaire de la tâche
- CORS limité aux origines autorisées
- Secrets via variables d'environnement, jamais commités
