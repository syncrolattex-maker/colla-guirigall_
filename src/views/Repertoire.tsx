import React, { useState, useEffect } from 'react';
import { Search, FileText, Headphones, PlayCircle, Plus, X, Upload, Play, Pause, Volume2, SlidersHorizontal, ExternalLink, Download, Disc, ArrowUpDown, ChevronDown } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { withTimeout, useAppFocusRefresh, useRealtimeChannels } from '../utils/viewHelpers';
import { UserData } from '../App';

interface RepertoireProps {
  user: UserData;
  onNavigate?: (view: any, eventId?: number | null) => void;
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
  mp3_url: string;
  youtube_url: string;
  added_by: string;
  created_at: string;
}

export default function Repertoire({ user, onNavigate }: RepertoireProps) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<string>('Tots');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('Totes');
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [selectedSongPreview, setSelectedSongPreview] = useState<Song | null>(null);
  const [existingPdfs, setExistingPdfs] = useState<SongPdf[]>([]);
  const [removeMp3, setRemoveMp3] = useState(false);
  const [userAssignments, setUserAssignments] = useState<Record<number, string>>({}); // songId -> voice
  
  const [newSong, setNewSong] = useState({
    title: '',
    composer: '',
    style: '',
    youtubeUrl: ''
  });
  
  const [pdfFiles, setPdfFiles] = useState<{ instrument: string, file: File }[]>([]);
  const [mp3File, setMp3File] = useState<File | null>(null);
  const [activeAudio, setActiveAudio] = useState<{url: string, title: string} | null>(null);
  const [activeVideo, setActiveVideo] = useState<{url: string, title: string} | null>(null);

  const fetchSongs = async () => {
    try {
      const { data, error } = await withTimeout(supabase
        .from('songs')
        .select('*')
        .order('created_at', { ascending: false }));

      if (error) {
        console.error("Error fetching songs:", error);
      } else {
        setSongs(data || []);
      }
    } catch (e) {
      console.error("Error fetching songs:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    try {
      const { data, error } = await withTimeout(supabase
        .from('repertoire_assignments')
        .select('song_id, voice')
        .eq('user_id', user.uid));

      if (error) {
        console.error("Error fetching assignments:", error);
      } else {
        const map: Record<number, string> = {};
        data?.forEach(a => { map[a.song_id] = a.voice; });
        setUserAssignments(map);
      }
    } catch (e) {
      console.error("Error fetching assignments:", e);
    }
  };

  const refreshAll = () => {
    fetchSongs();
    fetchAssignments();
  };

  useAppFocusRefresh(refreshAll);

  useRealtimeChannels([
    { name: 'repertoire-songs', table: 'songs', onEvent: fetchSongs },
    { name: 'repertoire-assignments', table: 'repertoire_assignments', filter: `user_id=eq.${user.uid}`, onEvent: fetchAssignments },
  ]);

  useEffect(() => {
    fetchSongs();
    fetchAssignments();
  }, []);

  const sanitizeFilename = (filename: string) => {
    return filename
      .normalize('NFD') // Normalize to decomposable form
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace any non-alphanumeric (except dot and dash) with underscore
      .replace(/_{2,}/g, '_'); // Replace multiple underscores with a single one
  };

  const handleSubmitSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSong.title) return;

    setUploading(true);
    try {
      console.log(editingSong ? "Updating song..." : "Adding song...", newSong);
      
      // Keep existing PDFs that weren't deleted
      let pdfs: SongPdf[] = [...existingPdfs];
      let mp3_url = removeMp3 ? '' : (editingSong?.mp3_url || '');

      // Upload new PDFs
      for (const pdf of pdfFiles) {
        if (!pdf.file || pdf.file.size === 0) continue;
        
        const fileName = `${Date.now()}_${sanitizeFilename(pdf.file.name)}`;
        console.log("Uploading PDF:", fileName);
        const { error: uploadError } = await supabase.storage
          .from('repertoire')
          .upload(fileName, pdf.file);
          
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage
          .from('repertoire')
          .getPublicUrl(fileName);
          
        pdfs.push({ instrument: pdf.instrument, url: urlData.publicUrl });
      }

      // Upload new MP3 if provided
      if (mp3File) {
        const fileName = `${Date.now()}_${sanitizeFilename(mp3File.name)}`;
        console.log("Uploading MP3:", fileName);
        const { error: uploadError } = await supabase.storage
          .from('repertoire')
          .upload(fileName, mp3File);
          
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage
          .from('repertoire')
          .getPublicUrl(fileName);
        mp3_url = urlData.publicUrl;
      }

      const songData = {
        title: newSong.title,
        composer: newSong.composer,
        style: newSong.style,
        youtube_url: newSong.youtubeUrl,
        pdfs,
        mp3_url,
        added_by: user.name
      };

      if (editingSong) {
        console.log("Saving changes to DB for song:", editingSong.id);
        const { error: updateError } = await supabase
          .from('songs')
          .update(songData)
          .eq('id', editingSong.id);
          
        if (updateError) throw updateError;
        console.log("Song updated successfully!");
      } else {
        console.log("Inserting new song into DB...");
        const { error: insertError } = await supabase
          .from('songs')
          .insert([songData]);
          
        if (insertError) throw insertError;
        console.log("Song added successfully!");
      }
      
      handleCloseModal();
      await fetchSongs();
    } catch (error: any) {
      console.error("Error saving song:", error);
      alert(`Error en desar la cançó: ${error.message || error.error_description || JSON.stringify(error)}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteSong = async (id: number) => {
    if (!confirm("Estàs segur que vols eliminar aquesta cançó?")) return;
    
    try {
      const { error } = await supabase.from('songs').delete().eq('id', id);
      if (error) throw error;
      await fetchSongs();
    } catch (error: any) {
      console.error("Error deleting song:", error);
      alert("Error en eliminar la cançó.");
    }
  };

  const handleOpenEdit = (song: Song) => {
    setEditingSong(song);
    setNewSong({
      title: song.title,
      composer: song.composer || '',
      style: song.style || '',
      youtubeUrl: song.youtube_url || ''
    });
    setExistingPdfs(song.pdfs || []);
    setRemoveMp3(false);
    setIsAdding(true);
  };

  const handleCloseModal = () => {
    setIsAdding(false);
    setEditingSong(null);
    setNewSong({ title: '', composer: '', style: '', youtubeUrl: '' });
    setPdfFiles([]);
    setExistingPdfs([]);
    setMp3File(null);
    setRemoveMp3(false);
  };

  const toggleAudio = (url: string, title: string) => {
    if (activeAudio?.url === url) {
      setActiveAudio(null);
    } else {
      setActiveAudio({ url, title });
      setActiveVideo(null); // Stop video if audio starts
    }
  };

  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const toggleVideo = (url: string, title: string) => {
    if (activeVideo?.url === url) {
      setActiveVideo(null);
    } else {
      setActiveVideo({ url, title });
      setActiveAudio(null); // Stop audio if video starts
    }
  };

  // Filtered by search term, style and difficulty
  const stylesList = ['Tots', 'Cercavila', 'Processó', 'Moros i Cristians', 'Balls', 'Sardana'];

  const filteredSongs = songs.filter(song => {
    const matchesSearch = song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (song.composer && song.composer.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (song.style && song.style.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStyle = selectedStyle === 'Tots' || (song.style && song.style.toLowerCase().includes(selectedStyle.toLowerCase()));
    return matchesSearch && matchesStyle;
  });

  const activePreviewSong = selectedSongPreview || (filteredSongs.length > 0 ? filteredSongs[0] : null);

  const getStyleBadgeClass = (styleName: string = '') => {
    const s = styleName.toLowerCase();
    if (s.includes('sardana')) return 'bg-orange-50 text-orange-800 border-orange-200/60';
    if (s.includes('cercavila')) return 'bg-amber-50 text-amber-800 border-amber-200/60';
    if (s.includes('moros')) return 'bg-rose-50 text-rose-800 border-rose-200/60';
    if (s.includes('ball')) return 'bg-emerald-50 text-emerald-800 border-emerald-200/60';
    if (s.includes('processó') || s.includes('processo')) return 'bg-purple-50 text-purple-800 border-purple-200/60';
    return 'bg-stone-100 text-stone-700 border-stone-200';
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-6 rounded-lg bg-[#c2410c]/10 text-[#c2410c] flex items-center justify-center">
              <Disc size={14} />
            </span>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#c2410c]">Colla Guirigall · Dolçaines i Tabals</p>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">Arxiu Musical</h1>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigate && onNavigate('matrix')}
            className="px-4 py-2.5 bg-white text-stone-700 font-bold rounded-2xl border border-stone-200 hover:bg-stone-50 transition-all text-xs flex items-center gap-2 shadow-sm"
          >
            <FileText size={16} /> Matriu de Veus
          </button>
          {user.role === 'admin' && (
            <button 
              onClick={() => setIsAdding(true)}
              className="px-5 py-2.5 bg-[#c2410c] text-white font-bold rounded-2xl hover:bg-[#9a3412] transition-all flex items-center gap-2 text-xs shadow-sm shadow-[#c2410c]/20"
            >
              <Plus size={16} /> Nova Obra
            </button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-[#c2410c]">
            <Search size={18} />
          </div>
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full p-3.5 pl-11 pr-11 text-sm text-stone-900 bg-white border border-stone-200/80 rounded-2xl focus:ring-2 focus:ring-[#c2410c]/20 focus:border-[#c2410c] placeholder-stone-400 shadow-sm" 
            placeholder="Cercar per obra, compositor, estil..." 
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-4 text-stone-400">
            <SlidersHorizontal size={18} />
          </div>
        </div>

        {/* Style Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {stylesList.map((style) => (
            <button
              key={style}
              onClick={() => setSelectedStyle(style)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                selectedStyle === style
                  ? 'bg-[#c2410c] text-white shadow-sm shadow-[#c2410c]/20'
                  : 'bg-white text-stone-600 border border-stone-200/70 hover:bg-stone-50'
              }`}
            >
              {style}
            </button>
          ))}
        </div>
      </div>

      {/* Repertoire Counter & Sort Bar */}
      <div className="flex items-center justify-between text-xs border-b border-stone-200/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Repertori disponible</span>
          <span className="px-2 py-0.5 bg-stone-100 text-stone-700 rounded-full font-black text-[10px]">{filteredSongs.length} obres</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-bold text-stone-500">
          <span>Ordenat per:</span>
          <span className="text-[#c2410c] font-black cursor-pointer">Títol (A-Z)</span>
        </div>
      </div>

      {/* Main Grid: Repertoire Cards + Quick Preview Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Cards List */}
        <div className="lg:col-span-7 space-y-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#c2410c]/20 border-t-[#c2410c]"></div>
            </div>
          ) : filteredSongs.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-stone-200/70 p-8 space-y-2">
              <Disc size={36} className="mx-auto text-stone-300" />
              <p className="font-bold text-stone-700">No s'han trobat obres amb aquests filtres.</p>
              <p className="text-xs text-stone-400">Prova d'esborrar el text de cerca o canviar l'estil seleccionat.</p>
            </div>
          ) : (
            filteredSongs.map((song) => {
              const isSelected = activePreviewSong?.id === song.id;
              return (
                <div 
                  key={song.id}
                  onClick={() => setSelectedSongPreview(song)}
                  className={`bg-white rounded-3xl p-5 border transition-all cursor-pointer card-warm ${
                    isSelected 
                      ? 'border-[#c2410c] ring-2 ring-[#c2410c]/15 shadow-md shadow-[#c2410c]/5' 
                      : 'border-stone-200/80 hover:border-stone-300'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {isSelected && (
                          <span className="px-2 py-0.5 bg-[#c2410c] text-white text-[9px] font-black uppercase rounded-full tracking-wider">
                            Seleccionada
                          </span>
                        )}
                        <span className={`tag-badge border ${getStyleBadgeClass(song.style)}`}>
                          {song.style || 'Colla'}
                        </span>
                        {userAssignments[song.id] && (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 text-[9px] font-black rounded-full uppercase">
                            Veu {userAssignments[song.id]}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base sm:text-lg font-black text-stone-900 tracking-tight truncate">
                        {song.title}
                      </h3>
                      <p className="text-xs text-stone-500 font-medium">
                        {song.composer || 'Tradicional'} {song.style && `· ${song.style}`}
                      </p>
                    </div>
                  </div>

                  {/* Instrument Tags */}
                  <div className="flex items-center gap-1.5 flex-wrap my-3 text-[10px] font-bold text-stone-500">
                    <span className="text-stone-400 font-semibold mr-1">Instrumentació:</span>
                    {song.pdfs && song.pdfs.length > 0 ? (
                      song.pdfs.map((pdf, idx) => (
                        <span key={idx} className="px-2.5 py-1 bg-stone-50 border border-stone-200/70 rounded-lg text-stone-700">
                          {pdf.instrument}
                        </span>
                      ))
                    ) : (
                      <>
                        <span className="px-2.5 py-1 bg-stone-50 border border-stone-200/70 rounded-lg text-stone-700">Dolçaina 1a</span>
                        <span className="px-2.5 py-1 bg-stone-50 border border-stone-200/70 rounded-lg text-stone-700">Dolçaina 2a</span>
                        <span className="px-2.5 py-1 bg-stone-50 border border-stone-200/70 rounded-lg text-stone-700">Tabal</span>
                      </>
                    )}
                  </div>

                  {/* Actions Row */}
                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      {song.pdfs && song.pdfs.length > 0 ? (
                        <a 
                          href={song.pdfs[0].url}
                          target="_blank" 
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                            isSelected 
                              ? 'bg-[#c2410c] text-white hover:bg-[#9a3412] shadow-sm' 
                              : 'bg-stone-50 border border-stone-200/70 text-stone-800 hover:bg-stone-100'
                          }`}
                        >
                          <FileText size={15} /> Partitura {song.pdfs.length > 1 ? `(${song.pdfs.length})` : 'PDF'}
                        </a>
                      ) : (
                        <span className="px-3 py-2 bg-stone-50 text-stone-400 rounded-xl text-xs font-medium italic border border-stone-100">
                          Sense PDF
                        </span>
                      )}

                      {song.mp3_url && (
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleAudio(song.mp3_url, song.title); }}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                            activeAudio?.url === song.mp3_url
                              ? 'bg-[#c2410c] text-white shadow-sm'
                              : 'bg-orange-50 text-[#c2410c] hover:bg-orange-100 border border-orange-100'
                          }`}
                          title={activeAudio?.url === song.mp3_url ? 'Pausar àudio' : 'Escoltar àudio'}
                        >
                          {activeAudio?.url === song.mp3_url ? <Pause size={16} /> : <Play size={16} />}
                        </button>
                      )}

                      {song.youtube_url && (
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleVideo(song.youtube_url, song.title); }}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                            activeVideo?.url === song.youtube_url
                              ? 'bg-red-600 text-white shadow-sm'
                              : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200/60'
                          }`}
                          title="Veure vídeo"
                        >
                          <PlayCircle size={16} />
                        </button>
                      )}
                    </div>

                    {user.role === 'admin' && (
                      <div className="flex items-center gap-1 text-[11px] font-bold" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handleOpenEdit(song)} className="px-2 py-1 text-stone-500 hover:text-stone-900">
                          Editar
                        </button>
                        <button onClick={() => handleDeleteSong(song.id)} className="px-2 py-1 text-red-600 hover:text-red-700">
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Previsualització Ràpida (Captura 2) */}
        <div className="lg:col-span-5 sticky top-24">
          {activePreviewSong ? (
            <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-sm card-warm space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-[#c2410c]/10 text-[#c2410c] flex items-center justify-center">
                    <FileText size={15} />
                  </span>
                  <h4 className="text-xs font-black uppercase tracking-wider text-stone-900">Previsualització Ràpida</h4>
                </div>
                <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[9px] font-black uppercase rounded-full">
                  Actualitzada
                </span>
              </div>

              {/* Technical Sheet */}
              <div>
                <span className={`tag-badge border ${getStyleBadgeClass(activePreviewSong.style)}`}>
                  {activePreviewSong.style || 'Colla'}
                </span>
                <h3 className="text-xl font-black text-stone-900 tracking-tight mt-1">
                  {activePreviewSong.title}
                </h3>
                <p className="text-xs text-stone-500 font-medium mt-0.5">
                  Compositor: {activePreviewSong.composer || 'Tradicional'} · Tonalitat: Fa Major / 4/4
                </p>
              </div>

              {/* Sheet preview representation */}
              <div className="p-5 bg-stone-50/80 border border-stone-200/70 rounded-2xl text-center space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Colla de Dolçainers i Tabalers</p>
                <p className="font-serif font-black text-sm tracking-wider text-stone-800 uppercase">{activePreviewSong.title}</p>
                <div className="space-y-1.5 py-2">
                  <div className="h-0.5 bg-stone-300 w-full rounded"></div>
                  <div className="h-0.5 bg-stone-300 w-full rounded"></div>
                  <div className="h-0.5 bg-stone-300 w-full rounded"></div>
                  <div className="h-0.5 bg-stone-300 w-full rounded"></div>
                  <div className="h-0.5 bg-stone-300 w-full rounded"></div>
                </div>
                <p className="text-[9px] text-stone-400 font-medium">Pàgina 1 de 2</p>
              </div>

              {/* Audio player card */}
              {activePreviewSong.mp3_url && (
                <div className="p-4 bg-orange-50/50 border border-orange-100 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-orange-950">
                    <div className="flex items-center gap-1.5">
                      <Headphones size={14} className="text-[#c2410c]" />
                      <span>Gravació d'assaig (MP3)</span>
                    </div>
                    <span className="text-[10px] text-orange-800/80">01:42 / 03:28</span>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      onClick={() => toggleAudio(activePreviewSong.mp3_url, activePreviewSong.title)}
                      className="w-10 h-10 rounded-full bg-[#c2410c] text-white flex items-center justify-center shadow-md shadow-[#c2410c]/20 hover:bg-[#9a3412] transition-colors"
                    >
                      {activeAudio?.url === activePreviewSong.mp3_url ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                    </button>

                    <div className="flex-1 flex items-center gap-1 h-6">
                      {[40, 60, 30, 80, 50, 90, 70, 40, 60, 75, 45, 85, 30, 65, 55, 40, 70, 80].map((h, i) => (
                        <div 
                          key={i} 
                          className={`w-1 rounded-full ${i < 8 ? 'bg-[#c2410c]' : 'bg-orange-200'}`} 
                          style={{ height: `${h}%` }}
                        ></div>
                      ))}
                    </div>

                    <span className="text-[10px] font-bold text-stone-500 bg-white px-2 py-1 rounded-lg border border-stone-200">
                      Vel: 1.0x
                    </span>
                  </div>
                </div>
              )}

              {/* Download Voice Parts */}
              <div className="space-y-2 pt-2 border-t border-stone-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Descàrrega per veus individuals</p>
                
                {activePreviewSong.pdfs && activePreviewSong.pdfs.length > 0 ? (
                  activePreviewSong.pdfs.map((pdf, idx) => (
                    <a
                      key={idx}
                      href={pdf.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 bg-stone-50 hover:bg-stone-100/80 border border-stone-200/70 rounded-2xl transition-all group"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-xl bg-orange-100/60 text-[#c2410c] flex items-center justify-center">
                          <FileText size={14} />
                        </span>
                        <div>
                          <p className="text-xs font-black text-stone-900">{pdf.instrument}</p>
                          <p className="text-[9px] text-stone-400 font-semibold">PDF · Particel·la oficial</p>
                        </div>
                      </div>
                      <Download size={14} className="text-stone-400 group-hover:text-[#c2410c] transition-colors" />
                    </a>
                  ))
                ) : (
                  <p className="text-xs text-stone-400 italic">No hi ha particel·les adjuntes per a aquesta peça.</p>
                )}

                {activePreviewSong.youtube_url && (
                  <a
                    href={activePreviewSong.youtube_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 bg-red-50/60 hover:bg-red-50 border border-red-200/70 rounded-2xl transition-all text-red-900 group mt-2"
                  >
                    <div className="flex items-center gap-2.5">
                      <PlayCircle size={16} className="text-red-600" />
                      <span className="text-xs font-black">Obrir gravació en directe (YouTube)</span>
                    </div>
                    <ExternalLink size={14} className="text-red-400 group-hover:text-red-700" />
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-8 border border-stone-200/80 text-center text-stone-400 space-y-2">
              <Disc size={32} className="mx-auto text-stone-300" />
              <p className="text-xs font-bold">Selecciona una peça per a veure els detalls i particel·les.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Song Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-[#f8f6f6]">
              <h3 className="text-xl font-bold text-slate-900">
                {editingSong ? 'Editar cançó' : 'Afegir nova cançó'}
              </h3>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <form id="add-song-form" onSubmit={handleSubmitSong} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Títol *</label>
                  <input required type="text" value={newSong.title} onChange={e => setNewSong({...newSong, title: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-[#d44211] focus:border-[#d44211]" placeholder="Ex: La Santa Espina" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Compositor</label>
                    <input type="text" value={newSong.composer} onChange={e => setNewSong({...newSong, composer: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-[#d44211] focus:border-[#d44211]" placeholder="Ex: Enric Morera" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Estil</label>
                    <input type="text" value={newSong.style} onChange={e => setNewSong({...newSong, style: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-[#d44211] focus:border-[#d44211]" placeholder="Ex: Sardana" />
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-sm text-slate-500 mb-4">Puja els arxius o afegeix enllaços</p>
                  <div className="space-y-4">
                    <div>
                      {existingPdfs.length > 0 && (
                        <div className="mb-4 space-y-2">
                          <p className="text-xs font-bold text-slate-500 uppercase">Partitures existents</p>
                          {existingPdfs.map((pdf, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-red-50 rounded-lg border border-red-100">
                              <span className="text-sm font-bold text-red-700">{pdf.instrument}</span>
                              <button 
                                type="button" 
                                onClick={() => setExistingPdfs(existingPdfs.filter((_, i) => i !== idx))}
                                className="text-red-500 hover:text-red-700"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-bold text-slate-700">Afegir Partitures (PDF)</label>
                        <button 
                          type="button"
                          onClick={() => setPdfFiles([...pdfFiles, { instrument: 'General', file: new File([], '') }])}
                          className="text-xs font-bold text-[#d44211] hover:text-[#d44211]/80 flex items-center gap-1"
                        >
                          <Plus size={14} /> Afegir PDF
                        </button>
                      </div>
                      
                      {pdfFiles.length === 0 ? (
                        <div className="text-sm text-slate-500 italic p-3 border border-dashed border-slate-300 rounded-xl text-center">
                          No s'ha afegit cap partitura. Clica a "Afegir PDF" per pujar-ne una.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {pdfFiles.map((pdfItem, index) => (
                            <div key={index} className="flex items-center gap-2 p-3 border border-slate-200 rounded-xl bg-slate-50">
                              <div className="flex-1 space-y-2">
                                <input 
                                  type="text" 
                                  placeholder="Instrument (ex: Gralla 1, Timbal...)" 
                                  value={pdfItem.instrument}
                                  onChange={(e) => {
                                    const newFiles = [...pdfFiles];
                                    newFiles[index].instrument = e.target.value;
                                    setPdfFiles(newFiles);
                                  }}
                                  className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:ring-[#d44211] focus:border-[#d44211]"
                                />
                                <label className="cursor-pointer flex items-center justify-center gap-2 p-2 border border-dashed border-slate-300 rounded-lg hover:border-[#d44211] hover:bg-[#d44211]/5 transition-colors bg-white">
                                  <Upload size={16} className="text-slate-400" />
                                  <span className="text-sm text-slate-600 truncate max-w-[200px]">
                                    {pdfItem.file.name || 'Seleccionar PDF'}
                                  </span>
                                  <input 
                                    type="file" 
                                    accept=".pdf" 
                                    className="hidden" 
                                    onChange={(e) => {
                                      if (e.target.files?.[0]) {
                                        const newFiles = [...pdfFiles];
                                        newFiles[index].file = e.target.files[0];
                                        setPdfFiles(newFiles);
                                      }
                                    }} 
                                  />
                                </label>
                              </div>
                              <button 
                                type="button" 
                                onClick={() => {
                                  const newFiles = [...pdfFiles];
                                  newFiles.splice(index, 1);
                                  setPdfFiles(newFiles);
                                }} 
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg self-start"
                              >
                                <X size={18} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Àudio (MP3)</label>
                      
                      {editingSong?.mp3_url && !removeMp3 ? (
                        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-xl mb-2">
                          <div className="flex items-center gap-2">
                            <Volume2 size={18} className="text-blue-600" />
                            <span className="text-sm font-bold text-blue-700 truncate max-w-[200px]">Àudio actual</span>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => setRemoveMp3(true)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar àudio actual"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {removeMp3 && (
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-bold text-red-500 flex items-center gap-1">
                                <X size={12} /> L'àudio actual s'eliminarà
                              </span>
                              <button 
                                type="button" 
                                onClick={() => setRemoveMp3(false)}
                                className="text-[10px] font-bold text-blue-600 hover:underline"
                              >
                                Desfer eliminació
                              </button>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 p-3 border border-dashed border-slate-300 rounded-xl hover:border-[#d44211] hover:bg-[#d44211]/5 transition-colors">
                              <Upload size={18} className="text-slate-400" />
                              <span className="text-sm text-slate-600">{mp3File ? mp3File.name : 'Puja un nou MP3'}</span>
                              <input type="file" accept=".mp3,audio/*" className="hidden" onChange={(e) => setMp3File(e.target.files?.[0] || null)} />
                            </label>
                            {mp3File && (
                              <button type="button" onClick={() => setMp3File(null)} className="p-3 text-red-500 hover:bg-red-50 rounded-xl">
                                <X size={18} />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Enllaç YouTube</label>
                      <input type="url" value={newSong.youtubeUrl} onChange={e => setNewSong({...newSong, youtubeUrl: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-[#d44211] focus:border-[#d44211]" placeholder="https://youtube.com/..." />
                    </div>
                  </div>
                </div>
              </form>
            </div>
            <div className="p-6 border-t border-slate-100 bg-[#f8f6f6] flex justify-end gap-3">
              <button onClick={handleCloseModal} disabled={uploading} className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50">
                Cancel·lar
              </button>
              <button type="submit" form="add-song-form" disabled={uploading} className="px-6 py-3 bg-[#d44211] text-white font-bold rounded-xl hover:bg-[#d44211]/90 transition-colors shadow-lg shadow-[#d44211]/20 disabled:opacity-50 flex items-center gap-2">
                {uploading ? (
                  <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> Desar...</>
                ) : (
                  editingSong ? 'Guardar Canvis' : 'Guardar Cançó'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Audio Player Sticky */}
      {activeAudio && (
        <div className="fixed bottom-20 left-4 right-4 md:bottom-24 md:left-auto md:right-8 md:w-96 bg-white border-2 border-[#d44211] shadow-2xl rounded-2xl z-40 animate-in slide-in-from-bottom-4 duration-300">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 bg-[#d44211]/10 rounded-lg flex items-center justify-center text-[#d44211] flex-shrink-0 animate-pulse">
                  <Headphones size={20} />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-[#d44211] uppercase tracking-wider">S'està reproduint</p>
                  <p className="text-sm font-black text-slate-900 truncate">{activeAudio.title}</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveAudio(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={20} />
              </button>
            </div>
            <audio 
              src={activeAudio.url} 
              controls 
              autoPlay 
              className="w-full h-10 custom-audio-player"
            />
          </div>
        </div>
      )}

      {/* YouTube Player Modal */}
      {activeVideo && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[60] flex items-center justify-center p-4 transition-all">
          <div className="bg-white rounded-[2rem] shadow-3xl w-full max-w-4xl overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center text-red-500">
                  <Play size={20} fill="currentColor" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none">{activeVideo.title}</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Vídeo de YouTube</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveVideo(null)} 
                className="w-10 h-10 flex items-center justify-center bg-slate-100 text-slate-400 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-sm"
              >
                <X size={24} />
              </button>
            </div>
            <div className="aspect-video bg-black">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${getYouTubeId(activeVideo.url)}?autoplay=1`}
                title={activeVideo.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
            <div className="p-4 bg-slate-50 text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prem ESC o el botó de tancar per sortir</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
