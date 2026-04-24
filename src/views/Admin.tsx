import React, { useState, useEffect } from 'react';
import { ChevronDown, CheckCircle, MoreVertical, Calendar, Users, Archive, Pencil, X, Bell, Shield, Music, Trash2, Save, AlertTriangle, PieChart, Plus, ShoppingBag, FileText, Package } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { UserData } from '../App';

interface AdminProps {
  user: UserData;
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

type AdminTab = 'convocatories' | 'musics' | 'alertes' | 'enquestes';

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
export default function Admin({ user }: AdminProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('convocatories');
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [attendances, setAttendances] = useState<Record<string, {status: string, convocat: boolean}>>({});
  const [loading, setLoading] = useState(true);
  const [globalAlert, setGlobalAlert] = useState<{message: string; active: boolean; type: string}>({
    message: '',
    active: false,
    type: 'warning'
  });
  const [savingAlert, setSavingAlert] = useState(false);
  
  // Polls state
  const [adminPolls, setAdminPolls] = useState<any[]>([]);
  const [newPoll, setNewPoll] = useState({ title: '', description: '', deadline: '', options: ['', ''], type: 'standard' });
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
        setSelectedEventId(data[0].id);
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
    setLoading(true);
    const { data, error } = await supabase
      .from('attendances')
      .select('*')
      .eq('eventid', selectedEventId);
    if (error) console.error("Error fetching attendances:", error);
    else {
      const attendanceData: Record<string, {status: string, convocat: boolean}> = {};
      data?.forEach(d => {
        attendanceData[d.userid] = { status: d.status, convocat: d.convocat || false };
      });
      setAttendances(attendanceData);
    }
    setLoading(false);
  };

  const fetchGlobalAlert = async () => {
    const { data } = await supabase.from('global_alerts').select('*').eq('id', 1).single();
    if (data) setGlobalAlert(data);
  };

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
    const eventsChannel = supabase.channel('adm:events').on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, fetchEvents).subscribe();
    const usersChannel = supabase.channel('adm:users').on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, fetchMembers).subscribe();
    const pollsChannel = supabase.channel('adm:polls').on('postgres_changes', { event: '*', schema: 'public', table: 'polls' }, fetchAdminPolls).subscribe();
    const votesChannel = supabase.channel('adm:votes').on('postgres_changes', { event: '*', schema: 'public', table: 'poll_votes' }, fetchPollDetails).subscribe();
    return () => {
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
    if (!newPoll.title.trim() || newPoll.options.filter(o => o.trim() !== '').length < 2) {
      alert("L'enquesta necessita un títol i almenys 2 opcions vàlides.");
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
      
      const { error: optionsError } = await supabase.from('poll_options').insert(validOptions);
      if (optionsError) throw optionsError;

      alert("Enquesta creada correctament!");
      setNewPoll({ title: '', description: '', deadline: '', options: ['', ''], type: 'standard' });
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
    fetchAttendances();
    const attendancesChannel = supabase.channel('adm:attendances').on('postgres_changes', { event: '*', schema: 'public', table: 'attendances' }, fetchAttendances).subscribe();
    return () => { supabase.removeChannel(attendancesChannel); };
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
    try {
      const { error } = await supabase.from('attendances').upsert({
        eventid: selectedEventId, userid: userId,
        status: attendances[userId]?.status || 'Pendent',
        convocat, updatedat: new Date().toISOString()
      }, { onConflict: 'eventid, userid' });
      if (error) throw error;
    } catch (error) { console.error("Error updating convocat:", error); }
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
    convocat: attendances[m.uid]?.convocat || false
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

  // ─── Nav items ─────────────────────────────────────────────────────────────
  const navItems = [
    { id: 'convocatories' as AdminTab, label: 'Convocatòries', icon: Calendar },
    { id: 'musics' as AdminTab, label: 'Músics', icon: Users },
    { id: 'alertes' as AdminTab, label: 'Alertes', icon: Bell },
    { id: 'enquestes' as AdminTab, label: 'Enquestes', icon: PieChart },
  ];

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#fcfcfd]">
      {/* Sidebar */}
      <aside className="w-full lg:w-72 glass border-r border-white/40 p-8 flex flex-col gap-10 shrink-0 z-20">
        <div className="flex flex-col gap-2 px-2">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-2">
            <Users size={24} strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Panell d'<span className="text-gradient">Admin</span></h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Gestió de la Colla</p>
        </div>

        <nav className="flex flex-col gap-3">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-4 px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] group transition-all ${
                  isActive
                    ? 'bg-primary text-white shadow-xl shadow-primary/20'
                    : 'text-slate-400 hover:text-primary hover:bg-primary/5'
                }`}
              >
                <Icon size={18} className={isActive ? '' : 'group-hover:scale-110 transition-transform'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-auto p-6 bg-slate-900 rounded-[2rem] text-white space-y-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Usuari Actiu</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-primary font-black">
              {user.name[0]}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-black truncate">{user.name}</p>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Administrador</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 p-8 lg:p-12 flex flex-col gap-12 pb-32 lg:pb-12 max-w-7xl mx-auto w-full">

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
            <div className="flex flex-col gap-2">
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">Nova <span className="text-gradient">Enquesta</span></h2>
              <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">Crea votacions per a la colla</p>
            </div>

            <div className="glass rounded-[3rem] border-white/40 p-10 shadow-2xl space-y-8 max-w-2xl">
              <div className="space-y-4">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400">Tipus de Publicació</label>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setNewPoll({...newPoll, type: 'standard'})}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${newPoll.type === 'standard' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 bg-slate-50 text-slate-400 opacity-60'}`}
                  >
                    <PieChart size={24} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Enquesta de Votació</span>
                  </button>
                  <button 
                    onClick={() => setNewPoll({...newPoll, type: 'order'})}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${newPoll.type === 'order' ? 'border-amber-500 bg-amber-50 text-amber-600' : 'border-slate-100 bg-slate-50 text-slate-400 opacity-60'}`}
                  >
                    <ShoppingBag size={24} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Pre-comanda / Llista</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400">
                  {newPoll.type === 'order' ? 'Títol de la Comanda *' : "Títol de l'Enquesta *"}
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
                    {newPoll.type === 'order' ? 'Llista de Productes *' : 'Opcions de Resposta *'}
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
                    {newPoll.options.length > 2 && (
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
                  Publicar {newPoll.type === 'order' ? 'Comanda' : 'Enquesta'}
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
                                          <div className={`w-2 h-2 rounded-full ${poll.type === 'order' ? 'bg-amber-500' : 'bg-primary'}`}></div>
                                          <h5 className="text-sm font-black text-slate-900 uppercase tracking-wide">{opt.text}</h5>
                                        </div>
                                        <div className="flex items-center gap-4">
                                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{optVotes.length} persones</span>
                                          {poll.type === 'order' && (
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
                                            {poll.type === 'order' && (
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

        {/* ── CONVOCATÒRIES TAB ───────────────────────────────────────────────── */}
        {activeTab === 'convocatories' && (
          <>
            {/* Header */}
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter leading-none">
                    Gestió de <span className="text-gradient">Convocatòria</span>
                  </h2>
                  {selectedEvent?.ispublished && (
                    <span className="px-4 py-1.5 bg-green-500/10 text-green-600 text-[10px] font-black rounded-full uppercase tracking-widest flex items-center gap-2 border border-green-500/10">
                      <CheckCircle size={14} strokeWidth={3} /> Publicat
                    </span>
                  )}
                </div>
                <p className="text-slate-500 text-lg font-medium max-w-2xl">Revisió de disponibilitat i confirmació final per a les actuacions programades.</p>
              </div>
              <div className="space-y-2 w-full xl:w-96">
                <label className="text-[10px] font-black text-primary uppercase tracking-widest mb-1 block ml-1">Selecciona l'esdeveniment</label>
                <div className="relative group">
                  <select
                    value={selectedEventId || ''}
                    onChange={(e) => setSelectedEventId(Number(e.target.value))}
                    className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-black text-slate-700 appearance-none focus:border-primary outline-none transition-all shadow-sm group-hover:shadow-md"
                  >
                    {events.length === 0 && <option value="">Cap esdeveniment proper</option>}
                    {events.map(event => (
                      <option key={event.id} value={event.id}>{event.title} • {formatDate(event.date)}</option>
                    ))}
                  </select>
                  <ChevronDown size={20} className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-primary transition-colors" />
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total Convocats', value: totalConvocats, sub: 'músics', color: 'primary', icon: Users },
                { label: 'Dolçaines', value: dolcaines, sub: 'instruments', color: 'slate-900', icon: Archive },
                { label: 'Tabals', value: tabals, sub: 'percussió', color: 'slate-900', icon: Archive },
                { label: 'Altres', value: percussio, sub: 'músics', color: 'slate-900', icon: Archive },
              ].map((stat, i) => (
                <div key={i} className="glass p-8 rounded-[2.5rem] border-white/40 shadow-xl shadow-slate-200/50 space-y-4 group hover:-translate-y-1 transition-all duration-300">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${stat.color === 'primary' ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-400'} group-hover:scale-110 transition-transform`}>
                    <stat.icon size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{stat.label}</p>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-4xl font-black tracking-tight ${stat.color === 'primary' ? 'text-primary' : 'text-slate-900'}`}>{stat.value}</span>
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{stat.sub}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Table */}
            <div className="glass rounded-[3rem] border-white/40 shadow-2xl overflow-hidden">
              <div className="px-10 py-8 border-b border-slate-100/50 flex flex-col xl:flex-row justify-between items-center gap-8 bg-white/40">
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                    Gestió de Músics
                    <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black rounded-full uppercase tracking-widest">Tot el llistat</span>
                  </h3>
                  <p className="text-slate-400 text-sm font-medium">
                    {confirmedMusiciansCount} confirmats, {pendingMusiciansCount} pendents, {noStayMusiciansCount} no poden
                  </p>
                </div>
                <button onClick={handlePublish} className="w-full xl:w-auto px-10 py-5 bg-slate-900 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-800 transition-all active:scale-95 shadow-2xl shadow-slate-900/20">
                  <CheckCircle size={18} strokeWidth={3} /> Confirmar i Notificar
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                      <th className="px-10 py-6 w-32 text-center">Convocat</th>
                      <th className="px-10 py-6">Músic</th>
                      <th className="px-10 py-6">Instrument</th>
                      <th className="px-10 py-6">Estat Disponibilitat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/50">
                    {loading ? (
                      <tr><td colSpan={4} className="px-10 py-20 text-center"><div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-100 border-t-primary"></div></td></tr>
                    ) : combinedData.length === 0 ? (
                      <tr><td colSpan={4} className="px-10 py-32 text-center space-y-4">
                        <Users size={48} className="mx-auto text-slate-200" />
                        <p className="text-slate-400 font-medium italic">No hi ha músics registrats encara.</p>
                      </td></tr>
                    ) : (
                      combinedData.map((m) => (
                        <tr key={m.uid} className={`group hover:bg-primary/[0.02] transition-colors ${m.status === 'No puc' ? 'opacity-50 grayscale-[0.5]' : ''}`}>
                          <td className="px-10 py-6 text-center">
                            <input type="checkbox" checked={m.convocat} onChange={(e) => handleConvocatChange(m.uid, e.target.checked)}
                              className="w-7 h-7 rounded-xl border-2 border-slate-200 text-primary focus:ring-primary focus:ring-offset-2 cursor-pointer transition-all checked:scale-110" />
                          </td>
                          <td className="px-10 py-6">
                            <div className="flex items-center gap-4">
                              <div className="relative">
                                <img src={m.avatar} alt={m.name} className="w-12 h-12 rounded-2xl object-cover shadow-sm group-hover:scale-110 transition-transform duration-300" />
                                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${m.status === 'Vull anar-hi' ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                              </div>
                              <div>
                                <p className="font-black text-slate-900 tracking-tight text-base group-hover:text-primary transition-colors">{m.name}</p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{m.role === 'admin' ? 'Administrador' : 'Membre'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-10 py-6">
                            <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${m.instrument.toLowerCase().includes('dolçaina') ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'}`}>
                              {m.instrument}
                            </span>
                          </td>
                          <td className="px-10 py-6">
                            <select value={m.status} onChange={(e) => handleAttendanceChange(m.uid, e.target.value)}
                              className={`text-[10px] font-black uppercase tracking-widest rounded-xl px-5 py-3 border-none ring-2 ring-transparent focus:ring-primary/20 outline-none cursor-pointer transition-all ${
                                m.status === 'Vull anar-hi' ? 'bg-green-500/10 text-green-600' :
                                m.status === 'No puc' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-600'
                              }`}>
                              <option value="Pendent">Pendent</option>
                              <option value="Vull anar-hi">Vull anar-hi</option>
                              <option value="No puc">No puc</option>
                            </select>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-10 py-6 bg-slate-50/50 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <p>Mostrant {combinedData.length} músics totals</p>
              </div>
            </div>

            {/* Publish Footer */}
            <div className="glass-dark p-10 rounded-[3rem] border-white/10 shadow-3xl text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] pointer-events-none rounded-full translate-x-1/2 -translate-y-1/2"></div>
              <div className="relative z-10 flex flex-col xl:flex-row gap-8 items-center justify-between">
                <div className="space-y-2 text-center xl:text-left">
                  <h4 className="text-2xl font-black tracking-tight leading-tight">Publicar Convocatòria <span className="text-primary italic">Final</span></h4>
                  <p className="text-white/50 font-medium text-lg">S'enviaran notificacions instantànies als {totalConvocats} músics seleccionats.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
                  <button className="px-10 py-5 bg-white/5 text-white/70 border border-white/10 text-[10px] font-black uppercase tracking-widest rounded-3xl hover:bg-white/10 hover:text-white transition-all shadow-xl active:scale-95">
                    Guardar Esborrany
                  </button>
                  <button onClick={handlePublish} className="px-12 py-5 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-3xl shadow-[0_20px_40px_-10px_rgba(212,66,17,0.4)] hover:-translate-y-0.5 transition-all active:scale-95">
                    Publicar i Notificar Ara
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

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
    </div>
  );
}
