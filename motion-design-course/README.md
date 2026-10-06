# MotionClaude — Site de vente de la formation

Landing page statique en un seul fichier (`index.html`, sans dépendance) pour vendre une formation « Motion design avec Claude ».

## Voir le site en local

```bash
cd motion-design-course
python3 -m http.server 8080
# puis ouvrir http://localhost:8080
```

## À personnaliser avant la mise en ligne

1. **Liens de paiement** — en bas de `index.html`, renseigne `PAYMENT_LINKS` pour chaque formule :
   - `card` : Stripe Payment Link en paiement unique (CB, Apple Pay, Google Pay)
   - `split` : Stripe Payment Link en 3 mensualités
   - `paypal` : lien PayPal
2. **Offre de lancement** — `LAUNCH_OFFER_END` dans `index.html` (date passée = bandeau masqué).
3. **Prix & formules** — section `#tarifs` dans `index.html`.
4. **Témoignages** — ajoute de vrais avis d'élèves dès que tu en as.
5. **Mentions légales / CGV / Contact** — liens du footer (obligatoires pour vendre en France).

## Déploiement

Le dossier est autonome : il suffit de le glisser sur Netlify, Vercel, GitHub Pages ou Hostinger.
