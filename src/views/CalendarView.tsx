import React, { useState, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, Users, Settings, MapPin, CheckCircle, Plus, X, Trash2, FileText, Music, Pencil, Link2, ExternalLink } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { UserData } from '../App';

interface CalendarProps {
  user: UserData;
  selectedEventId?: number | null;
  setSelectedEventId?: (id: number | null) => void;
}

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
  repertoireids?: number[];
  is_cancelled?: boolean;
  cancellation_reason?: string;
}

interface Song {
  id: number;
  title: string;
}

interface Attendance {
  eventid: number;
  userid: string;
  status: 'Vull anar-hi' | 'No puc' | 'Pendent';
  convocat?: boolean;
  updatedat?: string;
}

export default function CalendarView({ user, selectedEventId, setSelectedEventId }: CalendarProps) {
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [allAttendances, setAllAttendances] = useState<Record<number, Record<string, Attendance>>>({});
  const [users, setUsers] = useState<UserData[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AppEvent | null>(null);
  const [viewingEvent, setViewingEvent] = useState<AppEvent | null>(null);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [newEvent, setNewEvent] = useState({
    title: '',
    type: 'Actuació',
    date: '',
    location: '',
    notes: ''
  });

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: true });
    if (error) console.error("Error fetching events:", error);
    else setEvents(data || []);
    setLoading(false);
  };

  const fetchAttendances = async () => {
    const { data, error } = await supabase.from('attendances').select('*');
    if (error) console.error("Error fetching attendances:", error);
    else {
      const attData: Record<number, Record<string, Attendance>> = {};
      data?.forEach(att => {
        if (!attData[att.eventid]) attData[att.eventid] = {};
        attData[att.eventid][att.userid] = att;
      });
      setAllAttendances(attData);
    }
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase.from('users').select('*');
    if (error) console.error("Error fetching users:", error);
    else {
      // Filter out the superadmin from the list
      const filteredUsers = (data || []).filter(u => u.email !== 'syncrolattex@gmail.com');
      setUsers(filteredUsers);
    }
  };

  const fetchSongs = async () => {
    const { data, error } = await supabase.from('songs').select('id, title');
    if (error) console.error("Error fetching songs:", error);
    else setSongs(data || []);
  };

  useEffect(() => {
    fetchEvents();
    fetchAttendances();
    fetchUsers();
    fetchSongs();

    const eventsChannel = supabase.channel('calendar-view-events').on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, fetchEvents).subscribe();
    const attendancesChannel = supabase.channel('calendar-view-attendances').on('postgres_changes', { event: '*', schema: 'public', table: 'attendances' }, fetchAttendances).subscribe();
    const usersChannel = supabase.channel('calendar-view-users').on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, fetchUsers).subscribe();

    return () => {
      supabase.removeChannel(eventsChannel);
      supabase.removeChannel(attendancesChannel);
      supabase.removeChannel(usersChannel);
    };
  }, []);

  useEffect(() => {
    if (selectedEventId && events.length > 0) {
      const ev = events.find(e => e.id === selectedEventId);
      if (ev) setViewingEvent(ev);
    }
  }, [selectedEventId, events]);

  // Sync viewingEvent with latest data if it's already open
  useEffect(() => {
    if (viewingEvent) {
      const latest = events.find(e => e.id === viewingEvent.id);
      if (latest && JSON.stringify(latest) !== JSON.stringify(viewingEvent)) {
        setViewingEvent(latest);
      }
    }
  }, [events]);

  const closeEventModal = () => {
    setViewingEvent(null);
    if (setSelectedEventId) setSelectedEventId(null);
  };

  const handleShareWhatsApp = (event: AppEvent) => {
    const eventDate = formatDate(event.date);
    const appUrl = window.location.origin;
    const shareLink = `${appUrl}/?event=${event.id}`;
    
    const mapsUrl = event.location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}` : '';
    const message = `📢 *NOU ESDEVENIMENT!* 📢\n\n🗓️ *Esdeveniment:* ${event.title}\n📅 *Data:* ${eventDate}\n📍 *Lloc:* ${event.location || 'Per confirmar'}${mapsUrl ? `\n🗺️ *Mapa:* ${mapsUrl}` : ''}\n📝 *Notes:* ${event.notes || '-'}\n\n👇 *Apunta't aquí:* \n${shareLink}\n\nRevisa l'app de la colla per confirmar assistència! 🎺🥁`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleCopyLink = (event: AppEvent) => {
    const appUrl = window.location.origin;
    const shareLink = `${appUrl}/?event=${event.id}`;
    navigator.clipboard.writeText(shareLink);
    alert("Enllaç directe copiat al porta-retalls! Ja el pots compartir.");
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const isRehearsal = newEvent.type.startsWith('Assaig');
    if ((!newEvent.title && !isRehearsal) || !newEvent.date) return;

    try {
      const finalTitle = newEvent.title || newEvent.type;
      
      const eventData = {
        title: finalTitle,
        type: newEvent.type,
        date: new Date(newEvent.date).toISOString(), // Use ISO string for consistency
        location: newEvent.location,
        notes: newEvent.notes,
        createdby: user.name,
        createdat: editingEvent ? editingEvent.createdat : new Date().toISOString()
      };

      if (editingEvent) {
        console.log("Updating event...", editingEvent.id);
        const { error } = await supabase.from('events').update(eventData).eq('id', editingEvent.id);
        if (error) throw error;
      } else {
        console.log("Adding event...");
        const { data, error } = await supabase.from('events').insert(eventData).select();
        if (error) throw error;

        if (isRehearsal && data && data[0]) {
          setTimeout(() => {
            if (confirm("Vols compartir aquest nou assaig per WhatsApp?")) {
              handleShareWhatsApp(data[0] as AppEvent);
            }
          }, 500);
        }
      }
      
      handleCloseAddModal();
    } catch (error) {
      console.error("Error saving event:", error);
      alert("Hi ha hagut un error en desar l'esdeveniment.");
    }
  };

  const handleOpenEdit = (event: AppEvent) => {
    setEditingEvent(event);
    
    // Convert UTC date to local string for datetime-local input
    const dateObj = new Date(event.date);
    const localISO = new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    
    setNewEvent({
      title: event.title,
      type: event.type,
      date: localISO,
      location: event.location,
      notes: event.notes
    });
    setIsAdding(true);
  };

  const handleCloseAddModal = () => {
    setIsAdding(false);
    setEditingEvent(null);
    setNewEvent({ title: '', type: 'Actuació', date: '', location: '', notes: '' });
  };

  const handleDeleteEvent = async (eventId: number) => {
    if (!confirm("Estàs segur que vols eliminar aquest esdeveniment? També s'esborraran les assistències i notificacions associades.")) return;
    
    try {
      const { error } = await supabase.from('events').delete().eq('id', eventId);
      if (error) throw error;
      // Real-time will handle the list update
    } catch (error) {
      console.error("Error deleting event:", error);
      alert("Error en eliminar l'esdeveniment.");
    }
  };

  const handleAttendance = async (eventId: number, status: 'Vull anar-hi' | 'No puc' | 'Pendent', targetUserId: string = user.uid) => {
    try {
      const event = events.find(e => e.id === eventId);
      if (event?.type === 'Actuació' && event.ispublished && user.role !== 'admin') {
        alert("La llista de convocats ja ha estat publicada. No es pot canviar l'assistència.");
        return;
      }

      const currentConvocat = allAttendances[eventId]?.[targetUserId]?.convocat || false;
      const { error } = await supabase.from('attendances').upsert({
        eventid: eventId,
        userid: targetUserId,
        status,
        convocat: currentConvocat,
        updatedat: new Date().toISOString()
      }, { onConflict: 'eventid, userid' });
      if (error) throw error;
    } catch (error) {
      console.error("Error updating attendance:", error);
      alert("Error en actualitzar l'assistència.");
    }
  };

  const handleCancelEvent = async (eventId: number) => {
    const reason = prompt("Indica el motiu de la cancel·lació (opcional):");
    if (reason === null) return; // User cancelled the prompt

    try {
      // 1. Update event status
      const { error: updateError } = await supabase
        .from('events')
        .update({ 
          is_cancelled: true, 
          cancellation_reason: reason || 'L\'esdeveniment ha estat cancel·lat.' 
        })
        .eq('id', eventId);
      
      if (updateError) throw updateError;

      // 2. Notify all attendees (anyone who said "Vull anar-hi" or "Pendent")
      const event = events.find(e => e.id === eventId);
      const eventTitle = event?.title || 'Esdeveniment';
      const eventAtts = allAttendances[eventId] || {};
      
      // Get all users who have an attendance record for this event (except those who said "No puc")
      const userIdsToNotify = Object.keys(eventAtts).filter(uid => eventAtts[uid].status !== 'No puc');
      
      // If no attendance records yet, we might want to notify everyone, but usually base it on attendances
      if (userIdsToNotify.length > 0) {
        const notifications = userIdsToNotify.map(uid => ({
          userid: uid,
          title: `🚫 CANCEL·LAT: ${eventTitle}`,
          message: reason || `S'ha cancel·lat l'esdeveniment del dia ${formatDate(event?.date || '')}.`,
          link: 'calendar',
          eventid: eventId,
          read: false,
          send_email: true
        }));

        const { error: notifError } = await supabase.from('notifications').insert(notifications);
        if (notifError) console.error("Error sending notifications:", notifError);
      }

      alert("Esdeveniment cancel·lat i assistents notificats.");
      fetchEvents();
    } catch (error) {
      console.error("Error cancelling event:", error);
      alert("Error en cancel·lar l'esdeveniment.");
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ca-ES', { 
      day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' 
    }).format(date);
  };

  const now = new Date();
  const upcomingEvents = events.filter(e => new Date(e.date) >= now);
  const pastEvents = events.filter(e => new Date(e.date) < now).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const displayedEvents = activeTab === 'upcoming' ? upcomingEvents : pastEvents;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 pb-24 md:pb-8">
      <div className="flex-1">
        <div className="flex flex-col sm:flex-row border-b border-[#d44211]/10 mb-6 gap-4 sm:gap-8 justify-between items-start sm:items-center">
          <div className="flex gap-6 sm:gap-8 w-full sm:w-auto">
            <button 
              onClick={() => setActiveTab('upcoming')}
              className={`flex-1 sm:flex-none flex flex-col items-center justify-center border-b-[3px] pb-3 pt-2 transition-colors ${activeTab === 'upcoming' ? 'border-[#d44211] text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              <span className="text-sm font-black tracking-widest uppercase">Pròxims</span>
            </button>
            <button 
              onClick={() => setActiveTab('past')}
              className={`flex-1 sm:flex-none flex flex-col items-center justify-center border-b-[3px] pb-3 pt-2 transition-colors ${activeTab === 'past' ? 'border-[#d44211] text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              <span className="text-sm font-black tracking-widest uppercase">Passats</span>
            </button>
          </div>
          {user.role === 'admin' && (
            <button 
              onClick={() => setIsAdding(true)}
              className="w-full sm:w-auto px-4 py-3 bg-[#d44211] text-white font-black uppercase tracking-widest rounded-xl hover:bg-[#d44211]/90 transition-all flex items-center justify-center gap-2 text-[10px] mb-2 shadow-lg shadow-[#d44211]/20"
            >
              <Plus size={14} /> Nou Esdeveniment
            </button>
          )}
        </div>

        <h1 className="text-2xl font-bold mb-6 text-slate-900">
          {activeTab === 'upcoming' ? 'Pròximes actuacions i assajos' : 'Esdeveniments passats'}
        </h1>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d44211]"></div>
          </div>
        ) : displayedEvents.length === 0 ? (
          <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-slate-200">
            {activeTab === 'upcoming' ? 'No hi ha esdeveniments programats.' : 'No hi ha esdeveniments passats.'}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {displayedEvents.map(event => {
              const eventAtts = allAttendances[event.id] || {};
              const myAttendance = eventAtts[user.uid]?.status;
              const amIConvocat = eventAtts[user.uid]?.convocat;
              const confirmedCount = users.filter(u => eventAtts[u.uid]?.status === 'Vull anar-hi').length;
              const declinedCount = users.filter(u => eventAtts[u.uid]?.status === 'No puc').length;
              
              return (
                <div key={event.id} className="flex flex-col md:flex-row bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-lg hover:border-[#d44211]/20 transition-all group">
                  <div className="w-full md:w-32 h-24 md:h-auto bg-[#d44211]/5 flex flex-col items-center justify-center p-4 text-center border-b md:border-b-0 md:border-r border-[#d44211]/10">
                    <div className="text-[#d44211] font-black text-2xl leading-none">{new Date(event.date).getDate()}</div>
                    <div className="text-[#d44211]/60 text-[10px] font-black uppercase tracking-widest mt-1">{new Date(event.date).toLocaleDateString('ca-ES', { month: 'short' }).toUpperCase()}</div>
                  </div>
                  <div className="flex-1 p-5 flex flex-col justify-between">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                      <div className="flex-1 min-w-0 w-full space-y-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-[10px] font-black text-[#d44211] uppercase tracking-widest bg-[#d44211]/5 px-2 py-0.5 rounded-full">{event.type}</span>
                          {event.is_cancelled && (
                            <span className="px-3 py-1 bg-red-600 text-white text-[9px] font-black uppercase tracking-widest rounded-full flex items-center gap-1.5 shadow-lg shadow-red-600/20 animate-pulse">
                              🚫 Cancel·lat
                            </span>
                          )}
                          {event.ispublished && amIConvocat && myAttendance !== 'No puc' && !event.is_cancelled && (
                            <span className="px-3 py-1 bg-[#d44211] text-white text-[9px] font-black uppercase tracking-widest rounded-full flex items-center gap-1 shadow-sm shadow-[#d44211]/20">
                              <CheckCircle size={10} /> Convocat
                            </span>
                          )}
                          {!event.ispublished && myAttendance === 'Vull anar-hi' && !event.is_cancelled && (
                            <span className="px-3 py-1 bg-green-100 text-green-700 text-[9px] font-black uppercase tracking-widest rounded-full flex items-center gap-1">
                              <CheckCircle size={10} /> Inscrit
                            </span>
                          )}
                          {myAttendance === 'No puc' && !event.is_cancelled && (
                            <span className="px-3 py-1 bg-red-100 text-red-700 text-[9px] font-black uppercase tracking-widest rounded-full">
                              No assisteix
                            </span>
                          )}
                          {!myAttendance && !event.is_cancelled && (
                            <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[9px] font-black uppercase tracking-widest rounded-full">
                              Pendent
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-black text-slate-900 leading-tight mb-2 group-hover:text-[#d44211] transition-colors truncate">{event.title}</h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                          <div className="flex items-center gap-1.5 text-slate-500 font-bold text-[11px] sm:text-xs">
                            <CalendarIcon size={14} className="text-[#d44211]" />
                            <span>{formatDate(event.date)}</span>
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-1.5 min-w-0">
                              <a 
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1.5 text-slate-500 font-bold text-[11px] sm:text-xs hover:text-[#d44211] transition-colors truncate group/cardloc"
                              >
                                <MapPin size={14} className="text-[#d44211] shrink-0" />
                                <span className="truncate group-hover/cardloc:underline">{event.location}</span>
                              </a>
                            </div>
                          )}
                        </div>
                        {event.notes && (
                          <p className="text-xs text-slate-600 mt-3 italic line-clamp-2">{event.notes}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 w-full sm:w-auto justify-end border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0 mt-2 sm:mt-0">
                        {user.role === 'admin' && (
                          <div className="flex items-center gap-1 pr-2 mr-2 border-r border-slate-100">
                            {!event.is_cancelled && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleCancelEvent(event.id); }}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                title="Cancel·lar"
                              >
                                <X size={18} className="stroke-[3]" />
                              </button>
                            )}
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleOpenEdit(event); }}
                              className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                              title="Editar"
                            >
                              <Pencil size={18} />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteEvent(event.id); }}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                              title="Eliminar"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleCopyLink(event); }}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                            title="Copiar enllaç"
                          >
                            <Link2 size={18} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleShareWhatsApp(event); }}
                            className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all"
                            title="WhatsApp"
                          >
                            <svg size={18} viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.438 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.94 3.659 1.437 5.634 1.437h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                      <div className="flex gap-4 text-sm">
                        <div className="flex items-center gap-1 text-green-600 font-medium">
                          <CheckCircle size={16} /> {confirmedCount} inscrits
                        </div>
                        <div className="flex items-center gap-1 text-red-500 font-medium">
                          <X size={16} /> {declinedCount} no vénen
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button 
                          onClick={() => setViewingEvent(event)} 
                          className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-lg text-sm hover:bg-slate-50 transition-colors"
                        >
                          Veure Detalls
                        </button>
                        
                        {/* Only allow editing attendance if it's not a published Actuació (unless admin) AND not cancelled */}
                        {!(event.type === 'Actuació' && event.ispublished && user.role !== 'admin') && !event.is_cancelled ? (
                          myAttendance === 'Vull anar-hi' ? (
                            <button onClick={() => handleAttendance(event.id, 'No puc')} className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-lg text-sm hover:bg-emerald-50 hover:text-emerald-700 transition-colors">
                              Cancel·lar assistència
                            </button>
                          ) : (
                            <>
                              <button onClick={() => handleAttendance(event.id, 'No puc')} className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-lg text-sm hover:bg-red-50 hover:text-red-700 transition-colors">
                                No puc
                              </button>
                              <button onClick={() => handleAttendance(event.id, 'Vull anar-hi')} className="px-6 py-2 bg-[#d44211] text-white font-bold rounded-lg text-sm hover:bg-[#d44211]/90 transition-colors shadow-sm shadow-[#d44211]/20">
                                Vull anar-hi
                              </button>
                            </>
                          )
                        ) : event.is_cancelled ? (
                          <span className="text-xs font-bold text-red-500 bg-red-50 px-3 py-2 rounded-lg border border-red-100">
                            Esdeveniment cancel·lat
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                            Inscripció tancada
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Event Details Modal */}
      {viewingEvent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-[#f8f6f6]">
              <h3 className="text-xl font-bold text-slate-900">Detalls de l'esdeveniment</h3>
              <button onClick={closeEventModal} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="mb-6">
                <div className="inline-block px-3 py-1 bg-[#d44211]/10 text-[#d44211] font-bold text-sm rounded-full mb-3">
                  {viewingEvent.type}
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">{viewingEvent.title}</h2>
                <div className="flex flex-col gap-2 text-slate-600">
                  <div className="flex items-center gap-2">
                    <CalendarIcon size={16} className="text-[#d44211]" />
                    <span>{formatDate(viewingEvent.date)}</span>
                  </div>
                  {viewingEvent.location && (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <MapPin size={16} className="text-[#d44211]" />
                          <span className="font-bold text-slate-700">{viewingEvent.location}</span>
                        </div>
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(viewingEvent.location)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-slate-200 transition-colors"
                        >
                          <ExternalLink size={12} /> Veure al mapa
                        </a>
                      </div>
                      
                      {/* Search-based interactive map iframe (no API key needed) */}
                      <div className="w-full h-48 rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-slate-50">
                        <iframe 
                          width="100%" 
                          height="100%" 
                          frameBorder="0" 
                          style={{ border: 0 }}
                          src={`https://maps.google.com/maps?q=${encodeURIComponent(viewingEvent.location)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                          allowFullScreen
                        ></iframe>
                      </div>
                    </div>
                  )}
                </div>
                {viewingEvent.is_cancelled && (
                  <div className="mb-4 p-4 bg-red-50 border-2 border-red-100 rounded-2xl flex items-start gap-3">
                    <span className="text-2xl mt-0.5">🚫</span>
                    <div>
                      <h4 className="font-black text-red-600 uppercase text-xs tracking-widest mb-1">Esdeveniment Cancel·lat</h4>
                      <p className="text-red-700 font-bold text-sm">{viewingEvent.cancellation_reason || 'L\'esdeveniment ha estat cancel·lat.'}</p>
                    </div>
                  </div>
                )}
                {viewingEvent.notes && (
                  <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-slate-700 whitespace-pre-wrap">{viewingEvent.notes}</p>
                  </div>
                )}
              </div>

              {/* Repertoire Section */}
              {viewingEvent.repertoireids && viewingEvent.repertoireids.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <Music size={20} className="text-[#d44211]" />
                    Repertori assignat
                  </h3>
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {viewingEvent.repertoireids.map(id => {
                        const song = songs.find(s => s.id === id);
                        return (
                          <li key={id} className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                            <FileText size={14} className="text-[#d44211]" />
                            {song?.title || 'Cançó desconeguda'}
                          </li>
                        );
                      })}
                    </ul>
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <p className="text-xs text-slate-500 mb-2">Pots consultar les partitures i audios a la secció de "Obres i Assajos".</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Users size={20} className="text-[#d44211]" />
                  Llista de Convocats
                </h3>
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-2 bg-slate-50 p-3 border-b border-slate-200 font-bold text-sm text-slate-700">
                    <div>Músic</div>
                    <div>Instrument</div>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                    {users
                      .filter(u => {
                        const att = allAttendances[viewingEvent.id]?.[u.uid];
                        return att?.convocat || att?.status === 'Vull anar-hi';
                      })
                      .map(u => (
                        <div key={u.uid} className="grid grid-cols-2 p-3 text-sm items-center">
                          <div className="font-medium text-slate-900">{u.name}</div>
                          <div className="text-slate-500">{u.instrument || 'Sense assignar'}</div>
                        </div>
                      ))}
                    {users.filter(u => {
                      const att = allAttendances[viewingEvent.id]?.[u.uid];
                      return att?.convocat || att?.status === 'Vull anar-hi';
                    }).length === 0 && (
                      <div className="p-4 text-center text-slate-500 text-sm">
                        Encara no hi ha cap músic confirmat o convocat.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Event Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-[#f8f6f6]">
              <h3 className="text-xl font-bold text-slate-900">
                {editingEvent ? 'Editar Esdeveniment' : 'Nou Esdeveniment'}
              </h3>
              <button onClick={handleCloseAddModal} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <form id="add-event-form" onSubmit={handleSaveEvent} className="space-y-4">
                {!newEvent.type.startsWith('Assaig') && (
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Títol *</label>
                    <input type="text" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-[#d44211] focus:border-[#d44211]" placeholder="Ex: Diada Castellera" />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Tipus</label>
                    <select 
                      value={newEvent.type} 
                      onChange={e => {
                        const type = e.target.value;
                        const location = type.startsWith('Assaig') ? 'Plaça Numero 8, 7A, 46290, Valencia' : newEvent.location;
                        setNewEvent({...newEvent, type, location});
                      }} 
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-[#d44211] focus:border-[#d44211] bg-white"
                    >
                      <option value="Actuació">Actuació</option>
                      <option value="Assaig Colleta">Assaig Colleta</option>
                      <option value="Assaig Cambra">Assaig Cambra</option>
                      <option value="Intercanvi">Intercanvi</option>
                      <option value="Final de curs">Final de curs</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Data i Hora *</label>
                    <input required type="datetime-local" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-[#d44211] focus:border-[#d44211]" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Ubicació</label>
                  <input type="text" value={newEvent.location} onChange={e => setNewEvent({...newEvent, location: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-[#d44211] focus:border-[#d44211]" placeholder="Ex: Plaça de la Vila" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Notes / Observacions</label>
                  <textarea value={newEvent.notes} onChange={e => setNewEvent({...newEvent, notes: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-[#d44211] focus:border-[#d44211]" rows={3} placeholder="Detalls de la convocatòria..."></textarea>
                </div>
              </form>
            </div>
            <div className="p-6 border-t border-slate-100 bg-[#f8f6f6] flex justify-end gap-3">
              <button onClick={handleCloseAddModal} className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors">
                Cancel·lar
              </button>
              <button type="submit" form="add-event-form" className="px-6 py-3 bg-[#d44211] text-white font-bold rounded-xl hover:bg-[#d44211]/90 transition-colors shadow-lg shadow-[#d44211]/20">
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
