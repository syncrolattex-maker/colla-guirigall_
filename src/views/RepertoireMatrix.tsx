import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Save, CheckCircle, ChevronDown } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { UserData } from '../App';

interface RepertoireMatrixProps {
  user: UserData;
  eventId?: number | null;
  onBack: () => void;
}

interface Song { id: number; title: string; }
interface Musician { uid: string; name: string; instrument: string; }

const DOLCAINA_VOICES = ['1', '2', '3'];
const TABAL_VOICES    = ['T', 'B', 'Pl', 'Pe'];

const VOICE_STYLES: Record<string, string> = {
  '1':  'bg-blue-100 text-blue-800 border-blue-300',
  '2':  'bg-amber-100 text-amber-800 border-amber-300',
  '3':  'bg-green-100 text-green-800 border-green-300',
  'T':  'bg-purple-100 text-purple-800 border-purple-300',
  'B':  'bg-rose-100 text-rose-800 border-rose-300',
  'Pl': 'bg-cyan-100 text-cyan-800 border-cyan-300',
  'Pe': 'bg-teal-100 text-teal-800 border-teal-300',
};

export default function RepertoireMatrix({ user, eventId, onBack }: RepertoireMatrixProps) {
  const [songs, setSongs]             = useState<Song[]>([]);
  const [musicians, setMusicians]     = useState<Musician[]>([]);
  const [assignments, setAssignments] = useState<Record<string, Record<number, string>>>({});
  const [allEvents, setAllEvents]     = useState<{ id: number; title: string }[]>([]);
  const [currentEventId, setCurrentEventId] = useState<number | null>(eventId || null);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [showEventMenu, setShowEventMenu] = useState(false);
  const isAdmin = user.role === 'admin';
  const [showOnlyMe, setShowOnlyMe] = useState(!isAdmin);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const desktopMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const isOutsideMobile = mobileMenuRef.current && !mobileMenuRef.current.contains(target);
      const isOutsideDesktop = desktopMenuRef.current && !desktopMenuRef.current.contains(target);
      
      if (isOutsideMobile && isOutsideDesktop) {
        setShowEventMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { fetchEventsList(); }, []);
  useEffect(() => { fetchData(); }, [currentEventId]);

  const fetchEventsList = async () => {
    const { data } = await supabase.from('events').select('id, title').order('date', { ascending: false });
    setAllEvents(data || []);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      let songIds: number[] = [];
      if (currentEventId) {
        const { data, error } = await supabase.from('events').select('repertoireids').eq('id', currentEventId).single();
        if (error) throw error;
        songIds = data.repertoireids || [];
      }

      let songsData: Song[] = [];
      if (!(currentEventId && songIds.length === 0)) {
        let q = supabase.from('songs').select('id, title');
        if (currentEventId && songIds.length > 0) q = q.in('id', songIds);
        else q = q.order('title', { ascending: true });
        const { data, error } = await q;
        if (error) throw error;
        songsData = data || [];
      }
      if (currentEventId && songIds.length > 0) {
        songsData = songIds.map(id => songsData.find(s => s.id === id)).filter(Boolean) as Song[];
      }
      setSongs(songsData);

      const { data: usersData, error: userError } = await supabase
        .from('users').select('uid, name, instrument').neq('email', 'syncrolattex@gmail.com');
      if (userError) throw userError;
      const sorted = (usersData || []).sort((a: any, b: any) => {
        const order: Record<string, number> = { 'Dolçaina': 1, 'Tabal': 2 };
        const diff = (order[a.instrument] || 99) - (order[b.instrument] || 99);
        return diff !== 0 ? diff : a.name.localeCompare(b.name);
      });
      setMusicians(sorted);

      const table = currentEventId ? 'song_assignments' : 'repertoire_assignments';
      const q2 = supabase.from(table).select('*');
      if (currentEventId) q2.eq('event_id', currentEventId);
      const { data: assignData, error: assignError } = await q2;
      if (assignError) throw assignError;
      const map: Record<string, Record<number, string>> = {};
      assignData.forEach((a: any) => {
        if (!map[a.user_id]) map[a.user_id] = {};
        map[a.user_id][a.song_id] = a.voice;
      });
      setAssignments(map);
    } catch (err) {
      console.error('Matrix fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const isTabal = (uid: string) =>
    musicians.find(x => x.uid === uid)?.instrument?.toLowerCase().includes('tabal') || false;

  const handleCellClick = (uid: string, songId: number) => {
    if (!isAdmin) return;
    const cur = assignments[uid]?.[songId] || '';
    const voices = isTabal(uid) ? TABAL_VOICES : DOLCAINA_VOICES;
    const idx = voices.indexOf(cur);
    const nextVoice = cur === '' ? voices[0] : (idx === voices.length - 1 ? '' : voices[idx + 1]);
    setAssignments(prev => ({ ...prev, [uid]: { ...(prev[uid] || {}), [songId]: nextVoice } }));
  };

  const saveAssignments = async () => {
    if (!isAdmin) return;
    setSaving(true);
    try {
      const table = currentEventId ? 'song_assignments' : 'repertoire_assignments';
      const payload: any[] = [];
      Object.entries(assignments).forEach(([uid, songMap]) => {
        Object.entries(songMap).forEach(([songId, voice]) => {
          const row: any = { user_id: uid, song_id: parseInt(songId), voice };
          if (currentEventId) row.event_id = currentEventId;
          payload.push(row);
        });
      });
      if (payload.length > 0) {
        const { error } = await supabase.from(table)
          .upsert(payload, { onConflict: currentEventId ? 'event_id, user_id, song_id' : 'user_id, song_id' });
        if (error) throw error;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('Save error:', err);
      alert('Error en desar les assignacions.');
    } finally {
      setSaving(false);
    }
  };

  const filteredMusicians = showOnlyMe 
    ? musicians.filter(m => m.uid === user.uid)
    : musicians;

  const musiciansByInstrument = filteredMusicians.reduce((acc, m) => {
    const k = m.instrument || 'Altres';
    if (!acc[k]) acc[k] = [];
    acc[k].push(m);
    return acc;
  }, {} as Record<string, Musician[]>);

  const voiceCount = (instMusicians: Musician[], songId: number, voice: string) =>
    instMusicians.filter(m => assignments[m.uid]?.[songId] === voice).length;

  const currentEventLabel = allEvents.find(e => e.id === currentEventId)?.title || null;

  // ── Column widths: smaller on mobile, bigger on desktop
  const COL_W_MOBILE  = 36;
  const COL_W_DESKTOP = 120;
  const NAME_W_MOBILE  = 130;
  const NAME_W_DESKTOP = 200;

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ══════════════════════ TOP BAR ══════════════════════════════════════ */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">

        {/* MOBILE: two rows */}
        <div className="flex items-center justify-between px-3 py-2 gap-2 sm:hidden">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors shrink-0">
              <ChevronLeft size={20} className="text-slate-500" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm font-black text-slate-900 tracking-tight leading-tight truncate">Matriu de Veus</h1>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-tight truncate">
                {currentEventLabel ?? 'Repertori global'}
              </p>
            </div>
          </div>
          {isAdmin && (
            <button onClick={saveAssignments} disabled={saving}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 ${saved ? 'bg-green-500 text-white' : 'bg-[#d44211] text-white hover:bg-[#b83a0f]'}`}>
              {saving ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
               : saved ? <CheckCircle size={13} /> : <Save size={13} />}
              {saving ? 'Guardant…' : saved ? 'Desat!' : 'Desar'}
            </button>
          )}
        </div>

        {/* MOBILE: event selector row */}
        <div className="px-3 pb-2 sm:hidden flex gap-2" ref={mobileMenuRef}>
          <div className="relative flex-1">
            <button onClick={() => setShowEventMenu(v => !v)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors">
              <span className="truncate">{currentEventLabel ? `🎺 ${currentEventLabel}` : '🌍 Totes les obres (Global)'}</span>
              <ChevronDown size={14} className={`shrink-0 transition-transform ${showEventMenu ? 'rotate-180' : ''}`} />
            </button>
            {showEventMenu && (
              <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto">
                <button onClick={() => { setCurrentEventId(null); setShowEventMenu(false); }}
                  className={`w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-slate-50 transition-colors ${!currentEventId ? 'text-[#d44211] bg-[#d44211]/5' : 'text-slate-700'}`}>
                  🌍 Totes les obres (Global)
                </button>
                <div className="border-t border-slate-100 px-4 py-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Actuacions</p>
                </div>
                {allEvents.map(ev => (
                  <button key={ev.id} onClick={() => { setCurrentEventId(ev.id); setShowEventMenu(false); }}
                    className={`w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-slate-50 transition-colors truncate ${currentEventId === ev.id ? 'text-[#d44211] bg-[#d44211]/5' : 'text-slate-700'}`}>
                    🎺 {ev.title}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button 
            onClick={() => setShowOnlyMe(!showOnlyMe)}
            className={`shrink-0 px-3 py-2 border rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${showOnlyMe ? 'bg-[#d44211] text-white border-[#d44211]' : 'bg-slate-50 text-slate-700 border-slate-200'}`}
          >
            {showOnlyMe ? 'Només Jo' : 'Tots'}
          </button>
        </div>


        {/* DESKTOP: single row */}
        <div className="hidden sm:flex items-center gap-4 px-6 py-3">
          <button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-100 transition-colors shrink-0">
            <ChevronLeft size={22} className="text-slate-500" />
          </button>

          <div className="shrink-0">
            <h1 className="text-lg font-black text-slate-900 tracking-tight leading-tight">Matriu de Veus</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {currentEventLabel ? `Actuació: ${currentEventLabel}` : 'Assignació global del repertori'}
            </p>
          </div>

          <div className="h-8 w-px bg-slate-200 mx-1" />

          {/* Desktop event selector */}
          <div className="relative flex-1 max-w-xs" ref={desktopMenuRef}>
            <button onClick={() => setShowEventMenu(v => !v)}
              className="w-full flex items-center justify-between gap-3 px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-700 bg-white hover:border-[#d44211]/40 transition-colors">
              <span className="truncate">{currentEventLabel ? `🎺 ${currentEventLabel}` : '🌍 Global'}</span>
              <ChevronDown size={15} className={`shrink-0 text-slate-400 transition-transform ${showEventMenu ? 'rotate-180' : ''}`} />
            </button>
            {showEventMenu && (
              <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-72 overflow-y-auto">
                <button onClick={() => { setCurrentEventId(null); setShowEventMenu(false); }}
                  className={`w-full text-left px-4 py-3 text-sm font-bold hover:bg-slate-50 transition-colors rounded-t-xl ${!currentEventId ? 'text-[#d44211] bg-[#d44211]/5' : 'text-slate-700'}`}>
                  🌍 Totes les obres (Global)
                </button>
                <div className="border-t border-slate-100 px-4 pt-2 pb-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Actuacions</p>
                </div>
                {allEvents.map(ev => (
                  <button key={ev.id} onClick={() => { setCurrentEventId(ev.id); setShowEventMenu(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 transition-colors truncate ${currentEventId === ev.id ? 'text-[#d44211] bg-[#d44211]/5' : 'text-slate-700'}`}>
                    🎺 {ev.title}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="ml-auto flex items-center gap-3">
            <button 
              onClick={() => setShowOnlyMe(!showOnlyMe)}
              className={`px-4 py-2.5 border-2 rounded-xl text-sm font-bold transition-colors ${showOnlyMe ? 'bg-[#d44211] text-white border-[#d44211]' : 'bg-white text-slate-700 border-slate-200 hover:border-[#d44211]/40'}`}
            >
              {showOnlyMe ? 'Mostrant: Només Jo' : 'Mostrant: Tots'}
            </button>
            {isAdmin && (
              <button onClick={saveAssignments} disabled={saving}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 shadow-md ${saved ? 'bg-green-500 text-white shadow-green-200' : 'bg-[#d44211] text-white hover:bg-[#b83a0f] shadow-[#d44211]/20'}`}>
                {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                 : saved ? <CheckCircle size={16} /> : <Save size={16} />}
                {saving ? 'Guardant…' : saved ? 'Desat!' : 'Desar Canvis'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════ CONTENT ═════════════════════════════════════ */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d44211]" />
        </div>
      ) : songs.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3 py-20 px-6 text-center">
          <div className="text-5xl">🎶</div>
          <p className="text-base font-bold text-slate-600">Sense obres al repertori</p>
          <p className="text-sm">Aquesta actuació no té cançons assignades al seu repertori.</p>
        </div>
      ) : (
        <>
          {/* ── MOBILE VIEW ── */}
          <div className="sm:hidden flex flex-col gap-4 p-4 pb-24 overflow-y-auto flex-1 bg-slate-50/50">
            {showOnlyMe ? (
              <div className="flex flex-col gap-3">
                {songs.map(song => {
                  const me = filteredMusicians[0];
                  const voice = me ? assignments[me.uid]?.[song.id] : null;
                  if (!voice && !isAdmin) return null;
                  return (
                    <div key={song.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-800 text-sm truncate">{song.title}</h4>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        {isAdmin && (
                          <button onClick={() => me && handleCellClick(me.uid, song.id)} className={`w-8 h-8 rounded-lg border flex items-center justify-center font-black text-xs transition-colors ${voice ? VOICE_STYLES[voice] : 'bg-slate-50 border-slate-200 text-slate-300'}`}>
                            {voice || '+'}
                          </button>
                        )}
                        {!isAdmin && (
                          voice ? (
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border font-black text-xs ${VOICE_STYLES[voice]}`}>{voice}</span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100 uppercase tracking-widest">Cap</span>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {songs.map(song => {
                  let assignedCount = 0;
                  filteredMusicians.forEach(m => {
                    if (assignments[m.uid]?.[song.id]) assignedCount++;
                  });
                  const totalCount = filteredMusicians.length;

                  return (
                    <details key={song.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 group overflow-hidden">
                      <summary className="p-4 font-bold text-slate-800 text-sm cursor-pointer list-none flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <span className="truncate pr-4 flex-1">{song.title}</span>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{assignedCount}/{totalCount}</span>
                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center group-open:rotate-180 transition-transform">
                            <ChevronDown size={14} className="text-slate-500" />
                          </div>
                        </div>
                      </summary>
                      <div className="p-4 pt-2 border-t border-slate-100 bg-slate-50/50">
                        {['Dolçaina', 'Tabal'].map(inst => {
                          const instMusicians = filteredMusicians.filter(m => m.instrument === inst);
                          if(instMusicians.length === 0) return null;
                          return (
                            <div key={inst} className="mb-4 last:mb-0">
                              <h5 className="text-[10px] font-black uppercase tracking-widest text-[#d44211] mb-2">{inst}</h5>
                              <div className="flex flex-col gap-1.5">
                                {instMusicians.map(m => {
                                  const voice = assignments[m.uid]?.[song.id] || '';
                                  return (
                                    <div key={m.uid} className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-100">
                                      <span className="text-xs font-semibold text-slate-700 truncate pr-2">{m.name}</span>
                                      <button 
                                        onClick={() => isAdmin && handleCellClick(m.uid, song.id)}
                                        className={`shrink-0 w-8 h-8 rounded-lg border font-black text-[11px] flex items-center justify-center transition-colors ${voice ? VOICE_STYLES[voice] : 'border-slate-200 text-slate-300 bg-slate-50 hover:bg-slate-100'}`}
                                      >
                                        {voice || '+'}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── DESKTOP VIEW ── */}
          <div className="hidden sm:block flex-1 overflow-auto bg-slate-50/50">
            <table className="border-collapse" style={{ tableLayout: 'fixed', minWidth: 'max-content', width: '100%' }}>
              <thead>
                <tr>
                  {/* Corner */}
                  <th className="sticky left-0 z-20 bg-slate-100 border border-slate-300 text-left text-[12px] font-black text-slate-500 uppercase tracking-wider whitespace-nowrap px-4 py-3"
                    style={{ width: NAME_W_DESKTOP, minWidth: NAME_W_DESKTOP }}
                  >
                    Músic / Obra
                  </th>

                  {songs.map(song => (
                    <th key={song.id}
                      className="border border-slate-200 bg-slate-100 text-center align-middle p-2"
                      style={{ width: COL_W_DESKTOP, minWidth: COL_W_DESKTOP }}
                    >
                      <div
                        className="text-[12px] font-bold text-slate-700 leading-tight w-full truncate px-1"
                        title={song.title}
                      >
                        {song.title}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {(Object.entries(musiciansByInstrument) as [string, Musician[]][]).map(([instrument, instMusicians]) => (
                  <React.Fragment key={instrument}>
                    {/* ── Group header ── */}
                    <tr>
                      <td colSpan={songs.length + 1}
                        className="sticky left-0 border border-slate-300 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-[#d44211] bg-orange-50">
                        {instrument}
                      </td>
                    </tr>

                    {/* ── Musician rows ── */}
                    {instMusicians.map(musician => (
                      <tr key={musician.uid} className="group hover:bg-blue-50/20 transition-colors">
                        <td
                          className="sticky left-0 z-10 bg-white group-hover:bg-blue-50/30 border border-slate-200 px-4 py-2 text-[13px] font-semibold text-slate-800 whitespace-nowrap overflow-hidden text-ellipsis transition-colors"
                          style={{ maxWidth: NAME_W_DESKTOP }}
                          title={musician.name}
                        >
                          {musician.name}
                        </td>

                        {songs.map(song => {
                          const voice = assignments[musician.uid]?.[song.id] || '';
                          const styleClass = VOICE_STYLES[voice] || '';
                          return (
                            <td key={song.id}
                              onClick={() => handleCellClick(musician.uid, song.id)}
                              title={isAdmin ? `${musician.name} — ${song.title}` : ''}
                              className={`border border-slate-200 text-center transition-all select-none ${isAdmin ? 'cursor-pointer' : ''}`}
                              style={{ height: 36, width: COL_W_DESKTOP }}
                            >
                              {voice ? (
                                <span className={`inline-flex items-center justify-center rounded border font-black ${styleClass} text-[12px] w-8 h-8`}>
                                  {voice}
                                </span>
                              ) : (
                                <span className="text-slate-200 group-hover:text-slate-300 text-sm transition-colors">·</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}

                    {/* ── Totals row ── */}
                    <tr className="bg-slate-50">
                      <td className="sticky left-0 bg-slate-50 border border-slate-200 px-4 py-1 text-[9px] font-black uppercase text-slate-400 tracking-wider italic">
                        Resum
                      </td>
                      {songs.map(song => {
                        const voices = instrument.toLowerCase().includes('tabal') ? TABAL_VOICES : DOLCAINA_VOICES;
                        const counts = voices.map(v => {
                          const n = voiceCount(instMusicians, song.id, v);
                          return n > 0 ? { v, n } : null;
                        }).filter(Boolean) as { v: string; n: number }[];
                        return (
                          <td key={song.id}
                            className="border border-slate-200 text-center py-1.5 px-1"
                            style={{ width: COL_W_DESKTOP }}>
                            <div className="flex flex-wrap justify-center gap-1">
                              {counts.map(({ v, n }) => (
                                <div key={v}
                                  className={`text-[9px] font-black leading-tight px-1 rounded ${VOICE_STYLES[v]}`}>
                                  {v}:{n}
                                </div>
                              ))}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ══════════════════════ LEGEND ══════════════════════════════════════ */}
      {!loading && songs.length > 0 && (
        <div className="border-t border-slate-200 bg-white px-3 sm:px-6 py-2 sm:py-3 flex flex-col sm:flex-row gap-2 sm:gap-8 sm:items-center">
          <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
            <span className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest">Dolçaina:</span>
            {[{ v: '1', label: '1ª Veu' }, { v: '2', label: '2ª Veu' }, { v: '3', label: '3ª Veu' }].map(({ v, label }) => (
              <div key={v} className="flex items-center gap-1 sm:gap-1.5">
                <span className={`inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded border text-[9px] sm:text-[10px] font-black ${VOICE_STYLES[v]}`}>{v}</span>
                <span className="text-[8px] sm:text-[9px] text-slate-500 font-medium">{label}</span>
              </div>
            ))}
          </div>

          <div className="hidden sm:block w-px h-5 bg-slate-200" />

          <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
            <span className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest">Tabal:</span>
            {[{ v: 'T', label: 'Tabal' }, { v: 'B', label: 'Bombo' }, { v: 'Pl', label: 'Plats' }, { v: 'Pe', label: 'Percussió' }].map(({ v, label }) => (
              <div key={v} className="flex items-center gap-1 sm:gap-1.5">
                <span className={`inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded border text-[9px] sm:text-[10px] font-black ${VOICE_STYLES[v]}`}>{v}</span>
                <span className="text-[8px] sm:text-[9px] text-slate-500 font-medium">{label}</span>
              </div>
            ))}
          </div>

          {isAdmin && (
            <span className="hidden sm:block text-[9px] text-slate-300 italic ml-auto">
              Clica una cel·la per ciclar entre les opcions
            </span>
          )}
        </div>
      )}
    </div>
  );
}
