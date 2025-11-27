# Selaou

> *Selaou* (breton: "écouter") - Outil open source d'annotation de transcriptions audio pour l'entraînement IA.

Selaou permet de valider et corriger des transcriptions audio (format Whisper) via une interface web simple et intuitive. Idéal pour créer des datasets de fine-tuning.

## Fonctionnalités

- Interface d'annotation simple et rapide
- Lecteur audio intégré avec lecture en boucle du segment
- Correction mot par mot avec indication de confiance
- Sélection intelligente des segments (priorise les segments incertains)
- Système de feedback pour signaler les problèmes audio
- Export JSONL/CSV compatible HuggingFace
- Système d'import flexible (SQL, fichiers JSON, API)
- **Interface d'administration** sécurisée par token
- Exclusion automatique des segments signalés comme problématiques
- Déploiement Docker simple

## Démarrage rapide

### Prérequis

- Node.js 20+
- Docker et Docker Compose (pour MySQL)

### Installation

```bash
# Cloner le repo
git clone https://github.com/Synapsr/Selaou.git
cd Selaou

# Installer les dépendances
npm install

# Copier la configuration
cp .env.example .env.local

# Démarrer MySQL avec Docker
docker compose up -d db

# Générer le schéma de base de données
npm run db:push

# (Optionnel) Ajouter des données de test
npx tsx scripts/seed.ts

# Démarrer le serveur de développement
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

### Déploiement Docker

#### Option 1 : Avec l'image Docker Hub

```bash
# Configurer l'environnement
cp .env.example .env
# Éditer .env avec vos valeurs

# Lancer avec l'image pré-construite
docker compose -f docker-compose.hub.yml up -d

# L'application est disponible sur http://localhost:3000
```

#### Option 2 : Build local

```bash
# Configurer l'environnement
cp .env.example .env
# Éditer .env avec vos valeurs

# Lancer l'application complète (build local)
docker compose up -d

# L'application est disponible sur http://localhost:3000
```

## Import de données

### Via API

```bash
curl -X POST http://localhost:3000/api/sources/import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VOTRE_ADMIN_TOKEN" \
  -d '{
    "name": "Mon episode",
    "audioUrl": "https://example.com/audio.mp3",
    "whisperJson": { ... }
  }'
```

> **Note:** L'import nécessite le token admin configuré dans `ADMIN_TOKEN`.

### Via SQL (base externe)

Configurer dans `.env`:

```bash
DATASOURCE_SQL_ENABLED=true
DATASOURCE_SQL_HOST=your-db-host
DATASOURCE_SQL_DATABASE=your-database
DATASOURCE_SQL_USER=your-user
DATASOURCE_SQL_PASSWORD=your-password
DATASOURCE_SQL_QUERY="SELECT id, title, audio_url, whisper_json FROM episodes WHERE ..."
```

Puis lancer:

```bash
npx tsx scripts/sync-sources.ts
```

### Via fichiers JSON

```bash
DATASOURCE_JSON_ENABLED=true
DATASOURCE_JSON_PATH=./data/episodes
DATASOURCE_JSON_PATTERN=*.json
```

## Export des données

### JSONL (HuggingFace compatible)

```bash
curl "http://localhost:3000/api/export?format=jsonl&min_reviews=2"
```

Sortie:
```jsonl
{"audio":{"path":"...","start":0.0,"end":3.5},"text":"Bonjour...","is_correction":false}
```

### CSV

```bash
curl "http://localhost:3000/api/export?format=csv&only_corrections=true"
```

## Administration

L'interface d'administration est accessible à `/admin` et permet de:

- Voir la liste des annotateurs (triée par nombre d'annotations)
- Consulter l'historique des annotations
- Gérer les alertes et remarques signalées par les utilisateurs
- Supprimer des segments problématiques

### Configuration

1. Générer un token sécurisé:
```bash
openssl rand -hex 32
```

2. Ajouter dans `.env.local`:
```bash
ADMIN_TOKEN=votre_token_genere
```

3. Accéder à `http://localhost:3000/admin` et entrer le token.

### Comportement automatique

- Les segments signalés avec une **alerte audio** sont automatiquement exclus de la sélection pour les annotateurs
- Les remarques simples n'excluent pas le segment mais sont visibles dans l'admin

## Structure du projet

```
selaou/
├── src/
│   ├── app/                 # Pages et API Next.js
│   │   ├── page.tsx         # Page d'accueil
│   │   ├── review/          # Interface d'annotation
│   │   ├── admin/           # Interface d'administration
│   │   └── api/             # Routes API
│   │       └── admin/       # Routes API admin (sécurisées)
│   ├── components/          # Composants React
│   │   ├── ui/              # shadcn/ui
│   │   ├── audio/           # Lecteur audio
│   │   └── review/          # Composants d'annotation
│   ├── lib/
│   │   ├── db/              # Schema Drizzle + connexion
│   │   └── data-sources/    # Adaptateurs d'import
│   └── types/               # Types TypeScript
├── scripts/                 # Scripts utilitaires
├── docker-compose.yml
└── Dockerfile
```

## Configuration

Variables d'environnement principales:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | URL de connexion MySQL | - |
| `ADMIN_TOKEN` | Token d'accès à l'interface admin | - |
| `SELECTION_UNCERTAINTY_WEIGHT` | Poids pour prioriser segments incertains (0-1) | `0.7` |
| `SELECTION_MAX_REVIEWS` | Reviews max par segment | `3` |

Voir `.env.example` pour toutes les options.

## API

### Routes publiques

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/segments/next` | GET | Prochain segment à annoter |
| `/api/reviews` | POST | Soumettre une annotation |
| `/api/feedback` | POST | Signaler un problème sur un segment |
| `/api/export` | GET | Exporter les données |
| `/api/stats` | GET | Statistiques globales |

### Routes admin (token requis)

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/sources/import` | POST | Importer une source audio |
| `/api/admin/reviewers` | GET | Liste des annotateurs |
| `/api/admin/reviews` | GET | Liste des annotations |
| `/api/admin/feedback` | GET | Alertes et remarques |
| `/api/admin/segments` | GET | Liste des segments |
| `/api/admin/segments/:id` | DELETE | Supprimer un segment |

## Contribuer

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

1. Fork le projet
2. Créer une branche (`git checkout -b feature/amélioration`)
3. Commit (`git commit -m 'Ajout fonctionnalité'`)
4. Push (`git push origin feature/amélioration`)
5. Ouvrir une Pull Request

## Roadmap

- [ ] Interface de connexion avec authentification par email
- [ ] Système de vérification d'email pour les annotateurs
- [ ] Dashboard de statistiques avancées
- [ ] Support multi-langues

## Licence

MIT - voir [LICENSE](LICENSE)
