import { useState } from 'react';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, User, Grid3X3, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface InstagramPreviewProps {
  feedUrl: string | null;
  storiesUrl: string | null;
  username?: string;
  caption?: string;
  profilePic?: string;
}

export function InstagramPreview({ 
  feedUrl,
  storiesUrl,
  username = 'socialflow_app', 
  caption = '', 
  profilePic
}: InstagramPreviewProps) {
  const [type, setType] = useState<'FEED' | 'STORIES'>(feedUrl ? 'FEED' : 'STORIES');
  
  const currentImageUrl = type === 'FEED' ? feedUrl : storiesUrl;

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm mx-auto overflow-hidden">
      {/* Phone Frame - Proporção exata de 9:16 (360x640) */}
      <div className="relative w-full aspect-[9/16] sm:w-[360px] sm:h-[640px] max-h-[85vh] bg-black rounded-[2.5rem] sm:rounded-[3rem] border-[6px] sm:border-[8px] border-zinc-900 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden transition-transform origin-top">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-zinc-900 rounded-b-2xl z-50"></div>

        <AnimatePresence mode="wait">
          {type === 'FEED' ? (
            <motion.div 
              key="feed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full bg-black text-white flex flex-col"
            >
              {/* Header */}
              <div className="p-3 flex items-center justify-between mt-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 via-red-500 to-purple-600 p-[1.5px]">
                    <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden border border-black">
                      {profilePic ? <img src={profilePic} alt="" className="w-6 h-6 object-cover" /> : <User className="w-4 h-4" />}
                    </div>
                  </div>
                  <span className="text-xs font-bold">{username}</span>
                </div>
                <MoreHorizontal className="w-4 h-4" />
              </div>

              {/* Main Image - Feed mantido com object-contain para 1:1 e 4:5 */}
              <div className="w-full max-h-[450px] bg-black flex items-center justify-center overflow-hidden">
                {currentImageUrl ? (
                  <img src={currentImageUrl} alt="Preview" className="w-full h-auto max-h-[450px] object-contain" />
                ) : (
                  <div className="text-zinc-700 flex flex-col items-center gap-2 py-20">
                    <Grid3X3 className="w-12 h-12" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Aguardando Arte</span>
                  </div>
                )}
              </div>

              {/* Icons */}
              <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Heart className="w-6 h-6" />
                  <MessageCircle className="w-6 h-6" />
                  <Send className="w-6 h-6" />
                </div>
                <Bookmark className="w-6 h-6" />
              </div>

              {/* Likes & Caption */}
              <div className="px-3 space-y-1">
                <p className="text-xs font-bold">1,234 curtidas</p>
                <p className="text-xs">
                  <span className="font-bold mr-2">{username}</span>
                  <span className="text-zinc-300 line-clamp-2">{caption}</span>
                </p>
                <p className="text-[10px] text-zinc-500 uppercase mt-2">Há 2 horas</p>
              </div>

              {/* Fake Navigation */}
              <div className="mt-auto border-t border-zinc-900 p-4 flex justify-around">
                <div className="w-6 h-6 rounded bg-zinc-800"></div>
                <div className="w-6 h-6 rounded bg-zinc-800"></div>
                <div className="w-6 h-6 rounded-full bg-zinc-800"></div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="stories"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full bg-zinc-900 relative"
            >
              {/* Progress Bar */}
              <div className="absolute top-10 left-0 w-full px-2 flex gap-1 z-20">
                <div className="h-[2px] flex-1 bg-white/40 rounded-full mt-2">
                  <div className="h-full bg-white w-2/3 rounded-full"></div>
                </div>
                <div className="h-[2px] flex-1 bg-white/20 rounded-full mt-2"></div>
              </div>

              {/* Header */}
              <div className="absolute top-14 left-0 w-full px-4 flex items-center justify-between z-20">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden border border-zinc-700">
                     {profilePic ? <img src={profilePic} alt="" className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-zinc-500 m-1" />}
                  </div>
                  <span className="text-xs font-bold text-white drop-shadow-md">{username}</span>
                  <span className="text-[10px] text-white/60">2h</span>
                </div>
              </div>

              {/* Image - Corrigido para absolute inset-0 e object-cover para preencher toda a tela 9:16 */}
              <div className="absolute inset-0 w-full h-full bg-black z-0">
                {currentImageUrl ? (
                  <img src={currentImageUrl} alt="Stories" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700 bg-black gap-2">
                    <Play className="w-12 h-12" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Aguardando Story</span>
                  </div>
                )}
              </div>

              {/* Fake Footer */}
              <div className="absolute bottom-6 left-0 w-full px-4 flex items-center gap-4 z-20">
                <div className="flex-1 h-10 rounded-full border border-white/40 bg-black/20 backdrop-blur-md px-4 flex items-center">
                  <span className="text-xs text-white/60">Enviar mensagem...</span>
                </div>
                <Heart className="w-6 h-6 text-white" />
                <Send className="w-6 h-6 text-white" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Format Toggle */}
      <div className="flex p-1 bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-2xl w-fit">
        <button 
          onClick={() => setType('FEED')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${type === 'FEED' ? 'bg-brand-gradient text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}
        >
          Feed (1:1 / 4:5)
        </button>
        <button 
          onClick={() => setType('STORIES')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${type === 'STORIES' ? 'bg-brand-gradient text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}
        >
          Stories (9:16)
        </button>
      </div>
    </div>
  );
}