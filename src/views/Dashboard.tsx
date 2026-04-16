import { useState, useEffect } from 'react';
import { Calendar, MapPin, Music, ChevronRight, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { UserData } from '../App';

interface AppEvent {
  id: number;
  title: string;
  type: string;
  date: string;
  location: string;
  notes: string;
  createdby: string;
  createdat: string;
  ispublished?: boolean;
}

interface Attendance {
  eventid: number;
  userid: string;
  status: 'Vull anar-hi' | 'No puc' | 'Pendent';
  convocat?: boolean;
}

interface DashboardProps {
  setView: (v: any) => void;
  user: UserData;
}

export default function Dashboard({ setView, user }: DashboardProps) {
  const [upcomingEvents, setUpcomingEvents] = useState<AppEvent[]>([]);
  const [attendances, setAttendances] = useState<Record<number, Attendance>>({});
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .gte('date', now.toISOString())
      .order('date', { ascending: true });
      
    if (error) {
      console.error("Error fetching events:", error);
    } else {
      setUpcomingEvents((data || []).slice(0, 3));
    }
    setLoading(false);
  };

  const fetchAttendances = async () => {
    const { data, error } = await supabase
      .from('attendances')
      .select('*')
      .eq('userid', user.uid);
      
    if (error) {
      console.error("Error fetching attendances:", error);
    } else {
      const attData: Record<number, Attendance> = {};
      data?.forEach(att => {
        attData[att.eventid] = att;
      });
      setAttendances(attData);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchAttendances();

    const eventsChannel = supabase
      .channel('public:events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, fetchEvents)
      .subscribe();

    const attendancesChannel = supabase
      .channel('public:attendances')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendances' }, fetchAttendances)
      .subscribe();

    return () => {
      supabase.removeChannel(eventsChannel);
      supabase.removeChannel(attendancesChannel);
    };
  }, [user.uid]);

  const handleAttendance = async (eventId: number, status: 'Vull anar-hi' | 'No puc') => {
    try {
      const { error } = await supabase
        .from('attendances')
        .upsert({
          eventid: eventId,
          userid: user.uid,
          status,
          convocat: attendances[eventId]?.convocat || false,
          updatedat: new Date().toISOString()
        }, { onConflict: 'eventid, userid' });
        
      if (error) throw error;
    } catch (error) {
      console.error("Error updating attendance:", error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ca-ES', { 
      weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' 
    }).format(date);
  };

  const getMonthShort = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ca-ES', { month: 'short' }).format(date).toUpperCase();
  };

  const getDay = (dateString: string) => {
    const date = new Date(dateString);
    return date.getDate().toString();
  };
  return (
    <div className="max-w-md mx-auto p-4 sm:p-6 flex flex-col gap-6 pb-28 md:pb-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Hola, {user.name.split(' ')[0]}!</h1>
        <p className="text-slate-500 text-sm sm:text-base font-medium">Membre Actiu • {user.instrument}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => setView('repertoire')} className="flex flex-col items-center justify-center p-4 rounded-xl bg-[#d44211] text-white shadow-lg shadow-[#d44211]/20 hover:scale-[1.02] transition-transform">
          <Music size={32} className="mb-2" />
          <span className="text-sm font-bold">Repertori</span>
        </button>
        <button onClick={() => setView('calendar')} className="flex flex-col items-center justify-center p-4 rounded-xl bg-[#d44211]/10 text-[#d44211] hover:bg-[#d44211]/20 transition-colors">
          <Calendar size={32} className="mb-2" />
          <span className="text-sm font-bold">El meu calendari</span>
        </button>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Pròxims Esdeveniments</h2>
          <button onClick={() => setView('calendar')} className="text-[#d44211] text-sm font-bold">Veure tots</button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#d44211]"></div>
          </div>
        ) : upcomingEvents.length === 0 ? (
          <div className="text-center py-8 text-slate-500 bg-white rounded-xl border border-slate-200">
            No hi ha esdeveniments pròxims.
          </div>
        ) : (
          upcomingEvents.map((event, index) => {
            const myAttendance = attendances[event.id]?.status;
            const isFirst = index === 0;

            if (isFirst) {
              // Highlight the very next event
              return (
                <div key={event.id} className="flex flex-col gap-3 p-4 rounded-xl bg-white border border-[#d44211]/20 shadow-md">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1">
                      <span className="inline-flex items-center rounded-full bg-[#d44211]/10 px-2 py-0.5 text-xs font-bold text-[#d44211] w-fit uppercase tracking-wider">
                        {event.type}
                      </span>
                      <h3 className="text-lg font-black text-slate-900 leading-tight">{event.title}</h3>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 mt-1">
                    <div className="flex items-center gap-2 text-[#d44211] text-sm font-medium">
                      <Calendar size={16} />
                      <span className="capitalize">{formatDate(event.date)}</span>
                    </div>
                    {event.location && (
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-slate-500 text-sm hover:text-[#d44211] transition-colors group/loc w-fit"
                      >
                        <MapPin size={16} className="shrink-0" />
                        <span className="truncate underline underline-offset-4 decoration-slate-200 group-hover/loc:decoration-[#d44211]/30">{event.location}</span>
                        <ExternalLink size={12} className="opacity-0 group-hover/loc:opacity-100 transition-opacity" />
                      </a>
                    )}
                  </div>

                  {event.ispublished && attendances[event.id]?.convocat && (
                    <div className="mt-2 bg-[#d44211]/10 text-[#d44211] px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                      <CheckCircle size={16} /> Estàs convocat!
                    </div>
                  )}

                  <div className="mt-2 pt-3 border-t border-slate-100 flex gap-2">
                    {myAttendance === 'Vull anar-hi' ? (
                      <button onClick={() => handleAttendance(event.id, 'No puc')} className="flex-1 py-2.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm font-bold hover:bg-green-100 transition-colors flex items-center justify-center gap-2">
                        <CheckCircle size={16} /> Assistiré
                      </button>
                    ) : myAttendance === 'No puc' ? (
                      <button onClick={() => handleAttendance(event.id, 'Vull anar-hi')} className="flex-1 py-2.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2">
                        <XCircle size={16} /> No assistiré
                      </button>
                    ) : (
                      <>
                        <button onClick={() => handleAttendance(event.id, 'No puc')} className="flex-1 py-2.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-lg text-sm font-bold hover:bg-slate-100 transition-colors">
                          No puc
                        </button>
                        <button onClick={() => handleAttendance(event.id, 'Vull anar-hi')} className="flex-1 py-2.5 bg-[#d44211] text-white rounded-lg text-sm font-bold hover:bg-[#d44211]/90 transition-colors shadow-sm shadow-[#d44211]/20">
                          Confirmar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            }

            // Standard list item for other upcoming events
            return (
              <div key={event.id} className="flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-100 shadow-sm cursor-pointer hover:border-[#d44211]/30 transition-colors" onClick={() => setView('calendar')}>
                  <div className="w-16 h-16 bg-[#d44211]/5 flex flex-col items-center justify-center p-2 text-center border border-[#d44211]/10 rounded-lg">
                    <div className="text-[#d44211] font-black text-xl leading-none">{getDay(event.date)}</div>
                    <div className="text-[#d44211]/60 text-[10px] font-black uppercase tracking-widest mt-1">{getMonthShort(event.date)}</div>
                  </div>
                <div className="flex flex-col flex-1 overflow-hidden">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-bold text-[#d44211] uppercase tracking-wider">{event.type}</span>
                    {event.ispublished && attendances[event.id]?.convocat && (
                      <span className="w-2 h-2 rounded-full bg-[#d44211]" title="Convocat"></span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 truncate leading-tight">{event.title}</h3>
                  <div className="flex items-center gap-1 text-slate-500 text-xs mt-1">
                    <Calendar size={12} />
                    <span>{new Date(event.date).toLocaleTimeString('ca-ES', {hour: '2-digit', minute:'2-digit'})}</span>
                    {event.location && (
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-slate-300">•</span>
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 text-slate-400 hover:text-[#d44211] transition-colors truncate group/inner"
                        >
                          <MapPin size={10} className="shrink-0" />
                          <span className="truncate group-hover/inner:underline">{event.location}</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {myAttendance === 'Vull anar-hi' && <CheckCircle size={16} className="text-green-500" />}
                  {myAttendance === 'No puc' && <XCircle size={16} className="text-red-500" />}
                  <ChevronRight size={16} className="text-slate-300" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
