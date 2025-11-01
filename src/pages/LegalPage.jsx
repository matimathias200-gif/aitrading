import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-red-500 hover:text-red-400 mb-8">
          <ArrowLeft className="w-5 h-5" />
          Retour
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-12"
        >
          {/* Mentions Légales */}
          <section id="mentions">
            <h1 className="text-4xl font-bold mb-6 text-red-500">Mentions Légales</h1>

            <div className="space-y-6 text-gray-300">
              <div>
                <h2 className="text-2xl font-bold mb-3 text-white">Éditeur du Site</h2>
                <p>
                  <strong>Raison sociale :</strong> NeuraTrade Technologies™<br />
                  <strong>Forme juridique :</strong> SAS<br />
                  <strong>Capital social :</strong> 50 000 €<br />
                  <strong>Siège social :</strong> 42 Avenue de l'Innovation, 75008 Paris, France<br />
                  <strong>Email :</strong> contact@neuratrade.ai
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold mb-3 text-white">Propriété Intellectuelle</h2>
                <p>
                  L'ensemble du contenu présent sur NEURA TRADE AI est la propriété exclusive de NeuraTrade Technologies™.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold mb-3 text-white">Avertissement sur les Risques</h2>
                <p className="text-yellow-400 font-semibold">
                  Le trading de cryptomonnaies comporte des risques financiers importants.
                </p>
              </div>
            </div>
          </section>

          {/* Politique de Confidentialité */}
          <section id="privacy" className="pt-12 border-t border-gray-800">
            <h1 className="text-4xl font-bold mb-6 text-red-500">Politique de Confidentialité</h1>

            <div className="space-y-6 text-gray-300">
              <div>
                <h2 className="text-2xl font-bold mb-3 text-white">Collecte des Données</h2>
                <p>Nous collectons : email, données de paiement crypto, données de navigation.</p>
              </div>

              <div>
                <h2 className="text-2xl font-bold mb-3 text-white">Vos Droits (RGPD)</h2>
                <p>Droits d'accès, rectification, effacement, portabilité.</p>
                <p className="mt-3">
                  Contact : <a href="mailto:privacy@neuratrade.ai" className="text-red-500 hover:underline">privacy@neuratrade.ai</a>
                </p>
              </div>
            </div>
          </section>

          {/* CGV */}
          <section id="cgv" className="pt-12 border-t border-gray-800">
            <h1 className="text-4xl font-bold mb-6 text-red-500">Conditions Générales de Vente</h1>

            <div className="space-y-6 text-gray-300">
              <div>
                <h2 className="text-2xl font-bold mb-3 text-white">Services</h2>
                <p>Accès plateforme IA, signaux trading, analyses en temps réel.</p>
              </div>

              <div>
                <h2 className="text-2xl font-bold mb-3 text-white">Tarifs</h2>
                <p>Paiement en crypto-monnaies. Abonnement mensuel.</p>
              </div>

              <div>
                <h2 className="text-2xl font-bold mb-3 text-white">Responsabilité</h2>
                <p className="text-yellow-400 font-semibold">
                  NeuraTrade Technologies™ ne garantit pas les résultats de trading.
                </p>
              </div>
            </div>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
