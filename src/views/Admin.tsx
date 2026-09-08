import React, { useState, useEffect } from 'react';
import { ChevronDown, CheckCircle, MoreVertical, Calendar, Users, Archive, Pencil, X, Bell, Shield, Music, Trash2, Save, AlertTriangle, PieChart, Plus, ShoppingBag, FileText, Package, Utensils, ArrowLeft, Download, RotateCcw, Sparkles, MessageCircle, Clock, Search, MapPin } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { UserData } from '../App';

interface AdminProps {
  user: UserData;
  setView: (view: any) => void;
  setSelectedEventId: (id: number) => void;
}

interface AppEvent {
  id: number;
  title: string;
  date: string;
  type: string;
  ispublished?: boolean;
}

interface Member {
  uid: string;
  name: string;
  email: string;
  role: string;
  instrument: string;
  avatar: string;
}

type AdminTab = 'convocatories' | 'musics' | 'veus' | 'alertes' | 'enquestes';

// ─── Notify Modal ────────────────────────────────────────────────────────────
function NotifyModal({ member, onClose }: { member: Member; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) return;
    setSending(true);
    try {
      const { error } = await supabase.from('notifications').insert([{
        userid: member.uid,
        title: title.trim(),
        message: message.trim(),
        read: false,
        createdat: new Date().toISOString(),
        send_email: sendEmail,
      }]);
      if (error) throw error;
      onClose();
    } catch (err) {
      console.error('Error sending notification:', err);
      alert("Error en enviar la notificació.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Bell size={20} />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-sm">Enviar notificació</h3>
              <p className="text-xs text-slate-400 font-medium">Per a {member.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">Títol</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Recordatori assaig"
              className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">Missatge</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Escriu el missatge aquí..."
              rows={4}
              className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary resize-none"
            />
          </div>
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <input
              type="checkbox"
              id="sendEmail"
              checked={sendEmail}
              onChange={e => setSendEmail(e.target.checked)}
              className="w-5 h-5 rounded-lg border-2 border-slate-200 text-primary focus:ring-primary cursor-pointer transition-all"
            />
            <label htmlFor="sendEmail" className="text-xs font-bold text-slate-600 cursor-pointer select-none">
              Enviar també per correu electrònic
            </label>
          </div>
        </div>
        <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
            Cancel·lar
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !title.trim() || !message.trim()}
            className="px-6 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Bell size={16} /> {sending ? 'Enviant...' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Member Modal ──────────────────────────────────────────────────────────
function AddMemberModal({ onClose, onAdd, adding }: { onClose: () => void; onAdd: (name: string, email: string, instrument: string) => Promise<void>; adding: boolean }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [instrument, setInstrument] = useState('Sense assignar');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(name.trim(), email.trim(), instrument);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Users size={24} />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-lg tracking-tight">Afegir Músic Manual</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Registre Intern</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors bg-white w-10 h-10 rounded-xl flex items-center justify-center border border-slate-100 shadow-sm">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Nom Complet *</label>
              <input
                required
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Joan Petit"
                className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl text-sm font-bold focus:bg-white focus:border-primary focus:outline-none transition-all placeholder:text-slate-300"
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Correu (Opcional)</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Ex: joan@exemple.com"
                className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl text-sm font-bold focus:bg-white focus:border-primary focus:outline-none transition-all placeholder:text-slate-300"
              />
              <p className="text-[10px] text-slate-400 mt-2 italic px-1">Si no té correu, es generarà un identificador intern.</p>
            </div>
            
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Instrument</label>
              <select
                value={instrument}
                onChange={e => setInstrument(e.target.value)}
                className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl text-sm font-bold focus:bg-white focus:border-primary focus:outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="Sense assignar">Sense assignar</option>
                <option value="Dolçaina">Dolçaina</option>
                <option value="Tabal">Tabal</option>
              </select>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-8 py-4 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all font-sans"
            >
              Cancel·lar
            </button>
            <button
              type="submit"
              disabled={adding || !name.trim()}
              className="flex-1 px-8 py-4 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 disabled:opacity-50 disabled:shadow-none font-sans"
            >
              {adding ? 'Afegint...' : 'Afegir Músic'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Member Card ─────────────────────────────────────────────────────────────
const MemberCard: React.FC<{
  member: Member;
  currentUser: UserData;
  onUpdate: (uid: string, field: 'instrument' | 'role', value: string) => Promise<void>;
  onDelete: (member: Member) => Promise<void>;
}> = ({ member, currentUser, onUpdate, onDelete }) => {
  const [editing, setEditing] = useState(false);
  const [localInstrument, setLocalInstrument] = useState(member.instrument);
  const [localRole, setLocalRole] = useState(member.role);
  const [saving, setSaving] = useState(false);
  const [showNotify, setShowNotify] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (localInstrument !== member.instrument) await onUpdate(member.uid, 'instrument', localInstrument);
      if (localRole !== member.role) await onUpdate(member.uid, 'role', localRole);
      setEditing(false);
    } catch (err) {
      console.error("Error saving member details:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setLocalInstrument(member.instrument);
    setLocalRole(member.role);
    setEditing(false);
  };

  const instrumentColor = (instr: string) => {
    if (instr.toLowerCase().includes('dolçaina')) return 'bg-primary/10 text-primary';
    if (instr.toLowerCase().includes('tabal')) return 'bg-blue-100 text-blue-600';
    return 'bg-slate-100 text-slate-500';
  };

  return (
    <>
      {showNotify && <NotifyModal member={member} onClose={() => setShowNotify(false)} />}
      <div className={`glass border-white/40 rounded-[2rem] p-6 flex flex-col gap-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${editing ? 'ring-2 ring-primary/30' : ''}`}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={member.avatar}
                alt={member.name}
                className="w-14 h-14 rounded-2xl object-cover shadow-md"
              />
              <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center ${member.role === 'admin' ? 'bg-primary' : 'bg-slate-300'}`}>
                {member.role === 'admin' ? <Shield size={10} className="text-white" /> : null}
              </div>
            </div>
            <div>
              <p className="font-black text-slate-900 tracking-tight text-base">{member.name}</p>
              <p className="text-xs text-slate-400 font-medium truncate max-w-[160px]">{member.email}</p>
              <span className={`mt-1 inline-block px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${member.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-400'}`}>
                {member.role === 'admin' ? 'Administrador' : 'Membre'}
              </span>
            </div>
          </div>
          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setShowNotify(true)}
              title="Enviar notificació"
              className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-300 hover:text-primary hover:bg-primary/10 transition-all"
            >
              <Bell size={16} />
            </button>
            {currentUser.uid !== member.uid && (
              <button
                onClick={() => onDelete(member)}
                title="Eliminar membre"
                className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
              >
                <Trash2 size={16} />
              </button>
            )}
            <button
              onClick={() => editing ? handleCancel() : setEditing(true)}
              title={editing ? "Cancel·lar edició" : "Editar"}
              className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all ${editing ? 'text-slate-400 hover:text-slate-600 hover:bg-slate-100' : 'text-slate-300 hover:text-blue-500 hover:bg-blue-50'}`}
            >
              {editing ? <X size={16} /> : <Pencil size={16} />}
            </button>
          </div>
        </div>

        {/* Instrument badge / editor */}
        {editing ? (
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Instrument</label>
              <select
                value={localInstrument}
                onChange={e => setLocalInstrument(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-primary bg-white"
              >
                <option value="Sense assignar">Sense assignar</option>
                <option value="Dolçaina">Dolçaina</option>
                <option value="Tabal">Tabal</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Rol</label>
              <select
                value={localRole}
                onChange={e => setLocalRole(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-primary bg-white"
              >
                <option value="member">Membre</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-2.5 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Save size={14} /> {saving ? 'Desant...' : 'Desar canvis'}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${instrumentColor(member.instrument)}`}>
              <Music size={11} />
              {member.instrument}
            </span>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Main Admin Component ─────────────────────────────────────────────────────
export default function Admin({ user, setView, setSelectedEventId }: AdminProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('convocatories');
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [selectedEventId, setLocalSelectedEventId] = useState<number | null>(null);
  
  // Helper to update both local and parent state
  const handleEventSelection = (id: number) => {
    setLocalSelectedEventId(id);
    setSelectedEventId(id);
  };
  const [members, setMembers] = useState<Member[]>([]);
  const [attendances, setAttendances] = useState<Record<string, {status: string, convocat: boolean, note?: string}>>({});
  const [dolcainaSearch, setDolcainaSearch] = useState('');
  const [dolcainaVoiceFilter, setDolcainaVoiceFilter] = useState('all');
  const [tabalSearch, setTabalSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [globalAlert, setGlobalAlert] = useState<{message: string; active: boolean; type: string}>({
    message: '',
    active: false,
    type: 'warning'
  });
  const [savingAlert, setSavingAlert] = useState(false);
  
  // Polls state
  const [adminPolls, setAdminPolls] = useState<any[]>([]);
  const [newPoll, setNewPoll] = useState({ title: '', description: '', deadline: '', options: [''], type: 'standard' });
  const [creatingPoll, setCreatingPoll] = useState(false);
  const [pollDetails, setPollDetails] = useState<{options: any[], votes: any[]}>({ options: [], votes: [] });
  const [expandedPoll, setExpandedPoll] = useState<number | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [addingMember, setAddingMember] = useState(false);

  const fetchEvents = async () => {
    const now = new Date().getTime();
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .or('type.ilike.Assaig%,type.eq.Intercanvi,type.eq.Final de curs,type.eq.Actuació')
      .gte('date', new Date(now - 86400000).toISOString())
      .order('date', { ascending: true });
    if (error) console.error("Error fetching events:", error);
    else {
      setEvents(data || []);
      if (data && data.length > 0 && !selectedEventId) {
        const nowIso = new Date().toISOString();
        const nextEvent = data.find(e => e.date >= nowIso) || data[data.length - 1];
        handleEventSelection(nextEvent.id);
      }
    }
  };

  const fetchMembers = async () => {
    const { data, error } = await supabase.from('users').select('*');
    if (error) console.error("Error fetching members:", error);
    else {
      // Filter out the superadmin from the list
      const filteredData = (data || []).filter(u => u.email !== 'syncrolattex@gmail.com');
      setMembers(filteredData.map(d => ({
        uid: d.uid,
        name: d.name,
        email: d.email || '',
        role: d.role,
        instrument: d.instrument || 'Sense assignar',
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(d.name)}&background=d44211&color=fff`
      })));
    }
  };

  const fetchAttendances = async () => {
    if (!selectedEventId) { setLoading(false); return; }
    const { data, error } = await supabase
      .from('attendances')
      .select('*')
      .eq('eventid', selectedEventId);
    if (error) console.error("Error fetching attendances:", error);
    else {
      const attendanceData: Record<string, {status: string, convocat: boolean, note?: string}> = {};
      data?.forEach(d => {
        attendanceData[d.userid] = { status: d.status, convocat: d.convocat || false, note: d.note || '' };
      });
      setAttendances(attendanceData);
    }
    setLoading(false);
  };

  const fetchGlobalAlert = async () => {
    const { data } = await supabase.from('global_alerts').select('*').eq('id', 1).single();
    if (data) setGlobalAlert(data);
  };

  const fetchAdminPolls = async () => {
    const { data } = await supabase.from('polls').select('*').order('created_at', { ascending: false });
    if (data) setAdminPolls(data);
  };
  
  const fetchPollDetails = async () => {
    try {
      const { data: oData } = await supabase.from('poll_options').select('*');
      const { data: vData } = await supabase.from('poll_votes').select('*, users(name, instrument)');
      if (oData && vData) {
        setPollDetails({ options: oData, votes: vData });
      }
    } catch (err) {
      console.error("Error fetching poll details:", err);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchMembers();
    fetchGlobalAlert();
    fetchAdminPolls();
    fetchPollDetails();
    
    const onFocus = () => {
      fetchEvents();
      fetchMembers();
      fetchGlobalAlert();
      fetchAdminPolls();
      fetchPollDetails();
    };
    window.addEventListener('app-focus', onFocus);
    
    const eventsChannel = supabase.channel('adm:events').on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, fetchEvents).subscribe();
    const usersChannel = supabase.channel('adm:users').on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, fetchMembers).subscribe();
    const pollsChannel = supabase.channel('adm:polls').on('postgres_changes', { event: '*', schema: 'public', table: 'polls' }, fetchAdminPolls).subscribe();
    const votesChannel = supabase.channel('adm:votes').on('postgres_changes', { event: '*', schema: 'public', table: 'poll_votes' }, fetchPollDetails).subscribe();
    return () => {
      window.removeEventListener('app-focus', onFocus);
      supabase.removeChannel(eventsChannel);
      supabase.removeChannel(usersChannel);
      supabase.removeChannel(pollsChannel);
      supabase.removeChannel(votesChannel);
    };
  }, []);

  const handleSaveAlert = async () => {
    setSavingAlert(true);
    try {
      const { error } = await supabase.from('global_alerts').update({
        message: globalAlert.message,
        active: globalAlert.active,
        type: globalAlert.type,
        updated_at: new Date().toISOString()
      }).eq('id', 1);
      if (error) throw error;
      alert("Avís actualitzat correctament!");
    } catch (err) {
      console.error('Error saving alert:', err);
      alert("Error en desar l'avís.");
    } finally {
      setSavingAlert(false);
    }
  };

  const handleCreatePoll = async () => {
    if (!newPoll.title.trim() || newPoll.options.filter(o => o.trim() !== '').length < 1) {
      alert("ATENCIÓ: L'enquesta necessita un títol i almenys 1 opció vàlida.");
      return;
    }
    setCreatingPoll(true);
    try {
      // 1. Create Poll
      const { data: pollData, error: pollError } = await supabase.from('polls').insert([{
        title: newPoll.title.trim(),
        description: newPoll.description.trim() || null,
        deadline: newPoll.deadline ? new Date(newPoll.deadline).toISOString() : null,
        created_by: user.uid,
        type: newPoll.type
      }]).select().single();
      
      if (pollError) throw pollError;

      // 2. Create Options
      const validOptions = newPoll.options.filter(o => o.trim() !== '').map(text => ({
        poll_id: pollData.id,
        text: text.trim()
      }));

      if (newPoll.type === 'meal') {
        validOptions.push({ poll_id: pollData.id, text: 'No vinc' });
      }
      
      const { error: optionsError } = await supabase.from('poll_options').insert(validOptions);
      if (optionsError) throw optionsError;

      alert("Enquesta creada correctament!");
      setNewPoll({ title: '', description: '', deadline: '', options: [''], type: 'standard' });
      fetchAdminPolls();
    } catch (err) {
      console.error("Error creating poll:", err);
      alert("Error en crear l'enquesta.");
    } finally {
      setCreatingPoll(false);
    }
  };

  const handleDeletePoll = async (pollId: number) => {
    if (!confirm("Vols esborrar aquesta enquesta? S'esborraran també els vots emesos.")) return;
    try {
      const { error } = await supabase.from('polls').delete().eq('id', pollId);
      if (error) throw error;
      fetchAdminPolls();
    } catch (err) {
      console.error("Error deleting poll:", err);
      alert("Error en esborrar l'enquesta.");
    }
  };

  useEffect(() => {
    setAttendances({}); // Clear stale data when switching events
    fetchAttendances();
    
    const onFocus = () => fetchAttendances();
    window.addEventListener('app-focus', onFocus);
    
    const attendancesChannel = supabase.channel('adm:attendances').on('postgres_changes', { event: '*', schema: 'public', table: 'attendances' }, fetchAttendances).subscribe();
    return () => { 
      window.removeEventListener('app-focus', onFocus);
      supabase.removeChannel(attendancesChannel); 
    };
  }, [selectedEventId]);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleAttendanceChange = async (userId: string, newStatus: string) => {
    if (!selectedEventId) return;
    try {
      const { error } = await supabase.from('attendances').upsert({
        eventid: selectedEventId, userid: userId, status: newStatus,
        convocat: attendances[userId]?.convocat || false,
        updatedat: new Date().toISOString()
      }, { onConflict: 'eventid, userid' });
      if (error) throw error;
    } catch (error) { console.error("Error updating attendance:", error); }
  };

  const handleConvocatChange = async (userId: string, convocat: boolean) => {
    if (!selectedEventId) return;
    // Optimistic update
    setAttendances(prev => ({
      ...prev,
      [userId]: {
        ...(prev[userId] || { status: 'Pendent', note: '' }),
        convocat
      }
    }));
    try {
      const { error } = await supabase.from('attendances').upsert({
        eventid: selectedEventId, userid: userId,
        status: attendances[userId]?.status || 'Pendent',
        convocat, updatedat: new Date().toISOString()
      }, { onConflict: 'eventid, userid' });
      if (error) throw error;
    } catch (error) { 
      console.error("Error updating convocat:", error);
      fetchAttendances();
    }
  };

  const handleNoteChange = async (userId: string, note: string) => {
    if (!selectedEventId) return;
    setAttendances(prev => ({
      ...prev,
      [userId]: {
        ...(prev[userId] || { status: 'Pendent', convocat: false }),
        note
      }
    }));
    try {
      const { error } = await supabase.from('attendances').upsert({
        eventid: selectedEventId,
        userid: userId,
        status: attendances[userId]?.status || 'Pendent',
        convocat: attendances[userId]?.convocat || false,
        note,
        updatedat: new Date().toISOString()
      }, { onConflict: 'eventid, userid' });
      if (error) throw error;
    } catch (err) {
      console.error("Error saving note:", err);
    }
  };

  // handleWhatsAppShare and handleExportList are defined after combinedData (see below)

  // --- Lineup Generation Logic ---
  const [showLineupModal, setShowLineupModal] = useState(false);
  const [generatingLineup, setGeneratingLineup] = useState(false);
  const [proposedLineup, setProposedLineup] = useState<{user_id: string, name: string, instrument: string, score: number, peso_acumulado: number}[]>([]);
  const [manualLineupEdits, setManualLineupEdits] = useState<Record<string, boolean>>({});

  const handleGenerateLineup = async () => {
    if (!selectedEventId) return;
    const ev = events.find(e => e.id === selectedEventId);
    if (!ev || ev.type !== 'Actuació') {
      alert("La generació automàtica només està disponible per a Actuacions.");
      return;
    }

    setGeneratingLineup(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-lineup', {
        body: { event_id: selectedEventId }
      });
      if (error) throw error;
      setProposedLineup(data || []);
      const initialEdits: Record<string, boolean> = {};
      (data || []).forEach((u: any) => initialEdits[u.user_id] = true);
      setManualLineupEdits(initialEdits);
      setShowLineupModal(true);
    } catch (err) {
      console.error("Error generating lineup:", err);
      alert("Error en generar la proposta. Assegura't que la funció està desplegada.");
    } finally {
      setGeneratingLineup(false);
    }
  };

  const confirmLineup = async () => {
    if (!selectedEventId) return;
    try {
      const toConvocate = Object.keys(manualLineupEdits).filter(uid => manualLineupEdits[uid]);
      for (const uid of toConvocate) {
        await supabase.from('attendances').upsert({
          eventid: selectedEventId,
          userid: uid,
          status: attendances[uid]?.status || 'Pendent',
          convocat: true,
          updatedat: new Date().toISOString()
        }, { onConflict: 'eventid, userid' });
      }
      setShowLineupModal(false);
      alert("Convocatòria aplicada correctament.");
    } catch (err) {
      console.error("Error applying lineup:", err);
      alert("Error en aplicar la convocatòria.");
    }
  };

  const handlePublish = async () => {
    if (!selectedEventId) return;
    try {
      const { error: eventError } = await supabase.from('events').update({ ispublished: true }).eq('id', selectedEventId);
      if (eventError) throw eventError;
      const event = events.find(e => e.id === selectedEventId);
      const eventTitle = event?.title || event?.type || 'Esdeveniment';
      const eventDate = event ? new Date(event.date).toLocaleString('ca-ES', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : '';
      const notifications = combinedData.filter(m => m.convocat).map(m => ({
        userid: m.uid,
        title: `Convocatoria: ${eventTitle}`,
        message: `Has estat convocat per a l'actuacio "${eventTitle}" el dia ${eventDate}. Revisa el calendari per a mes detalls.`,
        read: false, createdat: new Date().toISOString(), link: 'calendar', eventid: selectedEventId,
        send_email: true
      }));
      if (notifications.length > 0) {
        console.log("Sending email notifications to:", notifications.length, "musicians");
        const { error: notifError } = await supabase.from('notifications').insert(notifications);
        if (notifError) throw notifError;
      }
      alert(`S'ha publicat la llista i s'estan enviant ${notifications.length} correus de notificació.`);
    } catch (error) { console.error("Error publishing event:", error); alert("Error en publicar la llista."); }
  };

  const handleUpdateMember = async (uid: string, field: 'instrument' | 'role', value: string) => {
    try {
      const { error } = await supabase.from('users').update({ [field]: value }).eq('uid', uid);
      if (error) throw error;
      await fetchMembers();
    } catch (error) {
      console.error("Error updating member:", error);
      alert("Error en actualitzar el membre.");
    }
  };

  const handleDeleteMember = async (member: Member) => {
    if (!confirm(`Estàs segur que vols eliminar ${member.name} de la colla? Aquesta acció no es pot desfer.`)) return;
    try {
      // Delete attendances first to avoid FK issues
      await supabase.from('attendances').delete().eq('userid', member.uid);
      await supabase.from('notifications').delete().eq('userid', member.uid);
      const { error } = await supabase.from('users').delete().eq('uid', member.uid);
      if (error) throw error;
      await fetchMembers();
    } catch (error) {
      console.error("Error deleting member:", error);
      alert("Error en eliminar el membre.");
    }
  };

  const sendNotificationToAll = async () => {
    const title = prompt("Títol de la notificació per a tots els membres:");
    if (!title) return;
    const message = prompt("Missatge:");
    if (!message) return;
    const sendViaEmail = confirm("Vols enviar també aquesta notificació per correu electrònic a tots els membres?");
    try {
      const notifications = members.map(m => ({
        userid: m.uid, title, message, read: false, createdat: new Date().toISOString(),
        send_email: sendViaEmail
      }));
      const { error } = await supabase.from('notifications').insert(notifications);
      if (error) throw error;
      alert(`Notificació enviada a ${members.length} membres.`);
    } catch (error) {
      console.error("Error sending notifications:", error);
      alert("Error en enviar les notificacions.");
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Intl.DateTimeFormat('ca-ES', { day: 'numeric', month: 'short' }).format(new Date(dateString));
  };

  const handleAddMember = async (name: string, email: string, instrument: string) => {
    setAddingMember(true);
    try {
      // Use a more robust unique ID for manual users
      const manualId = `man-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`;
      
      const { error } = await supabase.from('users').insert([{
        uid: manualId,
        name: name,
        email: email || `${manualId}@manual-entry.colla`,
        instrument,
        role: 'member'
      }]);

      if (error) throw error;
      
      await fetchMembers();
      setShowAddMember(false);
      alert(`${name} ha estat afegit correctament.`);
    } catch (error: any) {
      console.error("Error adding member:", error);
      alert(`Error en afegir el membre: ${error.message || 'Error desconegut'}`);
    } finally {
      setAddingMember(false);
    }
  };

  const combinedData = members.map(m => ({
    ...m,
    status: attendances[m.uid]?.status || 'Pendent',
    convocat: attendances[m.uid]?.convocat || false,
    note: attendances[m.uid]?.note || ''
  })).sort((a, b) => {
    const order: Record<string, number> = { 'Vull anar-hi': 0, 'Pendent': 1, 'No puc': 2 };
    return (order[a.status] ?? 3) - (order[b.status] ?? 3);
  });

  const confirmedMusiciansCount = combinedData.filter(m => m.status === 'Vull anar-hi').length;
  const pendingMusiciansCount = combinedData.filter(m => m.status === 'Pendent').length;
  const noStayMusiciansCount = combinedData.filter(m => m.status === 'No puc').length;
  const totalConvocats = combinedData.filter(m => m.convocat).length;
  const dolcaines = combinedData.filter(m => m.convocat && m.instrument.toLowerCase().includes('dolçaina')).length;
  const tabals = combinedData.filter(m => m.convocat && m.instrument.toLowerCase().includes('tabal')).length;
  const percussio = combinedData.filter(m => m.convocat && !m.instrument.toLowerCase().includes('dolçaina') && !m.instrument.toLowerCase().includes('tabal')).length;
  const selectedEvent = events.find(e => e.id === selectedEventId);

  // Members tab stats
  const totalMembers = members.length;
  const totalAdmins = members.filter(m => m.role === 'admin').length;
  const totalDolcaines = members.filter(m => m.instrument.toLowerCase().includes('dolçaina')).length;
  const totalTabals = members.filter(m => m.instrument.toLowerCase().includes('tabal')).length;

  const filteredMembers = members.filter(m =>
    m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
    m.email.toLowerCase().includes(memberSearch.toLowerCase()) ||
    m.instrument.toLowerCase().includes(memberSearch.toLowerCase())
  );

  // Handlers that reference combinedData — defined here, AFTER combinedData
  const handleWhatsAppShare = () => {
    if (!selectedEvent) return;
    const eventDate = new Date(selectedEvent.date).toLocaleDateString('ca-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    const confirmed = combinedData.filter(m => m.convocat);
    const msg = `📢 *CONTROL DE PLANTILLA D'ACTUACIÓ - COLLA GUIRIGALL* 📢\n\n🗓️ *${selectedEvent.title}*\n📅 ${eventDate}\n\n*MÚSICS CONVOCATS (${confirmed.length}):*\n` +
      confirmed.map((m) => `• ${m.name} (${m.instrument})`).join('\n') +
      `\n\nReviseu l'aplicació per a més detalls! 🎺🥁`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleExportList = () => {
    if (!selectedEvent) return;
    const confirmed = combinedData.filter(m => m.convocat);
    const dolcs = confirmed.filter(m => m.instrument.toLowerCase().includes('dolçaina'));
    const tabs = confirmed.filter(m => !m.instrument.toLowerCase().includes('dolçaina'));
    let content = `PLANTILLA D'ACTUACIÓ - COLLA GUIRIGALL\n`;
    content += `Actuació: ${selectedEvent.title}\nData: ${new Date(selectedEvent.date).toLocaleString('ca-ES')}\n\n`;
    content += `DOLÇAINES (${dolcs.length}):\n` + dolcs.map((m, i) => `${i + 1}. ${m.name} - ${m.instrument} ${m.note ? `[${m.note}]` : ''}`).join('\n') + '\n\n';
    content += `TABALS I PERCUSSIÓ (${tabs.length}):\n` + tabs.map((m, i) => `${i + 1}. ${m.name} - ${m.instrument} ${m.note ? `[${m.note}]` : ''}`).join('\n') + '\n';
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Plantilla_${selectedEvent.title.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Nav items ─────────────────────────────────────────────────────────────
  const navItems = [
    { id: 'convocatories' as AdminTab, label: 'Convocatòries', icon: Calendar },
    { id: 'musics' as AdminTab, label: 'Músics', icon: Users },
    { id: 'alertes' as AdminTab, label: 'Alertes', icon: Bell },
    { id: 'enquestes' as AdminTab, label: 'Enquestes', icon: PieChart },
  ];

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-60px)]">
      {/* ── SIDEBAR (desktop) ─────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-64 xl:w-72 bg-white border-r border-stone-200/80 min-h-full shrink-0">
        <div className="p-6 border-b border-stone-100">
          <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-3">
            <Users size={20} strokeWidth={2.5} />
          </div>
          <h1 className="text-xl font-black text-stone-900 tracking-tight">Panell d'<span className="text-primary">Admin</span></h1>
          <p className="text-stone-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">Gestió de la Colla</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs transition-all ${
                  isActive
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'text-stone-500 hover:text-primary hover:bg-primary/5'
                }`}
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </button>
            );
          })}
          <button
            onClick={() => { setSelectedEventId(0); setView('matrix'); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs transition-all text-stone-500 hover:text-primary hover:bg-primary/5"
          >
            <Music size={17} />
            <span>Matriu de Veus</span>
          </button>
        </nav>

        <div className="p-4 border-t border-stone-100">
          <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary font-black text-xs flex items-center justify-center border border-primary/20">
              {user.name[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-stone-900 truncate">{user.name}</p>
              <p className="text-[10px] font-bold text-stone-400 uppercase">Administrador</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── MOBILE TAB BAR ────────────────────────────────────────── */}
      <div className="lg:hidden flex items-center gap-1 overflow-x-auto px-4 py-3 bg-white border-b border-stone-200/80">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs whitespace-nowrap shrink-0 transition-all ${
                isActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-stone-500 bg-stone-100/80 hover:text-primary'
              }`}
            >
              <Icon size={15} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── MAIN CONTENT ──────────────────────────────────────────── */}
      <div className="flex-1 p-6 lg:p-10 flex flex-col gap-10 pb-32 lg:pb-10 overflow-y-auto min-w-0">

        {/* ── ALERTS TAB ───────────────────────────────────────────────────────── */}
        {activeTab === 'alertes' && (
          <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-2">
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">Avís <span className="text-gradient">Global</span></h2>
              <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">Comunicació en Temps Real</p>
            </div>

            <div className="glass rounded-[3rem] border-white/40 p-10 shadow-2xl space-y-8 max-w-2xl">
              <div className="space-y-4">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <Bell size={18} className="text-primary" /> Missatge del banner
                </label>
                <textarea 
                  value={globalAlert.message}
                  onChange={(e) => setGlobalAlert({...globalAlert, message: e.target.value})}
                  className="w-full p-6 bg-slate-50 border-2 border-white/40 rounded-3xl text-sm font-bold focus:bg-white focus:border-primary focus:outline-none transition-all min-h-[120px]"
                  placeholder="Ex: ⚠️ L'assaig d'avui es trasllada a l'interior per pluja."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Tipus d'Alerta</label>
                  <div className="flex gap-3">
                    {['warning', 'info', 'danger'].map((t) => (
                      <button
                        key={t}
                        onClick={() => setGlobalAlert({...globalAlert, type: t})}
                        className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          globalAlert.type === t 
                            ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                            : 'bg-white/50 text-slate-400 hover:bg-white hover:text-primary border border-transparent hover:border-primary/20'
                        }`}
                      >
                        {t === 'warning' ? 'Avís' : t === 'info' ? 'Info' : 'Urgent'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Estat Vizualització</label>
                  <button 
                    onClick={() => setGlobalAlert({...globalAlert, active: !globalAlert.active})}
                    className={`w-full py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border-2 ${
                      globalAlert.active 
                        ? 'bg-green-500 text-white border-green-500 shadow-lg shadow-green-500/20' 
                        : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    {globalAlert.active ? <CheckCircle size={16} /> : <X size={16} />}
                    {globalAlert.active ? 'Banner Actiu' : 'Banner Inactiu'}
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button 
                  onClick={handleSaveAlert}
                  disabled={savingAlert}
                  className="w-full py-6 bg-primary text-white font-black uppercase tracking-widest text-xs rounded-[2rem] hover:bg-primary/90 transition-all shadow-2xl shadow-primary/20 flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
                >
                  {savingAlert ? <div className="animate-spin w-5 h-5 border-2 border-white/20 border-t-white rounded-full"></div> : <Save size={20} />}
                  Publicar Avís ara mateix
                </button>
              </div>
              
              <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <AlertTriangle size={16} />
                </div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic leading-relaxed">
                  L'avís s'actualitzarà automàticament a tots els dispositius dels membres sense necessitat de reiniciar l'aplicació.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── ENQUESTES TAB ──────────────────────────────────────────────────────── */}
        {activeTab === 'enquestes' && (
          <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-2 relative">
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">Nova <span className="text-gradient">Enquesta</span></h2>
              <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">Crea votacions per a la colla</p>
              <span className="absolute -top-4 right-0 px-3 py-1 bg-slate-900 text-white text-[8px] font-black rounded-lg uppercase tracking-widest">Build v2.2 - Single Option Active</span>
            </div>

            <div className="glass rounded-[3rem] border-white/40 p-10 shadow-2xl space-y-8 max-w-2xl">
              <div className="space-y-4">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400">Tipus de Publicació</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button 
                    onClick={() => setNewPoll({...newPoll, type: 'standard'})}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${newPoll.type === 'standard' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 bg-slate-50 text-slate-400 opacity-60'}`}
                  >
                    <PieChart size={24} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Votació</span>
                  </button>
                  <button 
                    onClick={() => setNewPoll({...newPoll, type: 'order'})}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${newPoll.type === 'order' ? 'border-amber-500 bg-amber-50 text-amber-600' : 'border-slate-100 bg-slate-50 text-slate-400 opacity-60'}`}
                  >
                    <ShoppingBag size={24} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Pre-comanda</span>
                  </button>
                  <button 
                    onClick={() => setNewPoll({...newPoll, type: 'meal'})}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${newPoll.type === 'meal' ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-slate-100 bg-slate-50 text-slate-400 opacity-60'}`}
                  >
                    <Utensils size={24} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Dinar / Esmorçar</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400">
                  {newPoll.type === 'order' ? 'Títol de la Comanda *' : newPoll.type === 'meal' ? 'Títol del Menjar / Esmorçar *' : "Títol de l'Enquesta *"}
                </label>
                <input 
                  type="text"
                  value={newPoll.title}
                  onChange={(e) => setNewPoll({...newPoll, title: e.target.value})}
                  className="w-full p-6 bg-slate-50 border-2 border-white/40 rounded-3xl text-sm font-bold focus:bg-white focus:border-primary focus:outline-none transition-all"
                  placeholder="Ex: Què us sembla l'horari dels divendres?"
                />
              </div>

              <div className="space-y-4">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400">Descripció (Opcional)</label>
                <textarea 
                  value={newPoll.description}
                  onChange={(e) => setNewPoll({...newPoll, description: e.target.value})}
                  className="w-full p-4 bg-slate-50 border-2 border-white/40 rounded-2xl text-sm font-medium focus:bg-white focus:border-primary focus:outline-none transition-all min-h-[80px]"
                  placeholder="Ex: Volem ajustar els horaris per adaptar-nos millor..."
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">
                    {newPoll.type === 'order' ? 'Llista de Productes *' : newPoll.type === 'meal' ? 'Opcions de Menjar (l\'opció "No vinc" s\'afegeix sola) *' : 'Opcions de Resposta *'}
                  </label>
                  <button 
                    onClick={() => setNewPoll({...newPoll, options: [...newPoll.options, '']})}
                    className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1 hover:text-primary/80"
                  >
                    <Plus size={14} /> Afegir Opció
                  </button>
                </div>
                {newPoll.options.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <input 
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...newPoll.options];
                        newOpts[i] = e.target.value;
                        setNewPoll({...newPoll, options: newOpts});
                      }}
                      className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:border-primary focus:outline-none transition-all"
                      placeholder={`Opció ${i + 1}`}
                    />
                    {newPoll.options.length > 1 && (
                      <button 
                        onClick={() => {
                          const newOpts = newPoll.options.filter((_, index) => index !== i);
                          setNewPoll({...newPoll, options: newOpts});
                        }}
                        className="w-12 flex items-center justify-center text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded-2xl transition-colors shrink-0"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400">Data Límit (Opcional)</label>
                <input 
                  type="datetime-local"
                  value={newPoll.deadline}
                  onChange={(e) => setNewPoll({...newPoll, deadline: e.target.value})}
                  className="w-full p-4 bg-slate-50 border-2 border-white/40 rounded-2xl text-sm font-bold text-slate-700 focus:bg-white focus:border-primary focus:outline-none transition-all"
                />
                <p className="text-[10px] text-slate-400 font-bold italic mt-1">L'enquesta es tancarà automàticament en aquesta data passada.</p>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <button 
                  onClick={handleCreatePoll}
                  disabled={creatingPoll}
                  className="w-full py-5 bg-primary text-white font-black uppercase tracking-widest text-xs rounded-[2rem] hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
                >
                  {creatingPoll ? <div className="animate-spin w-5 h-5 border-2 border-white/20 border-t-white rounded-full"></div> : <Save size={18} />}
                  Publicar {newPoll.type === 'order' ? 'Comanda' : newPoll.type === 'meal' ? 'Menjar' : 'Enquesta'}
                </button>
              </div>
            </div>

            <div className="mt-8 space-y-6 max-w-2xl">
              <h3 className="text-lg font-black text-slate-900">Enquestes Existents</h3>
              {adminPolls.length === 0 ? (
                <p className="text-sm text-slate-500 font-medium italic">No hi ha enquestes encara.</p>
              ) : (
                <div className="space-y-3">
                  {adminPolls.map(poll => {
                    const options = pollDetails.options.filter(o => o.poll_id === poll.id);
                    const votes = pollDetails.votes.filter(v => v.poll_id === poll.id);
                    const totalVotes = votes.length;
                    const isExpanded = expandedPoll === poll.id;

                    return (
                      <div key={poll.id} className="flex flex-col bg-white border border-slate-100 rounded-[2rem] shadow-sm overflow-hidden transition-all duration-300">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 sm:p-8">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {poll.type === 'order' ? (
                                <span className="bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                                  <ShoppingBag size={10} /> Pre-comanda
                                </span>
                              ) : poll.type === 'meal' ? (
                                <span className="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                                  <Utensils size={10} /> Menjar
                                </span>
                              ) : (
                                <span className="bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                                  <PieChart size={10} /> Enquesta
                                </span>
                              )}
                              {poll.deadline && new Date(poll.deadline) < new Date() && (
                                <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest">Tancada</span>
                              )}
                            </div>
                            <h4 className="font-black text-slate-900 text-lg tracking-tight truncate">{poll.title}</h4>
                            <div className="flex gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                              <span>Creada: {new Date(poll.created_at).toLocaleDateString('ca-ES')}</span>
                              <span>{totalVotes} participants</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0">
                            <button 
                              onClick={() => setExpandedPoll(isExpanded ? null : poll.id)}
                              className={`p-3 rounded-xl transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest ${isExpanded ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                            >
                              <FileText size={16} /> 
                              {isExpanded ? 'Amagar' : 'Resultats'}
                            </button>
                            <button 
                              onClick={() => handleDeletePoll(poll.id)}
                              className="p-3 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded-xl transition-colors"
                              title="Esborrar Enquesta"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        {/* Expanded Results View */}
                        {isExpanded && (
                          <div className="px-8 pb-8 animate-in fade-in slide-in-from-top-2 duration-300">
                             <div className="p-6 bg-slate-50 rounded-3xl space-y-8">
                                {options.map(opt => {
                                  const optVotes = votes.filter(v => v.option_id === opt.id);
                                  const optQuantity = optVotes.reduce((sum, v) => sum + (v.quantity || 1), 0);
                                  
                                  if (optVotes.length === 0 && options.length > 1) return null;

                                  return (
                                    <div key={opt.id} className="space-y-4">
                                      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                                        <div className="flex items-center gap-3">
                                          <div className={`w-2 h-2 rounded-full ${poll.type === 'order' ? 'bg-amber-500' : poll.type === 'meal' ? 'bg-emerald-500' : 'bg-primary'}`}></div>
                                          <h5 className="text-sm font-black text-slate-900 uppercase tracking-wide">{opt.text}</h5>
                                        </div>
                                        <div className="flex items-center gap-4">
                                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{optVotes.length} persones</span>
                                          {(poll.type === 'order' || poll.type === 'meal') && (
                                            <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-black">
                                              TOTAL: {optQuantity} unitats
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {optVotes.map(v => (
                                          <div key={v.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-primary/20 transition-all">
                                            <div className="min-w-0">
                                              <p className="text-sm font-bold text-slate-900 truncate">{v.users?.name || 'Anònim'}</p>
                                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">{v.users?.instrument || 'Sense instrument'}</p>
                                            </div>
                                            {(poll.type === 'order' || poll.type === 'meal') && (
                                              <div className="bg-slate-50 px-3 py-1 rounded-xl border border-slate-100">
                                                <span className="text-xs font-black text-primary">x{v.quantity || 1}</span>
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                        {optVotes.length === 0 && (
                                          <p className="text-xs italic text-slate-400 py-2">Ningú ha triat aquesta opció encara.</p>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                                
                                {votes.length === 0 && (
                                  <div className="text-center py-10 space-y-3">
                                    <Package size={48} className="mx-auto text-slate-200" />
                                    <p className="text-slate-400 font-medium italic">Encara no hi ha cap participació en aquesta {poll.type === 'order' ? 'comanda' : 'enquesta'}.</p>
                                  </div>
                                )}
                             </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── CONVOCATÒRIES TAB (Control de Plantilla d'Actuació) ────────────────── */}
        {activeTab === 'convocatories' && (() => {
          const targetDolcaines = (selectedEvent as any)?.slots_dolcaina || 8;
          const targetTabals = (selectedEvent as any)?.slots_tabal || 6;
          
          const filteredDolcaines = combinedData
            .filter(m => m.instrument.toLowerCase().includes('dolçaina') || m.instrument.toLowerCase().includes('gralla'))
            .filter(m => m.name.toLowerCase().includes(dolcainaSearch.toLowerCase()));

          const filteredTabals = combinedData
            .filter(m => !m.instrument.toLowerCase().includes('dolçaina') && !m.instrument.toLowerCase().includes('gralla'))
            .filter(m => m.name.toLowerCase().includes(tabalSearch.toLowerCase()));

          const activeDolcaines = filteredDolcaines.filter(m => m.convocat).length;
          const activeTabals = filteredTabals.filter(m => m.convocat).length;
          const dolcainaQuorumPercent = Math.min(100, Math.round((activeDolcaines / targetDolcaines) * 100)) || 0;
          const tabalQuorumPercent = Math.min(100, Math.round((activeTabals / targetTabals) * 100)) || 0;
          const isOptimal = activeDolcaines >= targetDolcaines && activeTabals >= targetTabals;

          const getVoiceTag = (m: Member, idx: number) => {
            const instr = m.instrument.toLowerCase();
            if (instr.includes('dolçaina') || instr.includes('gralla')) {
              if (idx === 0 || idx === 1) return 'Veu 1a';
              if (idx === 2 || idx === 3) return 'Veu 2a';
              if (idx === 4) return 'Tiple Baix';
              return idx % 2 === 0 ? 'Veu 1a' : 'Veu 2a';
            }
            if (idx === 0) return 'Tabal Principal';
            if (idx === 1) return 'Tabal 2';
            if (idx === 2) return 'Bombo';
            return `Tabal ${idx + 1}`;
          };

          return (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* Top Navigation & Breadcrumb (Screenshot 6) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2.5 text-xs font-semibold text-stone-500">
                  <button 
                    onClick={() => setView('calendar')}
                    className="flex items-center gap-1.5 hover:text-stone-900 transition-colors"
                  >
                    <ArrowLeft size={16} />
                    <span>Tornar al llistat d'actes</span>
                  </button>
                  <span className="text-stone-300">/</span>
                  <span className="text-stone-900 font-bold text-sm">Control de Plantilla d'Actuació</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-100/70 text-primary border border-orange-200/60">
                    ADMIN VIEW
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => fetchAttendances()}
                    className="px-3.5 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                    title="Recarregar canvis"
                  >
                    <RotateCcw size={15} />
                    <span className="hidden sm:inline">Historial de canvis</span>
                  </button>
                  <button
                    onClick={handleExportList}
                    className="px-3.5 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Download size={15} />
                    <span>Exportar PDF / Llista</span>
                  </button>
                </div>
              </div>

              {/* Actuació Seleccionada Banner Card (Screenshot 6) */}
              <div className="bg-white rounded-3xl border border-stone-200/80 p-6 md:p-8 shadow-sm space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  {/* Left Event Details */}
                  <div className="space-y-4 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-primary text-xs">🚩</span>
                      <span className="text-[11px] font-black tracking-wider uppercase text-stone-500">
                        ACTUACIÓ SELECCIONADA
                      </span>
                      <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full ml-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Inscripcions obertes
                      </span>
                    </div>

                    <div className="relative max-w-xl">
                      <select
                        value={selectedEventId || ''}
                        onChange={(e) => handleEventSelection(Number(e.target.value))}
                        className="w-full bg-stone-50 hover:bg-stone-100/80 border border-stone-200 rounded-2xl px-4 py-3 text-base md:text-lg font-black text-stone-900 appearance-none focus:bg-white focus:border-primary outline-none transition-all cursor-pointer pr-10"
                      >
                        {events.length === 0 && <option value="">Cap esdeveniment proper</option>}
                        {events.map(event => (
                          <option key={event.id} value={event.id}>
                            {event.title} • {formatDate(event.date)}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={20} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400" />
                    </div>

                    {selectedEvent && (
                      <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs font-semibold text-stone-600">
                        <span className="px-3 py-1 rounded-xl bg-stone-50 border border-stone-200/70 flex items-center gap-1.5">
                          <Calendar size={14} className="text-primary" />
                          {formatDate(selectedEvent.date)}
                        </span>
                        <span className="px-3 py-1 rounded-xl bg-stone-50 border border-stone-200/70 flex items-center gap-1.5">
                          <Clock size={14} className="text-primary" />
                          {new Date(selectedEvent.date).toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' })} h (Convocatòria 45 min abans)
                        </span>
                        <span className="px-3 py-1 rounded-xl bg-stone-50 border border-stone-200/70 flex items-center gap-1.5">
                          <MapPin size={14} className="text-primary" />
                          {(selectedEvent as any).location || 'Plaça Major'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right Quorum Meter Cards (Screenshot 6) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
                    {/* Card 1: CONVOCATS */}
                    <div className="bg-stone-50/70 border border-stone-200/70 rounded-2xl p-4 flex flex-col justify-between min-w-[105px]">
                      <p className="text-[10px] font-black uppercase tracking-wider text-stone-400">CONVOCATS</p>
                      <div className="my-1">
                        <span className="text-3xl font-black text-stone-900 tracking-tight">{totalConvocats}</span>
                      </div>
                      <p className="text-[11px] text-stone-500 font-medium">Total inscrits</p>
                    </div>

                    {/* Card 2: DOLÇAINES */}
                    <div className="bg-stone-50/70 border border-stone-200/70 rounded-2xl p-4 flex flex-col justify-between min-w-[105px]">
                      <p className="text-[10px] font-black uppercase tracking-wider text-primary">DOLÇAINES</p>
                      <div className="my-1 flex items-baseline gap-1">
                        <span className="text-3xl font-black text-primary tracking-tight">{activeDolcaines}</span>
                        <span className="text-sm font-bold text-stone-400">/{targetDolcaines}</span>
                      </div>
                      <p className="text-[11px] text-stone-500 font-medium">{dolcainaQuorumPercent}% Quòrum</p>
                    </div>

                    {/* Card 3: TABALS */}
                    <div className="bg-stone-50/70 border border-stone-200/70 rounded-2xl p-4 flex flex-col justify-between min-w-[105px]">
                      <p className="text-[10px] font-black uppercase tracking-wider text-primary">TABALS</p>
                      <div className="my-1 flex items-baseline gap-1">
                        <span className="text-3xl font-black text-primary tracking-tight">{activeTabals}</span>
                        <span className="text-sm font-bold text-stone-400">/{targetTabals}</span>
                      </div>
                      <p className="text-[11px] text-stone-500 font-medium">{tabalQuorumPercent}% Quòrum</p>
                    </div>

                    {/* Card 4: ESTAT */}
                    <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-2xl p-4 flex flex-col justify-between min-w-[105px]">
                      <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">ESTAT</p>
                      <div className="my-1 flex items-center gap-1.5">
                        <CheckCircle size={18} className="text-emerald-600 shrink-0" />
                        <span className="text-xl font-black text-emerald-800 tracking-tight">
                          {isOptimal ? 'Òptima' : 'Equilibrada'}
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-600 font-medium">Equilibrada</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Two Main Columns: Dolçaines & Tabals (Screenshot 6) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                {/* ─── COLUMN 1: DOLÇAINES ─── */}
                <div className="space-y-4">
                  {/* Column Header Card */}
                  <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-orange-100 flex items-center justify-center text-primary font-bold">
                        <Music size={22} />
                      </div>
                      <div>
                        <h3 className="font-black text-lg text-stone-900 tracking-tight">
                          Dolçaines ({targetDolcaines})
                        </h3>
                        <p className="text-xs text-stone-500 font-medium mt-0.5">
                          Veu 1a, Veu 2a i Baix
                        </p>
                      </div>
                    </div>

                    <span className="bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-full px-3 py-1 text-xs font-black shrink-0">
                      {activeDolcaines} Confirmades
                    </span>
                  </div>

                  {/* Search and Voice Filter */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        type="text"
                        value={dolcainaSearch}
                        onChange={(e) => setDolcainaSearch(e.target.value)}
                        placeholder="Filtrar per dolçainer o veu..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200/80 rounded-xl text-xs font-semibold text-stone-800 focus:border-primary outline-none"
                      />
                    </div>
                    <select
                      value={dolcainaVoiceFilter}
                      onChange={(e) => setDolcainaVoiceFilter(e.target.value)}
                      className="bg-white border border-stone-200/80 rounded-xl px-3 py-2.5 text-xs font-semibold text-stone-700 outline-none focus:border-primary"
                    >
                      <option value="all">Totes les veus</option>
                      <option value="1a">Veu 1a</option>
                      <option value="2a">Veu 2a</option>
                      <option value="baix">Baix</option>
                    </select>
                  </div>

                  {/* Dolçaines Musician Cards List */}
                  <div className="space-y-3">
                    {filteredDolcaines.length === 0 ? (
                      <div className="bg-white rounded-2xl border border-dashed border-stone-200 p-8 text-center text-stone-400 text-xs">
                        No hi ha dolçainers que coincideixin amb el filtre.
                      </div>
                    ) : (
                      filteredDolcaines.map((m, idx) => {
                        const voiceTag = getVoiceTag(m, idx);
                        const initials = m.name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();

                        return (
                          <div 
                            key={m.uid} 
                            className={`bg-white rounded-2xl border p-4 shadow-xs transition-all ${
                              m.convocat ? 'border-stone-200/90' : 'border-stone-100 opacity-60 bg-stone-50/40'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-full bg-stone-100 border border-stone-200/70 flex items-center justify-center text-stone-700 font-black text-xs shrink-0">
                                  {initials}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="font-black text-stone-900 text-sm truncate">{m.name}</p>
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200/60 shrink-0">
                                      {voiceTag}
                                    </span>
                                  </div>
                                  <p className="text-xs text-stone-400 font-medium truncate mt-0.5">
                                    {m.instrument} {idx === 0 ? '· Veterà (12 anys)' : idx === 1 ? '· Solista' : ''}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                {/* Status Badge */}
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  m.status === 'Vull anar-hi' 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' 
                                    : m.status === 'No puc' 
                                    ? 'bg-stone-100 text-stone-500 border border-stone-200/60' 
                                    : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                                }`}>
                                  {m.status === 'Vull anar-hi' ? 'Confirmada' : m.status === 'No puc' ? 'No assisteix' : 'Pendent'}
                                </span>

                                {/* Interactive Orange Toggle Switch */}
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={m.convocat}
                                  onClick={() => handleConvocatChange(m.uid, !m.convocat)}
                                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer ${
                                    m.convocat ? 'bg-primary' : 'bg-stone-200'
                                  }`}
                                >
                                  <div
                                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                                      m.convocat ? 'translate-x-6' : 'translate-x-0'
                                    }`}
                                  />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* ─── COLUMN 2: TABALS I PERCUSSIÓ ─── */}
                <div className="space-y-4">
                  {/* Column Header Card */}
                  <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-orange-100 flex items-center justify-center text-primary font-bold">
                        <Archive size={22} />
                      </div>
                      <div>
                        <h3 className="font-black text-lg text-stone-900 tracking-tight">
                          Tabals i Percussió ({targetTabals})
                        </h3>
                        <p className="text-xs text-stone-500 font-medium mt-0.5">
                          Tabals valencians, Bombo i Timbal
                        </p>
                      </div>
                    </div>

                    <span className="bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-full px-3 py-1 text-xs font-black shrink-0">
                      {activeTabals} Confirmats
                    </span>
                  </div>

                  {/* Search and Add Suplent */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        type="text"
                        value={tabalSearch}
                        onChange={(e) => setTabalSearch(e.target.value)}
                        placeholder="Filtrar per tabaler o instrument..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200/80 rounded-xl text-xs font-semibold text-stone-800 focus:border-primary outline-none"
                      />
                    </div>
                    <button
                      onClick={() => setShowAddMember(true)}
                      className="px-3.5 py-2.5 bg-white hover:bg-stone-50 border border-stone-200/80 rounded-xl text-xs font-bold text-primary flex items-center gap-1.5 transition-colors shrink-0"
                    >
                      <Plus size={15} />
                      <span>Afegir suplent</span>
                    </button>
                  </div>

                  {/* Tabals Musician Cards List */}
                  <div className="space-y-3">
                    {filteredTabals.length === 0 ? (
                      <div className="bg-white rounded-2xl border border-dashed border-stone-200 p-8 text-center text-stone-400 text-xs">
                        No hi ha tabalers que coincideixin amb el filtre.
                      </div>
                    ) : (
                      filteredTabals.map((m, idx) => {
                        const voiceTag = getVoiceTag(m, idx);
                        const initials = m.name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();

                        return (
                          <div 
                            key={m.uid} 
                            className={`bg-white rounded-2xl border p-4 shadow-xs transition-all ${
                              m.convocat ? 'border-stone-200/90' : 'border-stone-100 opacity-60 bg-stone-50/40'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-full bg-stone-100 border border-stone-200/70 flex items-center justify-center text-stone-700 font-black text-xs shrink-0">
                                  {initials}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="font-black text-stone-900 text-sm truncate">{m.name}</p>
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-200/60 shrink-0">
                                      {voiceTag}
                                    </span>
                                  </div>
                                  <p className="text-xs text-stone-400 font-medium truncate mt-0.5">
                                    {m.instrument} {idx === 0 ? 'tradicional' : ''}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                {/* Status Badge */}
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  m.status === 'Vull anar-hi' 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' 
                                    : m.status === 'No puc' 
                                    ? 'bg-stone-100 text-stone-500 border border-stone-200/60' 
                                    : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                                }`}>
                                  {m.status === 'Vull anar-hi' ? 'Confirmada' : m.status === 'No puc' ? 'No assisteix' : 'Pendent'}
                                </span>

                                {/* Interactive Orange Toggle Switch */}
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={m.convocat}
                                  onClick={() => handleConvocatChange(m.uid, !m.convocat)}
                                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer ${
                                    m.convocat ? 'bg-primary' : 'bg-stone-200'
                                  }`}
                                >
                                  <div
                                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                                      m.convocat ? 'translate-x-6' : 'translate-x-0'
                                    }`}
                                  />
                                </button>
                              </div>
                            </div>

                            {/* Director's Note Line (Screenshot 6) */}
                            <div className="mt-3 pt-2 border-t border-stone-100">
                              <input
                                type="text"
                                defaultValue={m.note || ''}
                                onBlur={(e) => handleNoteChange(m.uid, e.target.value)}
                                placeholder="Afegeix una nota..."
                                className="w-full text-xs text-stone-700 placeholder-stone-400 bg-stone-50 hover:bg-stone-100/60 focus:bg-white px-3 py-1.5 rounded-lg border border-transparent focus:border-stone-200 outline-none transition-all font-medium"
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Sticky Action Bar (Screenshot 6) */}
              <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-stone-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                  <span>
                    Plantilla activa: <strong className="text-stone-900">{totalConvocats} Músics convocats</strong> ({noStayMusiciansCount} baixes gestionades)
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
                  <button
                    onClick={handleGenerateLineup}
                    disabled={generatingLineup}
                    className="px-4 py-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold flex items-center gap-2 transition-colors shadow-xs"
                  >
                    <Sparkles size={16} className="text-primary" />
                    <span>{generatingLineup ? 'Calculant SWRR...' : 'Generar Proposta SWRR'}</span>
                  </button>

                  <button
                    onClick={handleExportList}
                    className="px-4 py-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold flex items-center gap-2 transition-colors shadow-xs"
                  >
                    <Download size={16} />
                    <span>Exportar Llistat</span>
                  </button>

                  <button
                    onClick={handleWhatsAppShare}
                    className="px-4 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/60 text-emerald-800 text-xs font-bold flex items-center gap-2 transition-colors shadow-xs"
                  >
                    <MessageCircle size={16} />
                    <span>Notificar Músics (WhatsApp)</span>
                  </button>

                  <button
                    onClick={handlePublish}
                    className="px-5 py-2.5 rounded-xl bg-primary hover:bg-[#b03a0b] text-white text-xs font-bold flex items-center gap-2 transition-colors shadow-sm active:scale-98"
                  >
                    <CheckCircle size={16} />
                    <span>Confirmar Plantilla Definitiva</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── MÚSICS TAB ─────────────────────────────────────────────────────── */}
        {activeTab === 'musics' && (
          <>
             {/* Header */}
             <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
               <div className="space-y-2">
                 <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter leading-none">
                   Gestió de <span className="text-gradient">Músics</span>
                 </h2>
                 <p className="text-slate-500 text-lg font-medium">Membres registrats a la colla, instruments i rols.</p>
               </div>
               <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
                 <button
                   onClick={() => setShowAddMember(true)}
                   className="flex items-center gap-3 px-8 py-4 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-primary/90 transition-all active:scale-95 shadow-xl shadow-primary/20 justify-center"
                 >
                   <Users size={16} /> Afegir Músic Manual
                 </button>
                 <button
                   onClick={sendNotificationToAll}
                   className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-900/20 justify-center"
                 >
                   <Bell size={16} /> Notificar a tothom
                 </button>
               </div>
             </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Membres', value: totalMembers, color: 'primary', icon: Users },
                { label: 'Administradors', value: totalAdmins, color: 'slate', icon: Shield },
                { label: 'Dolçaines', value: totalDolcaines, color: 'slate', icon: Music },
                { label: 'Tabals', value: totalTabals, color: 'slate', icon: Music },
              ].map((stat, i) => (
                <div key={i} className="glass p-6 rounded-[2rem] border-white/40 shadow-lg space-y-3 group hover:-translate-y-1 transition-all duration-300">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color === 'primary' ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-400'}`}>
                    <stat.icon size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">{stat.label}</p>
                    <span className={`text-3xl font-black tracking-tight ${stat.color === 'primary' ? 'text-primary' : 'text-slate-900'}`}>{stat.value}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <input
                type="text"
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                placeholder="Cercar per nom, email o instrument..."
                className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-medium text-slate-700 focus:border-primary outline-none transition-all shadow-sm placeholder:text-slate-300"
              />
              {memberSearch && (
                <button
                  onClick={() => setMemberSearch('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Members grid */}
            {filteredMembers.length === 0 ? (
              <div className="text-center py-20 text-slate-400">
                <Users size={48} className="mx-auto mb-4 text-slate-200" />
                <p className="font-bold">No s'han trobat músics amb aquest criteri.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredMembers.map(member => (
                  <MemberCard
                    key={member.uid}
                    member={member}
                    currentUser={user}
                    onUpdate={handleUpdateMember}
                    onDelete={handleDeleteMember}
                  />
                ))}
              </div>
            )}

            <p className="text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">
              {filteredMembers.length} de {totalMembers} membres
            </p>

            {/* Add Member Modal */}
            {showAddMember && (
              <AddMemberModal 
                onClose={() => setShowAddMember(false)} 
                onAdd={handleAddMember}
                adding={addingMember}
              />
            )}
          </>
        )}
      </div>
      {/* Lineup Modal */}
      {showLineupModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Proposta de Convocatòria</h3>
                <p className="text-sm font-medium text-slate-400 mt-1">Generada pel sistema de rotació equitativa</p>
              </div>
              <button onClick={() => setShowLineupModal(false)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 shadow-sm border border-slate-100">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto bg-white flex-1">
              <div className="space-y-3">
                {proposedLineup.map((user) => (
                  <label key={user.user_id} className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${manualLineupEdits[user.user_id] ? 'border-[#d44211]/30 bg-[#d44211]/5' : 'border-slate-100 bg-slate-50 grayscale'}`}>
                    <input 
                      type="checkbox" 
                      className="w-6 h-6 rounded-xl border-slate-300 text-[#d44211] focus:ring-[#d44211]"
                      checked={manualLineupEdits[user.user_id]}
                      onChange={(e) => setManualLineupEdits(prev => ({...prev, [user.user_id]: e.target.checked}))}
                    />
                    <div className="flex-1">
                      <p className="font-bold text-slate-900">{user.name}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{user.instrument}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
              <button onClick={() => setShowLineupModal(false)} className="flex-1 py-4 text-sm font-black uppercase tracking-widest text-slate-500 hover:bg-slate-200 rounded-2xl transition-all">
                Cancel·lar
              </button>
              <button onClick={confirmLineup} className="flex-1 py-4 bg-[#d44211] text-white text-sm font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-[#d44211]/20 hover:bg-[#d44211]/90 transition-all">
                Aplicar Selecció
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
