# Fundeyaco Bot — Guide de déploiement Railway

## Étapes de déploiement

### 1. Créer un compte Railway
Allez sur railway.app et créez un compte gratuit.

### 2. Déployer le code
- Cliquez "New Project" → "Deploy from GitHub repo"
- Ou glissez-déposez ce dossier directement

### 3. Configurer les variables d'environnement
Dans Railway → votre projet → "Variables", ajoutez :
- INSTAGRAM_TOKEN = votre token Instagram (de Meta for Developers)
- CLAUDE_API_KEY  = votre clé sk-ant-...
- VERIFY_TOKEN    = fundeyaco_webhook_2026

### 4. Récupérer votre URL
Railway génère une URL publique type :
https://fundeyaco-bot-production.up.railway.app

### 5. Configurer le webhook Meta
Retournez sur Meta for Developers → Instagram API → Configure webhooks :
- Callback URL : https://votre-url.railway.app/webhook
- Verify Token : fundeyaco_webhook_2026
- Cliquez "Verify and save"

## Coûts estimés
- Railway : gratuit (500h/mois incluses)
- Claude API : ~$0.01 par 100 messages (Claude Haiku)
- $5 de crédits = environ 50.000 messages
