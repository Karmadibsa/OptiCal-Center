# 📘 Le calcul OptiCal Center — règles & formules

Ce document décrit **exactement** ce que fait `src/utils/dietAlgo.js`.
Si le code et ce fichier divergent, c'est le code qui a raison — et ce fichier est à corriger.

---

## 1. La règle d'or

> **socle fixe + repas batch = cible calorique**

Tout découle de là. Le plan n'est pas "un forfait de X % pour les repas" : les recettes du
batch cooking sont calibrées sur **ce qui reste** une fois le socle déduit. Résultat : alourdir
le petit-déjeuner rétrécit automatiquement les portions des plats, et inversement, mais le
total de la journée tombe toujours sur la cible.

---

## 2. La cible calorique

### Étape A — Métabolisme de base (BMR)
Formule de **Mifflin-St Jeor** :

```
BMR = (10 × poids_kg) + (6.25 × taille_cm) − (5 × âge) + S
      S = +5 (homme) | −161 (femme)
```

L'âge est recalculé automatiquement depuis la date de naissance (`birthdate`).

### Étape B — Dépense totale (TDEE)
```
TDEE = BMR × PAL
```

Le **PAL** (Physical Activity Level) remplace l'ancien système MET par séance : le budget est
volontairement **stable 7 j/7**, sans variation les jours d'entraînement.

| PAL | Niveau | Correspond à |
|---|---|---|
| 1.2 | Sédentaire | bureau, peu de déplacements |
| 1.375 | Peu actif | 1–3 séances légères / semaine |
| **1.55** | **Actif** | **3–5 séances / semaine** (réglage actuel) |
| 1.725 | Très actif | 6–7 séances intenses / semaine |

### Étape C — Déficit
```
cible_jour = TDEE − déficit
```

---

## 3. Le socle fixe

Le socle regroupe **tout ce qui est mangé en dehors des recettes batch**. Il est entièrement
réglable par personne dans *Macro Plan* (et persisté dans `public/diet.csv`) :

| Moment | Aliment | Réglage |
|---|---|---|
| Matin | Pain semi-complet | `pain_matin_g` |
| Matin | Cancoillotte | `cancoillotte_g` |
| Matin | Skyr / fromage blanc | `skyr_g` |
| Matin | Œufs | `oeuf_matin` |
| Matin | Whey (Axel) | `opt_whey_matin` |
| 16 h | Bananes / pommes | `banane_qty` / `pomme_qty` |
| 16 h | Whey | `opt_whey_collation` |
| Soir | Œufs | `oeuf_soir` |
| Soir | Fromage | `opt_fromage` |

Valeurs nutritionnelles unitaires dans la constante `FOOD` (pain et fromages **par gramme**,
œufs et fruits **par unité**).

> ⚠️ Le socle exclut **volontairement** la crème et les légumes : les recettes batch les
> contiennent déjà. Les compter ici créerait un double comptage.

C'est exactement cette liste que renvoie `getSocleItems()` et qu'affiche la feuille FatSecret.

---

## 4. Le budget des repas batch

```
budget_batch = cible_jour − socle_fixe
   ├── midi : 55 %
   └── soir : 45 %
```

Puis `scaleRecipeForMeal()` met la recette à l'échelle :

```
coefficient = budget_du_repas / kcal_de_la_recette_de_base     (plancher : 0.3)
```

- Chaque ingrédient est multiplié par ce coefficient…
- …**sauf** ceux marqués `fixed_qty` (épices, aromates ≤ 10 g), qui ne bougent pas.
- **Boost lipides** : si le repas est sous sa part de la cible lipides, l'huile de la recette
  est augmentée automatiquement (plafond +25 g par repas).

---

## 5. Les cibles macros

| Macro | Calcul | Remarque |
|---|---|---|
| **Protéines** | `prot_ratio × poids_de_forme` | basé sur le **poids de forme**, pas le poids actuel |
| **Lipides** | `lip_ratio × poids_de_forme` | plancher santé à **0.8 g/kg** (alerte rouge en dessous) |
| **Glucides** | 3 modes, voir ci-dessous | variable d'ajustement |

Les glucides acceptent trois modes, par ordre de priorité :
1. **Pourcentage** des kcal (`glu_pct`) — si renseigné, il gagne ;
2. **Grammes** fixes (`glu_target`) ;
3. **Auto** (défaut) : le résiduel calorique `(cible − prot×4 − lip×9) ÷ 4`.

---

## 6. Index & charge glycémique (indicatif)

Calculés par `computeGlycemic()` sur une portion mise à l'échelle :

```
CG   = Σ (IG_ingrédient × glucides_ingrédient) ÷ 100
IG   = moyenne des IG pondérée par les glucides
```

Un **lissage "repas mixte"** est ensuite appliqué : lipides et protéines ralentissent la
vidange gastrique, donc l'IG effectif est réduit en fonction du ratio (lipides, protéines)
sur glucides — réduction bornée à **−35 %**.

> ⚠️ Les IG proviennent de tables de référence internationales (Foster-Powell / Univ. de Sydney).
> Ce sont des **estimations** pour comparer les recettes entre elles, pas un outil médical.
> Repères par repas complet : ≤ 25 bas · ≤ 45 modéré · au-delà élevé.

---

## 7. Ordre de cuisson (`precook`)

Un ingrédient marqué `precook: true` (légumineuses **sèches** à bouillir, **PST sèches** à
réhydrater) est sorti de son groupe "sauce" et remonté en tête de la vue Cuisson, avec les
féculents à peser (riz / pâtes / Ebly / gnocchis).

La logique de cuisson se lit donc en trois temps : **cuire d'abord → assembler la sauce → finition**.

Le flag est posé par l'IA au moment d'écrire la recette (voir `public/recipes/_GUIDE_RECETTES.md`)
et, à défaut, détecté automatiquement dans le protocole par `scripts/generate_recipes.js`.

---

## 8. Vérifier que tout est cohérent

L'invariant du §1 se contrôle en une commande :

```bash
node --input-type=module -e "
import { calculatePlan, getSocleItems, DEFAULT_PROFILES } from './src/utils/dietAlgo.js';
const p={axel:{...DEFAULT_PROFILES.axel,weight:109,form_weight:95,height:183,deficit:500,pal:1.55,prot_ratio:2.0,opt_fromage:20},prisca:DEFAULT_PROFILES.prisca};
['axel','prisca'].forEach(k=>{const pl=calculatePlan(k,p),s=getSocleItems(k,p);
console.log(k, s.total.kcal+pl.batch_midi_budget+pl.batch_soir_budget, '=', Math.round(pl.target_daily));});
"
```

Les deux nombres doivent être égaux (± 2 kcal d'arrondi).
