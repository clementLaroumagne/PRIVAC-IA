![image](https://github.com/user-attachments/assets/f4d02d8a-7461-46d7-8bca-d60525f9ffe7)

## Ce projet comprend :
- Un chatbot IA expert sur le RGPD avec comme contexte les textes de lois de la CNIL --> utilisation de l'API OpenAI + ChromaDB (longchain)
- Un front responsive NextJS
- Une intégration d'un modèle 3D de robot animé dans le front
- Une gestion des historiques des échanges enregistrés dans le navigateur
- Un scrapper de données qui récupère les données du site de la CNIL et en produit des .CSV exploitable

Ce projet doit avoir une clée API OpenAI présente dans .env pour fonctionner.

## Lancement du projet :
```bash
npm run i
npm run build
```
```bash
cd DataExtractions/
```
```bash
python executor_api.py
```

Le projet ouvre le port :3000 pour le front et que le port :8000 pour le chatbot sur votre réseau local.

--> http://localhost:3000
