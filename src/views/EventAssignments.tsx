import React, { useState, useEffect } from 'react';
import { ChevronLeft, Save, User, FileText, CheckCircle, Loader2, Music } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { UserData } from '../App';

interface EventAssignmentsProps {
  user: UserData;
  eventId: number;
  onBack: () => void;
}

interface Song {
  id: number;
  title: string;
}

interface Musician {
  uid: string;
  name: string;
  instrument: string;
}

interface Assignment {
  user_id: string;
  song_id: number;
  voice: string;
}

export default function EventAssignments({ user, eventId, onBack }: EventAssignmentsProps) {
  const [eventTitle, setEventTitle] = useState('');
  const [songs, setSongs] = useState<Song[]>([]);
  const [musicians, setMusicians] = useState<Musician[]>([]);
  const [assignments, setAssignments] = useState<Record<string, Record<number, string>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isAdmin = user.role === 'admin';

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Event
        const { data: event, error: eventError } = await supabase
          .from('events')
          .select('title, repertoireids')
          .eq('id', eventId)
          .single();

        if (eventError) throw eventError;
        setEventTitle(event.title);

        // 2. Fetch Songs
        const songIds = event.repertoireids || [];
        if (songIds.length > 0) {
          const { data: songData, error: songError } = await supabase
            .from('songs')
            .select('id, title')
            .in('id', songIds);
          if (songError) throw songError;
          
          // Keep order of repertoireids
          const orderedSongs = songIds.map((id: number) => songData.find(s => s.id === id)).filter(Boolean) as Song[];
          setSongs(orderedSongs);
        }

        // 3. Fetch All Musicians (not just convocats)
        const { data: usersData, error: userError } = await supabase
          .from('users')
          .select('uid, name, instrument')
          .neq('email', 'syncrolattex@gmail.com'); // Hide superadmin
        
        if (userError) throw userError;
        
        // Sort by instrument (Dolçaina first, then Tabal, then others) and name
        const sortedMusicians = (usersData || []).sort((a: any, b: any) => {
          const order: Record<string, number> = { 'Dolçaina': 1, 'Tabal': 2 };
          const orderA = order[a.instrument] || 99;
          const orderB = order[b.instrument] || 99;
          if (orderA !== orderB) return orderA - orderB;
          return a.name.localeCompare(b.name);
        });
        setMusicians(sortedMusicians);

        // 4. Fetch Existing Assignments
        const { data: assignData, error: assignError } = await supabase
          .from('song_assignments')
          .select('user_id, song_id, voice')
          .eq('event_id', eventId);
        
        if (assignError) throw assignError;

        const assignmentMap: Record<string, Record<number, string>> = {};
        assignData.forEach((a: any) => {
          if (!assignmentMap[a.user_id]) assignmentMap[a.user_id] = {};
          assignmentMap[a.user_id][a.song_id] = a.voice;
        });
        setAssignments(assignmentMap);

      } catch (err) {
        console.error("Error fetching assignments data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [eventId]);

  const handleCellClick = (userId: string, songId: number) => {
    if (!isAdmin) return;

    const currentVoice = assignments[userId]?.[songId] || '';
    let nextVoice = '';
    
    // Cycle: '' -> '1' -> '2' -> '3' -> ''
    if (currentVoice === '') nextVoice = '1';
    else if (currentVoice === '1') nextVoice = '2';
    else if (currentVoice === '2') nextVoice = '3';
    else nextVoice = '';

    setAssignments(prev => ({
      ...prev,
      [userId]: {
        ...(prev[userId] || {}),
        [songId]: nextVoice
      }
    }));
  };

  const saveAssignments = async () => {
    setSaving(true);
    try {
      const payload: any[] = [];
      Object.entries(assignments).forEach(([userId, songMap]) => {
        Object.entries(songMap).forEach(([songId, voice]) => {
          payload.push({
            event_id: eventId,
            user_id: userId,
            song_id: parseInt(songId),
            voice: voice // includes empty string to "clear" it
          });
        });
      });

      // Simple approach: Delete existing for this event and insert new
      // Or use upsert with conflict on (event_id, user_id, song_id)
      const { error: upsertError } = await supabase
        .from('song_assignments')
        .upsert(payload, { onConflict: 'event_id, user_id, song_id' });

      if (upsertError) throw upsertError;

      // Also need to handle deletions of voices that are now empty
      // For simplicity in this demo, let's just do upsert. 
      // To properly handle deletions, we'd need to track what was removed.
      
      alert("Assignacions desades correctament!");
    } catch (err) {
      console.error("Error saving assignments:", err);
      alert("Error en desar les assignacions.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#d44211] animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Carregant matriu d'assignacions...</p>
      </div>
    );
  }

  // Group musicians by instrument
  const groupedMusicians: Record<string, Musician[]> = {};
  musicians.forEach(m => {
    if (!groupedMusicians[m.instrument]) groupedMusicians[m.instrument] = [];
    groupedMusicians[m.instrument].push(m);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{eventTitle}</h1>
            <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Assignació de Veus</p>
          </div>
        </div>
        {isAdmin && (
          <button 
            onClick={saveAssignments}
            disabled={saving}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-[#d44211] text-white font-bold rounded-xl shadow-lg shadow-[#d44211]/20 hover:scale-[1.02] transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save size={20} />}
            {saving ? 'Desant...' : 'Desar Canvis'}
          </button>
        )}
      </div>

      {/* Matrix */}
      <div className="bg-white rounded-3xl border border-[#d44211]/10 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#d44211]/5">
                <th className="sticky left-0 z-10 bg-[#fdfaf9] px-6 py-4 text-left border-b border-r border-[#d44211]/10 min-w-[200px]">
                  <span className="text-xs font-black text-[#d44211] uppercase tracking-widest">Músics / Obres</span>
                </th>
                {songs.map(song => (
                  <th key={song.id} className="px-4 py-4 text-center border-b border-[#d44211]/10 min-w-[120px]">
                    <div className="flex flex-col items-center">
                      <Music size={14} className="text-[#d44211] mb-1" />
                      <span className="text-xs font-black text-slate-900 line-clamp-2 max-w-[150px] leading-tight">
                        {song.title}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(groupedMusicians).map(([instrument, instrumentMusicians]) => (
                <React.Fragment key={instrument}>
                  {/* Instrument Header Row */}
                  <tr className="bg-slate-50/50">
                    <td colSpan={songs.length + 1} className="px-6 py-2 border-b border-[#d44211]/5">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        {instrument}
                      </span>
                    </td>
                  </tr>
                  {instrumentMusicians.map(musician => (
                    <tr key={musician.uid} className="hover:bg-[#d44211]/5 transition-colors group">
                      <td className="sticky left-0 z-10 bg-white group-hover:bg-[#fdfaf9] px-6 py-4 border-b border-r border-[#d44211]/10 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[#d44211]/10 rounded-lg flex items-center justify-center text-[#d44211]">
                            <User size={16} />
                          </div>
                          <span className="text-sm font-bold text-slate-700 truncate">
                            {musician.name}
                          </span>
                        </div>
                      </td>
                      {songs.map(song => {
                        const voice = assignments[musician.uid]?.[song.id] || '';
                        return (
                          <td 
                            key={song.id} 
                            className={`px-4 py-4 text-center border-b border-[#d44211]/5 transition-all cursor-pointer select-none ${voice ? 'bg-[#d44211]/5' : ''}`}
                            onClick={() => handleCellClick(musician.uid, song.id)}
                          >
                            <div className={`w-10 h-10 mx-auto rounded-xl flex items-center justify-center transition-all ${
                              voice ? 'bg-white shadow-md text-[#d44211] font-black scale-110 border border-[#d44211]/20' : 'text-slate-300'
                            }`}>
                              {voice || '-'}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 p-6 bg-[#d44211]/5 rounded-3xl border border-dashed border-[#d44211]/20">
        <div className="flex items-center gap-3 mb-2">
          <CheckCircle size={20} className="text-[#d44211]" />
          <h3 className="text-sm font-black text-[#d44211] uppercase tracking-widest">Com funciona?</h3>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed font-medium">
          Clica a cada cel·la per anar canviant la veu assignada. El sistema anirà passant per les veus 1, 2 i 3 de forma cíclica. Quan hagis acabat, recorda clicar a "Desar Canvis".
        </p>
      </div>
    </div>
  );
}
