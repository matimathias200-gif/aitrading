/*
  # Trigger pour créer automatiquement les settings utilisateur

  ## Description
  Cette migration crée un trigger qui initialise automatiquement les paramètres
  d'un utilisateur lors de son inscription.

  ## Fonctionnement
  - Trigger déclenché après l'insertion d'un nouvel utilisateur dans auth.users
  - Crée automatiquement une entrée dans la table settings avec des valeurs par défaut
  - Évite l'erreur "aucun paramètre trouvé" lors de la première connexion

  ## Valeurs par défaut
  - sensitivity_level: 3 (modéré)
  - notifications_enabled: true
  - risk_profile: 'modéré'
*/

-- Fonction pour créer les settings utilisateur
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.settings (user_id, sensitivity_level, notifications_enabled, risk_profile)
  VALUES (NEW.id, 3, true, 'modéré')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger sur auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
