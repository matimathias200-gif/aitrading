# Motion IA — Funnel de vente (quiz)

Funnel de vente en un seul fichier (`index.html`, sans dépendance) : un quiz pose des questions sur le projet de l'acheteur, affiche un plan personnalisé, puis l'envoie vers le paiement.

**Parcours :** accueil → objectif → créations voulues → écran « bonne nouvelle » → niveau → logiciels → IA → écran profil → temps par jour → frein → revenu visé (freelances uniquement) → prénom + e-mail → chargement → plan personnalisé → choix de la formule et paiement.

## Voir le site en local

```bash
cd motion-design-course
python3 -m http.server 8080
# puis ouvrir http://localhost:8080
```

## À configurer (en haut du `<script>` dans `index.html`)

1. **`PAYMENT_LINKS`** : un lien par formule et par moyen de paiement.
   - `card` : Stripe Payment Link en paiement unique (CB, Apple Pay, Google Pay). L'e-mail du quiz est prérempli automatiquement.
   - `split` : Stripe Payment Link en 3 mensualités.
   - `paypal` : lien PayPal.
2. **`LEAD_WEBHOOK_URL`** : URL qui reçoit les réponses et l'e-mail (Systeme.io, Brevo, Make, Zapier…).
3. **`LAUNCH_OFFER_END`** : fin de l'offre de lancement. Après cette date, les prix barrés et le compte à rebours disparaissent.
4. **`PLANS`** : prix des formules.
5. **Mentions légales / CGV / Contact** : obligatoires pour vendre en France.

## Déploiement

Le dossier est autonome : il suffit de le glisser sur Netlify, Vercel, GitHub Pages ou Hostinger.
