import { useState, useEffect, useRef } from 'react';
import { Music, LogOut, X, Pencil, AlertTriangle, Info, Menu } from 'lucide-react';
import { supabase } from './supabaseClient';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
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

  return (
    <div className="min-h-screen bg-[#f8f6f6] text-slate-900 font-sans flex flex-col relative">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-white/90 backdrop-blur-md border-b border-[#d44211]/10">
        <div className="flex items-center gap-2 sm:gap-3 text-[#d44211] cursor-pointer" onClick={() => navigate('/')}>
          <div className="relative w-8 h-8 sm:w-9 sm:h-9 bg-white rounded-full flex items-center justify-center text-[#d44211] shadow-lg shadow-[#d44211]/20 overflow-hidden border border-[#d44211]/20">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-cover relative z-10" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
            <Music size={18} className="absolute z-0 hidden" />
          </div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Guirigall</h2>
        </div>
        
        <div className="hidden md:flex items-center gap-8">
          <nav className="flex items-center gap-6">
            <button onClick={() => navigate('/')} className={`text-sm font-bold tracking-tight ${location.pathname === '/' ? 'text-[#d44211] border-b-2 border-[#d44211] pb-1' : 'text-slate-600 hover:text-[#d44211]'}`}>Inici</button>
            <button onClick={() => navigate('/repertori')} className={`text-sm font-bold tracking-tight ${location.pathname.startsWith('/repertori') ? 'text-[#d44211] border-b-2 border-[#d44211] pb-1' : 'text-slate-600 hover:text-[#d44211]'}`}>Repertori</button>
            <button onClick={() => navigate('/calendari')} className={`text-sm font-bold tracking-tight ${location.pathname.startsWith('/calendari') ? 'text-[#d44211] border-b-2 border-[#d44211] pb-1' : 'text-slate-600 hover:text-[#d44211]'}`}>Calendari</button>
            <button onClick={() => navigate('/assajos')} className={`text-sm font-bold tracking-tight ${location.pathname.startsWith('/assajos') ? 'text-[#d44211] border-b-2 border-[#d44211] pb-1' : 'text-slate-600 hover:text-[#d44211]'}`}>Obres i Assajos</button>
            <button onClick={() => navigate('/enquestes')} className={`text-sm font-bold tracking-tight ${location.pathname.startsWith('/enquestes') ? 'text-[#d44211] border-b-2 border-[#d44211] pb-1' : 'text-slate-600 hover:text-[#d44211]'}`}>Enquestes</button>
            {user.role === 'admin' && (
              <button onClick={() => navigate('/admin')} className={`text-sm font-bold tracking-tight ${location.pathname.startsWith('/admin') ? 'text-[#d44211] border-b-2 border-[#d44211] pb-1' : 'text-slate-600 hover:text-[#d44211]'}`}>Admin</button>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <NotificationBell user={user} onNavigate={handleNavigate} />
          <button 
            onClick={() => setIsProfileOpen(true)}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#d44211]/20 border-2 border-[#d44211] overflow-hidden flex items-center justify-center text-[#d44211] font-black text-sm sm:text-base hover:bg-[#d44211]/30 transition-all active:scale-95 cursor-pointer shadow-sm"
            title="El meu perfil"
          >
            {user.name.charAt(0).toUpperCase()}
          </button>
          <button onClick={handleLogout} className="hidden md:flex w-8 h-8 sm:w-10 sm:h-10 items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors" title="Tancar sessió">
            <LogOut size={18} sm:size={20} />
          </button>
          
          {/* Mobile Menu Toggle */}
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)} 
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 transition-colors ml-1"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-[60px] sm:top-[68px] left-0 right-0 bg-white shadow-xl border-b border-slate-100 z-40 animate-in slide-in-from-top-2">
          <nav className="flex flex-col p-4 space-y-1">
            <button onClick={() => navigate('/')} className={`p-4 flex items-center text-left rounded-xl font-bold ${location.pathname === '/' ? 'bg-[#d44211]/10 text-[#d44211]' : 'text-slate-700 hover:bg-slate-50'}`}>Inici</button>
            <button onClick={() => navigate('/repertori')} className={`p-4 flex items-center text-left rounded-xl font-bold ${location.pathname.startsWith('/repertori') ? 'bg-[#d44211]/10 text-[#d44211]' : 'text-slate-700 hover:bg-slate-50'}`}>Repertori</button>
            <button onClick={() => navigate('/calendari')} className={`p-4 flex items-center text-left rounded-xl font-bold ${location.pathname.startsWith('/calendari') ? 'bg-[#d44211]/10 text-[#d44211]' : 'text-slate-700 hover:bg-slate-50'}`}>Calendari</button>
            <button onClick={() => navigate('/assajos')} className={`p-4 flex items-center text-left rounded-xl font-bold ${location.pathname.startsWith('/assajos') ? 'bg-[#d44211]/10 text-[#d44211]' : 'text-slate-700 hover:bg-slate-50'}`}>Obres i Assajos</button>
            <button onClick={() => navigate('/enquestes')} className={`p-4 flex items-center text-left rounded-xl font-bold ${location.pathname.startsWith('/enquestes') ? 'bg-[#d44211]/10 text-[#d44211]' : 'text-slate-700 hover:bg-slate-50'}`}>Enquestes</button>
            {user.role === 'admin' && (
              <button onClick={() => navigate('/admin')} className={`p-4 flex items-center text-left rounded-xl font-bold ${location.pathname.startsWith('/admin') ? 'bg-[#d44211]/10 text-[#d44211]' : 'text-slate-700 hover:bg-slate-50'}`}>Admin</button>
            )}
            <div className="h-px bg-slate-100 my-2"></div>
            <button onClick={handleLogout} className="p-4 flex items-center text-left rounded-xl font-bold text-red-600 hover:bg-red-50">Tancar sessió</button>
          </nav>
        </div>
      )}
      
      {/* Global Alert Banner */}
      {globalAlert && (
        <div className={`px-4 py-3 flex items-center justify-center gap-3 text-sm font-bold shadow-lg z-40 sticky top-[65px] sm:top-[73px] bg-white border-b-2 ${
          globalAlert.type === 'danger' ? 'border-red-500 text-red-700 bg-red-50' : 
          globalAlert.type === 'info' ? 'border-blue-500 text-blue-700 bg-blue-50' : 
          'border-[#d44211] text-[#d44211] bg-[#d44211]/5'
        }`}>
          {globalAlert.type === 'danger' ? <AlertTriangle size={18} /> : 
           globalAlert.type === 'info' ? <Info size={18} /> : 
           <AlertTriangle size={18} />}
          <p className="flex-1 text-center">{globalAlert.message}</p>
        </div>
      )}

      <main className="flex-1 w-full flex flex-col">
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

      {/* Profile Modal */}
      {isProfileOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-[#f8f6f6]">
              <h3 className="text-xl font-bold text-slate-900">El meu perfil</h3>
              <button onClick={() => setIsProfileOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
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
                    className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl text-sm font-bold focus:bg-white focus:border-[#d44211] focus:outline-none transition-all placeholder:text-slate-300 pr-12"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#d44211]">
                    {updatingProfile ? (
                      <div className="w-5 h-5 border-2 border-[#d44211]/30 border-t-[#d44211] rounded-full animate-spin"></div>
                    ) : (
                      <Pencil size={18} className="opacity-30 group-focus-within:opacity-100 transition-opacity" />
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Aquest és el nom que veuran els administradors.</p>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Correu</label>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-400 font-medium cursor-not-allowed">{user.email}</div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">El meu instrument</label>
                <select 
                  value={user.instrument}
                  onChange={(e) => handleUpdateProfile({ instrument: e.target.value })}
                  disabled={updatingProfile}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-[#d44211] focus:border-[#d44211] bg-white font-medium"
                >
                  <option value="Sense assignar">Sense assignar</option>
                  <option value="Dolçaina">Dolçaina</option>
                  <option value="Tabal">Tabal</option>
                </select>
              </div>
              {DEV_MODE && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Rol (Només DEV)</label>
                  <select 
                    value={user.role}
                    onChange={(e) => setUser({...user, role: e.target.value as 'admin' | 'member'})}
                    className="w-full p-3 border border-amber-200 rounded-xl focus:ring-amber-500 focus:border-amber-500 bg-amber-50 font-medium text-amber-900"
                  >
                    <option value="admin">Administrador</option>
                    <option value="member">Usuari (Membre)</option>
                  </select>
                  <p className="text-[10px] text-amber-600 mt-1 italic">Aquest selector només apareix en mode desenvolupament.</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-100 bg-[#f8f6f6] flex justify-end">
              <button onClick={() => setIsProfileOpen(false)} className="px-6 py-3 bg-[#d44211] text-white font-bold rounded-xl hover:bg-[#d44211]/90 transition-colors shadow-lg shadow-[#d44211]/20">
                Tancar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
