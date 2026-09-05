# Task Manager — API REST (Django) + Client TypeScript

Projet de rattrapage B3 Dev : une API RESTful de gestion de tâches construite avec **Django** et **Django REST Framework**, sécurisée par **JWT**, testée avec les outils de test Django, conteneurisée avec **Docker**, et consommée par un client frontend **TypeScript** (Vite, vanilla TS).

## Démo en ligne

> ⚠️ Placeholder — à remplacer une fois le déploiement effectué.

- Frontend : https://rattrapage-b3-dev-ayadi-omar.vercel.app
- API : https://rattrapage-b3-dev-ayadi-omar.onrender.com/api/
- Admin Django : https://rattrapage-b3-dev-ayadi-omar.onrender.com/admin/

> Le backend est hébergé sur Render (offre gratuite) : le premier appel après une période d'inactivité peut prendre 30 à 50 secondes le temps que le conteneur se réveille.

## Stack technique

| Couche      | Technologie                                              |
|-------------|-----------------------------------------------------------|
| Backend     | Django 5, Django REST Framework, SimpleJWT                |
| Base de données | PostgreSQL (SQLite en fallback local)                  |
| Frontend    | TypeScript, Vite (vanilla, sans framework)                 |
| Auth        | JWT (access + refresh tokens)                              |
| Tests       | `django.test` / DRF `APITestCase`                          |
| Conteneurs  | Docker, docker-compose                                     |
| Déploiement | Render (backend, gunicorn + whitenoise) + Vercel (frontend) |

## Structure du dépôt

```
.
├── backend/            # Projet Django (API)
│   ├── config/         # Réglages du projet (settings, urls)
│   ├── tasks/           # App DRF : modèle Task, serializers, vues, tests
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/            # Client TypeScript (Vite)
│   ├── src/
│   │   ├── api.ts       # Client HTTP (auth + CRUD tâches)
│   │   ├── main.ts       # UI (login/register + liste des tâches)
│   │   └── types.ts
│   └── Dockerfile
├── docker-compose.yml
└── readme.md
```

## Démarrage rapide avec Docker (recommandé)

Prérequis : Docker et Docker Compose.

```bash
docker compose up --build
```

- Backend disponible sur http://localhost:8000
- Frontend disponible sur http://localhost:5173

Le service `backend` applique automatiquement les migrations au démarrage.

## Démarrage manuel (sans Docker)

### Backend

```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate   # Windows : .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # ajuster si besoin (SQLite par défaut si DATABASE_URL absent)
python main.py migrate
python main.py createsuperuser # optionnel, pour /admin
python main.py runserver
```

L'API est servie sur http://localhost:8000/api/.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env   # VITE_API_URL=http://localhost:8000/api
npm run dev
```

L'application est servie sur http://localhost:5173.

## Endpoints de l'API

| Méthode | URL                        | Description                          | Auth requise |
|---------|----------------------------|---------------------------------------|--------------|
| POST    | `/api/auth/register/`      | Créer un compte utilisateur           | Non          |
| POST    | `/api/token/`               | Obtenir un couple access/refresh JWT  | Non          |
| POST    | `/api/token/refresh/`      | Rafraîchir le token d'accès           | Non          |
| GET     | `/api/tasks/`               | Lister ses propres tâches             | Oui          |
| POST    | `/api/tasks/`               | Créer une tâche                       | Oui          |
| GET     | `/api/tasks/{id}/`          | Détail d'une tâche                    | Oui          |
| PATCH/PUT | `/api/tasks/{id}/`        | Modifier une tâche                    | Oui          |
| DELETE  | `/api/tasks/{id}/`          | Supprimer une tâche                   | Oui          |

Chaque utilisateur ne voit et ne peut modifier que ses propres tâches (permission `IsOwner` + filtrage du queryset par `request.user`).

### Authentification JWT — exemple

```bash
# Inscription
curl -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "email": "alice@example.com", "password": "supersecret1"}'

# Connexion
curl -X POST http://localhost:8000/api/token/ \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "password": "supersecret1"}'
# => { "access": "...", "refresh": "..." }

# Requête authentifiée
curl http://localhost:8000/api/tasks/ \
  -H "Authorization: Bearer <access_token>"
```

## Tests

```bash
cd backend
python main.py test
```

13 tests couvrant : inscription, obtention de token (succès/échec), et le CRUD complet des tâches y compris l'isolation entre utilisateurs (un utilisateur ne peut ni lire, ni modifier, ni supprimer les tâches d'un autre).

## Variables d'environnement (backend)

Voir `backend/.env.example`.

| Variable               | Description                                             | Défaut (local) |
|-------------------------|-----------------------------------------------------------|----------------|
| `SECRET_KEY`            | Clé secrète Django                                        | clé de dev non sécurisée |
| `DEBUG`                 | Mode debug                                                 | `False`        |
| `ALLOWED_HOSTS`          | Hôtes autorisés (liste séparée par des virgules)          | `localhost,127.0.0.1` |
| `DATABASE_URL`           | URL de connexion à la base (format `postgres://...`, ex. Neon/Render) | SQLite local (absent) |
| `CORS_ALLOWED_ORIGINS`   | Origines autorisées pour le frontend                       | `http://localhost:5173` |

## Déploiement (Render + Vercel)

Aucune carte bancaire requise, aucune base de données à provisionner : sans `DATABASE_URL`, le backend retombe automatiquement sur SQLite (voir `backend/config/settings.py`).

### Backend sur Render

1. Sur [render.com](https://render.com), **New +** → **Web Service** → connecter le dépôt GitHub `rattrapage-b3-dev-ayadi-omar`.
2. **Root Directory** : `backend`. Render détecte automatiquement le `Dockerfile`.
3. **Instance Type** : `Free`.
4. Variables d'environnement à ajouter :
   - `SECRET_KEY` : une valeur générée (`python -c "import secrets; print(secrets.token_urlsafe(50))"`)
   - `DEBUG` : `False`
   - `ALLOWED_HOSTS` : `rattrapage-b3-dev-ayadi-omar.onrender.com`
   - `CORS_ALLOWED_ORIGINS` : `https://rattrapage-b3-dev-ayadi-omar.vercel.app`
5. **Create Web Service**. `entrypoint.sh` applique automatiquement les migrations et le `collectstatic` à chaque démarrage.

> Pour une persistance réelle des données (au lieu du SQLite éphémère du plan gratuit), créer une base sur [neon.tech](https://neon.tech) (gratuit) et ajouter son `DATABASE_URL` dans les variables d'environnement Render — aucun changement de code nécessaire.

### Frontend sur Vercel

1. Sur [vercel.com](https://vercel.com), **Add New** → **Project** → importer le même dépôt.
2. **Root Directory** : `frontend`. Framework détecté : `Vite`.
3. Variable d'environnement : `VITE_API_URL` = `https://rattrapage-b3-dev-ayadi-omar.onrender.com/api`
4. **Deploy**.

## Sécurité

- Authentification par JWT (access token courte durée de vie, refresh token avec rotation).
- Permissions DRF : accès restreint aux tâches de l'utilisateur authentifié (`IsAuthenticated` + `IsOwner`).
- CORS restreint aux origines explicitement autorisées.
- Secrets et configuration sensible chargés via variables d'environnement (jamais commités).
