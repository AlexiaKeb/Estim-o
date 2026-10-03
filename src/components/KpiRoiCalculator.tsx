import React, { useState } from 'react';
import { 
  Calculator, 
  TrendingUp, 
  DollarSign, 
  Target, 
  PieChart, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  Sparkles
} from 'lucide-react';

export const KpiRoiCalculator: React.FC = () => {
  const [adSpend, setAdSpend] = useState<number>(600); // 600€ budget
  const [cplQualified, setCplQualified] = useState<number>(20); // 20€ / conversation qualifiée
  const [rdvConversionRate, setRdvConversionRate] = useState<number>(45); // 45% des qualifiés prennent RDV
  const [showUpRate, setShowUpRate] = useState<number>(85); // 85% de présence
  const [mandateSignRate, setMandateSignRate] = useState<number>(35); // 35% de mandats signés
  const [avgCommission, setAvgCommission] = useState<number>(12000); // 12 000€ d'honoraires moyens

  // Calculations
  const totalQualifiedLeads = Math.max(1, Math.round(adSpend / cplQualified));
  const rdvBooked = Math.max(1, Math.round(totalQualifiedLeads * (rdvConversionRate / 100)));
  const rdvAttended = Math.max(1, Math.round(rdvBooked * (showUpRate / 100)));
  const mandatesSigned = Math.max(1, Math.round(rdvAttended * (mandateSignRate / 100)));
  const totalTurnover = mandatesSigned * avgCommission;
  const costPerMandate = Math.round(adSpend / mandatesSigned);
  const netProfit = totalTurnover - adSpend;
  const roiMultiple = (totalTurnover / adSpend).toFixed(1);

  // Comparison with flawed Meta Lead Form
  const flawedCostPerLead = 8;
  const flawedTotalRawLeads = Math.round(adSpend / flawedCostPerLead);
  const flawedRdvRate = 8; // Only 8% turn into real meetings because of zero friction
  const flawedRdvs = Math.round(flawedTotalRawLeads * (flawedRdvRate / 100));
  const flawedMandates = Math.max(0, Math.round(flawedRdvs * 0.2));
  const flawedCostPerMandate = flawedMandates > 0 ? Math.round(adSpend / flawedMandates) : adSpend;

  return (
    <div id="kpi-roi-calculator-container" className="w-full max-w-6xl mx-auto space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold uppercase tracking-wider mb-2">
            <Calculator className="w-3.5 h-3.5 text-emerald-600" />
            Simulateur de Rentabilité & Commissions
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Estimez vos Honoraires & vos Mandats Signés
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Ajustez vos paramètres (budget, honoraires moyens, taux de transformation) pour visualiser directement vos rendez-vous obtenus et vos commissions prévisionnelles.
          </p>
        </div>
      </div>

      {/* Main Grid: Sliders + ROI Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Sliders Input Panel */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Vos Objectifs & Données d'Activité
            </h3>
            <p className="text-[11px] text-slate-500">Ajustez les curseurs pour simuler vos prévisions de mandats</p>
          </div>

          {/* Budget Ad */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-700">Budget communication mensuel</label>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                {adSpend} € / mois
              </span>
            </div>
            <input
              type="range"
              min="200"
              max="3000"
              step="50"
              value={adSpend}
              onChange={(e) => setAdSpend(Number(e.target.value))}
              className="w-full accent-blue-600 h-2 bg-slate-100 rounded-lg cursor-pointer"
            />
          </div>

          {/* CPL Qualifié */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-700">Coût estimé par contact vendeur qualifié</label>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                {cplQualified} € / contact
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="50"
              step="1"
              value={cplQualified}
              onChange={(e) => setCplQualified(Number(e.target.value))}
              className="w-full accent-blue-600 h-2 bg-slate-100 rounded-lg cursor-pointer"
            />
          </div>

          {/* Taux Transfo Qualif -> RDV */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-700">Taux de conversion vers RDV d'estimation</label>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                {rdvConversionRate} %
              </span>
            </div>
            <input
              type="range"
              min="15"
              max="75"
              step="1"
              value={rdvConversionRate}
              onChange={(e) => setRdvConversionRate(Number(e.target.value))}
              className="w-full accent-blue-600 h-2 bg-slate-100 rounded-lg cursor-pointer"
            />
          </div>

          {/* Taux de présence RDV */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-700">Taux de présence au RDV d'estimation</label>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                {showUpRate} %
              </span>
            </div>
            <input
              type="range"
              min="50"
              max="95"
              step="1"
              value={showUpRate}
              onChange={(e) => setShowUpRate(Number(e.target.value))}
              className="w-full accent-blue-600 h-2 bg-slate-100 rounded-lg cursor-pointer"
            />
          </div>

          {/* Taux Mandats signés */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-700">Taux de signature de mandat (RDV → Mandat)</label>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                {mandateSignRate} %
              </span>
            </div>
            <input
              type="range"
              min="15"
              max="65"
              step="1"
              value={mandateSignRate}
              onChange={(e) => setMandateSignRate(Number(e.target.value))}
              className="w-full accent-blue-600 h-2 bg-slate-100 rounded-lg cursor-pointer"
            />
          </div>

          {/* Honoraires moyens */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-700">Commission moyenne d'agence par vente</label>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                {avgCommission.toLocaleString('fr-FR')} €
              </span>
            </div>
            <input
              type="range"
              min="5000"
              max="25000"
              step="500"
              value={avgCommission}
              onChange={(e) => setAvgCommission(Number(e.target.value))}
              className="w-full accent-emerald-600 h-2 bg-slate-100 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* ROI Results & Unit Economics Cards */}
        <div className="lg:col-span-6 space-y-6">
          {/* Main Hero Metric Box */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 md:p-8 shadow-xl border border-slate-800 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                  Résultat Financier Projeté
                </span>
                <h4 className="text-xl font-extrabold text-white mt-0.5">Rentabilité Nette du Système</h4>
              </div>

              <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-black">
                ROI x{roiMultiple}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[11px] text-slate-400 uppercase font-semibold">CA Mandats Généré</div>
                <div className="text-2xl md:text-3xl font-extrabold text-emerald-400 mt-1">
                  {totalTurnover.toLocaleString('fr-FR')} €
                </div>
              </div>

              <div>
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Coût / Mandat Signé</div>
                <div className="text-2xl md:text-3xl font-extrabold text-white mt-1">
                  {costPerMandate.toLocaleString('fr-FR')} €
                </div>
              </div>
            </div>

            {/* Funnel Breakdown pills */}
            <div className="bg-slate-800/70 rounded-xl p-4 space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Leads qualifiés conversationnels :</span>
                <span className="font-bold text-white">{totalQualifiedLeads}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>RDV posés dans l'agenda :</span>
                <span className="font-bold text-blue-300">{rdvBooked} RDV</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>RDV honorés sur place :</span>
                <span className="font-bold text-blue-300">{rdvAttended} visites</span>
              </div>
              <div className="flex justify-between text-emerald-300 pt-2 border-t border-slate-700 font-bold">
                <span>Mandats de vente signés :</span>
                <span>{mandatesSigned} mandats</span>
              </div>
            </div>
          </div>

          {/* Direct Comparative Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Comparatif d'efficacité avec le même budget ({adSpend} €) :
            </h4>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                <div className="font-bold text-rose-900">Prospection Traditionnelle / Formulaires Bruts</div>
                <div className="text-slate-600 text-[11px]">~{flawedTotalRawLeads} contacts non qualifiés</div>
                <div className="font-semibold text-rose-800 pt-1">~{flawedMandates} mandat signé</div>
                <div className="text-[10px] text-slate-500">Coût / mandat : {flawedCostPerMandate} €</div>
              </div>

              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                <div className="font-bold text-emerald-950">Système d'Estimation & Qualification IA</div>
                <div className="text-slate-600 text-[11px]">{totalQualifiedLeads} contacts qualifiés & motivés</div>
                <div className="font-semibold text-emerald-800 pt-1">{mandatesSigned} mandats signés</div>
                <div className="text-[10px] text-slate-500">Coût / mandat : {costPerMandate} €</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
