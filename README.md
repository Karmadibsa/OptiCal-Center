# 🥗 OptiCal Center - Roadmap Nutrition & Performance

Bienvenue sur le projet **OptiCal Center**. 
Une application web optimisée pour gérer sa diète sportive, ses compléments et son batch cooking avec précision.

## 🚀 Fonctionnalités Clés

### 1. 🧠 SmartDiet (Le Cerveau)
- **Calculateur de Calories & Macros** : Ajustement automatique selon le poids, la taille, l'âge et l'activité sportive (Mifflin-St Jeor + METs).
- **Synchronisation Totale** : Vos réglages sont sauvegardés dans `public/diet.csv`, garantissant que tout le site utilise les mêmes données.
- **Gestion Hebdomadaire** : Définissez votre sport par semaine et votre déficit calorique cible.

### 2. ⚖️ Batch Cooking Intelligent
- **Fini les règles de trois !**
- Pesez votre casserole vide une fois pour toutes.
- Pesez votre casserole pleine de pâtes cuites.
- L'application calcule le **coefficient de cuisson** exact et vous donne le poids précis à mettre dans chaque tupperware (Midi/Soir pour Axel & Prisca).

### 3. Spécificités Techniques
- **Source de Vérité Unique** : `public/diet.csv` contient à la fois la configuration (Poids/Taille) et le plan alimentaire.
- **Suppléments Séparés** : `public/supplements.csv` gère la liste fixe des compléments (Vitamines, Créatine, etc.), pour ne pas polluer les réglages quotidiens.
- **Export CSV** : Un bouton "Copier Configuration" permet de sauvegarder instantanément vos réglages dans le fichier source.

## 🛠️ Comment mettre à jour sa diète ?

Tout se passe dans l'onglet **SmartDiet** :
1.  Ajustez vos poids, objectifs ou minutes de sport.
2.  L'algorithme recalcule instantanément les portions de pâtes et de protéines.
3.  Cliquez sur **"Copier Configuration CSV"**.
4.  Collez le contenu dans le fichier `public/diet.csv`.
5.  C'est tout ! Le Calculateur de courses et le Dashboard sont à jour.

## 📂 Structure des Fichiers Clés

- `src/components/SmartDiet.jsx` : Cœur de l'application (Interface & Logique).
- `src/utils/dietAlgo.js` : Algorithme de calcul nutritionnel pur.
- `public/diet.csv` : **NE PAS SUPPRIMER**. Contient vos réglages et votre diète.
- `public/supplements.csv` : Liste des compléments alimentaires.

## 💻 Installation & Lancement

1.  Installez les dépendances :
    ```bash
    npm install
    ```

2.  Lancez le site en local :
    ```bash
    npm run dev
    ```

---
*Projet perso - Optimisation • Calories • Performance*
