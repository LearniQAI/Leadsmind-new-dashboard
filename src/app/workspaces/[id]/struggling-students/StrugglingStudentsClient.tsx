'use client';

import React, { useState } from 'react';
import { AlertTriangle, Search, Clock, RotateCw, ChevronRight, Activity, TrendingDown, Timer, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StrugglingStudentsClientProps {
  initialScores: any[];
  workspaceId: string;
}

export default function StrugglingStudentsClient({ initialScores, workspaceId }: StrugglingStudentsClientProps) {
  const [scores, setScores] = useState<any[]>(initialScores);
  const [search, setSearch] = useState('');
  const [filterRisk, setFilterRisk] = useState<'all' | 'red' | 'orange' | 'amber'>('all');
  const [selectedScore, setSelectedScore] = useState<any | null>(scores[0] || null);
  const [recalculating, setRecalculating] = useState(false);

  const getRiskColor = (score: number) => {
    if (score >= 80) return { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'Critical Risk (Red)' };
    if (score >= 60) return { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', label: 'High Risk (Orange)' };
    if (score >= 40) return { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Moderate Risk (Amber)' };
    return { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Low Risk' };
  };

  const handleRecalculate = async (contactId: string, courseId: string) => {
    setRecalculating(true);
    try {
      const res = await fetch('/api/lms/struggle/recalculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId, courseId, workspaceId })
      });
      const data = await res.json();
      if (data.success) {
        const reloadRes = await fetch(`/api/lms/struggle/scores?workspaceId=${workspaceId}`);
        const reloadData = await reloadRes.json();
        if (reloadData.data) {
          setScores(reloadData.data);
          const updated = reloadData.data.find(
            (s: any) => s.contact?.id === contactId && s.course?.id === courseId
          );
          if (updated) setSelectedScore(updated);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRecalculating(false);
    }
  };

  const filteredScores = scores.filter(s => {
    const student = s.contact;
    const name = `${student?.first_name || ''} ${student?.last_name || ''}`.toLowerCase();
    const email = (student?.email || '').toLowerCase();
    const matchesSearch = name.includes(search.toLowerCase()) || email.includes(search.toLowerCase());
    
    if (filterRisk === 'red') return matchesSearch && s.score >= 80;
    if (filterRisk === 'orange') return matchesSearch && s.score >= 60 && s.score < 80;
    if (filterRisk === 'amber') return matchesSearch && s.score >= 40 && s.score < 60;
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">Student Telemetry Control</span>
        <h1 className="text-3xl font-space-grotesk font-black uppercase tracking-tighter text-white mt-1.5">
          Struggle <span className="text-[#3b82f6]">Analytics</span>
        </h1>
        <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-2">
          Monitor student learning bottlenecks, quiz performance margins, and time allocation anomalies.
        </p>
      </div>

      {/* Toolbar filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[#080f28] border border-white/5 p-4 rounded-2xl">
        <div className="relative w-full md:w-80">
          <Search size={14} className="absolute left-3.5 top-3 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student name or email..."
            className="w-full bg-[#04091a]/60 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-xs text-white outline-none focus:border-primary transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider font-mono">Risk Filter:</span>
          <div className="flex bg-[#04091a]/60 border border-white/5 rounded-xl p-1 gap-1">
            {(['all', 'red', 'orange', 'amber'] as const).map((risk) => (
              <button
                key={risk}
                onClick={() => setFilterRisk(risk)}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                  filterRisk === risk ? 'bg-primary text-white' : 'text-white/40 hover:text-white/60'
                }`}
              >
                {risk}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Panel layout */}
      {filteredScores.length === 0 ? (
        <div className="py-20 bg-[#080f28] border border-white/5 rounded-3xl text-center space-y-4">
          <ShieldAlert className="w-10 h-10 text-white/20 mx-auto animate-pulse" />
          <h3 className="text-base font-space-grotesk font-black text-white/50 uppercase tracking-widest">
            No Struggling Profiles Detected
          </h3>
          <p className="text-[10px] text-white/30 uppercase max-w-sm mx-auto leading-relaxed">
            All students are currently progressing cleanly within standard course telemetry parameters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Risk profile List */}
          <div className="lg:col-span-1 space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {filteredScores.map((s) => {
              const colors = getRiskColor(s.score);
              const isSelected = selectedScore?.id === s.id;

              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedScore(s)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between gap-3 select-none ${
                    isSelected
                      ? 'bg-primary/5 border-primary shadow-xl shadow-primary/5'
                      : 'bg-[#080f28]/60 border-white/5 hover:bg-[#080f28]/80 hover:border-white/10'
                  }`}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-white truncate max-w-[180px]">
                        {s.contact?.first_name || 'Student'} {s.contact?.last_name || ''}
                      </h4>
                      <span className="text-[10px] text-white/40 font-mono block truncate max-w-[180px] mt-0.5">
                        {s.contact?.email}
                      </span>
                    </div>
                    <span className={`text-[10px] font-mono font-black border px-2.5 py-1 rounded-lg shrink-0 ${colors.text} ${colors.bg} ${colors.border}`}>
                      Score: {s.score}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/5 pt-2 mt-1">
                    <span className="text-[9px] text-white/30 uppercase font-bold tracking-wider truncate max-w-[160px]">
                      {s.course?.title}
                    </span>
                    <ChevronRight size={13} className="text-white/30" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed Telemetry Report View */}
          <div className="lg:col-span-2 bg-[#080f28]/60 border border-white/5 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[500px]">
            {selectedScore ? (
              <div className="space-y-6">
                {/* Header Profile */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-5">
                  <div>
                    <h3 className="text-xl font-extrabold text-white">
                      {selectedScore.contact?.first_name || 'Student'} {selectedScore.contact?.last_name || ''}
                    </h3>
                    <span className="text-xs text-white/50 block font-mono mt-0.5">{selectedScore.contact?.email}</span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <Button
                      onClick={() => handleRecalculate(selectedScore.contact?.id, selectedScore.course?.id)}
                      disabled={recalculating}
                      className="bg-white/5 border border-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-wider h-10 px-4 flex items-center gap-1.5 active:scale-95 transition-all"
                    >
                      <RotateCw size={12} className={recalculating ? 'animate-spin' : ''} />
                      Recalculate
                    </Button>
                  </div>
                </div>

                {/* Score breakdown metrics grids */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="bg-[#04091a]/40 border border-white/5 p-3 rounded-xl text-center space-y-1">
                    <AlertTriangle className="text-red-400 mx-auto" size={14} />
                    <span className="text-[9px] text-white/40 uppercase block tracking-wider font-bold">Quiz Failure</span>
                    <span className="text-sm font-black text-white font-mono">{selectedScore.quiz_failure_rate_points}/30</span>
                  </div>
                  <div className="bg-[#04091a]/40 border border-white/5 p-3 rounded-xl text-center space-y-1">
                    <TrendingDown className="text-orange-400 mx-auto" size={14} />
                    <span className="text-[9px] text-white/40 uppercase block tracking-wider font-bold">Score Vector</span>
                    <span className="text-sm font-black text-white font-mono">{selectedScore.score_vector_points}/25</span>
                  </div>
                  <div className="bg-[#04091a]/40 border border-white/5 p-3 rounded-xl text-center space-y-1">
                    <ShieldAlert className="text-amber-400 mx-auto" size={14} />
                    <span className="text-[9px] text-white/40 uppercase block tracking-wider font-bold">Delta Margin</span>
                    <span className="text-sm font-black text-white font-mono">{selectedScore.passing_delta_points}/20</span>
                  </div>
                  <div className="bg-[#04091a]/40 border border-white/5 p-3 rounded-xl text-center space-y-1">
                    <Timer className="text-blue-400 mx-auto" size={14} />
                    <span className="text-[9px] text-white/40 uppercase block tracking-wider font-bold">Time Multiplier</span>
                    <span className="text-sm font-black text-white font-mono">{selectedScore.time_multiplier_points}/15</span>
                  </div>
                  <div className="bg-[#04091a]/40 border border-white/5 p-3 rounded-xl text-center space-y-1 col-span-2 md:col-span-1">
                    <Activity className="text-purple-400 mx-auto" size={14} />
                    <span className="text-[9px] text-white/40 uppercase block tracking-wider font-bold">Dropout/Idle</span>
                    <span className="text-sm font-black text-white font-mono">{selectedScore.dropout_trends_points}/10</span>
                  </div>
                </div>

                {/* Reasons logs context */}
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest font-mono">Performance drop-off reasons:</span>
                  <div className="space-y-2 bg-[#04091a]/20 border border-white/5 rounded-2xl p-4 max-h-[200px] overflow-y-auto">
                    {selectedScore.reasons && selectedScore.reasons.length > 0 ? (
                      selectedScore.reasons.map((reason: string, rIdx: number) => (
                        <div key={rIdx} className="flex gap-2.5 items-start text-xs text-white/80 leading-relaxed font-body">
                          <span className="text-primary mt-1">•</span>
                          <span>{reason}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-white/30 italic block py-4">No warning metrics are currently flagged.</span>
                    )}
                  </div>
                </div>

                <div className="text-[10px] font-mono text-white/30 uppercase flex justify-between pt-4">
                  <span>Course: {selectedScore.course?.title}</span>
                  <span>Evaluated: {new Date(selectedScore.updated_at).toLocaleString()}</span>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-center items-center text-center p-12 space-y-3">
                <Clock size={32} className="text-white/20" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Select Student Profile</h3>
                <p className="text-[10px] text-white/40 max-w-xs leading-relaxed">
                  Choose a student risk card from the left panel index to read the aggregated detailed struggle diagnostic report.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
