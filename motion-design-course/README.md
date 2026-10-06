# MotionClaude — Site de vente de la formation

Landing page statique (HTML/CSS/JS, sans dépendance) pour vendre une formation « Motion design avec Claude ».

## Voir le site en local

```bash
cd motion-design-course
python3 -m http.server 8080
# puis ouvrir http://localhost:8080
```

## À personnaliser avant la mise en ligne

1. **Liens de paiement** — dans `script.js`, renseigne `CHECKOUT_LINKS` (Stripe Payment Links, Gumroad, Systeme.io…).
2. **Offre de lancement** — `LAUNCH_OFFER_END` dans `script.js` (vide = compte à rebours masqué).
3. **Prix & formules** — section `#tarifs` dans `index.html`.
4. **Témoignages** — remplace les exemples par de vrais avis d'élèves.
5. **Mentions légales / CGV / Contact** — liens du footer (obligatoires pour vendre en France).

## Déploiement

Le dossier est autonome : il suffit de le glisser sur Netlify, Vercel, GitHub Pages ou Hostinger.
