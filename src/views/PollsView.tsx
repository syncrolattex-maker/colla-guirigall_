import React, { useState, useEffect } from 'react';
import { PieChart, Clock, CheckCircle2, Users, AlertTriangle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { UserData } from '../App';

export interface Poll {
  id: number;
  title: string;
  description: string;
  deadline: string;
  created_at: string;
  created_by: string;
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
}

interface PollsViewProps {
  user: UserData;
}

export default function PollsView({ user }: PollsViewProps) {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [options, setOptions] = useState<PollOption[]>([]);
  const [votes, setVotes] = useState<PollVote[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      const { data: pData } = await supabase.from('polls').select('*').order('created_at', { ascending: false });
      const { data: oData } = await supabase.from('poll_options').select('*');
      const { data: vData } = await supabase.from('poll_votes').select('*');

      if (pData) setPolls(pData);
      if (oData) setOptions(oData);
      if (vData) setVotes(vData);
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
      if (existingVote) {
        await supabase.from('poll_votes').update({ option_id: optionId }).eq('id', existingVote.id);
      } else {
        await supabase.from('poll_votes').insert([{
          poll_id: pollId,
          option_id: optionId,
          user_id: user.uid
        }]);
      }
      // Optimistic update
      fetchData();
    } catch (err) {
      console.error("Error casting vote:", err);
      alert("Error a l'hora de votar.");
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
              Enquestes
            </h1>
            <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">
              Votacions i decisions
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
            
            // Should reveal results if inactive OR user has voted
            const showResults = !pollActive || userVote;

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
                  {pollOptions.map((option) => {
                    const optionVotes = pollVotes.filter(v => v.option_id === option.id).length;
                    const percentage = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;
                    const isMyVote = userVote?.option_id === option.id;

                    if (showResults) {
                      return (
                        <div key={option.id} className="relative rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 p-4 z-0">
                          <div 
                            className={`absolute inset-y-0 left-0 -z-10 transition-all duration-1000 ease-out ${isMyVote ? 'bg-primary/20' : 'bg-slate-200'}`} 
                            style={{ width: `${percentage}%` }}
                          />
                          <div className="flex justify-between items-center gap-4">
                            <div className="flex items-center gap-3">
                              {isMyVote && <CheckCircle2 size={16} className="text-primary shrink-0" />}
                              <span className={`text-sm font-bold ${isMyVote ? 'text-primary' : 'text-slate-700'}`}>
                                {option.text}
                              </span>
                            </div>
                            <span className="text-sm font-black text-slate-900 shrink-0">
                              {percentage}%
                            </span>
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <button
                          key={option.id}
                          onClick={() => handleVote(poll.id, option.id)}
                          disabled={submitting === poll.id || !pollActive}
                          className="w-full text-left p-4 rounded-2xl border-2 border-slate-100 bg-white hover:border-primary/40 hover:bg-primary/5 transition-all group flex justify-between items-center disabled:opacity-50"
                        >
                          <span className="text-sm font-bold text-slate-700 group-hover:text-primary transition-colors">
                            {option.text}
                          </span>
                          <div className="w-5 h-5 rounded-full border-2 border-slate-200 group-hover:border-primary transition-colors"></div>
                        </button>
                      );
                    }
                  })}
                </div>

                {showResults && (
                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                      <Users size={14} /> {totalVotes} {totalVotes === 1 ? 'vot' : 'vots'} en total
                    </span>
                    {pollActive && userVote && (
                       <span className="text-[10px] font-bold text-primary/60 italic">Has votat</span>
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
