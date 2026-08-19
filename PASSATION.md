# 📋 Passation — OptiCal Center

> Document de reprise : comment le projet fonctionne, ce qui a été fait, ce qui reste à faire.
> Dernière mise à jour : après la refonte "suivi calorique FatSecret" + nettoyage code mort et docs.

---

## 1. En bref

Application web perso (React + Vite) pour piloter la diète de **deux personnes (Axel & Prisca)** :

- calcule les besoins caloriques et les macros de chacun ;
- planifie le **batch cooking** de la semaine (7 jours, midi + soir) ;
- calibre automatiquement les portions de chaque recette pour tomber sur la cible calorique ;
- sort la **liste de courses**, l'**ordre de cuisson** et une **feuille à saisir dans FatSecret**.

Hébergé sur Netlify, déployé automatiquement à chaque `git push` sur `main`
(dépôt : `github.com/Karmadibsa/OptiCal-Center`).

---

## 2. Comment ça marche

### 2.1 — La règle d'or du calcul

> **socle fixe + repas batch = cible calorique**

Tout le système découle de là. Concrètement, dans `calculatePlan()` :

```
BMR          = Mifflin-St Jeor (poids, taille, âge, sexe)
TDEE         = BMR × PAL                        (PAL = niveau d'activité, 1.2 → 1.725)
cible/jour   = TDEE − déficit

socle fixe   = petit-déj (pain + cancoillotte + skyr + œufs) + whey(s)
             + fruits 16h + œufs du soir + fromage        ← tout ce qui est mangé HORS recettes
budget batch = cible − socle fixe
               ├── midi : 55 %
               └── soir : 45 %
```

Puis `scaleRecipeForMeal()` multiplie les ingrédients d'une recette pour atteindre
le budget du repas. **Conséquence importante** : si on alourdit le petit-déj, les
portions batch rétrécissent automatiquement, et inversement. Le total reste égal à la cible.

⚠️ Le socle utilisé pour le budget est **exactement** celui listé par `getSocleItems()`
(la feuille FatSecret). Il exclut volontairement la crème et les légumes : les recettes
batch les contiennent déjà, les compter deux fois fausserait tout.

### 2.2 — Les deux sources de vérité

| Fichier | Contient | Qui le lit |
|---|---|---|
| `public/diet.csv` | La **config** des deux profils (poids, taille, déficit, PAL, ratios, petit-déj) | `App.jsx` au chargement |
| `public/recipes/manifest.json` | L'**index de toutes les recettes** + leurs ingrédients | tous les composants |

**`diet.csv` écrase le localStorage au chargement.** Donc pour changer un réglage
durablement, il faut le modifier dans le CSV (le modifier dans l'UI ne survivra pas
à un rechargement si le CSV dit autre chose).

**`manifest.json` est généré** à partir des fichiers `.md` par `scripts/generate_recipes.js`
(lancé via `update_recipes.bat`). Attention : le script **préserve** les `ingredients`
déjà présents dans le manifest — voir §5.2 pour forcer un re-parse.

### 2.3 — Flux de données

```
public/diet.csv ─────────► App.jsx ──► profiles (state) ──► calculatePlan()
                                            │                     │
                                    localStorage                  ├─► budgets repas
                              'smart_diet_profiles_v2'            ├─► cibles macros
                                                                  └─► getSocleItems()
public/recipes/*.md ──[generate_recipes.js]──► manifest.json ──► scaleRecipeForMeal()
                                                                  │
                                                                  └─► courses / cuisson /
                                                                      répartition / FatSecret
```

### 2.4 — Les fichiers qui comptent

| Fichier | Lignes | Rôle |
|---|---|---|
| `src/utils/dietAlgo.js` | ~900 | **Le cerveau.** Tous les calculs : plan, budgets, scaling, socle, IG/CG, tags. Aucun JSX. |
| `src/components/BatchCooking.jsx` | ~1830 | Page principale : sélection recettes, semaine, courses, cuisson, répartition, FatSecret |
| `src/components/RecipeIdeas.jsx` | ~1086 | Idées recettes + scaleur interactif des plats plaisir |
| `src/components/SmartDiet.jsx` | ~643 | "Macro Plan" : réglage des profils (poids, PAL, ratios, petit-déj) |
| `src/components/DietSummary.jsx` | ~407 | Récapitulatif diététique imprimable |
| `src/components/ExternalMeal.jsx` | ~562 | Guide repas extérieur — **jamais revu, utilise encore l'ancien modèle** |
| `scripts/generate_recipes.js` | ~395 | Génère `manifest.json` depuis les `.md` (+ auto-parse ingrédients, détection pré-cuisson) |
| `public/recipes/_GUIDE_RECETTES.md` | — | **Le prompt de référence** donné à l'IA pour créer des recettes au bon format |

### 2.5 — Stockage navigateur

| Clé | Contenu |
|---|---|
| `smart_diet_profiles_v2` | Profils (écrasé par `diet.csv` au chargement) |
| `batch_cooking_v2` | Sélection de recettes, plan de la semaine, slots désactivés, poids mesurés |
| `bc_done_steps` | Étapes de protocole cochées pendant la cuisson |

---

## 3. Config actuelle (au moment de la passation)

| | Axel | Prisca |
|---|---|---|
| Poids / poids de forme | 109 kg / 95 kg | 61 kg / 62 kg |
| Déficit | 500 kcal | 250 kcal |
| PAL | 1.55 (actif, 3-5 séances) | 1.55 |
| **Cible** | **~2761 kcal/j** | **~1787 kcal/j** |
| Protéines | 2.0 g/kg → **190 g** | 2.0 g/kg → **124 g** |
| Lipides | 0.9 g/kg → ~86 g | 0.9 g/kg → ~56 g |
| Glucides | auto (résiduel) | auto (résiduel) |
| Petit-déj | 100 g pain + 100 g skyr + 3 œufs | 80 g pain + 20 g cancoillotte + 2 œufs |
| Fruits | 1 pomme/j | 1 pomme/j |
| Œufs le soir | 0 | 0 |

Les cibles glucides acceptent **3 modes** : auto (résiduel calorique), valeur en grammes,
ou **pourcentage des kcal** (le % est prioritaire s'il est renseigné).

---

## 4. Ce qui a été fait

### Fonctionnalités
- ✅ **Feuille FatSecret** : socle fixe itemisé + chaque plat listé **une seule fois** (avec les jours où il revient), macros complètes kcal/P/L/G pour les deux, bouton "Copier tout".
- ✅ **Calibrage juste** : `socle + batch = cible`. Avant, le batch était calé sur un forfait de 65 % des kcal, ce qui faisait **dépasser la cible de ~450 kcal/jour** sans que ça se voie.
- ✅ **Petit-déj entièrement réglable** : pain, cancoillotte, skyr/fromage blanc, œufs matin, œufs soir, bananes, pommes — par personne, répercuté partout.
- ✅ **Semaine sur 7 jours** (14 créneaux) et **5 recettes max** par semaine.
- ✅ **Index & charge glycémique** par portion + panneau de lissage hebdomadaire (Axel + Prisca), avec atténuation "repas mixte". Purement indicatif.
- ✅ **Système de pré-cuisson** : les lentilles/PST à cuire à part remontent en tête de la vue Cuisson ("À FAIRE D'ABORD"), détecté automatiquement depuis le protocole.
- ✅ **Protocoles cochables** + panneau "prochaine étape par plat" directement dans la vue Cuisson.
- ✅ **Tags & filtres multi-sélection** triés par catégorie (température / féculent / protéine).
- ✅ **Plafond par ingrédient** (`MAX_G_MAP`) : le konjac bloque à 350 g (Axel) / 200 g (Prisca) et les calories restantes sont redistribuées sur les toppings. Bouton "🎯 Reco" pour caler le coefficient sur la cible du repas.
- ✅ **Fix SPA** (`public/_redirects`) : plus de "Page not found" au rafraîchissement.

### Nettoyage
- ✅ Suppression des onglets **Dashboard** et **Calculateur** (inutilisés) → bundle 842 kB → ~427 kB.
- ✅ Suppression du tableau legacy "Pâtes/PST" et des logs dans Macro Plan.
- ✅ Noms d'ingrédients homogénéisés dans les courses (tous les riz → "Riz", etc.).
- ✅ Suppression de 4 symboles morts dans `dietAlgo.js` (`MEAL_PCT`, `GLU_CRITICAL_MIN`, `LIP_MAX_RATIO`, alias `scaleRecipeForMidi`) — vérifié 0 usage, 10/10 tests de non-régression après coup.
- ✅ `README.md` et `CALCUL_DETAILS.md` réécrits (ils décrivaient encore l'ancien système MET / pancakes / Pâtes Protein+ et des onglets supprimés).
- ✅ **Plafonds d'ingrédients dans le frontmatter** (`max_g: konjac=350/200`) au lieu d'ids de recettes en dur — un changement d'id ne désactive plus silencieusement un plafond.
- ✅ **Page Récap Diète branchée dans la nav** (la route existait sans entrée de menu).
- ✅ **Base de prix complétée** : 100 % des ingrédients batch (293/293), contre 76 % avant.

### Recettes
- **51 recettes** : 36 batch scalables + 15 plaisir (+ 10 plaisir archivées dans `_archive_plaisir/`).
- 5 salades batch conçues pour tenir **2-3 jours** (rotation : une salade tous les 2-3 jours).

### Bugs corrigés (à connaître, ils peuvent revenir)
| Bug | Cause | Correctif |
|---|---|---|
| "Pâtes" apparaissait dans les Aromates | La canonicalisation transformait « **Pâte** de curry » en « Pâtes » | Règle limitée au pluriel `pates` |
| Thon/poulet/lentilles classés en **Féculents** | `mapRole()` testait "glucides" avant "protéine", donc « Protéine + Glucides » → féculent | Ordre inversé dans `generate_recipes.js` (12 rôles corrigés) |
| « Œufs » jamais reconnu | La ligature `Œ` n'est **pas** décomposée par `normalize('NFD')` | `.replace(/œ/g,'oe')` dans les normaliseurs |
| Id de recette en doublon | Deux recettes avec `600015` → l'une écrasait l'autre à la régénération | Ids uniques, à vérifier à chaque ajout |
| 900 g de konjac dans une portion | Le scaleur multipliait tout pour atteindre la cible kcal | Plafond par ingrédient + redistribution |
| Haricots verts comptés comme légumineuse | `nm.includes('haricot')` | Exclusion de `vert` |

---

## 5. Ce qui reste à faire

### 5.1 — Dette technique (par priorité)

**🔴 1. L'ancien modèle Pâtes/PST vit encore dans `calculatePlan()`**
C'est le plus gros morceau. ~46 références (`pasta_grams_day`, `pasta_midi`, `pasta_soir`,
`pst_qty`, `fb_qty`, `PASTA_REF`) calculent encore une diète "pâtes + protéines de soja"
qui n'est **plus utilisée pour le batch cooking**, mais qui alimente toujours :
- `DietSummary.jsx` (lignes du récapitulatif) ;
- `ExternalMeal.jsx` ;
- l'export CSV de `SmartDiet.jsx`.

Retirer ce modèle demande de redéfinir ce qu'affichent ces trois écrans. La décision a été
**volontairement reportée** pour ne pas casser les chiffres avant la mise en production.
À traiter dans une passe dédiée, avec des tests avant/après.

**🟡 2. `ExternalMeal.jsx` n'a jamais été revu** dans cette refonte : il utilise encore
l'ancien modèle Pâtes/PST (voir point 1) et n'a pas été retesté fonctionnellement.

**🟢 3. Les prix sont des estimations.** `ingredients_prix.json` couvre 100 % des
ingrédients batch, mais 17 entrées ont été ajoutées avec des prix **estimés** (marqués
`ESTIMATION` dans le champ `achat`). À corriger avec les vrais tickets de caisse.

### 5.2 — Pièges à connaître

- **Le générateur préserve les ingrédients existants.** Si tu modifies la table d'ingrédients
  d'une recette **déjà** dans le manifest, relancer `update_recipes.bat` **ne changera rien**.
  Il faut d'abord supprimer le tableau `ingredients` de l'entrée concernée dans `manifest.json`,
  puis régénérer.
- **Vérifier l'unicité de l'id** à chaque nouvelle recette (batch : `6000xx`, plaisir : 6 chiffres).
  Prochains ids batch libres : **600030+**.
- **Les macros des recettes créées sont des estimations.** Elles n'ont pas été vérifiées à la
  cuisson réelle. À ajuster dans les `.md` à l'usage (comme la maïzena 10 g → 3 g et les
  lentilles 90 g → 60 g qui se sont révélées absurdes une fois à l'échelle).
- **Toujours regarder une quantité "à l'échelle"** avant de valider une recette : une valeur
  raisonnable pour 1 portion peut devenir aberrante multipliée par le coefficient et par
  2 personnes × 3 jours.

### 5.3 — En attente côté utilisateur

- **Liens Instagram source** des recettes reprises (wrap patate douce, pizza feuilles de riz) :
  prévu d'ajouter un champ `source` cliquable dans le frontmatter.
- **Recette "Nasi Goreng"** (idée n°13 de la liste initiale) : mise de côté, "à voir".
- **Tri des recettes batch par goût** : 9 recettes plaisir ont été archivées, mais les
  36 recettes batch n'ont pas encore été triées après dégustation.

---

## 6. Opérations courantes

### Lancer en local
```bash
npm install
npm run dev
```

### Ajouter une recette
1. Créer le `.md` dans `public/recipes/batch/` ou `public/recipes/plaisir/`
   en suivant **`public/recipes/_GUIDE_RECETTES.md`** (c'est le prompt de référence :
   frontmatter, matrice d'ingrédients, prix, protocole, règle `precook`).
2. Vérifier que l'**id est unique**.
3. Lancer `update_recipes.bat` (ou `node scripts/generate_recipes.js`).
4. Vérifier en local que la recette apparaît et que les rôles/quantités sont cohérents.

### Changer un réglage de diète durablement
Modifier `public/diet.csv` (c'est lui qui gagne au chargement), puis recharger.

### Déployer
```bash
git add . && git commit -m "..." && git push
```
Netlify redéploie automatiquement. `public/_redirects` gère le routage SPA.

### Vérifier que le calcul est juste
Contrôle rapide de l'invariant fondamental :
```bash
node --input-type=module -e "
import { calculatePlan, getSocleItems, DEFAULT_PROFILES } from './src/utils/dietAlgo.js';
const p={axel:{...DEFAULT_PROFILES.axel,weight:109,form_weight:95,height:183,deficit:500,pal:1.55,prot_ratio:2.0,opt_fromage:20},prisca:DEFAULT_PROFILES.prisca};
['axel','prisca'].forEach(k=>{const pl=calculatePlan(k,p),s=getSocleItems(k,p);
console.log(k, s.total.kcal+pl.batch_midi_budget+pl.batch_soir_budget, '=', Math.round(pl.target_daily));});
"
```
Les deux nombres doivent être égaux (±2 kcal d'arrondi).
