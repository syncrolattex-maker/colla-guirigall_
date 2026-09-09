import { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { withTimeout, useRealtimeChannels } from '../utils/viewHelpers';
import { UserData } from '../App';

interface AppNotification {
  id: number;
  userid: string;
  title: string;
  message: string;
  read: boolean;
  createdat: string;
  link?: string;
  eventid?: number;
}

export default function NotificationBell({ user, onNavigate }: { user: UserData, onNavigate: (view: any, eventId?: number) => void }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showToast, setShowToast] = useState<AppNotification | null>(null);
  const prevNotifsRef = useRef<AppNotification[]>([]);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const { data, error } = await withTimeout(supabase
        .from('notifications')
        .select('*')
        .eq('userid', user.uid)
        .order('createdat', { ascending: false }));

      if (error) {
        console.error("Error fetching notifications:", error);
      } else {
        setNotifications(data || []);
      }
    } catch (e) {
      console.error("Error fetching notifications:", e);
    }
  };

  useRealtimeChannels([
    { name: 'bell-notifications', table: 'notifications', onEvent: fetchNotifications },
  ]);

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  useEffect(() => {
    // Check for new unread notifications that were not in our previous state
    const newNotifs = notifications.filter(n => 
      !n.read && !prevNotifsRef.current.some(p => p.id === n.id)
    );
    
    // If we have actual new notifications and this is not the first load (to avoid toast on initial login)
    if (newNotifs.length > 0 && prevNotifsRef.current.length > 0) {
      setShowToast(newNotifs[0]);
      setTimeout(() => setShowToast(null), 5000);
    }
    
    prevNotifsRef.current = notifications;
  }, [notifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (id: number, currentRead: boolean) => {
    if (currentRead) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error("Error marking as read", error);
    }
  };

  const handleNotificationClick = (notif: AppNotification) => {
    markAsRead(notif.id, notif.read);
    setIsOpen(false);
    if (notif.link) {
      const eid = typeof notif.eventid === 'string' ? parseInt(notif.eventid) : notif.eventid;
      onNavigate(notif.link, eid);
    }
  };

  const deleteNotification = async (id: number) => {
    // Optimistic UI update to make it feel instantaneous on mobile
    setNotifications(prev => prev.filter(n => n.id !== id));
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);
      if (error) {
        console.error("Error deleting notification", error);
        fetchNotifications(); // restore on error
      }
    } catch (error) {
      console.error("Error deleting notification", error);
      fetchNotifications();
    }
  };

  const clearReadNotifications = async () => {
    const readIds = notifications.filter(n => n.read).map(n => n.id);
    if (readIds.length === 0) return;
    
    // Optimistic UI update
    setNotifications(prev => prev.filter(n => !n.read));
    
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .in('id', readIds);
      if (error) {
        console.error("Error clearing notifications", error);
        fetchNotifications(); // restore on error
      }
    } catch (error) {
      console.error("Error clearing notifications", error);
      fetchNotifications();
    }
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all active:scale-90 relative group shadow-sm"
        >
          <Bell size={20} className="group-hover:rotate-12 transition-transform" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-slate-900 text-white text-[10px] font-black flex items-center justify-center rounded-lg border-2 border-white shadow-lg animate-bounce">
              {unreadCount}
            </span>
          )}
        </button>

        {isOpen && (
          <div className="fixed sm:absolute top-16 sm:top-auto left-4 right-4 sm:left-auto sm:right-0 sm:w-80 mt-4 bg-[#d44211] rounded-[2rem] shadow-2xl shadow-[#d44211]/30 border border-white/20 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="px-6 py-5 border-b border-white/10 flex justify-between items-center bg-black/10">
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Notificacions</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-white text-[#d44211] text-[10px] font-black rounded-full uppercase tracking-widest shadow-sm">{unreadCount} noves</span>
              )}
            </div>
            
            <div className="max-h-[28rem] overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white/50 mx-auto border border-white/5">
                    <Bell size={24} />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Tot al dia!</p>
                  <p className="text-xs text-white/80 font-bold">No tens cap notificació pendent.</p>
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {notifications.map(notif => (
                    <div
                      key={notif.id}
                      className={`flex items-stretch border-b border-white/5 last:border-0 ${!notif.read ? 'bg-white/10' : ''}`}
                    >
                      {/* Clickable content area */}
                      <div 
                        onClick={() => handleNotificationClick(notif)}
                        className="flex-1 p-6 flex gap-4 cursor-pointer hover:bg-white/5 transition-colors group"
                      >
                        <div className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${!notif.read ? 'bg-white ring-4 ring-white/20' : 'bg-transparent border border-white/20'}`} />
                        <div className="flex-1 space-y-1">
                          <p className={`text-sm tracking-tight ${!notif.read ? 'font-black text-white' : 'font-bold text-white/70'}`}>
                            {notif.title}
                          </p>
                          <p className="text-xs text-white/60 font-medium leading-relaxed">{notif.message}</p>
                          <div className="flex items-center gap-2 pt-1">
                            <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">
                                {new Date(notif.createdat).toLocaleDateString('ca-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                            {!notif.read && (
                              <>
                                <span className="w-1 h-1 rounded-full bg-white/20" />
                                <span className="text-[9px] font-black text-white uppercase tracking-widest">Nou</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Separate Delete Button (no nesting) */}
                      <div className="flex items-center pr-4">
                        <button
                          onClick={(e) => { 
                            e.preventDefault(); 
                            e.stopPropagation(); 
                            deleteNotification(notif.id); 
                          }}
                          className="w-12 h-12 flex items-center justify-center rounded-2xl text-white/40 hover:text-white hover:bg-white/20 transition-all border border-white/10"
                          title="Esborrar"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {notifications.length > 0 && (
              <div className="p-4 bg-black/10 border-t border-white/10 flex flex-col gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={async () => {
                      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
                      if (unreadIds.length === 0) return;
                      await supabase.from('notifications').update({ read: true }).in('id', unreadIds);
                    }}
                    className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white transition-colors flex items-center justify-center gap-2"
                  >
                    <Check size={12} /> Marcar totes com llegides
                  </button>
                )}
                {notifications.some(n => n.read) && (
                  <button
                    onClick={clearReadNotifications}
                    className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-red-400 transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 size={12} /> Netejar llegides
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toast for new notification */}
      {showToast && (
        <div className="fixed bottom-24 md:bottom-8 right-6 left-6 md:left-auto md:w-96 glass-dark border-white/10 shadow-3xl rounded-[2rem] p-6 flex items-start gap-5 z-[200] animate-in slide-in-from-bottom-10 fade-in duration-500 overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Bell size={64} className="rotate-12" />
          </div>
          
          <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shrink-0 shadow-lg shadow-primary/20 relative z-10">
            <Bell size={20} className="animate-pulse" />
          </div>
          
          <div className="flex-1 space-y-1 relative z-10 pr-4">
            <h4 className="text-sm font-black text-white tracking-tight">{showToast.title}</h4>
            <p className="text-xs text-white/60 font-medium leading-relaxed">{showToast.message}</p>
          </div>
          
          <button 
            onClick={() => setShowToast(null)} 
            className="text-white/20 hover:text-white transition-colors relative z-10 p-2"
          >
            <Trash2 size={16} />
          </button>
          
          <div className="absolute bottom-0 left-0 h-1 bg-primary group-hover:w-full transition-all duration-[5000ms] ease-linear w-0"></div>
        </div>
      )}
    </>
  );
}
