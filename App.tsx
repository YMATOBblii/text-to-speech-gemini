import React, { useState, useRef, useEffect, useMemo } from 'react';
import { VoiceName, StyleDefinition } from './types';
import { generateSpeech, PRESET_STYLES } from './services/gemini';
import { base64ToUint8Array, pcmToWav } from './utils/audio';
import Dropdown from './components/Dropdown';

const VOICE_GROUPS = [
  {
    label: "Женские голоса",
    options: [
      VoiceName.Achernar,
      VoiceName.Aoede,
      VoiceName.Autonoe,
      VoiceName.Callirrhoe,
      VoiceName.Despina,
      VoiceName.Erinome,
      VoiceName.Gacrux,
      VoiceName.Kore,
      VoiceName.Laomedeia,
      VoiceName.Leda,
      VoiceName.Pulcherrima,
      VoiceName.Sulafat,
      VoiceName.Vindemiatrix,
      VoiceName.Zephyr
    ]
  },
  {
    label: "Мужские голоса",
    options: [
      VoiceName.Achird,
      VoiceName.Algenib,
      VoiceName.Algieba,
      VoiceName.Alnilam,
      VoiceName.Charon,
      VoiceName.Enceladus,
      VoiceName.Fenrir,
      VoiceName.Iapetus,
      VoiceName.Orus,
      VoiceName.Puck,
      VoiceName.Rasalgethi,
      VoiceName.Sadachbia,
      VoiceName.Sadaltager,
      VoiceName.Schedar,
      VoiceName.Umbriel,
      VoiceName.Zubenelgenubi
    ]
  }
];

interface HistoryItem {
  id: string;
  text: string;
  promptText?: string;
  voiceName: string;
  styleName: string;
  mode: 'normal' | 'manual';
  audioUrl: string;
  createdAt: string;
}

const StarIcon = ({ filled, onClick }: { filled: boolean; onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`shrink-0 rounded-full transition-all focus:outline-none flex items-center justify-center h-12 w-12 ${
      filled 
        ? "text-indigo-500 hover:text-indigo-600 scale-105" 
        : "text-slate-300 hover:text-slate-400 hover:bg-slate-50"
    }`}
    title={filled ? "Убрать из избранного" : "Добавить в избранное"}
  >
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="22" 
      height="22" 
      viewBox="0 0 24 24" 
      fill={filled ? "currentColor" : "none"} 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className="transition-transform duration-200 active:scale-90"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  </button>
);

const App: React.FC = () => {
  // Styles State
  const [customStyles, setCustomStyles] = useState<StyleDefinition[]>([]);
  const [selectedStyleName, setSelectedStyleName] = useState<string>(PRESET_STYLES[0].name);

  // Combine Preset and Custom styles
  const allStyles = useMemo(() => {
    return [...PRESET_STYLES, ...customStyles];
  }, [customStyles]);

  // Favorites State
  const [favoriteVoices, setFavoriteVoices] = useState<string[]>([]);
  const [favoriteStyles, setFavoriteStyles] = useState<string[]>([]);

  // Load custom styles and favorites from localStorage on mount
  useEffect(() => {
    try {
      const storedStyles = localStorage.getItem('customTtsStyles');
      if (storedStyles) {
        setCustomStyles(JSON.parse(storedStyles));
      }
      
      const storedFavVoices = localStorage.getItem('ttsFavoriteVoices');
      if (storedFavVoices) {
        setFavoriteVoices(JSON.parse(storedFavVoices));
      }

      const storedFavStyles = localStorage.getItem('ttsFavoriteStyles');
      if (storedFavStyles) {
        setFavoriteStyles(JSON.parse(storedFavStyles));
      }
    } catch (e) {
      console.error("Failed to load local storage data", e);
    }
  }, []);

  // Persist Favorites
  useEffect(() => {
    localStorage.setItem('ttsFavoriteVoices', JSON.stringify(favoriteVoices));
  }, [favoriteVoices]);

  useEffect(() => {
    localStorage.setItem('ttsFavoriteStyles', JSON.stringify(favoriteStyles));
  }, [favoriteStyles]);

  // Form State
  const [text, setText] = useState<string>('');
  const [voice, setVoice] = useState<VoiceName>(VoiceName.Kore);
  
  // Voice Gender State
  const [voiceGender, setVoiceGender] = useState<'female' | 'male'>('female');
  
  // Generation Mode State
  const [generationMode, setGenerationMode] = useState<'normal' | 'manual'>('normal');
  const [manualText, setManualText] = useState<string>('');
  
  // App Logic State
  const [isMainLoading, setIsMainLoading] = useState<boolean>(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // History State
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Modal States
  const [isStyleModalOpen, setIsStyleModalOpen] = useState(false);
  const [styleModalMode, setStyleModalMode] = useState<'list' | 'edit'>('list');
  
  // Editing State
  const [editingStyleId, setEditingStyleId] = useState<string | null>(null);
  const [newStyleName, setNewStyleName] = useState('');
  const [newStylePrompt, setNewStylePrompt] = useState('');

  const audioRef = useRef<HTMLAudioElement>(null);

  // Cleanup object URL
  useEffect(() => {
    return () => {
      // Intentionally empty cleanup to allow history items to persist URLs in this session.
    };
  }, [audioUrl, previewAudioUrl]);

  // Derive grouped options for the Style Dropdown
  const styleGroupedOptions = useMemo(() => {
    const groups = [
      {
        label: "Предустановленные стили",
        options: PRESET_STYLES.map(s => s.name)
      }
    ];

    if (customStyles.length > 0) {
      groups.push({
        label: "Мои стили",
        options: customStyles.map(s => s.name)
      });
    }

    return groups;
  }, [customStyles]);

  // Derive filtered voice options
  const currentVoiceOptions = useMemo(() => {
    const group = VOICE_GROUPS.find(g => g.label === (voiceGender === 'female' ? "Женские голоса" : "Мужские голоса"));
    return group ? group.options : [];
  }, [voiceGender]);

  const handleGenderChange = (gender: 'female' | 'male') => {
    if (gender === voiceGender) return;
    setVoiceGender(gender);
    
    // Auto-select a valid voice if current one is not in the new list
    const newGroup = VOICE_GROUPS.find(g => g.label === (gender === 'female' ? "Женские голоса" : "Мужские голоса"));
    const newOptions = newGroup?.options || [];
    
    if (!newOptions.includes(voice)) {
      setVoice(newOptions[0]);
    }
  };

  const toggleFavoriteVoice = () => {
    setFavoriteVoices(prev => {
      if (prev.includes(voice)) {
        return prev.filter(v => v !== voice);
      } else {
        return [...prev, voice];
      }
    });
  };

  const handleSelectFavoriteVoice = (favVoice: string) => {
    // Check gender of the favorite voice
    const isFemale = VOICE_GROUPS[0].options.includes(favVoice as VoiceName);
    const targetGender = isFemale ? 'female' : 'male';
    
    if (voiceGender !== targetGender) {
      setVoiceGender(targetGender);
    }
    setVoice(favVoice as VoiceName);
  };

  const toggleFavoriteStyle = () => {
    setFavoriteStyles(prev => {
      if (prev.includes(selectedStyleName)) {
        return prev.filter(s => s !== selectedStyleName);
      } else {
        return [...prev, selectedStyleName];
      }
    });
  };

  // Helper to perform TTS and return URL
  const performTTS = async (textToSpeak: string, promptInstruction: string): Promise<string> => {
    const base64Audio = await generateSpeech(textToSpeak, voice, promptInstruction);
    const pcmData = base64ToUint8Array(base64Audio);
    const wavBlob = pcmToWav(pcmData, 24000);
    return URL.createObjectURL(wavBlob);
  };

  const handleGenerate = async () => {
    if (!text.trim()) return;
    setIsMainLoading(true);
    setError(null);
    
    try {
      const currentStyle = allStyles.find(s => s.name === selectedStyleName);
      const basePrompt = currentStyle ? currentStyle.prompt : PRESET_STYLES[0].prompt;
      
      let effectivePrompt = basePrompt;
      if (generationMode === 'manual' && manualText.trim()) {
        effectivePrompt = `${basePrompt}\n\n${manualText.trim()}`;
      }

      const url = await performTTS(text, effectivePrompt);
      setAudioUrl(url);

      const newItem: HistoryItem = {
        id: Date.now().toString(),
        text: text,
        promptText: generationMode === 'manual' ? manualText : undefined,
        voiceName: voice,
        styleName: selectedStyleName,
        mode: generationMode,
        audioUrl: url,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setHistory(prev => {
        const updated = [newItem, ...prev];
        return updated.slice(0, 5);
      });

    } catch (err: any) {
      setError(err.message || 'Произошла ошибка при генерации аудио.');
    } finally {
      setIsMainLoading(false);
    }
  };

  const handlePreviewStyle = async () => {
    setIsPreviewLoading(true);
    setError(null);
    setPreviewAudioUrl(null);

    try {
      const currentStyle = allStyles.find(s => s.name === selectedStyleName);
      const basePrompt = currentStyle ? currentStyle.prompt : PRESET_STYLES[0].prompt;
      // Preview always uses base style, ignoring manual instructions
      const url = await performTTS("Это пример звучания выбранного голоса и стиля.", basePrompt);
      setPreviewAudioUrl(url);
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка при генерации примера.');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleModeChange = (mode: 'normal' | 'manual') => {
    setGenerationMode(mode);
  };

  // Modal Handlers
  const openManageModal = () => {
    setStyleModalMode('list');
    setIsStyleModalOpen(true);
  };

  const switchToCreateMode = () => {
    setEditingStyleId(null);
    setNewStyleName('');
    setNewStylePrompt('');
    setStyleModalMode('edit');
  };

  const switchToEditMode = (style: StyleDefinition) => {
    setEditingStyleId(style.id || null);
    setNewStyleName(style.name);
    setNewStylePrompt(style.prompt);
    setStyleModalMode('edit');
  };

  const handleSaveStyle = () => {
    if (!newStyleName.trim() || !newStylePrompt.trim()) return;
    
    const duplicate = allStyles.find(s => 
      s.name === newStyleName.trim() && s.id !== editingStyleId
    );
    
    if (duplicate) {
      alert("Стиль с таким названием уже существует.");
      return;
    }

    let updatedStyles: StyleDefinition[];

    if (editingStyleId) {
      updatedStyles = customStyles.map(s => 
        s.id === editingStyleId 
          ? { ...s, name: newStyleName.trim(), prompt: newStylePrompt.trim() }
          : s
      );
    } else {
      const newStyle: StyleDefinition = {
        id: Date.now().toString(),
        name: newStyleName.trim(),
        prompt: newStylePrompt.trim(),
      };
      updatedStyles = [...customStyles, newStyle];
    }

    setCustomStyles(updatedStyles);
    localStorage.setItem('customTtsStyles', JSON.stringify(updatedStyles));
    setSelectedStyleName(newStyleName.trim());
    setStyleModalMode('list');
    setNewStyleName('');
    setNewStylePrompt('');
  };

  const handleDeleteStyle = (id: string) => {
    const styleToDelete = customStyles.find(s => s.id === id);
    if (!styleToDelete) return;

    if (window.confirm(`Удалить стиль "${styleToDelete.name}"?`)) {
      const updatedStyles = customStyles.filter(s => s.id !== id);
      setCustomStyles(updatedStyles);
      localStorage.setItem('customTtsStyles', JSON.stringify(updatedStyles));

      if (selectedStyleName === styleToDelete.name) {
        setSelectedStyleName(PRESET_STYLES[0].name);
      }
    }
  };

  const isGenerateDisabled = isMainLoading || !text.trim();

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-xl mx-auto space-y-6">
        
        {/* Header Block */}
        <div className="text-center mb-8 animate-fade-scale">
          <h1 className="text-3xl font-bold tracking-tight text-slate-700 mb-1">
            Текст в Речь
          </h1>
          <p className="text-sm text-slate-500 font-medium tracking-wide">
            Powered by Gemini 2.5 Flash
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-indigo-50/60 backdrop-blur-2xl saturate-150 rounded-[32px] shadow-[0_20px_40px_-12px_rgba(0,0,0,0.06)] border border-white/80 p-6 md:p-8 space-y-6 animate-slide-up relative z-10">
            
            {/* Controls Row */}
            <div className="grid grid-cols-2 gap-4 items-start">
              
              {/* Voice Column */}
              <div className="flex flex-col gap-2">
                {/* Row 1: Header */}
                <div className="flex justify-between items-center px-1 h-6">
                   <div className="flex items-center gap-2 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      ГОЛОС
                   </div>
                   <div className="bg-slate-100 rounded-full p-0.5 flex">
                     <button 
                        onClick={() => handleGenderChange('female')}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all ${
                          voiceGender === 'female' 
                            ? 'bg-indigo-600 text-white shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                     >
                       ЖЕН
                     </button>
                     <button 
                        onClick={() => handleGenderChange('male')}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all ${
                          voiceGender === 'male' 
                            ? 'bg-indigo-600 text-white shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                     >
                       МУЖ
                     </button>
                   </div>
                </div>

                {/* Row 2: Favorite Voices Chips (Scrollable) */}
                <div className="h-9 w-full flex items-center gap-2 overflow-x-auto custom-scrollbar no-scrollbar-on-mobile">
                  {favoriteVoices.length > 0 ? (
                      favoriteVoices.map(fv => (
                          <button 
                            key={fv} 
                            onClick={() => handleSelectFavoriteVoice(fv)} 
                            className="shrink-0 whitespace-nowrap px-2 py-1 bg-slate-50 border border-slate-200 rounded-full text-[10px] font-semibold text-slate-600 hover:border-indigo-300 hover:text-indigo-700 hover:bg-indigo-50 transition-colors shadow-sm active:scale-95"
                          >
                            {fv}
                          </button>
                      ))
                  ) : (
                    <div className="text-[10px] text-slate-400 italic px-1">Нет избранных</div>
                  )}
                </div>

                {/* Row 3: Dropdown */}
                <div className="flex items-center gap-2">
                   <div className="flex-1">
                      <Dropdown<VoiceName>
                        label="" 
                        value={voice}
                        options={currentVoiceOptions}
                        onChange={setVoice}
                      />
                   </div>
                   <StarIcon filled={favoriteVoices.includes(voice)} onClick={toggleFavoriteVoice} />
                </div>
              </div>
              
              {/* Style Column */}
              <div className="flex flex-col gap-2">
                 {/* Row 1: Header */}
                 <div className="flex justify-between items-center px-1 h-6">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                       СТИЛЬ / ТОН
                    </div>
                    <button onClick={openManageModal} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                      + Добавить
                    </button>
                 </div>

                 {/* Row 2: Favorite Styles Chips (Scrollable) */}
                 <div className="h-9 w-full flex items-center gap-2 overflow-x-auto custom-scrollbar no-scrollbar-on-mobile">
                   {favoriteStyles.length > 0 ? (
                       favoriteStyles.map(fs => (
                           <button 
                             key={fs} 
                             onClick={() => setSelectedStyleName(fs)} 
                             className="shrink-0 whitespace-nowrap px-2 py-1 bg-slate-50 border border-slate-200 rounded-full text-[10px] font-semibold text-slate-600 hover:border-indigo-300 hover:text-indigo-700 hover:bg-indigo-50 transition-colors shadow-sm active:scale-95"
                           >
                             {fs}
                           </button>
                       ))
                   ) : (
                      <div className="text-[10px] text-slate-400 italic px-1">Нет избранных</div>
                   )}
                 </div>

                 {/* Row 3: Dropdown */}
                 <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Dropdown<string>
                        label=""
                        value={selectedStyleName}
                        groupedOptions={styleGroupedOptions}
                        onChange={setSelectedStyleName}
                      />
                    </div>
                    <StarIcon filled={favoriteStyles.includes(selectedStyleName)} onClick={toggleFavoriteStyle} />
                 </div>
              </div>
            </div>

            {/* Text Area */}
            <div className="space-y-3">
               <div className="px-1 text-[11px] font-bold text-slate-700 uppercase tracking-wider">Введите текст</div>
               
               <div className="relative group">
                 <textarea
                   value={text}
                   onChange={(e) => setText(e.target.value)}
                   placeholder="Текст для озвучки..."
                   className="w-full h-40 p-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 resize-none text-slate-700 placeholder:text-slate-400 text-[16px] leading-relaxed outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all shadow-inner custom-scrollbar"
                 />
               </div>

               {/* Mode Switcher */}
               <div className="flex justify-center py-1">
                   <div className="bg-slate-100 p-1 rounded-full flex relative border border-slate-200">
                      <button
                         onClick={() => handleModeChange('normal')}
                         className={`px-5 py-2 rounded-full text-xs font-bold transition-all duration-300 ${
                           generationMode === 'normal' 
                             ? 'bg-indigo-600 text-white shadow-md' 
                             : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                         }`}
                      >
                         Обычная озвучка
                      </button>
                      <button
                         onClick={() => handleModeChange('manual')}
                         className={`px-5 py-2 rounded-full text-xs font-bold transition-all duration-300 ${
                           generationMode === 'manual' 
                             ? 'bg-indigo-600 text-white shadow-md' 
                             : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                         }`}
                      >
                         Ручная правка
                      </button>
                   </div>
               </div>

               {/* Manual Prompt Input (Conditional) */}
               {generationMode === 'manual' && (
                 <div className="animate-fade-scale space-y-2">
                    <div className="px-1 text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Промпт для модели (только правки произношения)</div>
                    <textarea
                      value={manualText}
                      onChange={(e) => setManualText(e.target.value)}
                      placeholder="Пишите только дополнительные правки: ударения, паузы, что исправить. Стиль и тон берутся из настроек выше."
                      className="w-full h-24 p-4 bg-white/90 backdrop-blur-sm rounded-2xl border border-indigo-200 resize-none text-slate-700 placeholder:text-indigo-300/60 text-[14px] leading-relaxed outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner custom-scrollbar"
                    />
                 </div>
               )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 text-red-600 text-sm rounded-2xl flex items-center gap-3 animate-fade-scale shadow-sm border border-red-100">
                <span>{error}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4 pt-2">
               <button
                  onClick={handlePreviewStyle}
                  disabled={isPreviewLoading || isMainLoading}
                  className={`h-12 rounded-full font-bold border-2 transition-all duration-200 flex items-center justify-center gap-2
                    ${(isPreviewLoading || isMainLoading)
                      ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                      : 'bg-white border-indigo-100 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200'
                    }`}
                >
                   {isPreviewLoading ? <span className="animate-spin">◌</span> : 'Пример'}
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerateDisabled}
                  className={`h-12 rounded-full font-bold text-white transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20
                    ${isGenerateDisabled
                      ? 'bg-slate-300 cursor-not-allowed shadow-none'
                      : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98]'
                    }`}
                >
                   {isMainLoading ? <span className="animate-spin text-xl">◌</span> : 'Озвучить текст'}
                </button>
            </div>
            
            {/* Preview Player (Conditional) */}
            {previewAudioUrl && (
                <div className="bg-white/60 rounded-2xl p-3 border border-indigo-100 animate-slide-up shadow-sm flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                   </div>
                   <div className="text-xs font-semibold text-indigo-900 mr-2">Пример</div>
                   <audio controls src={previewAudioUrl} className="w-full h-8 block outline-none opacity-80" autoPlay />
                </div>
            )}
        </div>

        {/* Result Section - Glass Card */}
        {audioUrl && (
          <div className="bg-white/80 backdrop-blur-xl rounded-[32px] shadow-sm border border-white/50 p-6 animate-slide-up">
            <div className="flex justify-between items-center mb-4 px-1">
               <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Готово</h3>
               <a
                href={audioUrl}
                download={`speech-${voice}-${Date.now()}.wav`}
                className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors"
              >
                Скачать WAV
              </a>
            </div>
            
            <div className="bg-slate-50 rounded-2xl p-4 shadow-inner border border-slate-200/60">
                <audio
                  ref={audioRef}
                  controls
                  src={audioUrl}
                  className="w-full h-10 block outline-none opacity-90"
                  autoPlay
                >
                  Ваш браузер не поддерживает аудио элемент.
                </audio>
            </div>
          </div>
        )}

        {/* Generation History */}
        {history.length > 0 && (
          <div className="bg-white/60 backdrop-blur-xl rounded-[32px] shadow-sm border border-white/30 p-6 animate-slide-up">
            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-4 px-1">История генераций</h3>
            <div className="space-y-3">
              {history.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:border-indigo-100 transition-all flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                     <div className="overflow-hidden">
                        <p className="text-slate-800 font-medium text-[14px] line-clamp-1 truncate">{item.text || 'Текст'}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{item.voiceName} • {item.styleName} • {item.createdAt}</p>
                     </div>
                     <a href={item.audioUrl} download className="text-slate-400 hover:text-indigo-600 shrink-0 ml-2 p-1"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></a>
                  </div>
                  <audio controls src={item.audioUrl} className="w-full h-8 block outline-none opacity-80 scale-95 origin-left" />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="h-8"></div>
      </div>

      {/* Unified Style Management Modal */}
      {isStyleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm animate-fade-scale">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-zoom-in flex flex-col max-h-[85vh] relative border border-slate-100">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
              <h2 className="text-lg font-bold text-slate-800">
                {styleModalMode === 'list' ? 'Мои стили' : 'Редактор стиля'}
              </h2>
              <button onClick={() => setIsStyleModalOpen(false)} className="bg-slate-100 p-2 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-200">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
               {styleModalMode === 'list' ? (
                  <div className="space-y-4">
                     <button onClick={switchToCreateMode} className="w-full py-3 bg-white border-2 border-dashed border-indigo-200 rounded-2xl text-indigo-600 font-semibold hover:bg-indigo-50 transition-colors">
                        + Новый стиль
                     </button>
                     {customStyles.map(style => (
                        <div key={style.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center">
                           <span className="font-semibold text-slate-700">{style.name}</span>
                           <div className="flex gap-2">
                              <button onClick={() => switchToEditMode(style)} className="text-slate-400 hover:text-indigo-600"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                              <button onClick={() => handleDeleteStyle(style.id!)} className="text-slate-400 hover:text-red-500"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>
                           </div>
                        </div>
                     ))}
                  </div>
               ) : (
                  <div className="space-y-4">
                     <input type="text" value={newStyleName} onChange={e => setNewStyleName(e.target.value)} placeholder="Название" className="w-full p-4 bg-white rounded-2xl shadow-sm border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-200" />
                     <textarea value={newStylePrompt} onChange={e => setNewStylePrompt(e.target.value)} placeholder="Инструкция..." className="w-full h-32 p-4 bg-white rounded-2xl shadow-sm border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-200 resize-none" />
                  </div>
               )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-white">
               {styleModalMode === 'edit' && (
                  <div className="flex gap-3">
                     <button onClick={() => setStyleModalMode('list')} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors">Назад</button>
                     <button onClick={handleSaveStyle} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700">Сохранить</button>
                  </div>
               )}
               {styleModalMode === 'list' && (
                  <button onClick={() => setIsStyleModalOpen(false)} className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200">Закрыть</button>
               )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;