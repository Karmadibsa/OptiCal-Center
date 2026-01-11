# 🥗 OptiCal Center - Roadmap Nutrition & Performance

Bienvenue sur le projet **OptiCal Center**. 
Ceci est une application web conçue pour visualiser une roadmap nutritionnelle, gérer les compléments alimentaires et calculer automatiquement les quantités pour le Batch Cooking.

## 🚀 Fonctionnalités

### 1. Dashboard (Tableau de Bord)
- Visualisation claire de la diète (Matin, Midi, Collation, Soir).
- Visualisation des compléments et du timing.
- **Export PDF "Frigo-Ready"** : Génère un PDF propre, optimisé pour l'impression (A4 Portrait), avec conversion automatique des poids crus en poids cuits (x3) pour le riz, les pâtes et le PST.

### 2. Calculateur Batch Cooking
- Sélectionnez les repas prévus (Lundi -> Dimanche / Midi & Soir).
- Calcul automatique des totaux de cuisson nécessaires (Riz, Pâtes, PST).
- Exclusion automatique des œufs et de la crème fraîche du résumé final.
- Bouton "Copier" pour envoyer la liste rapidement.

## 🛠️ Comment modifier les données ?

Tout est piloté par le fichier `public/roadmap.csv`. 
Vous n'avez pas besoin de toucher au code pour changer une quantité ou un aliment.

**Format du CSV :**
`Type,Section,Item,Axel,Prisca,Note`

- **Type** : `Diet`, `Supplement`, ou `Info`
- **Section** : Le moment de la journée (ex: `Matin`, `Midi`, `Avant Sport`)
- **Item** : Le nom de l'aliment (ex: `Riz (cru)`)
- **Axel / Prisca** : Les quantités (ex: `100g`)
- **Note** : Petit commentaire optionnel (ex: `OBLIGATOIRE`)

⚠️ **Important** : Si vous mettez `(cru)` dans le nom d'un aliment (Riz, Pâtes, PST), le PDF le convertira automatiquement en `(cuit)` et multipliera la quantité par 3.

## 💻 Installation & Lancement

Si vous récupérez le projet :

1.  Installez les dépendances :
    ```bash
    npm install
    ```

2.  Lancez le site en local :
    ```bash
    npm run dev
    ```

3.  Ouvrez votre navigateur sur l'adresse indiquée (souvent `http://localhost:5173`).

---
*Projet perso - Fait avec ❤️ pour la performance.*
