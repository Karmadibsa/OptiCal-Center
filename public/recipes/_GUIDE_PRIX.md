# Guide des prix d'ingrédients — OptiCal Center

> **Fichier source** : `ingredients_prix.json` (même dossier)
> Le site lit ce fichier pour calculer le budget de la semaine dans l'onglet Batch Cooking.

---

## Comment ça fonctionne

Le site associe chaque ingrédient d'une recette à une entrée dans `ingredients_prix.json`
en comparant les noms (insensible à la casse, accents ignorés, parenthèses ignorées).

**Formule** : `quantité_g × price_per_kg ÷ 1000 = coût de l'ingrédient`

Exemples :
- 150g de pois chiches × 2.92 €/kg ÷ 1000 = **0.44 €**
- 10g d'huile d'olive × 8.80 €/kg ÷ 1000 = **0.09 €**
- 30g de PST × 18.00 €/kg ÷ 1000 = **0.54 €**

---

## Format d'une entrée

```json
{
  "name": "Nom exact de l'ingrédient (tel qu'il apparaît dans les recettes)",
  "aliases": ["variante 1", "variante 2"],
  "price_per_kg": 2.92,
  "achat": "Boîte 400g · ~0.70€ · ~240g égouttés  (mémo pour retrouver le chiffre)",
  "magasin": "Lidl"
}
```

| Champ | Obligatoire | Description |
|---|---|---|
| `name` | ✅ | Nom principal, doit matcher (même partiellement) le nom dans la recette |
| `aliases` | ✅ | Variantes de noms pour la recherche floue |
| `price_per_kg` | ✅ | **Prix en €/kg** — voir §"Comment trouver le prix/kg" ci-dessous |
| `achat` | ⬜ | Mémo humain : comment vous avez obtenu le chiffre |
| `magasin` | ⬜ | Où vous achetez ça (Lidl, Leclerc, Biocoop…) |

---

## Comment trouver le prix/kg

### Ingrédient vendu au poids (vrac, sachet)
Prix/kg = prix indiqué sur l'emballage. Simple.

```
Lentilles vertes, sachet 500g = 1.25€
→ price_per_kg = 1.25 / 0.5 = 2.50
```

### Ingrédient vendu en boîte/conserve (légumineuses, tomates)
Pour les **légumineuses en boîte** : le poids utilisé en cuisine = poids **égoutté**.
Divisez le prix par le poids égoutté.

```
Haricots rouges, boîte 400g (dont 250g égouttés) = 0.70€
→ price_per_kg = 0.70 / 0.250 = 2.80
```

Pour les **tomates/coulis/pulpe** : utilisez le poids net total.
```
Pulpe de tomate, boîte 400g = 0.65€
→ price_per_kg = 0.65 / 0.4 = 1.63
```

### Ingrédient liquide (huile, lait de coco)
Convertissez en masse : densité huile ≈ 0.91, densité lait de coco ≈ 1.0.

```
Huile d'olive, bouteille 75cl = 6.00€
→ masse ≈ 750ml × 0.91 = 682g
→ price_per_kg = 6.00 / 0.682 = 8.80
```

```
Lait de coco light, boîte 400ml = 1.20€
→ masse ≈ 400g (densité ≈ 1)
→ price_per_kg = 1.20 / 0.4 = 3.00
```

### Épices / aromates (petites quantités)
Les épices coûtent peu mais ont un price_per_kg élevé. Une estimation approximative est OK.

```
Sachet d'épices 50g = 1.00€
→ price_per_kg = 1.00 / 0.05 = 20.00
(→ 10g d'épices = 0.20€ — acceptable comme estimation)
```

---

## Mettre à jour un prix

1. Ouvrez `ingredients_prix.json`
2. Trouvez l'entrée par son `name`
3. Mettez à jour `price_per_kg` et `achat`
4. Lancez `update_recipes.bat` (le manifest reste intact, seul l'affichage change au rechargement)

> Le `update_recipes.bat` ne touche pas à `ingredients_prix.json` — il ne gère que le manifest des recettes.
> Les prix sont lus directement par le navigateur au chargement de l'onglet Batch Cooking.

---

## Ajouter un ingrédient manquant

Si le site affiche "N ingrédients sans prix" dans le budget semaine, c'est qu'un ingrédient
n'a pas de correspondance dans ce fichier. Ajoutez une entrée :

1. Copiez le nom exact depuis le fichier `.md` de la recette (ou depuis le manifest.json)
2. Ajoutez l'entrée à la fin du tableau JSON (avant le `]` final)
3. Mettez la virgule sur l'entrée précédente
4. Rechargez le site — le calcul se met à jour automatiquement

---

## Ingrédients actuellement couverts

| Catégorie | Ingrédients |
|---|---|
| Légumineuses | Pois chiches, haricots rouges/blancs/noirs, lentilles vertes/corail |
| Protéines | PST hachées, PST grosses |
| Féculents | Pâtes sèches, Pâtes complètes, Barilla Protein+, Riz, Ebly (sec) |
| Tomates | Coulis, Pulpe, Concentré de tomate |
| Produits laitiers | Crème fraîche 15%, Parmesan râpé |
| Matières grasses | Huile d'olive *(€/L)*, Lait de coco light, Beurre de cacahuète |
| Condiments | Sauce soja *(€/L)* |
| Légumes frais | Oignon, Carottes, Courgettes, Patate douce (crue), Poireau, Brocolis, Chou blanc, Aubergines |
| Légumes surgelés | Épinards, Légumes variés |
| Légumes conserve | Maïs en conserve |
| Champignons | Champignons de Paris (frais/mélange) |
| Épices / aromates | **Une seule entrée** couvrant : ail, épices, curcuma, cumin, paprika, gingembre, cannelle, piment, muscade, levure maltée, herbes, thym, laurier, persil, curry, céleri |

---

## Règles de rédaction des recettes

> Ces règles garantissent que chaque ingrédient est reconnu par le moteur de prix.

### Oignon et épices — toujours séparés

Dans **toutes** les recettes batch, l'oignon et les épices doivent apparaître sur **deux lignes distinctes** :

```markdown
| Oignon | 80 | g | 40 | 1 | 0.1 | 9 | Aromates |
| Épices (cumin, paprika, sel) | 8 | g | 280 | 12 | 4 | 38 | Aromates |
```

❌ **Ne jamais écrire** : `Oignon / épices` (une seule ligne)
✅ **Toujours écrire** : deux lignes séparées

### Liquides (huile, sauce soja)

Les liquides sont achetés **au litre** mais la formule utilise des grammes.
Le `price_per_kg` est calculé en tenant compte de la densité :

| Ingrédient | Prix achat | Densité | price_per_kg stocké |
|---|---|---|---|
| Huile d'olive | ~6.60€/L | 0.916 | 8.80€/kg |
| Sauce soja | ~4.00€/L | ≈1.0 | 4.00€/kg |

### Une seule entrée "Épices"

Tous les noms du type `Ail / épices (curry, curcuma...)`, `Épices (cumin, cannelle...)`, `Céleri / herbes...` sont couverts par **une seule entrée JSON** avec des aliases étendus.
Le moteur reconnaît le match via le mot-clé `epices` ou `ail` dans le nom normalisé.

---

## Correspondance nom recette → prix

| Nom dans la recette | Entrée JSON matchée |
|---|---|
| `Oignon`, `Oignons (à caraméliser)` | `Oignon` |
| `Ail / épices (curry, curcuma, cumin)` | `Épices` via alias `ail epices` |
| `Épices (cumin, cannelle, sel)` | `Épices` via alias `epices` |
| `Patate douce (crue)` | `Patate douce (crue)` |
| `Ebly (sec)` | `Ebly (sec)` |
| `Carottes` | `Carottes` via alias `carotte` |
| `Poireau` | `Poireau` via alias `poireaux` |
| `Champignons de Paris (frais)` | `Champignons de Paris (frais)` |
