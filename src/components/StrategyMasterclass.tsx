import React, { useState } from 'react';
import { 
  Sparkles, 
  Layers, 
  Zap, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  Target, 
  Workflow, 
  Calendar, 
  Mail, 
  DollarSign, 
  Cpu, 
  FileText,
  HelpCircle
} from 'lucide-react';

export const StrategyMasterclass: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'anatomy' | 'comparison' | 'playbook' | 'architecture'>('anatomy');

  return (
    <div id="strategy-masterclass-container" className="w-full max-w-6xl mx-auto space-y-8 animate-in fade-in">
      {/* Hero Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-8 md:p-10 shadow-xs border border-slate-800 relative overflow-hidden">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-blue-300" />
            Guide Stratégique & Technique pour Alexia
          </div>

          <h1 className="text-2xl md:text-4xl font-extrabold text-white leading-tight">
            La Mécanique Complète : De l'Analyse du Pitch au Déploiement d'un Système Supérieur
          </h1>

          <p className="text-slate-300 text-sm md:text-base leading-relaxed">
            Démystifier les prétendus "Agents IA" vendus aux agences immobilières, corriger l'erreur structurelle du lead form Facebook natif, et industrialiser une machine d'acquisition de mandats qualifiés.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('anatomy')}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'anatomy'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white/10 text-slate-300 hover:bg-white/15'
            }`}
          >
            <Layers className="w-4 h-4" />
            1. Ce que ces gens vendent réellement (3 couches)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('comparison')}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'comparison'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white/10 text-slate-300 hover:bg-white/15'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            2. Pourquoi le Lead Form Facebook échoue
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('playbook')}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'playbook'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white/10 text-slate-300 hover:bg-white/15'
            }`}
          >
            <Target className="w-4 h-4" />
            3. Procédure de Construction en 6 Étapes
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('architecture')}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'architecture'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white/10 text-slate-300 hover:bg-white/15'
            }`}
          >
            <Cpu className="w-4 h-4" />
            4. Stack Technique Concrète (Make + LLM)
          </button>
        </div>
      </div>

      {/* Tab 1: Anatomy */}
      {activeTab === 'anatomy' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Layer 1 */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs relative overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black text-sm">
                01
              </div>
              <h3 className="text-base font-bold text-slate-900">La Promesse Commerciale</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Ils vendent <strong>un résultat mesurable (rendez-vous d'estimation posés dans l'agenda)</strong> plutôt qu'un outil ou un énième logiciel. L'agent immobilier achète du temps commercial libéré et des mandats, pas du code.
              </p>
              <div className="bg-amber-50 rounded-xl p-3 text-[11px] text-amber-900 border border-amber-200">
                <strong>Clé :</strong> Positionnement "conseil stratégique" axé sur la valeur finale.
              </div>
            </div>

            {/* Layer 2 */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs relative overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-black text-sm">
                02
              </div>
              <h3 className="text-base font-bold text-slate-900">Le Produit Réel (4 briques)</h3>
              <ul className="text-xs text-slate-600 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span><strong>Acquisition :</strong> Ads Meta/Google ciblant les propriétaires vendeurs.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span><strong>Qualification conversationnelle :</strong> Chatbot textuel/vocal qui filtre le lead.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span><strong>Prise de RDV auto :</strong> Insertion directe dans Calendly/Cal.com.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span><strong>Nurture des non-mûrs :</strong> Relances automatiques sur 6-8 semaines.</span>
                </li>
              </ul>
            </div>

            {/* Layer 3 */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs relative overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-sm">
                03
              </div>
              <h3 className="text-base font-bold text-slate-900">La Technique Concrète</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Ce n'est pas de la "R&D IA complexe" : c'est un <strong>workflow d'orchestration Make/n8n</strong> qui relie un webhook Meta, un prompt LLM métier (Gemini/Claude), une écriture CRM et un calendrier.
              </p>
              <div className="bg-emerald-50 rounded-xl p-3 text-[11px] text-emerald-900 border border-emerald-200">
                <strong>Verdict :</strong> Parfaitement accessible techniquement et réplicable en mode SaaS pour ton amie.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Comparison Facebook vs Conversational */}
      {activeTab === 'comparison' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 md:p-8 space-y-6">
          <div className="max-w-2xl space-y-2">
            <h2 className="text-xl font-bold text-slate-900">
              Pourquoi le formulaire Facebook natif génère 90% de déchets
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Le formulaire natif Meta (Lead Ads) génère du volume à bas coût mais zéro friction. Les internautes valident sans réfléchir (coordonnées pré-remplies), ce qui est létal pour un produit à cycle long et à forte valeur comme un mandat de vente.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Flawed Model */}
            <div className="bg-rose-50/60 border-2 border-rose-200 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 bg-rose-100 text-rose-800 rounded-full text-xs font-bold">
                  ❌ Modèle Formulaire Meta Natif
                </span>
                <span className="text-xs text-rose-600 font-semibold">Erreur classique</span>
              </div>

              <div className="space-y-3 text-xs text-slate-700">
                <div className="p-3 bg-white rounded-xl border border-rose-100 shadow-xs">
                  <div className="font-bold text-rose-900">Zéro Friction Cognitive</div>
                  <p className="text-slate-500 mt-0.5">Le prospect clique, ses champs sont pré-remplis automatiquement par Facebook, il valide par inadvertance.</p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-rose-100 shadow-xs">
                  <div className="font-bold text-rose-900">Aucune Qualification Métier</div>
                  <p className="text-slate-500 mt-0.5">Pas de motif de vente identifié, pas d'horizon de temps, pas de vérification de propriété.</p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-rose-100 shadow-xs">
                  <div className="font-bold text-rose-900">Perte des "Non-Mûrs"</div>
                  <p className="text-slate-500 mt-0.5">Ceux qui ne signent pas sous 48h sont abandonnés sans séquence de nurture.</p>
                </div>
                <div className="p-3 bg-rose-100/70 rounded-xl text-rose-900 font-semibold text-center">
                  Résultat : Agent découragé au téléphone, leads "injoignables" ou mécontents.
                </div>
              </div>
            </div>

            {/* Superior Model */}
            <div className="bg-emerald-50/60 border-2 border-emerald-200 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">
                  ✅ Modèle Conversationnel Qualifiant
                </span>
                <span className="text-xs text-emerald-700 font-semibold">Système Recommandé</span>
              </div>

              <div className="space-y-3 text-xs text-slate-700">
                <div className="p-3 bg-white rounded-xl border border-emerald-100 shadow-xs">
                  <div className="font-bold text-emerald-950">Aimant à Forte Valeur (Simulateur)</div>
                  <p className="text-slate-500 mt-0.5">Le vendeur investit 1 min pour configurer son bien et obtenir une fourchette de prix réaliste.</p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-emerald-100 shadow-xs">
                  <div className="font-bold text-emerald-950">Filtre Conversationnel (5-6 questions)</div>
                  <p className="text-slate-500 mt-0.5">L'Agent IA détecte le motif (succession, mutation), le délai et le niveau de motivation.</p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-emerald-100 shadow-xs">
                  <div className="font-bold text-emerald-950">Routage Intelligent (RDV vs Nurture)</div>
                  <p className="text-slate-500 mt-0.5">Seuls les leads chauds (&lt;3 mois) ont accès à l'agenda. Les autres entrent en séquence 6-8 semaines.</p>
                </div>
                <div className="p-3 bg-emerald-100/70 rounded-xl text-emerald-900 font-semibold text-center">
                  Résultat : Taux de présence aux RDV &gt; 85% et mandats exclusifs sécurisés.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Playbook 6 steps */}
      {activeTab === 'playbook' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 md:p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-xl font-bold text-slate-900">
              La Procédure Complète en 6 Étapes Opérationnelles
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              À déployer pas à pas pour ton amie sans gaspiller de budget média.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                step: '01',
                title: 'Repositionner l\'offre avant la pub',
                desc: 'Définir un ICP net : propriétaire dans un rayon précis avec un motif identifiable (mutation, succession, agrandissement familial, arbitrage locatif).',
                tag: 'Ciblage Amont',
              },
              {
                step: '02',
                title: 'Landing Page avec Simulateur',
                desc: 'Créer une page d\'estimation interactive (adresse, surface, état, DPE) qui sert d\'aimant à forte valeur et pré-qualifie par l\'intention.',
                tag: 'Aimant Vendeur',
              },
              {
                step: '03',
                title: 'Chatbot IA de Qualification',
                desc: 'Brancher un LLM (Gemini/Claude) scripté sur 5-6 questions clés avec calcul de score automatique (/100) pour filtrer les curieux.',
                tag: 'Filtre Intelligent',
              },
              {
                step: '04',
                title: 'Séquence Nurture pour Non-Mûrs',
                desc: 'Automatiser une séquence Email/SMS sur 6-8 semaines (tendances marché, ventes récentes) pour convertir les 70% de vendeurs décalés.',
                tag: 'Anti-Gaspillage',
              },
              {
                step: '05',
                title: 'Pub Meta à Petit Budget',
                desc: '1 seule audience large au départ, 2-3 créas à angle motif distinct, objectif de conversion calé sur "Conversation de qualification complétée".',
                tag: 'Acquisition Lean',
              },
              {
                step: '06',
                title: 'Pilotage par le Coût/Mandat',
                desc: 'Suivre le coût par lead qualifié et le coût par mandat signé (pas le simple CPL brut) pour ajuster le budget publicitaire.',
                tag: 'Unit Economics',
              },
            ].map((item) => (
              <div key={item.step} className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                    {item.step}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-blue-700 border border-slate-200">
                    {item.tag}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Concrete Architecture Stack */}
      {activeTab === 'architecture' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 md:p-8 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              L'Architecture Technique Réelle (Make / n8n + LLM + Calendrier)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Schéma du flux automatisé que tu peux implémenter directement pour ton amie.
            </p>
          </div>

          <div className="p-6 bg-slate-900 text-white rounded-2xl space-y-6 overflow-x-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono">
              <div className="p-4 bg-slate-800 rounded-xl border border-slate-700 text-center w-full md:w-48 space-y-1">
                <div className="text-blue-400 font-bold">1. Meta Ads</div>
                <div className="text-slate-300 text-[11px]">Angle Motif (Succession, etc.)</div>
              </div>

              <ArrowRight className="w-5 h-5 text-blue-400 hidden md:block" />

              <div className="p-4 bg-slate-800 rounded-xl border border-slate-700 text-center w-full md:w-48 space-y-1">
                <div className="text-amber-400 font-bold">2. Landing + Simu</div>
                <div className="text-slate-300 text-[11px]">Calcul valeur &gt; Webhook</div>
              </div>

              <ArrowRight className="w-5 h-5 text-amber-400 hidden md:block" />

              <div className="p-4 bg-slate-800 rounded-xl border border-slate-700 text-center w-full md:w-48 space-y-1">
                <div className="text-emerald-400 font-bold">3. Make + LLM</div>
                <div className="text-slate-300 text-[11px]">Prompt métier & Scoring /100</div>
              </div>

              <ArrowRight className="w-5 h-5 text-emerald-400 hidden md:block" />

              <div className="p-4 bg-slate-800 rounded-xl border border-slate-700 text-center w-full md:w-48 space-y-1">
                <div className="text-cyan-400 font-bold">4. Cal.com / CRM</div>
                <div className="text-slate-300 text-[11px]">RDV ou Séquence Nurture</div>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-4 text-xs text-slate-300 space-y-2">
              <div className="font-bold text-white flex items-center gap-2">
                <Workflow className="w-4 h-4 text-blue-400" />
                Détail du nœud d'automatisation Make :
              </div>
              <p className="text-slate-400 leading-relaxed">
                • <strong>Route 1 (Score &ge; 70 & Délai &lt; 3 mois) :</strong> Déclenchement lien Cal.com + Notification instantanée SMS à l'agent avec la fiche lead complète.
                <br />
                • <strong>Route 2 (Score &lt; 70 ou Délai &gt; 3 mois) :</strong> Inscription automatique dans Airtable / Brevo avec tag "Nurture-6-Semaines" + envoi immédiat du PDF de valorisation.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
