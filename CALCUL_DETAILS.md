# 📘 Calculateur SmartDiet : Règles & Formules

Ce document décrit le fonctionnement interne de l'outil *SmartDiet* (Linear Averaged Model), conçu pour lisser les apports sur la semaine.

---

## 1. Philosophie : Le Plan Unique
Contrairement aux diètes cycliques (jours ON/OFF), cet outil calcule **une moyenne** sur 7 jours.
*   **Avantage** : Plus simple à suivre (mêmes repas tous les jours).
*   **Méthode** : On additionne tout le sport de la semaine, on divise par 7, et on l'ajoute à chaque journée.

---

## 2. L'Algorithme de Calcul

### Étape A : Métabolisme de Base (BMR)
Formule de **Mifflin-St Jeor** (la plus fiable) :
*   **Axel** : `10 x Poids + 6.25 x Taille - 5 x Age + 5`
*   **Prisca** : `10 x Poids + 6.25 x Taille - 5 x Age - 161`

### Étape B : Dépense Totale (TDEE)
1.  **Sédentarité** : On multiplie le BMR par **1.2** (Travail bureau).
2.  **Sport** : 
    *   `Calories_Sport = Poids x (Minutes_Sport / 60) x 8 (MET)`
    *   On divise ce total par 7 pour l'ajouter à la journée.

### Étape C : Déficit
On soustrait le **Déficit Cible** (ex: 300 kcal) pour obtenir le budget calorique du jour.

---

## 3. Le Socle Fixe (Les "Incompressibles")

Avant de calculer les pâtes, l'outil soustrait tout ce qui est mangé par défaut.
Voici les valeurs **fixes** encodées dans l'outil :

| Aliment | Kcal | Protéines (g) |
| :--- | :--- | :--- |
| **Pancakes Matin** | 550 | 15 |
| **Whey Matin** (Axel) | 110 | 25 |
| **PST Midi** (100g Cru) | 330 | 50 |
| **Crème Fraîche** (2x30g) | 180 | 2 |
| **Oeufs Soir** (3 Axel / 2 Prisca) | 240 / 160 | 18 / 12 |
| **Banane + Whey (16h)** | 215 | 26 |
| **Légumes (Est.)** | 100 | 4 |

> **Total Socle Axel** : ~1725 kcal "déjà prises".

---

## 4. Calcul des Variables (Féculents)

Le reste des calories est comblé par les féculents.
*   **Référence** : Pâtes Barilla Protein+ (360 kcal / 100g).
*   **Formule** : `(Budget - Socle - Options) / 3.6` = Grammes de pâtes (Cru).

### 5. Options & Ajustements
*   **Galettes Soir** : Si coché, l'outil retire ~500 kcal de pâtes pour laisser la place aux galettes.
*   **Fromage** : Si vous ajoutez 20g de fromage, l'outil retire ~80 kcal de pâtes.

### 6. Sécurité Protéines ⚠️
Une alerte rouge apparaît si votre total de protéines (Socle + Pâtes) est inférieur à **1.6g / kg** de poids de corps.
