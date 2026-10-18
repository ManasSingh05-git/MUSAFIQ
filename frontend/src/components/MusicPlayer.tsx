import { Disc3, Music, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const STORAGE_KEY_PAUSED = "musafiq_bg_music_paused";
const STORAGE_KEY_VOL = "musafiq_bg_music_vol";
const DEFAULT_VOLUME = 0.25; // 25% volume (within user's 20-30% request)

export function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_VOL);
    return saved ? Number(saved) : DEFAULT_VOLUME;
  });
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(false);
  const [userInteracted, setUserInteracted] = useState<boolean>(false);

  // Initialize audio and handle autoplay policy
  useEffect(() => {
    const audio = new Audio("/audio/musafir.mp3");
    audio.loop = true;
    audio.volume = isMuted ? 0 : volume;
    audioRef.current = audio;

    const userManuallyPaused = localStorage.getItem(STORAGE_KEY_PAUSED) === "true";

    const attemptPlay = () => {
      if (userManuallyPaused) return;
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(() => {
          // Autoplay blocked by browser policy until user interacts
          setIsPlaying(false);
        });
    };

    attemptPlay();

    // Browser interaction fallback: start music on first user click if not paused
    const handleFirstInteraction = () => {
      setUserInteracted(true);
      if (localStorage.getItem(STORAGE_KEY_PAUSED) !== "true") {
        audio
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => {});
      }
      window.removeEventListener("pointerdown", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
    };

    window.addEventListener("pointerdown", handleFirstInteraction, { once: true });
    window.addEventListener("keydown", handleFirstInteraction, { once: true });

    audio.onplay = () => setIsPlaying(true);
    audio.onpause = () => setIsPlaying(false);

    return () => {
      window.removeEventListener("pointerdown", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
      audio.pause();
      audio.src = "";
    };
  }, []);

  // Sync volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
    localStorage.setItem(STORAGE_KEY_VOL, String(volume));
  }, [volume, isMuted]);

  // Toggle play / stop
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      localStorage.setItem(STORAGE_KEY_PAUSED, "true");
    } else {
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          localStorage.setItem(STORAGE_KEY_PAUSED, "false");
        })
        .catch((err) => console.log("Audio play error:", err));
    }
  };

  const toggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (val > 0 && isMuted) setIsMuted(false);
  };

  return (
    <aside
      aria-label="Background Travel Music Player"
      className="fixed bottom-5 left-5 z-[90] flex items-center transition-all duration-300"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <div className="glass-strong flex items-center gap-3 rounded-full border border-white/20 bg-[#071714]/85 px-3 py-2 text-white shadow-2xl backdrop-blur-xl transition hover:border-amber-400/40">
        {/* Animated Disc / Vinyl Icon */}
        <button
          onClick={togglePlay}
          title={isPlaying ? "Click to Pause / Stop Song" : "Click to Play Musafir Song"}
          aria-label={isPlaying ? "Stop Musafir Background Song" : "Play Musafir Background Song"}
          className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-slate-950 shadow-md transition hover:scale-105 active:scale-95"
        >
          <Disc3
            className={`h-5 w-5 transition-transform duration-1000 ${
              isPlaying ? "animate-spin text-forest-950" : "text-forest-950"
            }`}
            style={{ animationDuration: "3s" }}
          />
          {/* Subtle equalizer bars overlay when playing */}
          {isPlaying && (
            <span className="absolute -bottom-1 flex items-end gap-0.5">
              <span className="h-2 w-0.5 animate-bounce bg-white rounded-full" style={{ animationDelay: "0ms" }} />
              <span className="h-3 w-0.5 animate-bounce bg-white rounded-full" style={{ animationDelay: "150ms" }} />
              <span className="h-1.5 w-0.5 animate-bounce bg-white rounded-full" style={{ animationDelay: "300ms" }} />
            </span>
          )}
        </button>

        {/* Track Title & Artist */}
        <div className="flex flex-col pr-1 select-none cursor-pointer" onClick={() => setShowControls((v) => !v)}>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold tracking-wide text-white">Musafir Hoon Yaaron</span>
            <span className="rounded bg-amber-500/20 px-1.5 py-0.2 text-[9px] font-semibold text-amber-300">
              {isPlaying ? `${Math.round((isMuted ? 0 : volume) * 100)}%` : "Paused"}
            </span>
          </div>
          <span className="text-[10px] text-cream/70">Kishore Kumar • MUSAFIQ Theme</span>
        </div>

        {/* Play / Stop Button */}
        <button
          type="button"
          onClick={togglePlay}
          title={isPlaying ? "Stop Song" : "Play Song"}
          aria-label={isPlaying ? "Stop Song" : "Play Song"}
          className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
            isPlaying
              ? "bg-coral-accent/20 text-coral-accent hover:bg-coral-accent/30"
              : "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
          }`}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
        </button>

        {/* Expandable Volume Controls */}
        <div
          className={`flex items-center gap-2 overflow-hidden transition-all duration-300 ${
            showControls ? "max-w-[140px] opacity-100 pl-1" : "max-w-0 opacity-0"
          }`}
        >
          <button
            type="button"
            onClick={toggleMute}
            aria-label={isMuted ? "Unmute" : "Mute"}
            className="text-cream/70 hover:text-white"
          >
            {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            aria-label="Volume Control"
            className="h-1.5 w-16 cursor-pointer appearance-none rounded-lg bg-white/20 accent-amber-400"
          />
        </div>
      </div>
    </aside>
  );
}
