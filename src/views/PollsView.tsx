import React, { useState, useEffect } from 'react';
import { PieChart, Clock, CheckCircle2, Users, AlertTriangle, ShoppingBag, Package, Plus, Minus, Utensils } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { UserData } from '../App';

export interface Poll {
  id: number;
  title: string;
  description: string;
  deadline: string;
  created_at: string;
  created_by: string;
  type?: 'standard' | 'order' | 'meal';
}

export interface PollOption {
  id: number;
  poll_id: number;
  text: string;
}

export interface PollVote {
  id: number;
  poll_id: number;
  option_id: number;
  user_id: string;
  quantity?: number;
}

interface PollsViewProps {
  user: UserData;
}

export default function PollsView({ user }: PollsViewProps) {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [options, setOptions] = useState<PollOption[]>([]);
  const [votes, setVotes] = useState<PollVote[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [orderQuantity, setOrderQuantity] = useState<Record<number, number>>({});
  const [isEditing, setIsEditing] = useState<Record<number, boolean>>({});
  const [mealSelections, setMealSelections] = useState<Record<number, boolean>>({});
  const [mealNotes, setMealNotes] = useState<Record<number, string>>({});

  const fetchData = async () => {
    try {
      const { data: pData } = await supabase.from('polls').select('*').order('created_at', { ascending: false });
      const { data: oData } = await supabase.from('poll_options').select('*');
      const { data: vData } = await supabase.from('poll_votes').select('*');
      const { data: uData } = await supabase.from('users').select('*');

      if (pData) setPolls(pData);
      if (oData) setOptions(oData);
      if (vData) setVotes(vData);
      if (uData) setUsers(uData);
    } catch (err) {
      console.error("Error fetching polls:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const votesChannel = supabase.channel('polls:votes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_votes' }, fetchData)
      .subscribe();
      
    const pollsChannel = supabase.channel('polls:polls')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'polls' }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(votesChannel);
      supabase.removeChannel(pollsChannel);
    };
  }, []);

  const handleVote = async (pollId: number, optionId: number) => {
    setSubmitting(pollId);
    try {
      // Check if already voted
      const existingVote = votes.find(v => v.poll_id === pollId && v.user_id === user.uid);
      const poll = polls.find(p => p.id === pollId);
      const quantity = poll?.type === 'order' ? (orderQuantity[pollId] || 1) : 1;

      if (existingVote) {
        await supabase.from('poll_votes').update({ 
          option_id: optionId,
          quantity: quantity
        }).eq('id', existingVote.id);
      } else {
        await supabase.from('poll_votes').insert([{
          poll_id: pollId,
          option_id: optionId,
          user_id: user.uid,
          quantity: quantity
        }]);
      }
      // Optimistic update
      setIsEditing({ ...isEditing, [pollId]: false });
      fetchData();
    } catch (err) {
      console.error("Error casting vote:", err);
      alert("Error a l'hora de votar.");
    } finally {
      setSubmitting(null);
    }
  };

  const handleMealVote = async (pollId: number) => {
    setSubmitting(pollId);
    try {
      const pollOptions = options.filter(o => o.poll_id === pollId);
      const selectedOptionIds = pollOptions.filter(o => mealSelections[o.id]).map(o => o.id);
      
      if (selectedOptionIds.length === 0) {
        alert("Si us plau, selecciona almenys una opció.");
        setSubmitting(null);
        return;
      }

      await supabase.from('poll_votes').delete().eq('poll_id', pollId).eq('user_id', user.uid);

      const newVotes = selectedOptionIds.map(optId => ({
        poll_id: pollId,
        option_id: optId,
        user_id: user.uid,
        quantity: 1,
        notes: mealNotes[optId] || ''
      }));

      await supabase.from('poll_votes').insert(newVotes);

      setIsEditing({ ...isEditing, [pollId]: false });
      fetchData();
    } catch (err) {
      console.error("Error casting meal vote:", err);
      alert("Error a l'hora de guardar les opcions de menjar.");
    } finally {
      setSubmitting(null);
    }
  };

  const isActive = (deadline: string | null) => {
    if (!deadline) return true;
    return new Date(deadline) > new Date();
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-8 max-w-3xl mx-auto w-full flex flex-col gap-8 pb-32">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
            <PieChart size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Enquestes i Comandes
            </h1>
            <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">
              Votacions i gestió de material
            </p>
          </div>
        </div>
      </div>

      {polls.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center glass rounded-3xl border-white/40">
          <PieChart size={48} className="text-slate-300 mb-4" />
          <h3 className="text-xl font-black text-slate-900 mb-2">Cap enquesta</h3>
          <p className="text-sm text-slate-500 font-medium max-w-md">
            Encara no hi ha cap enquesta activa. Quan els administradors en creïn una, apareixerà aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {polls.map((poll) => {
            const pollActive = isActive(poll.deadline);
            const pollOptions = options.filter(o => o.poll_id === poll.id);
            const pollVotes = votes.filter(v => v.poll_id === poll.id);
            const userVote = pollVotes.find(v => v.user_id === user.uid);
            const totalVotes = pollVotes.length;
            
            // Should reveal results if inactive OR user has voted (and NOT editing)
            const showResults = (!pollActive || userVote) && !isEditing[poll.id];

            return (
              <div key={poll.id} className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-100 overflow-hidden relative">
                {/* Status badge */}
                <div className="absolute top-6 right-6 flex flex-col items-end gap-1">
                  {pollActive ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-green-50 text-green-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                      Activa
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500">
                      <CheckCircle2 size={12} />
                      Tancada
                    </span>
                  )}
                </div>

                <div className="pr-20 mb-6 space-y-2">
                  <h3 className="text-xl font-black text-slate-900 leading-tight">{poll.title}</h3>
                  {poll.description && (
                    <p className="text-sm text-slate-500 font-medium whitespace-pre-wrap">{poll.description}</p>
                  )}
                  {poll.deadline && (
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mt-2">
                      <Clock size={12} />
                      Finalitza: {new Date(poll.deadline).toLocaleString('ca-ES', { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  {poll.type === 'order' && pollActive && (!userVote || isEditing[poll.id]) && (
                    <div className="mb-4 p-4 rounded-2xl border flex items-center justify-between bg-amber-50 border-amber-100">
                      <span className="text-xs font-black uppercase tracking-widest text-amber-700">Quantitat:</span>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => setOrderQuantity({ ...orderQuantity, [poll.id]: Math.max(1, (orderQuantity[poll.id] || 1) - 1) })}
                          className="w-8 h-8 rounded-lg bg-white border flex items-center justify-center border-amber-200 text-amber-600 hover:bg-amber-100"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="text-lg font-black w-8 text-center text-amber-900">{orderQuantity[poll.id] || 1}</span>
                        <button 
                          onClick={() => setOrderQuantity({ ...orderQuantity, [poll.id]: (orderQuantity[poll.id] || 1) + 1 })}
                          className="w-8 h-8 rounded-lg bg-white border flex items-center justify-center border-amber-200 text-amber-600 hover:bg-amber-100"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  {poll.type === 'meal' && pollActive && (!userVote || isEditing[poll.id]) ? (
                    <div className="space-y-3">
                      {pollOptions.map((option) => {
                        const isNoVinc = option.text.toLowerCase().includes('no vinc');
                        return (
                          <div key={option.id} className={`p-4 rounded-2xl border-2 transition-all ${mealSelections[option.id] ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 bg-white hover:border-emerald-200'}`}>
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input 
                                type="checkbox" 
                                className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                checked={!!mealSelections[option.id]}
                                onChange={(e) => {
                                  const sel = {...mealSelections};
                                  if (e.target.checked) sel[option.id] = true;
                                  else delete sel[option.id];
                                  if (isNoVinc && e.target.checked) {
                                     Object.keys(sel).forEach(k => { 
                                       if (pollOptions.find(o => o.id === parseInt(k)) && k !== String(option.id)) delete sel[parseInt(k)]; 
                                     });
                                  } else if (!isNoVinc && e.target.checked) {
                                     const noVincOpt = pollOptions.find(o => o.text.toLowerCase().includes('no vinc'));
                                     if (noVincOpt) delete sel[noVincOpt.id];
                                  }
                                  setMealSelections(sel);
                                }}
                              />
                              <span className={`text-sm font-bold ${mealSelections[option.id] ? 'text-emerald-800' : 'text-slate-700'}`}>{option.text}</span>
                            </label>
                            {mealSelections[option.id] && !isNoVinc && (
                              <div className="mt-3 pl-8">
                                <input 
                                  type="text" 
                                  placeholder="Què vols menjar? (ex. Entrepà de pernil...)"
                                  value={mealNotes[option.id] || ''}
                                  onChange={(e) => setMealNotes({...mealNotes, [option.id]: e.target.value})}
                                  className="w-full p-2.5 bg-white border border-emerald-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder:text-emerald-300/70"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <button 
                        onClick={() => handleMealVote(poll.id)}
                        disabled={submitting === poll.id}
                        className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black p-4 rounded-2xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-lg shadow-emerald-600/20"
                      >
                        {submitting === poll.id ? <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" /> : <Utensils size={18} />}
                        Confirmar Selecció
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">

                  {pollOptions.map((option) => {
                    const optionVotes = pollVotes.filter(v => v.option_id === option.id);
                    const totalOptionQuantity = poll.type === 'meal' ? optionVotes.length : optionVotes.reduce((sum, v) => sum + (v.quantity || 1), 0);
                    const percentage = totalVotes > 0 ? Math.round((optionVotes.length / (poll.type === 'meal' ? users.length : totalVotes)) * 100) : 0;
                    const isMyVote = poll.type === 'meal' ? optionVotes.some(v => v.user_id === user.uid) : userVote?.option_id === option.id;

                    if (showResults) {
                      return (
                        <div key={option.id} className="space-y-2">
                          <div className="relative rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 p-4 z-0">
                            <div 
                              className={`absolute inset-y-0 left-0 -z-10 transition-all duration-1000 ease-out ${isMyVote ? (poll.type === 'order' ? 'bg-amber-500/10' : poll.type === 'meal' ? 'bg-emerald-500/10' : 'bg-primary/20') : 'bg-slate-200'}`} 
                              style={{ width: (poll.type === 'order' || poll.type === 'meal') ? '0%' : `${percentage}%` }}
                            />
                            <div className="flex justify-between items-center gap-4">
                              <div className="flex items-center gap-3">
                                {isMyVote && <CheckCircle2 size={16} className={poll.type === 'order' ? 'text-amber-600' : poll.type === 'meal' ? 'text-emerald-600' : 'text-primary'} />}
                                <span className={`text-sm font-bold ${isMyVote ? (poll.type === 'order' ? 'text-amber-700' : poll.type === 'meal' ? 'text-emerald-700' : 'text-primary') : 'text-slate-700'}`}>
                                  {option.text}
                                </span>
                              </div>
                              <span className="text-sm font-black text-slate-900 shrink-0">
                                {poll.type === 'order' ? `${totalOptionQuantity} racions` : poll.type === 'meal' ? `${optionVotes.length} apuntats` : `${percentage}%`}
                              </span>
                            </div>
                          </div>
                          {(poll.type === 'order' || poll.type === 'meal') && optionVotes.length > 0 && (
                            <div className="flex flex-wrap gap-1 px-2">
                              {optionVotes.map(v => {
                                const u = users.find(user => user.uid === v.user_id);
                                return (
                                  <span key={v.id} className={`text-[9px] bg-white border border-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold ${poll.type === 'meal' && v.notes ? 'flex items-center gap-1' : ''}`}>
                                    {u?.name.split(' ')[0]} 
                                    {poll.type === 'meal' ? (v.notes ? <span className="font-medium text-emerald-600 ml-1">- {v.notes}</span> : '') : `(${v.quantity || 1})`}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    } else {
                      return (
                        <button
                          key={option.id}
                          onClick={() => handleVote(poll.id, option.id)}
                          disabled={submitting === poll.id || !pollActive}
                          className={`w-full text-left p-4 rounded-2xl border-2 border-slate-100 bg-white transition-all group flex justify-between items-center disabled:opacity-50 ${poll.type === 'order' ? 'hover:border-amber-500/40 hover:bg-amber-50' : poll.type === 'meal' ? 'hover:border-emerald-500/40 hover:bg-emerald-50' : 'hover:border-primary/40 hover:bg-primary/5'}`}
                        >
                          <span className={`text-sm font-bold text-slate-700 transition-colors ${poll.type === 'order' ? 'group-hover:text-amber-600' : poll.type === 'meal' ? 'group-hover:text-emerald-600' : 'group-hover:text-primary'}`}>
                            {option.text}
                          </span>
                          <div className={`w-5 h-5 rounded-full border-2 border-slate-200 transition-colors ${poll.type === 'order' ? 'group-hover:border-amber-500' : poll.type === 'meal' ? 'group-hover:border-emerald-500' : 'group-hover:border-primary'}`}></div>
                        </button>
                      );
                    }
                  })}
                  </div>
                )}
                </div>

                {showResults && (
                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                      {poll.type === 'order' ? <Package size={14} /> : poll.type === 'meal' ? <Utensils size={14} /> : <Users size={14} />} 
                      {poll.type === 'order' || poll.type === 'meal'
                        ? `${totalVotes} persones han demanat` 
                        : `${totalVotes} ${totalVotes === 1 ? 'vot' : 'vots'} en total`
                      }
                    </span>
                    {pollActive && userVote && (
                       <div className="flex items-center gap-4">
                          <span className={`text-[10px] font-bold italic ${poll.type === 'order' ? 'text-amber-600/60' : poll.type === 'meal' ? 'text-emerald-600/60' : 'text-primary/60'}`}>
                            {(poll.type === 'order' || poll.type === 'meal') ? `Has demanat ${userVote.quantity || 1}` : 'Has votat'}
                          </span>
                          <button 
                            onClick={() => {
                              if (poll.type === 'order') {
                                setOrderQuantity({ ...orderQuantity, [poll.id]: userVote?.quantity || 1 });
                              } else if (poll.type === 'meal') {
                                const userPollVotes = votes.filter(v => v.poll_id === poll.id && v.user_id === user.uid);
                                const sels: Record<number, boolean> = { ...mealSelections };
                                const nts: Record<number, string> = { ...mealNotes };
                                userPollVotes.forEach(v => {
                                  sels[v.option_id] = true;
                                  if (v.notes) nts[v.option_id] = v.notes;
                                });
                                setMealSelections(sels);
                                setMealNotes(nts);
                              }
                              setIsEditing({ ...isEditing, [poll.id]: true });
                            }}
                            className="text-[10px] font-black uppercase tracking-widest text-[#d44211] hover:underline"
                          >
                            Editar
                          </button>
                       </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
