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

⚠️ **Important - Ratios de Cuisson** : 
Si vous mettez `(cru)` dans le nom d'un aliment, le PDF convertira automatiquement le poids pour l'affichage "Frigo" :
- **Riz** : x3 (100g cru -> 300g cuit)
- **Pâtes** : x2.5 (100g cru -> 250g cuit)
- **PST** : x2.5 (100g cru -> 250g cuit)

### 🤖 Générer le CSV avec une IA
Pour éviter les erreurs de format, copiez-collez ce prompt à votre IA préférée (ChatGPT, Claude, etc.) avec vos données :

> "Agis comme un expert data. Je veux mettre à jour mon fichier `roadmap.csv` pour mon application de nutrition.
> Voici le format STRICT à respecter (Headers inclus) :
> `Type,Section,Item,Axel,Prisca,Note`
>
> Règles :
> 1. **Type**: Diet, Supplement, ou Info.
> 2. **Section**: Matin, Midi, Collation, Soir, Avant Sport, Pendant Sport, Après Sport, Rappel.
> 3. **Item**: Nom de l'aliment. Ajoute '(cru)' pour Riz/Pâtes/PST si c'est le poids sec.
> 4. **Axel/Prisca**: Juste le nombre + unité (ex: '100g' ou '1 gel'). Pas de texte superflu.
> 5. **Note**: Court commentaire ou laisser vide.
>
> Voici mes nouveaux inputs : [INSÉRER TES DONNÉES ICI]. Génère-moi uniquement le contenu CSV."

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
