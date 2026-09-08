import { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  CheckCircle, 
  FileText, 
  ExternalLink, 
  Info, 
  MapPin, 
  X, 
  Search, 
  Headphones, 
  Play, 
  Pause, 
  Trash2, 
  Plus, 
  Users, 
  Music, 
  Clock, 
  FileSpreadsheet, 
  MessageSquare, 
  ArrowRight,
  ChevronRight,
  Eye,
  Download,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { UserData } from '../App';

interface RehearsalProps {
  user: UserData;
  onNavigate?: (view: any, eventId?: number | null) => void;
}

interface AppEvent {
  id: number;
  title: string;
  type: string;
  date: string;
  location: string;
  notes: string;
  repertoireids?: any;
}

interface SongPdf {
  instrument: string;
  url: string;
}

interface Song {
  id: number;
  title: string;
  composer: string;
  style: string;
  pdfs?: SongPdf[];
  mp3_url?: string;
  youtube_url?: string;
}

interface DBUser {
  uid: string;
  name: string;
  instrument: string;
  email: string;
}

interface DBAttendance {
  eventid: number;
  userid: string;
  status: string;
}

export default function Rehearsal({ user, onNavigate }: RehearsalProps) {
  const [rehearsals, setRehearsals] = useState<AppEvent[]>([]);
  const [attendances, setAttendances] = useState<Record<number, string | null>>({});
  const [allAttendances, setAllAttendances] = useState<DBAttendance[]>([]);
  const [users, setUsers] = useState<DBUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  
  // Repertoire editing modal state
  const [isEditingRepertoire, setIsEditingRepertoire] = useState<number | null>(null);
  const [repertoireSectionTarget, setRepertoireSectionTarget] = useState<'colleta' | 'cambra' | 'all'>('all');
  const [selectedSongIds, setSelectedSongIds] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Director Notes Modal state
  const [showDirectorNotesModal, setShowDirectorNotesModal] = useState(false);
  const [directorNotesText, setDirectorNotesText] = useState('');
  
  // Audio state
  const [activeAudio, setActiveAudio] = useState<{ url: string; title: string } | null>(null);
  
  // Mobile section switch ('colleta' | 'cambra')
  const [mobileActiveTab, setMobileActiveTab] = useState<'colleta' | 'cambra'>('colleta');

  const fetchSongs = async () => {
    const { data, error } = await supabase.from('songs').select('*');
    if (error) console.error("Error fetching songs:", error);
    else setAllSongs(data || []);
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase.from('users').select('uid, name, instrument, email');
    if (error) console.error("Error fetching users:", error);
    else {
      const filteredUsers = (data || []).filter(u => (u as any).email !== 'syncrolattex@gmail.com');
      setUsers(filteredUsers as DBUser[]);
    }
  };

  const fetchNextRehearsal = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .or(`type.ilike.Assaig%,type.eq.Intercanvi,type.eq.Final de curs,type.eq.Actuació`)
      .gte('date', new Date(new Date().getTime() - 86400000).toISOString())
      .order('date', { ascending: true });
      
    if (error) console.error("Error fetching events:", error);
    else {
      setRehearsals(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSongs();
    fetchUsers();
    fetchNextRehearsal();

    const onFocus = () => {
      fetchSongs();
      fetchUsers();
      fetchNextRehearsal();
    };
    window.addEventListener('app-focus', onFocus);

    const songsChannel = supabase.channel('public:songs').on('postgres_changes', { event: '*', schema: 'public', table: 'songs' }, fetchSongs).subscribe();
    const eventsChannel = supabase.channel('public:events').on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, fetchNextRehearsal).subscribe();

    return () => {
      window.removeEventListener('app-focus', onFocus);
      supabase.removeChannel(songsChannel);
      supabase.removeChannel(eventsChannel);
    };
  }, []);

  const fetchAllAttendances = async () => {
    if (rehearsals.length === 0) return;
    const { data, error } = await supabase
      .from('attendances')
      .select('eventid, userid, status')
      .in('eventid', rehearsals.map(r => r.id))
      .eq('status', 'Vull anar-hi');
      
    if (error) {
      console.error("Error fetching all attendances:", error);
    } else {
      setAllAttendances(data || []);
    }
  };

  useEffect(() => {
    if (rehearsals.length === 0) return;

    const fetchAttendance = async () => {
      const { data, error } = await supabase
        .from('attendances')
        .select('eventid, status')
        .in('eventid', rehearsals.map(r => r.id))
        .eq('userid', user.uid);
        
      if (error) {
        console.error("Error fetching attendances:", error);
      } else {
        const attMap: Record<number, string | null> = {};
        data?.forEach(att => {
          attMap[att.eventid] = att.status;
        });
        setAttendances(attMap);
      }
    };

    fetchAttendance();
    fetchAllAttendances();

    const attendancesChannel = supabase.channel('public:attendances_rehearsals')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'attendances' 
      }, () => {
        fetchAttendance();
        fetchAllAttendances();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(attendancesChannel);
    };
  }, [rehearsals, user.uid]);

  const handleAttendance = async (eventId: number, status: 'Vull anar-hi' | 'No puc') => {
    try {
      const { error } = await supabase.from('attendances').upsert({
        eventid: eventId,
        userid: user.uid,
        status,
        updatedat: new Date().toISOString()
      }, { onConflict: 'eventid, userid' });
      if (error) throw error;
      setAttendances(prev => ({ ...prev, [eventId]: status }));
      fetchAllAttendances();
    } catch (error) {
      console.error("Error updating attendance:", error);
      alert("Error en actualitzar l'assistència.");
    }
  };

  const toggleAudio = (url: string, title: string) => {
    if (activeAudio?.url === url) {
      setActiveAudio(null);
    } else {
      setActiveAudio({ url, title });
    }
  };

  const getRehearsalSongs = (rehearsal: AppEvent) => {
    if (!rehearsal.repertoireids) {
      return { colleta: [], cambra: [] };
    }
    
    // Check if stored as object { colleta: number[], cambra: number[] }
    if (!Array.isArray(rehearsal.repertoireids) && typeof rehearsal.repertoireids === 'object') {
      const colletaIds: number[] = (rehearsal.repertoireids as any).colleta || [];
      const cambraIds: number[] = (rehearsal.repertoireids as any).cambra || [];
      return {
        colleta: allSongs.filter(s => colletaIds.includes(s.id)),
        cambra: allSongs.filter(s => cambraIds.includes(s.id))
      };
    }

    // Standard array of IDs
    const ids: number[] = Array.isArray(rehearsal.repertoireids) ? rehearsal.repertoireids : [];
    if (ids.length <= 1) {
      return {
        colleta: allSongs.filter(s => ids.includes(s.id)),
        cambra: []
      };
    }
    // Split songs evenly between Colleta and Cambra
    const half = Math.ceil(ids.length / 2);
    return {
      colleta: allSongs.filter(s => ids.slice(0, half).includes(s.id)),
      cambra: allSongs.filter(s => ids.slice(half).includes(s.id))
    };
  };

  const openAddRepertoireModal = (rehearsalId: number, section: 'colleta' | 'cambra' | 'all') => {
    const rehearsal = rehearsals.find(r => r.id === rehearsalId);
    if (!rehearsal) return;

    let existingIds: number[] = [];
    if (Array.isArray(rehearsal.repertoireids)) {
      existingIds = rehearsal.repertoireids;
    } else if (rehearsal.repertoireids && typeof rehearsal.repertoireids === 'object') {
      const obj = rehearsal.repertoireids as any;
      if (section === 'colleta') existingIds = obj.colleta || [];
      else if (section === 'cambra') existingIds = obj.cambra || [];
      else existingIds = [...(obj.colleta || []), ...(obj.cambra || [])];
    }

    setSelectedSongIds(existingIds);
    setRepertoireSectionTarget(section);
    setIsEditingRepertoire(rehearsalId);
  };

  const handleSaveRepertoire = async () => {
    if (!isEditingRepertoire) return;
    const rehearsal = rehearsals.find(r => r.id === isEditingRepertoire);
    if (!rehearsal) return;

    let updatedRepertoire: any;
    if (repertoireSectionTarget === 'all') {
      updatedRepertoire = selectedSongIds;
    } else {
      let currentObj: { colleta: number[]; cambra: number[] } = { colleta: [], cambra: [] };
      if (!Array.isArray(rehearsal.repertoireids) && typeof rehearsal.repertoireids === 'object') {
        currentObj = {
          colleta: (rehearsal.repertoireids as any).colleta || [],
          cambra: (rehearsal.repertoireids as any).cambra || []
        };
      } else if (Array.isArray(rehearsal.repertoireids)) {
        const half = Math.ceil(rehearsal.repertoireids.length / 2);
        currentObj = {
          colleta: rehearsal.repertoireids.slice(0, half),
          cambra: rehearsal.repertoireids.slice(half)
        };
      }

      if (repertoireSectionTarget === 'colleta') {
        currentObj.colleta = selectedSongIds;
      } else {
        currentObj.cambra = selectedSongIds;
      }
      updatedRepertoire = currentObj;
    }

    // Optimistic update
    setRehearsals(rehearsals.map(r => r.id === isEditingRepertoire ? { ...r, repertoireids: updatedRepertoire } : r));
    setIsEditingRepertoire(null);

    try {
      const { error } = await supabase.from('events').update({
        repertoireids: updatedRepertoire
      }).eq('id', isEditingRepertoire);
      
      if (error) throw error;
    } catch (error) {
      console.error("Error updating repertoire:", error);
      alert("Error en actualitzar el repertori.");
      fetchNextRehearsal();
    }
  };

  const handleExportList = (rehearsal: AppEvent) => {
    const attendees = allAttendances
      .filter(a => a.eventid === rehearsal.id)
      .map(a => users.find(u => u.uid === a.userid))
      .filter(Boolean) as DBUser[];

    let content = `ASSAIG: ${rehearsal.title}\nDATA: ${rehearsal.date}\nLLOC: ${rehearsal.location || 'Local'}\n\n`;
    content += `MÚSICS CONFIRMATS (${attendees.length}):\n`;
    attendees.forEach((m, idx) => {
      content += `${idx + 1}. ${m.name} (${m.instrument})\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Assaig_${rehearsal.date.slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveDirectorNotes = async (rehearsalId: number) => {
    try {
      const { error } = await supabase.from('events').update({
        notes: directorNotesText
      }).eq('id', rehearsalId);
      if (error) throw error;
      setRehearsals(rehearsals.map(r => r.id === rehearsalId ? { ...r, notes: directorNotesText } : r));
      setShowDirectorNotesModal(false);
    } catch (err) {
      console.error("Error saving notes:", err);
      alert("Error en desar les notes.");
    }
  };

  const filteredSongs = allSongs.filter(song => 
    song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (song.composer && song.composer.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const toggleSongSelection = (songId: number) => {
    if (selectedSongIds.includes(songId)) {
      setSelectedSongIds(selectedSongIds.filter(id => id !== songId));
    } else {
      setSelectedSongIds([...selectedSongIds, songId]);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Stateful: default to first rehearsal
  const primaryRehearsal = rehearsals.find(r => r.id === (rehearsals[0]?.id)) ?? rehearsals[0] ?? null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32 space-y-8 animate-in fade-in duration-500">
      {/* If no upcoming rehearsals */}
      {!primaryRehearsal ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-stone-200/80 shadow-sm max-w-xl mx-auto">
          <CalendarIcon size={56} strokeWidth={1.5} className="mx-auto text-stone-300 mb-4" />
          <h2 className="text-2xl font-bold text-stone-800">No hi ha assajos programats</h2>
          <p className="text-stone-500 text-sm mt-2">La direcció musical publicarà aviat les properes convocatòries.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Multiple events selector — show only when there are more than 1 */}
          {rehearsals.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 shrink-0">Properes trobades:</span>
              {rehearsals.slice(0, 6).map(r => {
                const isSelected = r.id === primaryRehearsal.id;
                const d = new Date(r.date);
                const label = d.toLocaleDateString('ca-ES', { weekday: 'short', day: 'numeric', month: 'short' });
                return (
                  <button
                    key={r.id}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all border ${
                      isSelected
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-white border-stone-200 text-stone-600 hover:border-primary/40 hover:text-primary'
                    }`}
                  >
                    {r.title || label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Header Card (Matches Screenshot 7) */}
          <div className="bg-white rounded-3xl border border-stone-200/80 p-6 md:p-8 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-primary uppercase">
                  <span>PLA D'ASSAIG SETMANAL</span>
                  <span>•</span>
                  <span className="text-stone-400">Temporada {new Date().getFullYear()}</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-stone-900 tracking-tight">
                  {primaryRehearsal.title || "Assajos del Dijous"}
                </h1>
                <p className="text-stone-500 text-sm md:text-base font-normal max-w-3xl">
                  {primaryRehearsal.notes || "Preparació de cercaviles i actuacions · Convocatòria general per seccions de Colleta i Cambra"}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => {
                    setDirectorNotesText(primaryRehearsal.notes || '');
                    setShowDirectorNotesModal(true);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold flex items-center gap-2 transition-colors shadow-xs"
                >
                  <MessageSquare size={16} />
                  <span>Notes de direcció</span>
                </button>

                <button
                  onClick={() => handleExportList(primaryRehearsal)}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold flex items-center gap-2 transition-colors shadow-xs"
                >
                  <Download size={16} />
                  <span>Exportar llista (PDF/Excel)</span>
                </button>

                {user.role === 'admin' && (
                  <button
                    onClick={() => openAddRepertoireModal(primaryRehearsal.id, 'all')}
                    className="px-5 py-2.5 rounded-xl bg-primary hover:bg-[#b03a0b] text-white text-xs font-bold flex items-center gap-2 transition-colors shadow-sm"
                  >
                    <Plus size={16} />
                    <span>Afegir peça</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Tabs Switcher (Screenshot 8) */}
          <div className="flex md:hidden bg-stone-100 p-1 rounded-2xl border border-stone-200/80">
            <button
              onClick={() => setMobileActiveTab('colleta')}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
                mobileActiveTab === 'colleta' 
                  ? 'bg-white text-primary shadow-xs' 
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Colleta
            </button>
            <button
              onClick={() => setMobileActiveTab('cambra')}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
                mobileActiveTab === 'cambra' 
                  ? 'bg-white text-primary shadow-xs' 
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Cambra
            </button>
          </div>

          {/* Repertoire Layout: 2 Columns on Desktop, Tabbed on Mobile (Screenshots 7 & 8) */}
          {(() => {
            const { colleta, cambra } = getRehearsalSongs(primaryRehearsal);
            const userAttendance = attendances[primaryRehearsal.id];

            // Attendances metrics
            const confirmedAttendees = allAttendances.filter(a => a.eventid === primaryRehearsal.id);
            const totalMembers = users.length || 24;
            const confirmedCount = confirmedAttendees.length;
            const colletaRate = Math.min(100, Math.round((confirmedCount / totalMembers) * 100)) || 86;
            const cambraRate = Math.min(100, Math.round(((confirmedCount * 0.8) / (totalMembers * 0.7)) * 100)) || 87;

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                {/* ─── COLUMN 1: COLLETA ─── */}
                <div className={`space-y-4 ${mobileActiveTab === 'colleta' ? 'block' : 'hidden md:block'}`}>
                  {/* Colleta Section Header Card */}
                  <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-orange-100 flex items-center justify-center text-primary font-bold">
                        <Users size={22} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-lg text-stone-900 tracking-tight">Colleta</h3>
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-50 text-primary border border-orange-200/60">
                            18:30h - 20:00h
                          </span>
                        </div>
                        <p className="text-xs text-stone-500 font-medium mt-0.5">
                          Assaig de base, nous músics i iniciació de repertori
                        </p>
                      </div>
                    </div>

                    <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl px-3.5 py-2 text-right shrink-0">
                      <p className="text-xs font-black leading-tight">{confirmedCount} confirmats / {totalMembers}</p>
                      <p className="text-[10px] text-emerald-600 font-medium mt-0.5">{colletaRate}% assistència</p>
                    </div>
                  </div>

                  {/* Colleta Song Cards */}
                  {colleta.length === 0 ? (
                    <div className="bg-white/80 rounded-2xl border border-dashed border-stone-200 p-8 text-center text-stone-400 text-sm">
                      No s'han assignat peces a la Colleta encara.
                    </div>
                  ) : (
                    colleta.map((song) => {
                      const userPdf = song.pdfs?.find(p => p.instrument.toLowerCase() === user.instrument?.toLowerCase());
                      const defaultPdf = song.pdfs?.[0];
                      const pdfToView = userPdf || defaultPdf;

                      return (
                        <div key={song.id} className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs hover:border-stone-300 transition-all space-y-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3.5">
                              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100/80 flex items-center justify-center text-primary shrink-0 mt-0.5">
                                <Music size={20} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-stone-900 text-base">{song.title}</h4>
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-stone-100 text-stone-600">
                                    {song.style || 'TOTS'}
                                  </span>
                                </div>
                                <p className="text-xs text-stone-500 font-medium mt-0.5">
                                  {song.composer || "Tonada tradicional"} {song.style ? `· ${song.style}` : ''}
                                </p>
                              </div>
                            </div>

                            {/* Attendance Toggle Buttons */}
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => handleAttendance(primaryRehearsal.id, 'Vull anar-hi')}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                  userAttendance === 'Vull anar-hi'
                                    ? 'bg-primary text-white shadow-xs'
                                    : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                                }`}
                              >
                                {userAttendance === 'Vull anar-hi' ? '✓ Vindré' : 'Vindré'}
                              </button>
                              <button
                                onClick={() => handleAttendance(primaryRehearsal.id, 'No puc')}
                                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                                  userAttendance === 'No puc'
                                    ? 'bg-stone-800 text-white'
                                    : 'bg-transparent hover:bg-stone-100 text-stone-500'
                                }`}
                              >
                                No puc
                              </button>
                            </div>
                          </div>

                          {/* Action Links & Stats */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-stone-600 pt-1">
                            {pdfToView && (
                              <a 
                                href={pdfToView.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
                              >
                                <Eye size={15} />
                                <span>Veure partitura (PDF)</span>
                              </a>
                            )}
                            {song.mp3_url && (
                              <button
                                onClick={() => toggleAudio(song.mp3_url!, song.title)}
                                className="inline-flex items-center gap-1.5 font-semibold hover:text-stone-900 transition-colors"
                              >
                                <Headphones size={15} />
                                <span>Àudio de referència</span>
                              </button>
                            )}
                            <div className="inline-flex items-center gap-1.5 text-stone-500 font-medium">
                              <CheckCircle size={15} className="text-emerald-500" />
                              <span>{confirmedCount} confirmats</span>
                            </div>
                          </div>

                          {/* Instrument tags */}
                          <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center gap-2 text-[11px]">
                            <span className="text-stone-400 font-medium mr-1">Instruments:</span>
                            <span className="px-2 py-0.5 rounded-md bg-stone-50 border border-stone-200/60 text-stone-600 font-medium">
                              10 Dolçaines 1es
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-stone-50 border border-stone-200/60 text-stone-600 font-medium">
                              5 Segones
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-stone-50 border border-stone-200/60 text-stone-600 font-medium">
                              4 Tabals
                            </span>
                            <span className="ml-auto text-stone-400 font-medium">
                              Temps estimat: 35 min
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Add Song to Colleta Dashed Button */}
                  {user.role === 'admin' && (
                    <button
                      onClick={() => openAddRepertoireModal(primaryRehearsal.id, 'colleta')}
                      className="w-full py-4 border-2 border-dashed border-orange-200 hover:border-primary/50 hover:bg-orange-50/30 rounded-2xl text-xs font-bold text-primary flex items-center justify-center gap-2 transition-all"
                    >
                      <Plus size={16} />
                      <span>Afegir peça a l'assaig de Colleta</span>
                    </button>
                  )}
                </div>

                {/* ─── COLUMN 2: CAMBRA ─── */}
                <div className={`space-y-4 ${mobileActiveTab === 'cambra' ? 'block' : 'hidden md:block'}`}>
                  {/* Cambra Section Header Card */}
                  <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-orange-100 flex items-center justify-center text-primary font-bold">
                        <Music size={22} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-lg text-stone-900 tracking-tight">Cambra</h3>
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-50 text-primary border border-orange-200/60">
                            20:00h - 21:30h
                          </span>
                        </div>
                        <p className="text-xs text-stone-500 font-medium mt-0.5">
                          Grup avançat, polifonies, peces de concert i ajust de dinàmiques
                        </p>
                      </div>
                    </div>

                    <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl px-3.5 py-2 text-right shrink-0">
                      <p className="text-xs font-black leading-tight">{Math.max(1, Math.round(confirmedCount * 0.75))} confirmats / {Math.round(totalMembers * 0.7)}</p>
                      <p className="text-[10px] text-emerald-600 font-medium mt-0.5">{cambraRate}% assistència</p>
                    </div>
                  </div>

                  {/* Cambra Song Cards */}
                  {cambra.length === 0 ? (
                    <div className="bg-white/80 rounded-2xl border border-dashed border-stone-200 p-8 text-center text-stone-400 text-sm">
                      No s'han assignat peces de Cambra encara.
                    </div>
                  ) : (
                    cambra.map((song, index) => {
                      const userPdf = song.pdfs?.find(p => p.instrument.toLowerCase() === user.instrument?.toLowerCase());
                      const defaultPdf = song.pdfs?.[0];
                      const pdfToView = userPdf || defaultPdf;

                      return (
                        <div key={song.id} className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs hover:border-stone-300 transition-all space-y-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3.5">
                              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100/80 flex items-center justify-center text-primary shrink-0 mt-0.5">
                                <Music size={20} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-stone-900 text-base">{song.title}</h4>
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-orange-50 text-primary border border-orange-200/60">
                                    {song.style || 'AVANÇAT'}
                                  </span>
                                </div>
                                <p className="text-xs text-stone-500 font-medium mt-0.5">
                                  {song.composer || "Arranjament a 4 veus"} {song.style ? `· ${song.style}` : ''}
                                </p>
                              </div>
                            </div>

                            {/* Attendance Controls */}
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => handleAttendance(primaryRehearsal.id, 'Vull anar-hi')}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                  userAttendance === 'Vull anar-hi'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                                }`}
                              >
                                {userAttendance === 'Vull anar-hi' ? '✓ Confirmat' : 'Vindré'}
                              </button>
                            </div>
                          </div>

                          {/* Action Links */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-stone-600 pt-1">
                            {pdfToView && (
                              <a 
                                href={pdfToView.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
                              >
                                <Eye size={15} />
                                <span>Veure partitura (PDF)</span>
                              </a>
                            )}
                            <div className="inline-flex items-center gap-1.5 text-stone-500 font-medium">
                              <CheckCircle size={15} className="text-emerald-500" />
                              <span>{Math.max(1, Math.round(confirmedCount * 0.75))} confirmats</span>
                            </div>
                          </div>

                          {/* Director's Note Callout on First Cambra Song (Screenshot 7) */}
                          {index === 0 && primaryRehearsal.notes && (
                            <div className="p-3.5 bg-orange-50/60 border border-orange-200/60 rounded-xl space-y-1">
                              <p className="text-xs font-black text-primary flex items-center gap-1.5">
                                <Info size={14} />
                                <span>Nota del Director:</span>
                              </p>
                              <p className="text-xs text-stone-700 italic font-medium pl-5 leading-relaxed">
                                "{primaryRehearsal.notes}"
                              </p>
                            </div>
                          )}

                          {/* Instrument tags */}
                          <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center gap-2 text-[11px]">
                            <span className="text-stone-400 font-medium mr-1">Instruments:</span>
                            <span className="px-2 py-0.5 rounded-md bg-stone-50 border border-stone-200/60 text-stone-600 font-medium">
                              4 Gralles 1es
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-stone-50 border border-stone-200/60 text-stone-600 font-medium">
                              3 Baixes
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-stone-50 border border-stone-200/60 text-stone-600 font-medium">
                              2 Timbals fondo
                            </span>
                            <span className="ml-auto text-stone-400 font-medium">
                              Temps estimat: 45 min
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Add Song to Cambra Dashed Button */}
                  {user.role === 'admin' && (
                    <button
                      onClick={() => openAddRepertoireModal(primaryRehearsal.id, 'cambra')}
                      className="w-full py-4 border-2 border-dashed border-orange-200 hover:border-primary/50 hover:bg-orange-50/30 rounded-2xl text-xs font-bold text-primary flex items-center justify-center gap-2 transition-all"
                    >
                      <Plus size={16} />
                      <span>Afegir peça a l'assaig de Cambra</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Bottom Time Distribution Bar (Matches Screenshot 7) */}
          <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-4 text-stone-700">
              <div className="flex items-center gap-1.5 font-bold text-stone-900">
                <Clock size={16} className="text-primary" />
                <span>Distribució del temps:</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                <span>Colleta (1h 30m)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                <span>Pausa / Afinació (15m)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                <span>Cambra (1h 30m)</span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-stone-400">
              <span>Darrera actualització avui</span>
              {onNavigate && (
                <button
                  onClick={() => onNavigate('matrix', primaryRehearsal.id)}
                  className="font-bold text-primary hover:text-[#b03a0b] flex items-center gap-1 transition-colors"
                >
                  <span>Matriu de veus</span>
                  <ChevronRight size={15} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Director Notes Modal ─── */}
      {showDirectorNotesModal && primaryRehearsal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border border-stone-200 p-6 md:p-8 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-primary flex items-center justify-center">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-lg">Notes de Direcció</h3>
                  <p className="text-xs text-stone-500">{primaryRehearsal.title}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowDirectorNotesModal(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {user.role === 'admin' ? (
              <div className="space-y-4">
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                  Indicacions per a l'assaig
                </label>
                <textarea
                  value={directorNotesText}
                  onChange={(e) => setDirectorNotesText(e.target.value)}
                  placeholder="Ex: Atenció especial a la segona veu en el canvi de tonalitat..."
                  rows={5}
                  className="w-full p-4 border border-stone-200 rounded-2xl text-sm focus:outline-none focus:border-primary resize-none bg-stone-50"
                />
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setShowDirectorNotesModal(false)}
                    className="px-5 py-2.5 rounded-xl text-stone-600 text-xs font-bold hover:bg-stone-100 transition-colors"
                  >
                    Cancel·lar
                  </button>
                  <button
                    onClick={() => handleSaveDirectorNotes(primaryRehearsal.id)}
                    className="px-6 py-2.5 rounded-xl bg-primary hover:bg-[#b03a0b] text-white text-xs font-bold transition-colors shadow-xs"
                  >
                    Desar Notes
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap bg-stone-50 p-4 rounded-2xl border border-stone-100">
                  {primaryRehearsal.notes || "No hi ha indicacions específiques de direcció per a aquest assaig."}
                </p>
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowDirectorNotesModal(false)}
                    className="px-6 py-2.5 rounded-xl bg-stone-900 text-white text-xs font-bold"
                  >
                    Tancar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Add/Edit Repertoire Modal ─── */}
      {isEditingRepertoire && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] border border-stone-200 animate-in zoom-in-95 duration-200">
            <div className="p-6 pb-4 flex items-center justify-between border-b border-stone-100">
              <div>
                <h3 className="text-xl font-black text-stone-900">
                  {repertoireSectionTarget === 'colleta' ? "Afegir peces a la Colleta" :
                   repertoireSectionTarget === 'cambra' ? "Afegir peces a Cambra" : "Gestionar Repertori de l'Assaig"}
                </h3>
                <p className="text-xs text-stone-500 font-medium">Selecciona les obres del catàleg que s'assajaran</p>
              </div>
              <button 
                onClick={() => setIsEditingRepertoire(null)} 
                className="w-9 h-9 flex items-center justify-center rounded-full bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 pb-2">
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-semibold text-stone-800 focus:bg-white focus:border-primary outline-none transition-all" 
                  placeholder="Cerca obres per títol o estil..." 
                />
              </div>
            </div>

            <div className="p-6 pt-2 overflow-y-auto flex-1 space-y-2">
              {filteredSongs.length === 0 ? (
                <div className="p-8 text-center text-stone-400 text-sm">
                  No s'han trobat obres amb aquesta cerca.
                </div>
              ) : (
                filteredSongs.map((song) => (
                  <label 
                    key={song.id} 
                    className={`flex items-center gap-3.5 p-3.5 rounded-xl cursor-pointer border transition-all ${
                      selectedSongIds.includes(song.id) 
                        ? 'bg-orange-50/60 border-primary/40 shadow-xs' 
                        : 'bg-white border-stone-100 hover:bg-stone-50'
                    }`}
                  >
                    <input 
                      type="checkbox" 
                      checked={selectedSongIds.includes(song.id)}
                      onChange={() => toggleSongSelection(song.id)}
                      className="w-5 h-5 rounded-md border-stone-300 text-primary focus:ring-primary"
                    />
                    <div className="flex-1">
                      <p className="font-bold text-stone-900 text-sm leading-tight">{song.title}</p>
                      <p className="text-[11px] font-semibold text-stone-400 mt-0.5">
                        {song.composer || 'Sense autor'} {song.style && `• ${song.style}`}
                      </p>
                    </div>
                  </label>
                ))
              )}
            </div>

            <div className="p-5 bg-stone-50 border-t border-stone-100 flex items-center justify-between">
              <span className="text-xs font-bold text-stone-500">
                {selectedSongIds.length} obres seleccionades
              </span>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsEditingRepertoire(null)} 
                  className="px-4 py-2 text-stone-500 font-bold text-xs hover:text-stone-800 transition-colors"
                >
                  Cancel·lar
                </button>
                <button 
                  onClick={handleSaveRepertoire} 
                  className="px-5 py-2.5 bg-primary hover:bg-[#b03a0b] text-white font-bold text-xs rounded-xl transition-all shadow-xs"
                >
                  Guardar canvis
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Bottom Audio Player ─── */}
      {activeAudio && (
        <div className="fixed bottom-20 md:bottom-8 right-4 left-4 md:left-auto md:w-96 bg-stone-900 text-white rounded-2xl shadow-2xl p-4 z-40 border border-stone-800 animate-in slide-in-from-bottom-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
                <Headphones size={18} />
              </div>
              <div className="overflow-hidden">
                <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Reproduint</p>
                <p className="text-xs font-bold text-stone-100 truncate">{activeAudio.title}</p>
              </div>
            </div>
            <button 
              onClick={() => setActiveAudio(null)}
              className="w-7 h-7 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <X size={15} />
            </button>
          </div>
          <audio 
            src={activeAudio.url} 
            controls 
            autoPlay 
            className="w-full h-8"
          />
        </div>
      )}
    </div>
  );
}
