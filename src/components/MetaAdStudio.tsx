import React, { useState } from 'react';
import { META_CREATIVES } from '../data/mockLeads';
import { MetaAdCreative } from '../types';
import { 
  Sparkles, 
  Copy, 
  Check, 
  Target, 
  Workflow, 
  FileCode2, 
  RefreshCw, 
  Zap, 
  ExternalLink,
  Layers,
  ArrowRight
} from 'lucide-react';

export const MetaAdStudio: React.FC = () => {
  const [creatives, setCreatives] = useState<MetaAdCreative[]>(META_CREATIVES);
  const [selectedCreative, setSelectedCreative] = useState<MetaAdCreative>(META_CREATIVES[0]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // AI Generator state
  const [generating, setGenerating] = useState(false);
  const [aiCity, setAiCity] = useState('Bordeaux & Métropole');
  const [aiMotive, setAiMotive] = useState('Succession complexe entre plusieurs héritiers');

  // Blueprint copy state
  const [copiedBlueprint, setCopiedBlueprint] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleGenerateAiCreative = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/generate-ad-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          motive: aiMotive,
          targetCity: aiCity,
        }),
      });
      const data = await res.json();
      if (data.hook && data.body) {
        const newCreative: MetaAdCreative = {
          id: `ai-ad-${Date.now()}`,
          motive: aiMotive,
          title: `Angle IA : ${aiMotive}`,
          hook: data.hook,
          primaryText: data.body,
          ctaText: data.cta || 'Estimer mon bien gratuitement →',
          targetAudience: data.audienceTargeting || `Propriétaires 35-65 ans à ${aiCity}`,
          imagePrompt: data.creativeVisualAngle || 'Visuel immobilier soigné avec lumière naturelle',
          cplTarget: 18,
        };
        setCreatives([newCreative, ...creatives]);
        setSelectedCreative(newCreative);
      }
    } catch (e) {
      console.error('Ad generation error:', e);
    } finally {
      setGenerating(false);
    }
  };

  const makeBlueprintJson = JSON.stringify(
    {
      name: "Estimeo_RealEstate_Lead_Qualification",
      modules: [
        {
          id: 1,
          module: "gateway:CustomWebhook",
          name: "Meta Ads / Landing Page Webhook",
          description: "Reçoit les données de simulation d'estimation (surface, ville, type, prix)",
        },
        {
          id: 2,
          module: "google-genai:createChatCompletion",
          name: "Gemini 3.7 Flash Qualification Engine",
          description: "Script de qualification en 5 questions, extraction JSON et scoring /100",
        },
        {
          id: 3,
          module: "router:ConditionRouter",
          routes: [
            {
              condition: "qualificationScore >= 70 AND timeframe IN ('< 1 mois', '1-3 mois')",
              action: "Send Cal.com priority link + Instant SMS notification to agent",
            },
            {
              condition: "qualificationScore < 70 OR timeframe IN ('3-6 mois', '> 6 mois')",
              action: "Add to Brevo/Airtable Nurture Sequence (6-8 weeks automated cadence)",
            },
          ],
        },
        {
          id: 4,
          module: "airtable:createRecord",
          name: "Sync CRM Vendeurs & Estimations",
        },
      ],
    },
    null,
    2
  );

  const systemPromptTemplate = `Tu es l'agent IA de qualification immobilière de prestige conçu pour filtrer et qualifier les propriétaires vendeurs avant de leur proposer un rendez-vous d'estimation.

TON OBJECTIF :
Mener une conversation en 5 questions clés :
1. Type de bien, surface, état et adresse exacte
2. Motif réel de vente (Mutation, Succession, Agrandissement, Séparation, Vente locatif)
3. Délai souhaité (< 1 mois, 1-3 mois = CHAUD ; 3-6 mois = TIÈDE)
4. Prix net vendeur espéré / projet d'achat consécutif
5. Disponibilité pour une visite d'estimation sur place

FORMAT DE RÉPONSE JSON :
{
  "reply": "Message bienveillant et percutant",
  "qualificationScore": 85,
  "leadStatus": "HOT",
  "recommendedAction": "BOOK_MEETING"
}`;

  return (
    <div id="meta-ad-studio-container" className="w-full max-w-6xl mx-auto space-y-8 animate-in fade-in">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold uppercase tracking-wider mb-2">
            <Target className="w-3.5 h-3.5 text-blue-600" />
            Brique 5 & Blueprints : Studio Créa & Scripts Make.com
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Campagnes Meta Ads Spécifiques & Automatisation Make Prête à Déployer
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Pour réussir sur Meta sans gaspiller de budget, testez <strong>1 seule audience large avec 2-3 créas à angle motif différencié</strong>, puis envoyez le trafic vers le simulateur et l'agent IA.
          </p>
        </div>
      </div>

      {/* Main Grid: Ad Packs + AI Generator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left List of Creatives */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Angles Publicitaires Testés ({creatives.length})
            </h3>
            <span className="text-[11px] text-slate-400">Objectif : Qualification</span>
          </div>

          <div className="space-y-2">
            {creatives.map((c) => {
              const isSelected = selectedCreative.id === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCreative(c)}
                  className={`w-full p-3.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/70 shadow-xs ring-2 ring-blue-500/20'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{c.title}</span>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      CPL ~{c.cplTarget}€
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 line-clamp-1 mt-1">{c.hook}</div>
                </button>
              );
            })}
          </div>

          {/* AI Generator Box */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700">
              <Sparkles className="w-3.5 h-3.5" />
              Générer un nouvel angle créa avec Gemini IA
            </div>

            <div className="space-y-2">
              <input
                type="text"
                placeholder="Ville cible (ex: Bordeaux, Nantes...)"
                value={aiCity}
                onChange={(e) => setAiCity(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50"
              />
              <input
                type="text"
                placeholder="Motif de vente (ex: Divorce, Agrandissement...)"
                value={aiMotive}
                onChange={(e) => setAiMotive(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50"
              />
              <button
                type="button"
                onClick={handleGenerateAiCreative}
                disabled={generating}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {generating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                <span>Générer le pack publicitaire</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Active Ad Preview */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
                {selectedCreative.motive}
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-1">{selectedCreative.title}</h3>
            </div>

            <button
              type="button"
              onClick={() => handleCopyText(`${selectedCreative.hook}\n\n${selectedCreative.primaryText}\n\nCTA : ${selectedCreative.ctaText}`, selectedCreative.id)}
              className="py-1.5 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
            >
              {copiedId === selectedCreative.id ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600">Copié !</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copier le copy</span>
                </>
              )}
            </button>
          </div>

          {/* Facebook Mock Feed Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                AG
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Cabinet Immobilier Stratégique</div>
                <div className="text-[10px] text-slate-400">Sponsorisé • Publicité Meta</div>
              </div>
            </div>

            <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-line font-sans">
              {selectedCreative.primaryText}
            </p>

            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2 shadow-xs">
              <div className="text-[10px] text-slate-400 uppercase font-mono">Simulateur 2026 Certifié</div>
              <div className="text-sm font-bold text-slate-900">{selectedCreative.hook}</div>
              <div className="text-xs text-blue-600 font-semibold">{selectedCreative.ctaText}</div>
            </div>
          </div>

          {/* Targeting & Prompt */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="font-bold text-slate-900">Ciblage Recommandé :</div>
              <p className="text-slate-600 leading-relaxed text-[11px]">{selectedCreative.targetAudience}</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="font-bold text-slate-900">Idée de Visuel Créatif :</div>
              <p className="text-slate-600 leading-relaxed text-[11px]">{selectedCreative.imagePrompt}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Make.com & System Prompt Export Section */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
              <Workflow className="w-4 h-4" />
              Exports Prêts à l'Emploi pour Make.com & Gemini API
            </span>
            <h3 className="text-xl font-bold text-white mt-1">
              Le Blueprint d'Automatisation & Le System Prompt Métier
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Blueprint Make */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-blue-300">1. Blueprint Make.com / n8n (JSON)</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(makeBlueprintJson);
                  setCopiedBlueprint(true);
                  setTimeout(() => setCopiedBlueprint(false), 2000);
                }}
                className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                {copiedBlueprint ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedBlueprint ? 'Copié' : 'Copier JSON'}
              </button>
            </div>
            <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 h-64 overflow-y-auto">
              {makeBlueprintJson}
            </pre>
          </div>

          {/* System Prompt Gemini */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-blue-300">2. System Prompt Gemini 3.7 Flash</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(systemPromptTemplate);
                  setCopiedPrompt(true);
                  setTimeout(() => setCopiedPrompt(false), 2000);
                }}
                className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedPrompt ? 'Copié' : 'Copier Prompt'}
              </button>
            </div>
            <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 h-64 overflow-y-auto whitespace-pre-line">
              {systemPromptTemplate}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
