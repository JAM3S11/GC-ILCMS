import React, { useState } from 'react';
import {
  Database,
  Search,
  CheckCircle2,
  AlertTriangle,
  FlaskConical,
  FileText,
  Plus,
  BookOpen,
  Filter,
  Layers,
  Info,
} from 'lucide-react';
import { ScientificReferenceSubstance } from '../../types';
import { SCIENTIFIC_REFERENCES } from '../../data/initialData';

export const ReferenceDatabaseView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubstance, setSelectedSubstance] = useState<ScientificReferenceSubstance>(
    SCIENTIFIC_REFERENCES[0]
  );
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  const categories = ['ALL', 'Narcotic', 'Adulterant', 'Opioid', 'Stimulant'];

  const filteredReferences = SCIENTIFIC_REFERENCES.filter((ref) => {
    const matchesSearch =
      ref.substanceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ref.commonName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ref.casNumber.includes(searchTerm) ||
      ref.chemicalName.toLowerCase().includes(searchTerm.toLowerCase());

    if (activeCategory === 'ALL') return matchesSearch;
    return matchesSearch && ref.category.toLowerCase().includes(activeCategory.toLowerCase());
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Database className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                Local Scientific Reference Database &amp; Spectral Decision Support
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Decision-support library of certified reference standards and regional seized substance monographs
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300">
            {SCIENTIFIC_REFERENCES.length} Verified Standards Loaded
          </span>
        </div>
      </div>

      {/* Decision Support Advisory Notice */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border-l-4 border-amber-500 text-xs space-y-1">
        <div className="flex items-center gap-2 text-amber-400 font-mono font-bold uppercase">
          <Info className="w-4 h-4" />
          <span>Scientific Principle: Decision Support System Only</span>
        </div>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
          The Local Scientific Reference Database functions as a peer decision-support catalog. It does not automatically author or stamp court certificates. Final substance identification remains the legal responsibility of the reporting gazetted Government Analyst.
        </p>
      </div>

      {/* Main split view: Search & list on left, details on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Search & List */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search substance, CAS, synonym..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    activeCategory === cat
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Substance Cards List */}
          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {filteredReferences.map((ref) => {
              const isSelected = selectedSubstance.id === ref.id;
              return (
                <div
                  key={ref.id}
                  onClick={() => setSelectedSubstance(ref)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer space-y-1.5 text-xs ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{ref.substanceName}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-emerald-400 border border-slate-300 dark:border-slate-700">
                      {ref.verificationStatus}
                    </span>
                  </div>

                  <div className="text-slate-500 dark:text-slate-400 text-[11px] font-mono">
                    CAS: {ref.casNumber} • MW: {ref.molecularWeight} g/mol
                  </div>

                  <p className="text-slate-500 dark:text-slate-400 text-[11px] line-clamp-1">{ref.category}</p>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/80 dark:border-slate-800/80">
                    <span>Expected RT: {ref.gcmsRetentionTimeExpected} min</span>
                    <span>λmax: {ref.uvVisLambdaMax.join(', ')} nm</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Full Substance Dossier */}
        <div className="lg:col-span-7">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6 text-xs">
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-mono text-amber-400 uppercase font-bold">
                  Reference Record ID: {selectedSubstance.id}
                </span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white font-sans mt-1">
                  {selectedSubstance.substanceName}
                </h2>
                <div className="text-slate-500 dark:text-slate-400 text-xs font-mono mt-0.5">
                  Common name: {selectedSubstance.commonName}
                </div>
              </div>

              <div className="text-right">
                <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[10px] font-bold">
                  {selectedSubstance.verificationStatus}
                </span>
              </div>
            </div>

            {/* Chemical Properties Table */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono">
              <div>
                <span className="text-slate-500 dark:text-slate-400 text-[10px] block uppercase">CAS Number:</span>
                <span className="text-slate-900 dark:text-white font-bold">{selectedSubstance.casNumber}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 text-[10px] block uppercase">Molecular Formula:</span>
                <span className="text-amber-300 font-bold">{selectedSubstance.molecularFormula}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 text-[10px] block uppercase">Molecular Weight:</span>
                <span className="text-slate-900 dark:text-white">{selectedSubstance.molecularWeight} g/mol</span>
              </div>
            </div>

            {/* IUPAC Name */}
            <div className="space-y-1">
              <span className="text-slate-500 dark:text-slate-400 text-[10px] font-mono uppercase">Systematic Chemical IUPAC:</span>
              <p className="p-2.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-slate-700 dark:text-slate-200 text-[11px] break-all">
                {selectedSubstance.chemicalName}
              </p>
            </div>

            {/* Analytical Specifications */}
            <div className="space-y-3">
              <h3 className="font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-1">
                Forensic Instrumental Specifications
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <span className="text-amber-400 font-mono font-semibold text-[11px] block">
                    GC-MS Chromatography Specs
                  </span>
                  <div className="text-slate-600 dark:text-slate-300 space-y-1 font-mono text-[11px]">
                    <div>Expected RT: <strong>{selectedSubstance.gcmsRetentionTimeExpected} min</strong> (DB-5MS)</div>
                    <div>Carrier Gas: Helium (constant flow 1.0 mL/min)</div>
                    <div>Source: NIST20 / Certified In-House</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <span className="text-sky-400 font-mono font-semibold text-[11px] block">
                    UV-Vis Spectrophotometry Specs
                  </span>
                  <div className="text-slate-600 dark:text-slate-300 space-y-1 font-mono text-[11px]">
                    <div>Absorbance Maxima λ: <strong>{selectedSubstance.uvVisLambdaMax.join(', ')} nm</strong></div>
                    <div>Recommended Solvent: 0.1 M Hydrochloric Acid</div>
                    <div>Cuvette: Quartz 1.0 cm pathlength</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Presumptive Color Test Reaction */}
            <div className="space-y-1">
              <span className="text-slate-500 dark:text-slate-400 text-[10px] font-mono uppercase">Presumptive Color Spot Test:</span>
              <p className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs">
                {selectedSubstance.colorTestReaction}
              </p>
            </div>

            {/* Kenyan Statutory Schedule & Relevance */}
            <div className="space-y-1">
              <span className="text-purple-400 text-[10px] font-mono uppercase font-semibold">
                Kenyan Law Classification &amp; Regional Relevance:
              </span>
              <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/30 text-purple-200 text-xs space-y-2">
                <div>
                  <strong className="text-white block mb-0.5">Statutory Status:</strong>
                  <span>{selectedSubstance.scheduledStatus}</span>
                </div>
                <div>
                  <strong className="text-white block mb-0.5">Local Forensic Surveillance Context:</strong>
                  <span>{selectedSubstance.localRelevanceNotes}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 text-[10px] font-mono text-slate-500 dark:text-slate-400 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
              <span>Standard Source: {selectedSubstance.source}</span>
              <span>ISO 17025 Certified</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};