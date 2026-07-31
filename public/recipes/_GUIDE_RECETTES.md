# Guide de rédaction des recettes — OptiCal Center

> Ce fichier est la référence unique pour créer, modifier ou trier les recettes.
> Toute recette qui ne respecte pas ce format sera ignorée ou mal affichée par le site.

---

## 1. Organisation des dossiers

```
public/recipes/
├── batch/          ← Recettes batch cooking (scalable, portionnées pour la semaine)
├── plaisir/        ← Recettes plaisir (repas complet, une portion)
├── manifest.json   ← Index de TOUTES les recettes (source de vérité du site)
└── _GUIDE_RECETTES.md  ← Ce fichier
```

> **Règle d'or** : chaque fichier `.md` doit avoir une entrée correspondante dans `manifest.json`.
> Le site lit le manifest en premier, puis va chercher le `.md` pour l'affichage.

---

## 2. Les deux types de recettes

| | Batch (`batch/`) | Plaisir (`plaisir/`) |
|---|---|---|
| **Usage** | Préparée en grande quantité le dimanche, divisée sur la semaine | Repas complet cuisiné le jour même |
| **Portions** | 1 portion = ~650–690 kcal | 1 assiette complète = ~1 135–1 140 kcal |
| **Protéines** | 20–50 g/portion (complétées par PST au midi) | ≥ 55 g/assiette recommandé |
| **Fichier manifest** | Avec `scalable`, `has_pst`, `cook_coef` + array `ingredients` | Sans ces champs |
| **ID** | 6000xx (ex: 600007) | Nombre 6 chiffres aléatoire (ex: 291716) |

---

## 3. Format du fichier `.md`

### 3.1 — Recette BATCH (`batch/nom_recette.md`)

```markdown
---
id: 600007
name: Nom de la Recette
category: plats|vege
scalable: true
has_pst: false
cook_coef: 1.8
kcal: 650
prot: 28
lip: 18
glu: 95
price: 3.40
prep_active: 10 min
prep_inactive: 25 min
description: Une phrase ou deux max. Ce qui rend ce plat unique et appétissant.
tips: Le conseil clé du chef. Une seule phrase, actionnable.
emoji: 🥘
---

### 📊 Matrice des Ingrédients
| Ingrédient | Qty Base | Unité | Kcal/100g | Prot | Lip | Glu | Rôle |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Nom ingrédient | 150 | g | 164 | 9 | 3 | 22 | Protéine + Glucides |
| Pâtes sèches | 80 | g | 360 | 13 | 1.5 | 72 | Féculent |
| Huile d'olive | 10 | g | 884 | 0 | 100 | 0 | Lipides |
| Légumes variés | 150 | g | 25 | 2 | 0.2 | 4 | Légumes |
| Oignon / épices | 50 | g | 40 | 1 | 0.1 | 9 | Aromates |

### Prix des ingrédients
- Nom ingrédient : 0.70€
- Pâtes sèches : 0.40€
- Huile d'olive : 0.15€
- Légumes variés : 0.60€
- Oignon / épices : 0.25€

### Protocole
1. **Nom de l'étape** — Description de l'action. Précis, court, utile.
2. **Nom de l'étape** — Description de l'action.
3. **Nom de l'étape** — Description de l'action.
```

#### Champs frontmatter batch — détail

| Champ | Type | Obligatoire | Notes |
|---|---|---|---|
| `id` | entier | ✅ | 6000xx, incrémental |
| `name` | texte | ✅ | Nom affiché sur le site |
| `category` | `plats\|vege` / `plats\|viande` / `plats\|poisson` | ✅ | |
| `scalable` | `true` | ✅ | Toujours `true` pour batch |
| `has_pst` | `true` / `false` | ✅ | `true` si la recette contient des PST |
| `cook_coef` | `1.5` / `1.8` / `2.0` | ✅ | Multiplicateur volume cuit (1.5 = sauce, 2.0 = gros volume) |
| `kcal` | entier | ✅ | Pour 1 portion (base qty) |
| `prot` | entier | ✅ | g pour 1 portion |
| `lip` | entier | ✅ | g pour 1 portion |
| `glu` | entier | ✅ | g pour 1 portion |
| `price` | décimal | ✅ | Prix d'une portion en € |
| `prep_active` | `XX min` | ✅ | Temps où on est devant la casserole |
| `prep_inactive` | `XX min` | ✅ | Temps de cuisson/attente sans intervention |
| `description` | texte | ✅ | 1-2 phrases, ton appétissant |
| `tips` | texte | ✅ | 1 conseil concret |
| `emoji` | emoji | ✅ | 1 seul emoji |

#### Rôles dans le tableau ingrédients (colonne "Rôle")

| Valeur affichée | À utiliser pour |
|---|---|
| `Féculent` | Riz, pâtes, Ebly — les féculents pesables |
| `Protéine + Glucides` | Légumineuses (pois chiches, lentilles, haricots) |
| `Protéine (midi uniquement)` | PST — ajouter `★` après le nom |
| `Lipides` | Huile d'olive, crème, fromage, lait de coco |
| `Légumes` | Légumes, coulis, pulpe de tomate |
| `Aromates` | Oignon, ail, épices, herbes |

#### Note PST (si `has_pst: true`)
Ajouter `★` après le nom de l'ingrédient PST dans le tableau, et ajouter cette ligne juste après le tableau :

```markdown
★ Les PST sont incluses au **midi** uniquement. Au **soir**, remplacées par des œufs au plat (du socle).
```

---

### 3.2 — Recette PLAISIR (`plaisir/nom_recette.md`)

```markdown
---
id: 291716
name: Nom de la Recette
category: plats|viande
kcal: 1137
prot: 85
lip: 22
glu: 148
price: 9.50
prep_active: 15 min
prep_inactive: 10 min
description: Une phrase ou deux max. Ce qui rend ce plat unique et appétissant.
tips: Le conseil clé du chef. Une seule phrase, actionnable.
emoji: 🍗
---

### 📊 Matrice des Ingrédients
| Ingrédient | Qty Base | Unité | Kcal | Prot | Lip | Glu | Divisible | Vol. Cuit | Prix estimé (€) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Filet de poulet | 350 | g | 385 | 80 | 7 | 0 | oui | non | 4.50 |
| Riz Basmati (cru) | 130 | g | 455 | 10 | 1 | 101 | oui | oui | 0.35 |
| Sauce / marinade | 30 | g | 55 | 1 | 3 | 6 | oui | non | 0.60 |
| Légumes | 300 | g | 80 | 4 | 0.5 | 12 | oui | non | 2.00 |
| Épices | 1 | cs | 18 | 0 | 1 | 2 | oui | non | 0.30 |

### Protocole
1. **Étape 1** — Description de l'action.
2. **Étape 2** — Description de l'action.
3. **Étape 3** — Description de l'action.
4. **Étape 4** — Description de l'action.
5. **Étape 5** — Dressage et service.
```

#### Différences clés vs batch

| Point | Règle plaisir |
|---|---|
| `Kcal` dans tableau | **Total de la ligne** (pas /100g) |
| `Divisible` | `oui` si on peut en faire une portion plus petite, sinon `non` |
| `Vol. Cuit` | `oui` si l'ingrédient grossit à la cuisson (riz, pâtes), sinon `non` |
| `Prix estimé` | Inclus dans le tableau (pas de section séparée) |
| Protocole | Toujours **"Étape 1", "Étape 2"...** (pas de noms d'étapes) |
| Macros | Pour l'assiette entière (cible ~1135-1140 kcal) |

---

## 4. Le fichier `manifest.json`

C'est **la source de vérité** : si une recette n'est pas dans le manifest, elle n'existe pas pour le site.

### 4.1 — Entrée minimale (recette plaisir)

```json
{
  "file": "plaisir/nom_fichier.md",
  "id": "291716",
  "name": "Nom Affiché",
  "category": "plats|viande",
  "kcal": "1137",
  "prot": "85",
  "lip": "22",
  "glu": "148",
  "price": "9.50",
  "prep_active": "15 min",
  "prep_inactive": "10 min",
  "description": "Description courte.",
  "tips": "Conseil chef.",
  "emoji": "🍗"
}
```

> ⚠️ Dans le manifest les valeurs numériques sont des **chaînes** (`"1137"` pas `1137`).
> Exception : dans le tableau `ingredients` des recettes batch, les nombres sont des **nombres** (`150` pas `"150"`).

### 4.2 — Entrée complète (recette batch)

```json
{
  "file": "batch/nom_fichier.md",
  "id": "600007",
  "name": "Nom Affiché",
  "category": "plats|vege",
  "scalable": true,
  "has_pst": false,
  "cook_coef": "1.8",
  "kcal": "650",
  "prot": "28",
  "lip": "18",
  "glu": "95",
  "price": "3.40",
  "prep_active": "10 min",
  "prep_inactive": "25 min",
  "description": "Description courte.",
  "tips": "Conseil chef.",
  "emoji": "🥘",
  "ingredients": [
    { "name": "Lentilles vertes (sèches)", "qty_g": 60, "kcal_100": 340, "prot_100": 26, "lip_100": 1, "glu_100": 52, "role": "protein_glu", "cook_group": "sauce_nom", "precook": true },
    { "name": "Pâtes sèches",   "qty_g": 80,  "kcal_100": 360, "prot_100": 13, "lip_100": 1.5, "glu_100": 72, "role": "feculent",    "cook_group": "pates" },
    { "name": "Huile d'olive",  "qty_g": 10,  "kcal_100": 884, "prot_100": 0,  "lip_100": 100, "glu_100": 0,  "role": "lipide",      "cook_group": "sauce_nom" },
    { "name": "Légumes",        "qty_g": 150, "kcal_100": 25,  "prot_100": 2,  "lip_100": 0.2, "glu_100": 4,  "role": "legume",      "cook_group": "sauce_nom" },
    { "name": "Oignon",         "qty_g": 60,  "kcal_100": 40,  "prot_100": 1,  "lip_100": 0.1, "glu_100": 9,  "role": "aromatique",  "unit": "pc", "g_per_pc": 80, "cook_group": "sauce_nom" },
    { "name": "Épices",         "qty_g": 8,   "kcal_100": 280, "prot_100": 12, "lip_100": 4,   "glu_100": 38, "role": "aromatique",  "fixed_qty": true, "cook_group": "sauce_nom" }
  ]
}
```

### 4.3 — Champs des ingrédients (array `ingredients`)

| Champ | Type | Obligatoire | Notes |
|---|---|---|---|
| `name` | texte | ✅ | Nom affiché dans la liste de courses |
| `qty_g` | nombre | ✅ | Quantité en grammes pour **1 portion** |
| `kcal_100` | nombre | ✅ | Kcal pour 100g |
| `prot_100` | nombre | ✅ | Protéines pour 100g |
| `lip_100` | nombre | ✅ | Lipides pour 100g |
| `glu_100` | nombre | ✅ | Glucides pour 100g |
| `role` | voir ci-dessous | ✅ | Rôle nutritionnel |
| `cook_group` | texte | ✅ | Groupe de cuisson (voir §4.4) |
| `unit` | `"pc"` | ⬜ | Seulement si l'ingrédient se compte en pièces (oignons, œufs…) |
| `g_per_pc` | nombre | ⬜ | Poids moyen de la pièce en g. Requis si `unit: "pc"` |
| `fixed_qty` | `true` | ⬜ | Mettre sur les épices/aromates : leur quantité n'est PAS scalée |
| `is_pst` | `true` | ⬜ | Mettre uniquement sur l'ingrédient PST |
| `precook` | `true` | ⬜ | Mettre sur un ingrédient à **cuire / réhydrater À PART avant l'assemblage** (voir §4.5). Ex : lentilles/pois chiches **secs** à bouillir, **PST sèches** à réhydrater. ⚠️ NE PAS mettre si l'ingrédient cuit directement dans la sauce (lentilles corail, PST ajoutée sèche dans un plat mijoté, légumineuses en conserve). |

#### Valeurs de `role`

| Valeur | Utiliser pour |
|---|---|
| `feculent` | Riz, pâtes, Ebly **uniquement** (détermine l'affichage "à peser") |
| `protein` | PST — source protéique pure |
| `protein_glu` | Légumineuses (pois chiches, lentilles, haricots rouges/blancs) |
| `lipide` | Huile d'olive, crème fraîche, fromage, lait de coco |
| `legume` | Légumes frais/surgelés, pulpe/coulis de tomate, maïs |
| `aromatique` | Oignon, ail, épices, herbes — toujours avec `fixed_qty: true` pour les épices |

### 4.4 — Convention de nommage des `cook_group`

Le `cook_group` détermine comment les ingrédients sont regroupés dans l'ÉTAPE 2 du batch cooking (liste de courses + cuisson).

| Pattern | Exemple | Utiliser pour |
|---|---|---|
| `pst` | `pst` | Toujours ce nom pour les PST |
| `pates` | `pates` | Toujours ce nom pour les pâtes |
| `riz` | `riz` | Toujours ce nom pour le riz |
| `ebly` | `ebly` | Toujours ce nom pour l'Ebly |
| `sauce_[nom]` | `sauce_bolo`, `sauce_curry`, `sauce_chili` | Sauce/ragoût principal |
| `legumes_[nom]` | `legumes_pst` | Légumes sautés en accompagnement |
| `finition_[nom]` | `finition_bolo` | Ingrédients ajoutés hors feu (parmesan, herbes fraîches) |
| `[nom]_croustillants` | `pois_croustillants` | Préparation rôtie spécifique |

> ⚠️ `pates`, `riz`, `ebly` sont les **seuls** cook_groups qui génèrent un affichage "à peser au gramme près".
> Les autres affichent une quantité en g mais sans indication de pesée.

### 4.5 — Système de cuisson (ordre & pré-cuisson) 🔑

Le batch cooking suit une logique **« on cuit d'abord ce qui doit l'être, on assemble ensuite »**.
Le site regroupe les ingrédients en **3 temps** :

1. **À PRÉ-CUIRE D'ABORD** (remonte en tête de l'étape Cuisson) :
   - **Féculents à peser** : `cook_group` = `riz` / `pates` / `ebly` / `gnocchis`.
   - **Ingrédients `precook: true`** : légumineuses **sèches** à bouillir (lentilles vertes, pois chiches secs) et **PST sèches** à réhydrater.
2. **LA SAUCE / L'ASSEMBLAGE** : tout le reste (`cook_group` = `sauce_[nom]`, `legumes_[nom]`…).
3. **LA FINITION** hors feu : `cook_group` = `finition_[nom]` (parmesan, herbes fraîches).

#### 🧠 Règle de décision pour l'IA — mettre `precook: true` ou pas ?

Pour **chaque légumineuse sèche ou PST**, regarde le protocole et décide :

| Cas | `precook` | Exemple |
|---|---|---|
| Bouillie / réhydratée **séparément** puis égouttée avant d'être ajoutée | ✅ `true` | Lentilles vertes bouillies 20 min · PST réhydratées 10 min puis pressées |
| Ajoutée **sèche directement** dans la sauce/marmite qui mijote avec du liquide | ❌ (rien) | Lentilles **corail** (fondent dans la sauce) · PST sèche versée dans un curry coco |
| **En conserve / déjà cuite / égouttée** (aucune cuisson) | ❌ (rien) | Pois chiches en conserve, haricots rouges égouttés |

#### 📝 Impact sur le protocole
Si un ingrédient a `precook: true`, **l'étape 1 du protocole** doit être sa pré-cuisson, clairement nommée :
`1. **Pré-cuire les lentilles** — …` ou `1. **Réhydrater les PST** — …`.

---

## 5. Checklist avant d'ajouter une recette

### Recette Batch
- [ ] Fichier dans `batch/` avec nom en `snake_case.md`
- [ ] Frontmatter complet (tous les champs du §3.1)
- [ ] `scalable: true`, `has_pst: true/false`, `cook_coef` défini
- [ ] Macros pour **1 portion** (pas pour 4 portions !)
- [ ] Tableau `Kcal/100g` (pas kcal totales)
- [ ] Section "Prix des ingrédients" présente
- [ ] Protocole avec noms d'étapes significatifs
- [ ] Note ★ ajoutée si `has_pst: true`
- [ ] Entrée dans `manifest.json` avec array `ingredients` complet
- [ ] Chaque ingrédient a un `role` et un `cook_group` corrects
- [ ] Les épices/aromates ont `fixed_qty: true`
- [ ] L'oignon a `unit: "pc"` et `g_per_pc: 80`
- [ ] `precook: true` sur les légumineuses **sèches** à bouillir et **PST sèches** à réhydrater séparément (voir §4.5) — PAS sur celles cuites dans la sauce ni en conserve
- [ ] Si `precook` présent → l'étape 1 du protocole est bien la pré-cuisson

### Recette Plaisir
- [ ] Fichier dans `plaisir/` avec nom en `snake_case.md`
- [ ] Frontmatter sans `scalable`/`has_pst`/`cook_coef`
- [ ] Macros pour **l'assiette entière** (~1135 kcal)
- [ ] Tableau avec colonnes `Kcal` (totales) + `Divisible` + `Vol. Cuit` + `Prix estimé`
- [ ] Protocole en "Étape 1, Étape 2..."
- [ ] Entrée dans `manifest.json` **sans** array `ingredients`
- [ ] ID aléatoire à 6 chiffres (vérifier qu'il n'existe pas déjà)

---

## 6. IDs existants — ne pas réutiliser

| Plage | Usage |
|---|---|
| 600001–600014 | Recettes batch existantes |
| **600015+** | Prochaines recettes batch |
| 109340, 112094, 119512, 144193, 167177, 178122, 181980, 201144, 204477, 291716, 344618, 410001, 957622 | Recettes plaisir existantes |
