# PRIVAC-IA

## 1. Présentation du projet
PRIVAC-IA est un assistant IA spécialisé RGPD qui combine :
**scraping des textes CNIL → génération d’une base vectorielle → API FastAPI en streaming → front Next.js avec avatar 3D et historique local.**
Objectif : fournir des réponses contextualisées sur le RGPD (règlement + sanctions) via OpenAI, tout en restant portable (local ou cloud).

---

## 2. Pré‑requis système
- **Node.js ≥ 20** + **npm**
- **Python 3.13** (voir `DataExtraction/pyproject.toml`)
- **Git**
- Machine locale ou **VM** (CPU suffisant pour le scraping/embedding; pas de GPU requis)

---

## 3. Gestion des dépendances

### 3.1 Frontend (Next.js)
```bash
npm install
```

### 3.2 Backend / DataExtraction (uv)
1) **Installer uv**
```bash
python -m pip install uv
```
2) **Créer l’environnement virtuel**
```bash
cd DataExtraction
uv venv
```
3) **Activer l’environnement**
```bash
# macOS / Linux
source .venv/bin/activate
# Windows (PowerShell)
.venv\\Scripts\\Activate.ps1
```
4) **Synchroniser les dépendances**
```bash
uv sync
```

---

## 4. Structure du projet
```
PRIVAC-IA/
├─ app/                    # Pages Next.js (app router)
├─ components/             # UI + Chat + avatar 3D
├─ public/                 # Assets (robot.glb, icônes…)
├─ hooks/, lib/, types/    # Utilitaires frontend
├─ DataExtraction/         # Scraping CNIL, vecteurs, API FastAPI
│  ├─ Extractions/         # CSV générés (RGPD, sanctions)
│  ├─ RGPD_Scraper.py      # Scraper CNIL
│  ├─ executor_api.py      # Orchestration scraping + vecteurs + API
│  ├─ api.py               # Endpoint `/query` (streaming)
│  └─ pyproject.toml       # Dépendances (uv)
├─ rgpd_embeddings_db/     # Base vectorielle ChromaDB (locale, non versionnée)
└─ README.md
```
**Important :**
- `rgpd_embeddings_db/` et les CSV générés sont **locaux** et non versionnés.
- Créez `DataExtraction/.env` (voir variables ci‑dessous) avant de lancer l’API.

---

## 5. Préparation des données & API

### 5.1 Scraper les textes et sanctions CNIL
```bash
cd DataExtraction
uv run python RGPD_Scraper.py   # génère les CSV dans Extractions/
```

### 5.2 Construire la base vectorielle
```bash
uv run python executor_api.py -task all
```
Ce mode exécute successivement : scraping → création des embeddings (ChromaDB) → lancement de l’API.

### 5.3 Lancer uniquement l’API (base déjà prête)
```bash
uv run python executor_api.py -task api
# ou
uv run python api.py
```
Par défaut l’API écoute sur `0.0.0.0:8000` et expose `/query` (streaming) et `/health`.

---

## 6. Lancement du front
```bash
npm run dev      # front sur http://localhost:3000
# Production : npm run build && npm start
```
Le front contacte l’API sur `http://<hostname>:8000/query`. Si vous déployez l’API ailleurs, adaptez l’URL dans `components/ChatWindow/ChatWindow.tsx`.

---

## 7. Variables d’environnement
- **OPENAI_API_KEY** : clé OpenAI (placée dans `DataExtraction/.env`).  
  *Ne commitez jamais cette clé.*
- Optionnel : ajustez `CORS` dans `DataExtraction/api.py` pour restreindre les origines en production.

---

## 8. Notes importantes
- Les réponses sont **streamées** pour une meilleure UX côté front.
- L’historique des conversations est **stocké dans le navigateur** (localStorage).
- L’avatar 3D (Three.js + gsap) réagit à l’état du chatbot (idle, typing, erreur).
- Les ports par défaut : **3000** (front) et **8000** (API). Assurez-vous qu’ils sont libres ou modifiez-les au besoin.

---

## 9. Démarrage rapide
1. Installer `uv`, créer/activer l’environnement Python, `uv sync`.
2. Définir `OPENAI_API_KEY` dans `DataExtraction/.env`.
3. `uv run python executor_api.py -task all` (ou `-task api` si la base existe déjà).
4. À la racine : `npm install`, puis `npm run dev`.
5. Ouvrir `http://localhost:3000` et interroger le chatbot RGPD.

Le pipeline est pensé pour être reproductible, documenté et prêt à l’emploi en local ou en cloud léger.

---

## 10. Prochaines étapes / vérifications rapides
- ✅ `DataExtraction/.env` contient bien `OPENAI_API_KEY` (clé non committée).
- ✅ `uv run python executor_api.py -task all` a généré les CSV et la base ChromaDB.
- ✅ L’API répond sur `http://localhost:8000/health`.
- ✅ Le front s’affiche sur `http://localhost:3000` et les messages obtiennent une réponse streamée.
- ✅ Adapter l’URL d’API dans `components/ChatWindow/ChatWindow.tsx` si déploiement distant.
