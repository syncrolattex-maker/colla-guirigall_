import { useState, useEffect, useRef } from 'react';
import { 
  Music, LogOut, X, Pencil, AlertTriangle, Info, Menu, Facebook, Instagram,
  Home, Calendar, BookOpen, Users, BarChart3, Settings, Bell, User, Clock, MapPin, ChevronRight, Sparkles
} from 'lucide-react';
import { supabase } from './supabaseClient';
import { Routes, Route, useNavigate, useLocation, useSearchParams, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './views/Dashboard';
import Repertoire from './views/Repertoire';
import CalendarView from './views/CalendarView';
import Rehearsal from './views/Rehearsal';
import Admin from './views/Admin';
import NotificationBell from './components/NotificationBell';
import PollsView from './views/PollsView';
import RepertoireMatrix from './views/RepertoireMatrix';

export type View = 'dashboard' | 'repertoire' | 'calendar' | 'rehearsal' | 'polls' | 'admin' | 'matrix';

export interface UserData {
  uid: string;
  email: string;
  name: string;
  role: 'admin' | 'member';
  instrument: string;
}

export interface GlobalAlert {
  id: number;
  message: string;
  active: boolean;
  type: 'warning' | 'info' | 'danger';
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const currentAdminTab = searchParams.get('tab') || 'convocatories';
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [globalAlert, setGlobalAlert] = useState<GlobalAlert | null>(null);
  const DEV_MODE = false; // Set to true only for local testing without Supabase Auth
  const ADMIN_EMAILS = ['syncrolattex@gmail.com', 'crentero@gmail.com']; // Authorized administrators

  useEffect(() => {
    setIsMenuOpen(false); // Close mobile menu on route change
  }, [location.pathname]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        window.dispatchEvent(new Event('app-focus'));
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  useEffect(() => {
    if (user) {
      const params = new URLSearchParams(window.location.search);
      const eventId = params.get('event');
      if (eventId && (location.pathname === '/' || location.pathname === '/dashboard')) {
        setSelectedEventId(Number(eventId));
        navigate(`/calendari?event=${eventId}`, { replace: true });
      } else if (eventId && !selectedEventId) {
        setSelectedEventId(Number(eventId));
      }
    }
  }, [user, navigate, location.pathname, selectedEventId]);

  useEffect(() => {
    if (DEV_MODE) {
      setUser({
        uid: 'dev-user-id',
        email: 'syncrolattex@gmail.com', // Set to an admin email for testing admin view
        name: 'Administrador Local',
        role: 'admin',
        instrument: 'Dolçaina'
      });
      setLoading(false);
      return;
    }

    const mountedRef = { current: true };
    let authSubscription: any = null;

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mountedRef.current) return;
        
        console.log("Checking session on refresh...", session?.user?.email);
        
        if (session?.user) {
          if (!user || user.uid !== session.user.id) {
            await fetchUserData(session.user);
          }
        } else if (user) {
          // If session is gone but user state exists, log out
          console.warn("Session lost, logging out...");
          setUser(null);
          setLoading(false);
        }
      } catch (err) {
        console.error("Session check error:", err);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };

    // Global Alert fetch and subscription
    const fetchAlert = async () => {
      const { data } = await supabase
        .from('global_alerts')
        .select('*')
        .eq('id', 1)
        .single();
      if (data && mountedRef.current) {
        setGlobalAlert(data.active ? data : null);
      }
    };

    fetchAlert();

    const alertChannel = supabase
      .channel('global_alerts_realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'global_alerts' 
      }, (payload) => {
        const newData = payload.new as GlobalAlert;
        if (mountedRef.current) {
          setGlobalAlert(newData.active ? newData : null);
        }
      })
      .subscribe();

    const initializeAuth = async () => {
      // 10s safety timeout for the entire initialization
      const initTimeout = setTimeout(() => {
        if (mountedRef.current) {
          console.warn("Auth initialization safety timeout reached");
          setLoading(false);
        }
      }, 10000);

      try {
        // Step 1: Initial check
        await checkSession();
        
        // Step 2: Only after initial session is handled, setup the listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
          if (!mountedRef.current) return;
          
          console.log("Auth event:", event, currentSession?.user?.email);

          // If session shifted (login/logout), update data
          if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
            if (currentSession?.user) await fetchUserData(currentSession.user);
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
            setLoading(false);
          }
        });
        
        authSubscription = subscription;
      } catch (err) {
        console.error("Auth init error:", err);
        if (mountedRef.current) setLoading(false);
      } finally {
        if (mountedRef.current) {
          clearTimeout(initTimeout);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mountedRef.current = false;
      if (authSubscription) authSubscription.unsubscribe();
    };
  }, []);

  const fetchUserData = async (authUser: any, mountedRef?: { current: boolean }) => {
    try {
      console.log("Fetching data for UID:", authUser.id);
      
      // Use select() instead of single() to avoid 406 error confusion
      let { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('uid', authUser.id);

      if (error) {
        console.error("Supabase select error:", error);
        throw error;
      }

      let userData = users && users.length > 0 ? users[0] : null;

      if (!userData) {
        console.log("User not found in DB, creating profile...");
        // User not found, create it
        const newUser = {
          uid: authUser.id,
          email: authUser.email || '',
          name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Nou Membre',
          role: ADMIN_EMAILS.includes(authUser.email || '') ? 'admin' : 'member',
          instrument: 'Sense assignar'
        };
        
        const { data: insertedUser, error: insertError } = await supabase
          .from('users')
          .insert([newUser])
          .select()
          .single();
          
        if (insertError) {
          console.error("Supabase insert error:", insertError);
          throw insertError;
        }
        userData = insertedUser;
      }

      // Force admin role for users in the list
      if (ADMIN_EMAILS.includes(authUser.email || '') && userData) {
        userData.role = 'admin';
      }
      
      console.log("User dynamic data loaded:", userData);
      setUser(userData);
      setLoading(false);
    } catch (error: any) {
      console.error("Detailed error fetching user data:", error);
      // DON'T set user to null on transient errors to avoid logging them out
      // Only set to null if the error is explicitly an Auth error
      if (error.status === 401 || error.status === 403) {
        setUser(null);
      }
    } finally {
      if (!mountedRef || mountedRef.current) setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f6f6]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d44211]"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const handleLogout = async () => {
    if (DEV_MODE) {
      alert("Estàs en mode desenvolupament. El login està desactivat.");
      return;
    }
    await supabase.auth.signOut();
  };

  const handleUpdateProfile = async (updates: Partial<UserData>) => {
    if (!user) return;
    setUpdatingProfile(true);
    try {
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('uid', user.uid);
        
      if (error) throw error;
      setUser({ ...user, ...updates });
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Error en actualitzar el perfil.");
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleNavigate = (view: View, eventId?: number | null) => {
    if (eventId !== undefined) setSelectedEventId(eventId);
    let path = '/';
    if (view === 'dashboard') path = '/';
    if (view === 'repertoire') path = '/repertori';
    if (view === 'calendar') path = '/calendari' + (eventId ? `?event=${eventId}` : '');
    if (view === 'rehearsal') path = '/assajos';
    if (view === 'polls') path = '/enquestes';
    if (view === 'admin') path = '/admin';
    if (view === 'matrix') path = '/matriu' + (eventId ? `?event=${eventId}` : '');
    navigate(path);
  };

  // Helper for current section title
  const getSectionTitle = () => {
    if (location.pathname === '/' || location.pathname === '/dashboard') return 'Inici';
    if (location.pathname.startsWith('/repertori')) return 'Arxiu Musical';
    if (location.pathname.startsWith('/calendari')) return 'Pròximes Actuacions';
    if (location.pathname.startsWith('/assajos')) return 'Assajos del Dijous';
    if (location.pathname.startsWith('/enquestes')) return 'Enquestes';
    if (location.pathname.startsWith('/admin')) {
      if (currentAdminTab === 'musics') return 'Gestió de Músics';
      if (currentAdminTab === 'alertes') return 'Avís Global';
      return 'Actes i Convocatòries';
    }
    if (location.pathname.startsWith('/matriu')) return 'Matriu de Repertori';
    return 'Colla Guirigall';
  };

  return (
    <div className="min-h-screen bg-[#faf6f0] text-stone-900 font-sans flex flex-col relative">
      
      {/* ─── DESKTOP SIDEBAR ────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-64 xl:w-72 bg-white border-r border-stone-200/80 fixed left-0 top-0 bottom-0 z-30 overflow-y-auto">
        {/* Brand Header */}
        <div className="p-6 border-b border-stone-100 flex items-center gap-3.5 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-10 h-10 rounded-2xl bg-[#c2410c] text-white flex items-center justify-center font-black text-lg shadow-md shadow-[#c2410c]/20">
            G
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#c2410c] leading-none mb-1">
              Colla de Dolçainers i Tabalers
            </p>
            <h1 className="text-base font-black text-stone-900 tracking-tight leading-none">
              Colla Guirigall
            </h1>
          </div>
        </div>

        {/* Quick Widget: Propera Trobada */}
        <div className="p-4 mx-4 mt-4 bg-stone-50/80 border border-stone-200/70 rounded-2xl space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-stone-400">Propera trobada</span>
            <span className="px-2 py-0.5 bg-[#c2410c]/10 text-[#c2410c] text-[9px] font-black rounded-full uppercase">Dijous</span>
          </div>
          <p className="text-xs font-black text-stone-800">Assaig Setmanal</p>
          <div className="flex items-center gap-2 text-[10px] font-semibold text-stone-500">
            <Clock size={12} className="text-stone-400" /> 18:30h - 21:30h
          </div>
          <div className="flex items-center gap-2 text-[10px] font-semibold text-stone-500">
            <MapPin size={12} className="text-stone-400" /> Local de la Colla
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-4 space-y-6 flex-1">
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2">Menú Principal</p>
            
            <button
              onClick={() => navigate('/')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                location.pathname === '/' ? 'bg-[#c2410c] text-white shadow-sm shadow-[#c2410c]/20' : 'text-stone-600 hover:bg-stone-100/80'
              }`}
            >
              <Home size={18} />
              <span>Inici</span>
            </button>

            <button
              onClick={() => navigate('/calendari')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                location.pathname.startsWith('/calendari') ? 'bg-[#c2410c] text-white shadow-sm shadow-[#c2410c]/20' : 'text-stone-600 hover:bg-stone-100/80'
              }`}
            >
              <Calendar size={18} />
              <span>Calendari</span>
            </button>

            <button
              onClick={() => navigate('/assajos')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                location.pathname.startsWith('/assajos') ? 'bg-[#c2410c] text-white shadow-sm shadow-[#c2410c]/20' : 'text-stone-600 hover:bg-stone-100/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users size={18} />
                <span>Assajos</span>
              </div>
              <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-full ${
                location.pathname.startsWith('/assajos') ? 'bg-white/20 text-white' : 'bg-[#c2410c]/10 text-[#c2410c]'
              }`}>
                Avui
              </span>
            </button>

            <button
              onClick={() => navigate('/repertori')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                location.pathname.startsWith('/repertori') ? 'bg-[#c2410c] text-white shadow-sm shadow-[#c2410c]/20' : 'text-stone-600 hover:bg-stone-100/80'
              }`}
            >
              <BookOpen size={18} />
              <span>Repertori</span>
            </button>
          </div>

          {/* Admin Section */}
          {user.role === 'admin' && (
            <div className="space-y-1">
              <p className="px-3 text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2">Administració</p>
              
              <button
                onClick={() => navigate('/admin?tab=convocatories')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  location.pathname === '/admin' && currentAdminTab === 'convocatories'
                    ? 'bg-[#c2410c] text-white shadow-sm shadow-[#c2410c]/20'
                    : 'text-stone-600 hover:bg-stone-100/80'
                }`}
              >
                <Calendar size={18} />
                <span>Actes i Convocatòries</span>
              </button>

              <button
                onClick={() => navigate('/admin?tab=musics')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  location.pathname === '/admin' && currentAdminTab === 'musics'
                    ? 'bg-[#c2410c] text-white shadow-sm shadow-[#c2410c]/20'
                    : 'text-stone-600 hover:bg-stone-100/80'
                }`}
              >
                <Users size={18} />
                <span>Gestió de Músics</span>
              </button>

              <button
                onClick={() => navigate('/admin?tab=alertes')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  location.pathname === '/admin' && currentAdminTab === 'alertes'
                    ? 'bg-[#c2410c] text-white shadow-sm shadow-[#c2410c]/20'
                    : 'text-stone-600 hover:bg-stone-100/80'
                }`}
              >
                <Bell size={18} />
                <span>Avís Global</span>
              </button>

              <button
                onClick={() => navigate('/enquestes')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  location.pathname.startsWith('/enquestes')
                    ? 'bg-[#c2410c] text-white shadow-sm shadow-[#c2410c]/20'
                    : 'text-stone-600 hover:bg-stone-100/80'
                }`}
              >
                <BarChart3 size={18} />
                <span>Enquestes</span>
              </button>

              <button
                onClick={() => navigate('/matriu')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  location.pathname.startsWith('/matriu')
                    ? 'bg-[#c2410c] text-white shadow-sm shadow-[#c2410c]/20'
                    : 'text-stone-600 hover:bg-stone-100/80'
                }`}
              >
                <Music size={18} />
                <span>Matriu de Veus</span>
              </button>
            </div>
          )}

          {/* Widget: Avisos de Direcció */}
          <div className="p-3.5 bg-amber-50/70 border border-amber-200/60 rounded-2xl space-y-1">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-[11px]">
              <Info size={14} />
              <span>Avisos de Direcció</span>
            </div>
            <p className="text-[10px] text-amber-900/80 leading-relaxed">
              Recordeu portar la canya nova i les baquetes de recanvi per a la prova acústica.
            </p>
          </div>
        </nav>

        {/* User Card Bottom */}
        <div className="p-4 border-t border-stone-100 bg-stone-50/50 flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
            onClick={() => setIsProfileOpen(true)}
          >
            <div className="w-9 h-9 rounded-full bg-[#c2410c]/15 text-[#c2410c] font-black text-xs flex items-center justify-center border border-[#c2410c]/20">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-stone-900 truncate">{user.name}</p>
              <p className="text-[10px] text-stone-400 font-semibold uppercase">{user.role === 'admin' ? 'Cap de Colla' : user.instrument}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Tancar sessió"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* ─── MAIN CONTENT AREA ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64 xl:pl-72 w-full">
        
        {/* Top Header Desktop */}
        <header className="hidden lg:flex sticky top-0 z-20 items-center justify-between px-8 py-4 bg-white/80 backdrop-blur-md border-b border-stone-200/60 w-full">
          <div className="flex items-center gap-3 text-xs font-semibold text-stone-400">
            <span className="hover:text-stone-700 cursor-pointer" onClick={() => navigate('/')}>Inici</span>
            <ChevronRight size={14} />
            <span className="text-stone-900 font-bold">{getSectionTitle()}</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Portal Actiu</span>
            </div>

            <div className="h-4 w-px bg-stone-200"></div>

            <NotificationBell user={user} onNavigate={handleNavigate} />

            <button
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-full border border-stone-200 hover:border-stone-300 bg-white transition-all shadow-sm cursor-pointer"
            >
              <div className="w-6 h-6 rounded-full bg-[#c2410c] text-white text-[10px] font-black flex items-center justify-center">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-bold text-stone-700 max-w-[120px] truncate">{user.name.split(' ')[0]}</span>
            </button>
          </div>
        </header>

        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white/95 backdrop-blur-md border-b border-stone-200/80">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-8 h-8 rounded-xl bg-[#c2410c] text-white flex items-center justify-center font-black text-sm">
              G
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-[#c2410c] leading-none">Colla Guirigall</p>
              <h2 className="text-sm font-black text-stone-900 leading-tight">{getSectionTitle()}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell user={user} onNavigate={handleNavigate} />
            <button
              onClick={() => setIsProfileOpen(true)}
              className="w-8 h-8 rounded-full bg-[#c2410c]/10 text-[#c2410c] border border-[#c2410c]/20 font-black text-xs flex items-center justify-center"
            >
              {user.name.charAt(0).toUpperCase()}
            </button>
          </div>
        </header>

        {/* Global Alert Banner */}
        {globalAlert && (
          <div className={`px-4 py-2.5 flex items-center justify-center gap-2.5 text-xs font-bold z-20 border-b ${
            globalAlert.type === 'danger' ? 'border-red-200 text-red-800 bg-red-50' : 
            globalAlert.type === 'info' ? 'border-blue-200 text-blue-800 bg-blue-50' : 
            'border-amber-200 text-amber-800 bg-amber-50'
          }`}>
            <AlertTriangle size={15} />
            <p className="flex-1 text-center">{globalAlert.message}</p>
          </div>
        )}

        {/* Page Content */}
        <main className={`flex-1 w-full pb-24 lg:pb-12 ${
          location.pathname.startsWith('/matriu')
            ? 'p-4 sm:p-6 lg:p-8'
            : 'max-w-7xl mx-auto p-4 sm:p-6 lg:p-8'
        }`}>
          <Routes>
            <Route path="/" element={<Dashboard setView={(v) => handleNavigate(v)} user={user} />} />
            <Route path="/repertori" element={<Repertoire user={user} onNavigate={handleNavigate} />} />
            <Route path="/calendari" element={<CalendarView user={user} selectedEventId={selectedEventId} setSelectedEventId={setSelectedEventId} />} />
            <Route path="/assajos" element={<Rehearsal user={user} onNavigate={handleNavigate} />} />
            <Route path="/enquestes" element={<PollsView user={user} />} />
            <Route path="/admin" element={user.role === 'admin' ? <Admin user={user} setView={(v) => handleNavigate(v)} setSelectedEventId={setSelectedEventId} /> : <Navigate to="/" replace />} />
            <Route path="/matriu" element={<RepertoireMatrix user={user} eventId={selectedEventId} onBack={() => navigate(-1)} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {/* Global Footer */}
        <footer className="mt-auto py-8 pb-24 lg:pb-8 w-full bg-white border-t border-slate-100 flex flex-col items-center justify-center gap-4">
          <div className="flex items-center gap-6">
            <a href="https://www.facebook.com/collaguirigalldalcasser/" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-[#1877F2] transition-colors" title="Facebook">
              <Facebook size={20} />
            </a>
            <a href="https://www.instagram.com/colla_guirigall/" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-[#E4405F] transition-colors" title="Instagram">
              <Instagram size={20} />
            </a>
          </div>
          <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 text-center">
            &copy; {new Date().getFullYear()} Colla Guirigall d'Alcàsser. Tots els drets reservats.
          </p>
        </footer>
      </div>

      {/* ─── MOBILE BOTTOM NAVIGATION BAR ─────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200/80 px-2 py-1.5 flex justify-around items-center shadow-lg shadow-stone-900/5">
        <button
          onClick={() => navigate('/')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            location.pathname === '/' ? 'text-[#c2410c] font-black' : 'text-stone-400 hover:text-stone-600 font-semibold'
          }`}
        >
          <Home size={20} strokeWidth={location.pathname === '/' ? 2.5 : 2} />
          <span className="text-[10px] tracking-tight">Inici</span>
        </button>

        <button
          onClick={() => navigate('/calendari')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            location.pathname.startsWith('/calendari') ? 'text-[#c2410c] font-black' : 'text-stone-400 hover:text-stone-600 font-semibold'
          }`}
        >
          <Calendar size={20} strokeWidth={location.pathname.startsWith('/calendari') ? 2.5 : 2} />
          <span className="text-[10px] tracking-tight">Calendari</span>
        </button>

        <button
          onClick={() => navigate('/assajos')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            location.pathname.startsWith('/assajos') ? 'text-[#c2410c] font-black' : 'text-stone-400 hover:text-stone-600 font-semibold'
          }`}
        >
          <Users size={20} strokeWidth={location.pathname.startsWith('/assajos') ? 2.5 : 2} />
          <span className="text-[10px] tracking-tight">Assajos</span>
        </button>

        <button
          onClick={() => navigate('/repertori')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            location.pathname.startsWith('/repertori') ? 'text-[#c2410c] font-black' : 'text-stone-400 hover:text-stone-600 font-semibold'
          }`}
        >
          <BookOpen size={20} strokeWidth={location.pathname.startsWith('/repertori') ? 2.5 : 2} />
          <span className="text-[10px] tracking-tight">Repertori</span>
        </button>

        <button
          onClick={() => setIsProfileOpen(true)}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            isProfileOpen ? 'text-[#c2410c] font-black' : 'text-stone-400 hover:text-stone-600 font-semibold'
          }`}
        >
          <User size={20} strokeWidth={isProfileOpen ? 2.5 : 2} />
          <span className="text-[10px] tracking-tight">Perfil</span>
        </button>
      </nav>

      {/* Profile Modal */}
      {isProfileOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
              <h3 className="text-lg font-black text-stone-900 tracking-tight">El meu perfil</h3>
              <button onClick={() => setIsProfileOpen(false)} className="text-stone-400 hover:text-stone-600 p-1">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black text-stone-500 uppercase tracking-wider mb-1">Nom complet</label>
                <div className="relative group">
                  <input
                    type="text"
                    defaultValue={user.name}
                    placeholder="El teu nom o el del teu fill"
                    onBlur={(e) => {
                      if (e.target.value !== user.name && e.target.value.trim() !== "") {
                        handleUpdateProfile({ name: e.target.value.trim() });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const target = e.target as HTMLInputElement;
                        if (target.value !== user.name && target.value.trim() !== "") {
                          handleUpdateProfile({ name: target.value.trim() });
                          target.blur();
                        }
                      }
                    }}
                    disabled={updatingProfile}
                    className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-2xl text-sm font-bold focus:bg-white focus:border-[#c2410c] focus:outline-none transition-all placeholder:text-stone-300 pr-10"
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#c2410c]">
                    {updatingProfile ? (
                      <div className="w-4 h-4 border-2 border-[#c2410c]/30 border-t-[#c2410c] rounded-full animate-spin"></div>
                    ) : (
                      <Pencil size={16} className="opacity-40 group-focus-within:opacity-100 transition-opacity" />
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-stone-400 mt-1">Aquest és el nom visible per a les convocatòries.</p>
              </div>
              <div>
                <label className="block text-xs font-black text-stone-500 uppercase tracking-wider mb-1">Correu electrònic</label>
                <div className="p-3 bg-stone-50 border border-stone-200/70 rounded-xl text-stone-400 text-xs font-medium cursor-not-allowed">{user.email}</div>
              </div>
              <div>
                <label className="block text-xs font-black text-stone-500 uppercase tracking-wider mb-1">El meu instrument</label>
                <select 
                  value={user.instrument}
                  onChange={(e) => handleUpdateProfile({ instrument: e.target.value })}
                  disabled={updatingProfile}
                  className="w-full p-3 border border-stone-200 rounded-xl focus:ring-[#c2410c] focus:border-[#c2410c] bg-white font-bold text-xs"
                >
                  <option value="Sense assignar">Sense assignar</option>
                  <option value="Dolçaina">Dolçaina</option>
                  <option value="Tabal">Tabal</option>
                </select>
              </div>
              {DEV_MODE && (
                <div>
                  <label className="block text-xs font-black text-amber-800 uppercase tracking-wider mb-1">Rol (Només DEV)</label>
                  <select 
                    value={user.role}
                    onChange={(e) => setUser({...user, role: e.target.value as 'admin' | 'member'})}
                    className="w-full p-3 border border-amber-200 rounded-xl focus:ring-amber-500 focus:border-amber-500 bg-amber-50 font-medium text-amber-900 text-xs"
                  >
                    <option value="admin">Administrador</option>
                    <option value="member">Usuari (Membre)</option>
                  </select>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-stone-100 bg-stone-50/50 flex justify-end">
              <button onClick={() => setIsProfileOpen(false)} className="px-5 py-2.5 bg-[#c2410c] text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-[#9a3412] transition-colors shadow-sm">
                Fet
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
