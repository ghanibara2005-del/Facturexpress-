# FactureXpress

MVP de gestion commerciale en français construit avec Next.js App Router, TypeScript et Tailwind CSS. Les données de démonstration et les modifications sont stockées dans le navigateur (`localStorage`) ; aucune base de données n'est nécessaire.

## Démarrer

```bash
npm install
npm run dev
```

Puis ouvrez [http://localhost:3000](http://localhost:3000).

## Fonctionnalités

- Tableau de bord avec chiffre d'affaires payé, encours et documents récents.
- Gestion des clients et recherche d'entreprise par SIREN/SIRET via l'API publique `recherche-entreprises.api.gouv.fr`.
- Création de devis avec lignes, quantité, prix HT et TVA, calculs automatiques.
- Conversion d'un devis en facture, avec suivi des états brouillon, envoyée et payée.
- Impression/téléchargement PDF depuis la boîte de dialogue du navigateur.
- Persistance locale et données d'exemple réinitialisables depuis le navigateur.

## Limites du MVP

Les données restent sur l'appareil et ne sont ni synchronisées ni sauvegardées sur un serveur. Le PDF est produit via l'impression navigateur. L'export Factur-X conforme (PDF/A-3 avec fichier XML embarqué) n'est pas encore implémenté ; ne pas utiliser ce MVP comme outil de conformité comptable sans validation spécialisée.
