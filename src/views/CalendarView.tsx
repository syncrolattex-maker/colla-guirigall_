import React, { useState, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, Users, Settings, MapPin, CheckCircle, Plus, X, Trash2, FileText, Music, Pencil, Link2, ExternalLink, Clock } from 'lucide-react';
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
  slots_dolcaina?: number | null;
  slots_tabal?: number | null;
  requires_experienced?: boolean;
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
  attended?: boolean;
  updatedat?: string;
}

import { getTypeColors } from '../utils/eventColors';

export default function CalendarView({ user, selectedEventId, setSelectedEventId }: CalendarProps) {
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [allAttendances, setAllAttendances] = useState<Record<number, Record<string, Attendance>>>({});
  const [users, setUsers] = useState<UserData[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [userAssignments, setUserAssignments] = useState<Record<number, Record<number, string>>>({}); // eventId -> songId -> voice
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AppEvent | null>(null);
  const [viewingEvent, setViewingEvent] = useState<AppEvent | null>(null);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [eventTypeFilter, setEventTypeFilter] = useState<'all' | 'actuacions' | 'assajos'>('all');
  const [newEvent, setNewEvent] = useState<{
    title: string;
    type: string;
    date: string;
    location: string;
    notes: string;
    slots_dolcaina: number | '';
    slots_tabal: number | '';
    requires_experienced: boolean;
  }>({
    title: '',
    type: 'Actuació',
    date: '',
    location: '',
    notes: '',
    slots_dolcaina: '',
    slots_tabal: '',
    requires_experienced: false
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

  const fetchAssignments = async () => {
    const { data, error } = await supabase
      .from('song_assignments')
      .select('event_id, song_id, voice')
      .eq('user_id', user.uid);
    
    if (error) console.error("Error fetching assignments:", error);
    else {
      const assignMap: Record<number, Record<number, string>> = {};
      data?.forEach(a => {
        if (!assignMap[a.event_id]) assignMap[a.event_id] = {};
        assignMap[a.event_id][a.song_id] = a.voice;
      });
      setUserAssignments(assignMap);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchAttendances();
    fetchUsers();
    fetchSongs();
    fetchAssignments();

    const onFocus = () => {
      fetchEvents();
      fetchAttendances();
      fetchUsers();
      fetchSongs();
      fetchAssignments();
    };
    window.addEventListener('app-focus', onFocus);

    const eventsChannel = supabase.channel('calendar-view-events').on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, fetchEvents).subscribe();
    const attendancesChannel = supabase.channel('calendar-view-attendances').on('postgres_changes', { event: '*', schema: 'public', table: 'attendances' }, fetchAttendances).subscribe();
    const usersChannel = supabase.channel('calendar-view-users').on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, fetchUsers).subscribe();
    const assignmentsChannel = supabase.channel('calendar-view-assignments').on('postgres_changes', { event: '*', schema: 'public', table: 'song_assignments' }, fetchAssignments).subscribe();

    return () => {
      window.removeEventListener('app-focus', onFocus);
      supabase.removeChannel(eventsChannel);
      supabase.removeChannel(attendancesChannel);
      supabase.removeChannel(usersChannel);
      supabase.removeChannel(assignmentsChannel);
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
        slots_dolcaina: newEvent.slots_dolcaina === '' ? null : Number(newEvent.slots_dolcaina),
        slots_tabal: newEvent.slots_tabal === '' ? null : Number(newEvent.slots_tabal),
        requires_experienced: !!newEvent.requires_experienced,
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
      location: event.location || '',
      notes: event.notes || '',
      slots_dolcaina: event.slots_dolcaina ?? '',
      slots_tabal: event.slots_tabal ?? '',
      requires_experienced: !!event.requires_experienced
    });
    setIsAdding(true);
  };

  const handleCloseAddModal = () => {
    setIsAdding(false);
    setEditingEvent(null);
    setNewEvent({ title: '', type: 'Actuació', date: '', location: '', notes: '', slots_dolcaina: '', slots_tabal: '', requires_experienced: false });
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
  
  const baseEvents = activeTab === 'upcoming' ? upcomingEvents : pastEvents;
  
  const displayedEvents = baseEvents.filter(event => {
    if (eventTypeFilter === 'actuacions') return event.type !== 'Assaig' && !event.type.startsWith('Assaig');
    if (eventTypeFilter === 'assajos') return event.type === 'Assaig' || event.type.startsWith('Assaig');
    return true;
  });

  // Helper for event image matching screenshot 3
  const getEventImage = (event: AppEvent) => {
    const t = (event.type + ' ' + event.title).toLowerCase();
    if (t.includes('concert') || t.includes('audició') || t.includes('intercanvi')) {
      return 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800&auto=format&fit=crop';
    }
    if (t.includes('cercavila') || t.includes('pregó') || t.includes('paelles') || t.includes('albaes')) {
      return 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=800&auto=format&fit=crop';
    }
    if (t.includes('ball') || t.includes('corpus') || t.includes('moma')) {
      return 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=800&auto=format&fit=crop';
    }
    if (t.includes('processó') || t.includes('crist') || t.includes('carme')) {
      return 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?q=80&w=800&auto=format&fit=crop';
    }
    return 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?q=80&w=800&auto=format&fit=crop';
  };

  // Find next rehearsal & performance
  const nextRehearsal = upcomingEvents.find(e => e.type === 'Assaig' || e.type.startsWith('Assaig'));
  const nextPerformance = upcomingEvents.find(e => e.type !== 'Assaig' && !e.type.startsWith('Assaig'));

  // Calculate my attendance stats
  const pastAttCount = pastEvents.filter(e => {
    const att = allAttendances[e.id]?.[user.uid];
    return att?.status === 'Vull anar-hi';
  }).length;
  const attendanceRate = pastEvents.length > 0 ? Math.round((pastAttCount / pastEvents.length) * 100) : 100;

  // Calculate each member's total performances (actuacions realitzades)
  const memberActCounts: Record<string, number> = useMemo(() => {
    const counts: Record<string, number> = {};
    const nowTime = new Date().getTime();
    events
      .filter(e => new Date(e.date).getTime() < nowTime && !e.type.startsWith('Assaig') && !e.is_cancelled)
      .forEach(e => {
        const atts = allAttendances[e.id] || {};
        Object.keys(atts).forEach(uid => {
          if (atts[uid].convocat || atts[uid].attended) {
            counts[uid] = (counts[uid] || 0) + 1;
          }
        });
      });
    return counts;
  }, [events, allAttendances]);

  return (
    <div className="space-y-8">
      
      {/* Top Filter Buttons (Captura 4) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-stone-100/80 p-1 rounded-2xl border border-stone-200/60 w-fit">
          <button
            onClick={() => setEventTypeFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              eventTypeFilter === 'all' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            Tots els Actes
          </button>
          <button
            onClick={() => setEventTypeFilter('actuacions')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              eventTypeFilter === 'actuacions' ? 'bg-[#c2410c] text-white shadow-sm shadow-[#c2410c]/20' : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            Actuacions
          </button>
          <button
            onClick={() => setEventTypeFilter('assajos')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              eventTypeFilter === 'assajos' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            Assajos
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Upcoming vs Past Toggle */}
          <div className="flex items-center gap-1 bg-white border border-stone-200 p-1 rounded-2xl">
            <button 
              onClick={() => setActiveTab('upcoming')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === 'upcoming' ? 'bg-stone-100 text-stone-900' : 'text-stone-400 hover:text-stone-700'
              }`}
            >
              Pròxims
            </button>
            <button 
              onClick={() => setActiveTab('past')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === 'past' ? 'bg-stone-100 text-stone-900' : 'text-stone-400 hover:text-stone-700'
              }`}
            >
              Passats
            </button>
          </div>

          {user.role === 'admin' && (
            <button 
              onClick={() => setIsAdding(true)}
              className="px-4 py-2.5 bg-[#c2410c] text-white font-bold rounded-2xl hover:bg-[#9a3412] transition-all flex items-center gap-1.5 text-xs shadow-sm shadow-[#c2410c]/20"
            >
              <Plus size={16} /> Nou Esdeveniment
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Left Event Cards + Right Widgets (Captures 3 i 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Event Cards */}
        <div className="lg:col-span-8 space-y-6">
          <div>
            <h2 className="text-2xl font-black text-stone-900 tracking-tight">Pròximes Actuacions</h2>
            <p className="text-xs text-stone-500 font-medium mt-0.5">
              Confirma la teua disponibilitat per a quadrar les plantilles de la colla.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#c2410c]/20 border-t-[#c2410c]"></div>
            </div>
          ) : displayedEvents.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-stone-200/70 p-8 space-y-2">
              <CalendarIcon size={36} className="mx-auto text-stone-300" />
              <p className="font-bold text-stone-700">No hi ha esdeveniments en aquesta secció.</p>
              <p className="text-xs text-stone-400">Canvia els filtres o revisa la pestanya d'esdeveniments passats.</p>
            </div>
          ) : (
            displayedEvents.map(event => {
              const eventAtts = allAttendances[event.id] || {};
              const myAttendance = eventAtts[user.uid]?.status;
              const amIConvocat = eventAtts[user.uid]?.convocat;
              const confirmedCount = users.filter(u => eventAtts[u.uid]?.status === 'Vull anar-hi').length;
              const declinedCount = users.filter(u => eventAtts[u.uid]?.status === 'No puc').length;
              
              const totalSlots = (event.slots_dolcaina || 0) + (event.slots_tabal || 0);
              const isFull = totalSlots > 0 && confirmedCount >= totalSlots;
              const remainingSlots = totalSlots > 0 ? totalSlots - confirmedCount : 0;

              const isPast = new Date(event.date) < now;
              const convocats = users.filter(u => {
                const att = eventAtts[u.uid];
                return att?.convocat || (att as any)?.attended;
              });
              const confirmedAttendees = users.filter(u => eventAtts[u.uid]?.status === 'Vull anar-hi');
              const musiciansToDisplay = convocats.length > 0 ? convocats : confirmedAttendees;
              const dolcainesList = musiciansToDisplay.filter(m => (m.instrument || '').toLowerCase().includes('dolçaina'));
              const tabalsList = musiciansToDisplay.filter(m => (m.instrument || '').toLowerCase().includes('tabal'));
              const othersList = musiciansToDisplay.filter(m => !(m.instrument || '').toLowerCase().includes('dolçaina') && !(m.instrument || '').toLowerCase().includes('tabal'));

              return (
                <div 
                  key={event.id} 
                  className="bg-white rounded-3xl overflow-hidden border border-stone-200/80 shadow-sm card-warm card-warm-hover flex flex-col"
                >
                  {/* Photo Header with Image (Captura 3) */}
                  <div 
                    className="relative h-48 sm:h-56 w-full overflow-hidden bg-stone-900 cursor-pointer"
                    onClick={() => setViewingEvent(event)}
                  >
                    <img 
                      src={getEventImage(event)} 
                      alt={event.title}
                      className="w-full h-full object-cover opacity-90 hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-900/80 via-stone-900/20 to-transparent"></div>

                    {/* Date Badge Float Bottom-Left */}
                    <div className="absolute bottom-4 left-4 flex items-center gap-2">
                      <span className="px-3.5 py-1.5 bg-black/60 backdrop-blur-md text-white text-xs font-black uppercase tracking-wider rounded-xl border border-white/20 shadow-sm">
                        {formatDate(event.date)}
                      </span>
                    </div>

                    {/* Status Badge Float Top-Right */}
                    <div className="absolute top-4 right-4">
                      {event.is_cancelled ? (
                        <span className="px-3 py-1 bg-red-600 text-white text-[10px] font-black uppercase tracking-wider rounded-full shadow-md">
                          🚫 Cancel·lat
                        </span>
                      ) : myAttendance === 'Vull anar-hi' ? (
                        <span className="px-3.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-black uppercase tracking-wider rounded-full flex items-center gap-1 shadow-sm">
                          <CheckCircle size={12} className="text-emerald-600" /> {amIConvocat ? 'Convocat' : 'Inscrit'}
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-stone-100/90 text-stone-700 text-[10px] font-black uppercase tracking-wider rounded-full shadow-sm">
                          Pendent
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="tag-badge bg-orange-50 text-[#c2410c] border border-orange-100">
                          {event.type}
                        </span>
                        {event.requires_experienced && (
                          <span className="tag-badge bg-amber-100/90 text-amber-900 border border-amber-300 flex items-center gap-1 font-black">
                            ⭐ Nivell Experimentat
                          </span>
                        )}
                        {event.notes && (
                          <span className="text-[10px] text-stone-400 font-medium truncate max-w-xs">
                            {event.notes}
                          </span>
                        )}
                      </div>
                      <h3 
                        onClick={() => setViewingEvent(event)}
                        className="text-xl font-black text-stone-900 tracking-tight cursor-pointer hover:text-[#c2410c] transition-colors"
                      >
                        {event.title}
                      </h3>
                      {event.location && (
                        <div className="flex items-center gap-1.5 text-xs text-stone-500 font-semibold mt-1">
                          <MapPin size={14} className="text-[#c2410c]" />
                          <span>{event.location}</span>
                        </div>
                      )}
                    </div>

                    {/* Plantilla Requirements Info (Captura 4) */}
                    <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/60 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-stone-700 font-bold">
                        <Users size={15} className="text-[#c2410c]" />
                        <span>
                          Plantilla: {event.slots_dolcaina !== null && event.slots_dolcaina !== undefined ? `${event.slots_dolcaina} dolçaines, ${event.slots_tabal || 0} tabals` : 'Tota la colla'}
                        </span>
                      </div>
                      {event.slots_dolcaina ? (
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          isFull 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {isFull ? 'Complet' : `Falten ${remainingSlots}`}
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-stone-200/70 text-stone-700">
                          General
                        </span>
                      )}
                    </div>

                    {/* Músics que han actuat / Convocats */}
                    {event.type !== 'Assaig' && !event.type.startsWith('Assaig') && (
                      <div className="p-4 bg-stone-50/90 rounded-2xl border border-stone-200/70 space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 font-black text-stone-800 uppercase tracking-wider text-[11px]">
                            <Users size={14} className="text-[#c2410c]" />
                            <span>{isPast ? 'Músics que van actuar' : 'Músics convocats'}</span>
                            <span className="px-2 py-0.5 rounded-full bg-stone-200/80 text-stone-700 text-[10px] font-black">
                              {musiciansToDisplay.length}
                            </span>
                          </div>
                          <button
                            onClick={() => setViewingEvent(event)}
                            className="text-[11px] font-bold text-[#c2410c] hover:underline flex items-center gap-1"
                          >
                            Fitxa completa <ExternalLink size={11} />
                          </button>
                        </div>

                        {musiciansToDisplay.length === 0 ? (
                          <p className="text-xs text-stone-400 italic">
                            {isPast ? 'No hi ha registre de participants per a este acte.' : 'Convocatòria pendent de publicar.'}
                          </p>
                        ) : (
                          <div className="space-y-2 text-xs">
                            {dolcainesList.length > 0 && (
                              <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-orange-950 block mb-1">
                                  🎺 Dolçaines ({dolcainesList.length}):
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {dolcainesList.map(m => (
                                    <span
                                      key={m.uid}
                                      title={`${m.name} · ${memberActCounts[m.uid] || 0} actuacions realitzades${m.is_experienced ? ' · Músic experimentat' : ''}`}
                                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-colors ${
                                        m.is_experienced 
                                          ? 'bg-amber-50 text-amber-900 border-amber-200/80 shadow-xs' 
                                          : 'bg-white text-stone-700 border-stone-200'
                                      }`}
                                    >
                                      {m.name.split(' ')[0]} {m.name.split(' ')[1] ? `${m.name.split(' ')[1][0]}.` : ''}
                                      {m.is_experienced && <span className="text-amber-600 text-[10px]">⭐</span>}
                                      <span className="text-[10px] text-stone-400 font-semibold">({memberActCounts[m.uid] || 0})</span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {tabalsList.length > 0 && (
                              <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-blue-950 block mb-1">
                                  🥁 Tabals ({tabalsList.length}):
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {tabalsList.map(m => (
                                    <span
                                      key={m.uid}
                                      title={`${m.name} · ${memberActCounts[m.uid] || 0} actuacions realitzades${m.is_experienced ? ' · Músic experimentat' : ''}`}
                                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-colors ${
                                        m.is_experienced 
                                          ? 'bg-amber-50 text-amber-900 border-amber-200/80 shadow-xs' 
                                          : 'bg-white text-stone-700 border-stone-200'
                                      }`}
                                    >
                                      {m.name.split(' ')[0]} {m.name.split(' ')[1] ? `${m.name.split(' ')[1][0]}.` : ''}
                                      {m.is_experienced && <span className="text-amber-600 text-[10px]">⭐</span>}
                                      <span className="text-[10px] text-stone-400 font-semibold">({memberActCounts[m.uid] || 0})</span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {othersList.length > 0 && (
                              <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-stone-500 block mb-1">
                                  Altres ({othersList.length}):
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {othersList.map(m => (
                                    <span
                                      key={m.uid}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-white text-stone-700 border border-stone-200"
                                    >
                                      {m.name.split(' ')[0]}
                                      <span className="text-[10px] text-stone-400">({memberActCounts[m.uid] || 0})</span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Button & Admin Tools */}
                    <div className="pt-2 flex items-center justify-between gap-3">
                      <div className="flex-1">
                        {!event.is_cancelled ? (
                          myAttendance === 'Vull anar-hi' ? (
                            <button
                              onClick={() => handleAttendance(event.id, 'No puc')}
                              className="w-full py-3.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-black uppercase tracking-wider rounded-2xl transition-all"
                            >
                              Modifica assistència
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAttendance(event.id, 'Vull anar-hi')}
                              className="w-full py-3.5 bg-[#c2410c] hover:bg-[#9a3412] text-white text-xs font-black uppercase tracking-wider rounded-2xl transition-all shadow-md shadow-[#c2410c]/20"
                            >
                              Vull anar-hi
                            </button>
                          )
                        ) : (
                          <span className="block text-center text-xs font-bold text-red-600 py-2">
                            Actuació cancel·lada
                          </span>
                        )}
                      </div>

                      {user.role === 'admin' && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(event)}
                            className="p-3 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-all"
                            title="Editar"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(event.id)}
                            className="p-3 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Widgets (Captura 4) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Widget 1: Pròxim Assaig General Obligatori */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-sm card-warm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#c2410c]">Pròxim Assaig General</span>
              <span className="px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200/60 text-[9px] font-black uppercase rounded-full">
                Obligatori
              </span>
            </div>
            <div>
              <h4 className="text-base font-black text-stone-900 tracking-tight">
                {nextRehearsal ? nextRehearsal.title : 'Preparació Repertori Setmanal'}
              </h4>
              <p className="text-xs text-stone-500 font-medium mt-1 leading-relaxed">
                Repàs de les peces clau: Muixeranga, Processó d'Algemesí i pasdobles de carrer.
              </p>
            </div>
            <div className="space-y-1.5 text-xs font-semibold text-stone-600 pt-1">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-[#c2410c]" />
                <span>{nextRehearsal ? formatDate(nextRehearsal.date) : 'Dijous · 18:30h - 21:30h'}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-[#c2410c]" />
                <span>{nextRehearsal?.location || 'Local de la Colla, Carrer Major'}</span>
              </div>
            </div>
            <button
              onClick={() => {
                if (nextRehearsal) handleAttendance(nextRehearsal.id, 'Vull anar-hi');
                else alert("Assistència a l'assaig registrada.");
              }}
              className="w-full py-3 bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-800 font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle size={14} className="text-emerald-600" /> Confirmar presència a l'assaig
            </button>
          </div>

          {/* Widget 2: El meu resum d'actes */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-sm card-warm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">El meu resum d'actes</span>
              </div>
              <span className="px-2.5 py-0.5 bg-orange-50 text-orange-800 text-[9px] font-black uppercase rounded-full">
                Temporada 2026
              </span>
            </div>

            <div className="p-4 bg-stone-50/80 border border-stone-200/60 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-stone-400">Taxa d'assistència</p>
                  <p className="text-3xl font-black text-stone-900 tracking-tight">{attendanceRate}%</p>
                </div>
                <div className="w-14 h-14 rounded-full border-4 border-[#c2410c] flex items-center justify-center font-black text-xs text-stone-800">
                  {pastAttCount}/{pastEvents.length || 1}
                </div>
              </div>
              <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
                <div className="h-full bg-[#c2410c] rounded-full" style={{ width: `${attendanceRate}%` }}></div>
              </div>
              <p className="text-[11px] text-stone-500 font-medium leading-relaxed">
                {attendanceRate >= 50 
                  ? 'Molt bona participació! Complixes el mínim per a les festes majors.' 
                  : 'Recorda confirmar assistències per a mantenir una bona rotació a la colla.'}
              </p>
            </div>
          </div>

          {/* Widget 3: Uniformitat i Material */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-sm card-warm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-stone-900 font-black text-xs uppercase tracking-wider">
                <span className="w-6 h-6 rounded-lg bg-[#c2410c]/10 text-[#c2410c] flex items-center justify-center">
                  <Music size={13} />
                </span>
                <span>Uniformitat i Material</span>
              </div>
              <span className="px-2.5 py-0.5 bg-stone-100 text-stone-600 text-[9px] font-black uppercase rounded-full">
                Segons l'Acte
              </span>
            </div>

            <div className="p-3 bg-amber-50/80 border border-amber-200/70 rounded-2xl">
              <p className="text-xs text-amber-950 font-semibold leading-relaxed">
                ℹ️ La indumentària depèn de cada acte. Un dels administradors proporcionarà la informació oficial de vestuari i material necessari per a cada convocatòria.
              </p>
            </div>

            {nextPerformance && (
              <div className="p-3.5 bg-stone-50 border border-stone-200/70 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#c2410c] truncate max-w-[170px]">
                    {nextPerformance.title}
                  </span>
                  <span className="text-[9px] font-bold text-stone-400">
                    {formatDate(nextPerformance.date)}
                  </span>
                </div>
                {nextPerformance.notes ? (
                  <div className="bg-white p-2.5 rounded-xl border border-stone-200/60 text-xs text-stone-800 font-bold leading-relaxed">
                    📌 Indicació direcció: {nextPerformance.notes}
                  </div>
                ) : (
                  <p className="text-[11px] font-medium text-stone-500 italic">
                    L'administració confirmarà la indumentària exacta (camisa verda, samarreta, etc.) a la convocatòria.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2 pt-1">
              <p className="text-[10px] font-black uppercase tracking-wider text-stone-400">Material imprescindible</p>
              <ul className="space-y-1.5 text-xs font-semibold text-stone-600">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#c2410c]"></span>
                  <span>Dolçaina o tabal amb canyes de recanvi / baquetes</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#c2410c]"></span>
                  <span>Atril de carrer i particel·les plastificades</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#c2410c]"></span>
                  <span>Indumentària fixada per l'administrador per a l'acte</span>
                </li>
              </ul>
            </div>
          </div>

        </div>
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
                <div 
                  className="inline-block px-4 py-1 font-black text-[10px] uppercase tracking-[0.2em] rounded-full mb-4 border"
                  style={{ backgroundColor: getTypeColors(viewingEvent.type).bg, color: getTypeColors(viewingEvent.type).dark, borderColor: getTypeColors(viewingEvent.type).border }}
                >
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
                {viewingEvent.requires_experienced && (
                  <div className="mb-4 p-4 bg-amber-50 border-2 border-amber-200/90 rounded-2xl flex items-start gap-3 shadow-xs">
                    <span className="text-2xl mt-0.5">⭐</span>
                    <div>
                      <h4 className="font-black text-amber-900 uppercase text-xs tracking-wider mb-0.5">Acte de Nivell Avançat</h4>
                      <p className="text-amber-800 font-medium text-xs">
                        Aquesta actuació requereix el grup de músics experimentats de la colla. La proposta de rotació SWRR s'aplica exclusivament entre aquest grup.
                      </p>
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
                          const voice = userAssignments[viewingEvent.id]?.[id];
                          return (
                            <li key={id} className="flex items-center justify-between p-2 hover:bg-white rounded-lg transition-colors">
                              <div className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                                <FileText size={14} className="text-[#d44211]" />
                                {song?.title || 'Cançó desconeguda'}
                              </div>
                              {voice && (
                                <span className="px-3 py-1 bg-white border border-[#d44211]/20 text-[#d44211] text-[10px] font-black rounded-lg shadow-sm">
                                  Veu: {voice}
                                </span>
                              )}
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

              {/* Convocats / Participants Section */}
              {(() => {
                const isPastModal = new Date(viewingEvent.date) < new Date();
                const modalConvocats = users.filter(u => {
                  const att = allAttendances[viewingEvent.id]?.[u.uid];
                  return att?.convocat || (att as any)?.attended;
                });
                const confirmedOnly = users.filter(u => allAttendances[viewingEvent.id]?.[u.uid]?.status === 'Vull anar-hi');
                const listToShow = modalConvocats.length > 0 ? modalConvocats : confirmedOnly;
                const dolcs = listToShow.filter(u => (u.instrument || '').toLowerCase().includes('dolçaina'));
                const tabs = listToShow.filter(u => (u.instrument || '').toLowerCase().includes('tabal'));
                const others = listToShow.filter(u => !(u.instrument || '').toLowerCase().includes('dolçaina') && !(u.instrument || '').toLowerCase().includes('tabal'));

                return (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                          <Users size={20} className="text-[#d44211]" />
                          {isPastModal ? 'Plantilla que va actuar' : 'Llista de Convocats'} ({listToShow.length})
                        </h3>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          Qui ha fet eixe acte i el còmput total d'actuacions acumulades
                        </p>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                      {listToShow.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-sm italic">
                          Encara no hi ha cap músic confirmat o convocat per a aquest acte.
                        </div>
                      ) : (
                        <>
                          {dolcs.length > 0 && (
                            <div className="bg-orange-50/40 p-3 text-[11px] font-black uppercase tracking-wider text-orange-900 border-b border-orange-100 flex items-center justify-between">
                              <span>🎺 Dolçaines ({dolcs.length})</span>
                              <span className="text-[10px] text-stone-400 font-semibold lowercase">còmput d'actes</span>
                            </div>
                          )}
                          {dolcs.map(u => (
                            <div key={u.uid} className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-orange-100 text-primary font-black text-xs flex items-center justify-center">
                                  {u.name.charAt(0)}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-sm text-slate-900">{u.name}</span>
                                    {u.is_experienced && (
                                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-200/80" title="Músic Experimentat">
                                        ⭐ Experimentat
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs text-slate-400">{u.instrument || 'Dolçaina'}</span>
                                </div>
                              </div>
                              <span className="px-3 py-1 bg-stone-100 text-stone-700 text-xs font-black rounded-xl border border-stone-200/60" title="Total d'actuacions realitzades esta temporada">
                                🏆 {memberActCounts[u.uid] || 0} actes
                              </span>
                            </div>
                          ))}

                          {tabs.length > 0 && (
                            <div className="bg-blue-50/40 p-3 text-[11px] font-black uppercase tracking-wider text-blue-900 border-t border-b border-blue-100 flex items-center justify-between">
                              <span>🥁 Tabals i Percussió ({tabs.length})</span>
                              <span className="text-[10px] text-stone-400 font-semibold lowercase">còmput d'actes</span>
                            </div>
                          )}
                          {tabs.map(u => (
                            <div key={u.uid} className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center">
                                  {u.name.charAt(0)}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-sm text-slate-900">{u.name}</span>
                                    {u.is_experienced && (
                                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-200/80" title="Músic Experimentat">
                                        ⭐ Experimentat
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs text-slate-400">{u.instrument || 'Tabal'}</span>
                                </div>
                              </div>
                              <span className="px-3 py-1 bg-stone-100 text-stone-700 text-xs font-black rounded-xl border border-stone-200/60" title="Total d'actuacions realitzades esta temporada">
                                🏆 {memberActCounts[u.uid] || 0} actes
                              </span>
                            </div>
                          ))}

                          {others.length > 0 && (
                            <div className="bg-slate-50 p-3 text-[11px] font-black uppercase tracking-wider text-slate-700 border-t border-b border-slate-200 flex items-center justify-between">
                              <span>Altres ({others.length})</span>
                              <span className="text-[10px] text-stone-400 font-semibold lowercase">còmput d'actes</span>
                            </div>
                          )}
                          {others.map(u => (
                            <div key={u.uid} className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors">
                              <span className="font-bold text-sm text-slate-900">{u.name}</span>
                              <span className="px-3 py-1 bg-stone-100 text-stone-700 text-xs font-black rounded-xl border border-stone-200/60">
                                🏆 {memberActCounts[u.uid] || 0} actes
                              </span>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}
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
                {newEvent.type === 'Actuació' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Dolçaines necessàries</label>
                        <input type="number" min="1" value={newEvent.slots_dolcaina} onChange={e => setNewEvent({...newEvent, slots_dolcaina: e.target.value === '' ? '' : Number(e.target.value)})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-[#d44211] focus:border-[#d44211]" placeholder="Tots" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Tabals necessaris</label>
                        <input type="number" min="1" value={newEvent.slots_tabal} onChange={e => setNewEvent({...newEvent, slots_tabal: e.target.value === '' ? '' : Number(e.target.value)})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-[#d44211] focus:border-[#d44211]" placeholder="Tots" />
                      </div>
                    </div>
                    <div className="p-4 bg-amber-50/70 border border-amber-200/90 rounded-2xl flex items-start gap-3">
                      <input 
                        type="checkbox" 
                        id="requires_experienced"
                        checked={newEvent.requires_experienced}
                        onChange={e => setNewEvent({...newEvent, requires_experienced: e.target.checked})}
                        className="mt-1 w-4 h-4 text-[#c2410c] rounded focus:ring-[#c2410c] cursor-pointer"
                      />
                      <label htmlFor="requires_experienced" className="text-xs font-bold text-stone-900 cursor-pointer">
                        ⭐ Requereix músics experimentats (Nivell Avançat)
                        <span className="block text-[11px] text-stone-500 font-medium mt-0.5">
                          Activa aquesta opció si l'acte requereix el nivell de la gent més experimentada. La rotació automàtica SWRR triarà exclusivament membres d'aquest grup.
                        </span>
                      </label>
                    </div>
                  </>
                )}
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
