# 🥗 OptiCal Center

Application web perso (React + Vite) pour piloter la diète de **deux personnes** :
calcul des besoins caloriques, planification du **batch cooking** de la semaine,
et génération de tout ce qui va avec — liste de courses, ordre de cuisson, et
feuille de saisie pour une app de comptage type **FatSecret**.

> 📋 **Tu reprends le projet ?** Commence par [`PASSATION.md`](PASSATION.md) :
> architecture, ce qui est fait, ce qui reste à faire et les pièges connus.
> Pour les formules de calcul, voir [`CALCUL_DETAILS.md`](CALCUL_DETAILS.md).

---

## Le principe

> **socle fixe + repas batch = cible calorique**

L'app calcule la cible calorique de chacun (Mifflin-St Jeor × PAL − déficit), déduit
le **socle fixe** (petit-déjeuner, collations, œufs du soir), et **calibre automatiquement
les portions des recettes** sur ce qu'il reste. Le total de la journée tombe donc toujours
sur la cible, quels que soient les réglages.

---

## Les onglets

| Onglet | À quoi ça sert |
|---|---|
| 🍳 **Batch Cooking** *(accueil)* | Choisir jusqu'à 5 recettes, les répartir sur 7 jours (midi/soir), puis 4 vues : **Courses**, **Cuisson**, **Répartition** et **FatSecret** |
| 🥗 **Macro Plan** | Régler les profils : poids, taille, PAL, déficit, ratios macros et **tout le petit-déjeuner** (pain, skyr, œufs, fruits…) |
| 📖 **Idées Recettes** | Parcourir les recettes plaisir, avec un scaleur interactif qui ajuste les quantités à la cible de chacun |
| 🍽️ **Repas Ext.** | Guide pour un repas pris à l'extérieur |

> ℹ️ Une page **Récapitulatif diététique** imprimable existe sur `/diet-summary`, mais elle
> n'est reliée à aucun menu : il faut taper l'URL. À brancher ou à supprimer (voir `PASSATION.md`).

### Ce que fait la vue Batch Cooking

- **Courses** — liste agrégée pour les deux personnes, groupée par rayon, noms d'ingrédients
  homogénéisés, cases à cocher et estimation du budget.
- **Cuisson** — poids crus groupés par mode de cuisson, avec les ingrédients **à pré-cuire**
  (lentilles sèches, PST à réhydrater) remontés en tête, et la **prochaine étape** de chaque plat.
- **Répartition** — combien mettre dans chaque boîte, par personne et par repas.
- **FatSecret** — le socle fixe itemisé + chaque plat **listé une seule fois** avec ses macros
  complètes (kcal / P / L / G) pour les deux, et un bouton « Copier tout ».

---

## Les données

Deux sources de vérité :

| Fichier | Contenu |
|---|---|
| `public/diet.csv` | **La config des deux profils** — poids, taille, déficit, PAL, ratios, petit-déjeuner. Écrase le localStorage au chargement : c'est ici qu'on change un réglage durablement. |
| `public/recipes/manifest.json` | **L'index de toutes les recettes** et leurs ingrédients. **Généré** — ne pas éditer à la main sans raison. |

Également : `public/supplements.csv` (compléments, affichés dans le récapitulatif) et
`public/recipes/ingredients_prix.json` (base de prix pour l'estimation budget).

---

## Ajouter une recette

1. Créer un fichier `.md` dans `public/recipes/batch/` (batch cooking) ou
   `public/recipes/plaisir/` (repas plaisir), en suivant **[`public/recipes/_GUIDE_RECETTES.md`](public/recipes/_GUIDE_RECETTES.md)**.
   C'est le document de référence — c'est aussi le prompt à donner à une IA pour qu'elle
   produise une recette directement au bon format.
2. Vérifier que l'**identifiant est unique** (batch : `6000xx`, plaisir : 6 chiffres).
3. Régénérer le manifest :
   ```bash
   node scripts/generate_recipes.js     # ou : update_recipes.bat
   ```
4. Vérifier en local que la recette s'affiche et que les quantités sont réalistes
   **une fois mises à l'échelle** (voir les pièges dans `PASSATION.md`).

> ⚠️ Le générateur **préserve** les ingrédients déjà présents dans le manifest. Si tu modifies
> la table d'ingrédients d'une recette existante, supprime d'abord son tableau `ingredients`
> dans `manifest.json`, sinon la régénération ne changera rien.

---

## Développement

```bash
npm install
npm run dev      # serveur local
npm run build    # build de production
```

**Structure :**

```
src/
├── utils/dietAlgo.js       ← tous les calculs (aucun JSX)
├── components/
│   ├── BatchCooking.jsx    ← page principale
│   ├── SmartDiet.jsx       ← réglages des profils
│   ├── RecipeIdeas.jsx     ← recettes plaisir + scaleur
│   ├── DietSummary.jsx     ← récapitulatif imprimable
│   └── ExternalMeal.jsx    ← guide repas extérieur
scripts/generate_recipes.js ← .md → manifest.json
public/
├── diet.csv                ← config des profils
└── recipes/                ← recettes (.md) + manifest + guide
```

---

## Déploiement

Hébergé sur **Netlify**, redéployé automatiquement à chaque push sur `main` :

```bash
git add . && git commit -m "..." && git push
```

Le fichier `public/_redirects` assure le routage SPA (sans lui, rafraîchir une page
autre que l'accueil renvoie une erreur 404).

---

*Projet perso — Optimisation • Calories • Performance*
