/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

// --- Types & Constants ---
type Point = { x: number; y: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string };

const GRID_SIZE = 20;
const CELL_SIZE = 20;
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;
const TICK_RATE = 100; // ms per move

const TRACKS = [
  { id: "0x01", title: "SYS.NEON_DRIVE.WAV", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { id: "0x02", title: "SYS.CYBER_PULSE.WAV", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
  { id: "0x03", title: "SYS.SYNTH_DREAM.WAV", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
];

export default function App() {
  // --- React State for UI ---
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isStarted, setIsStarted] = useState(false);

  // --- Music State ---
  const [currentTrack, setCurrentTrack] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const audioRef = useRef<HTMLAudioElement>(null);

  // --- Canvas & Game State ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(null);

  const gameState = useRef({
    snake: [{ x: 10, y: 10 }],
    dir: { x: 0, y: 0 },
    nextDir: { x: 0, y: 0 },
    food: { x: 15, y: 10 },
    score: 0,
    gameOver: false,
    isStarted: false,
    lastMove: 0,
    particles: [] as Particle[],
    shakeUntil: 0,
  });

  // --- Game Logic ---
  const initGame = () => {
    gameState.current = {
      snake: [{ x: 10, y: 10 }],
      dir: { x: 0, y: 0 },
      nextDir: { x: 0, y: 0 },
      food: { x: Math.floor(Math.random() * GRID_SIZE), y: Math.floor(Math.random() * GRID_SIZE) },
      score: 0,
      gameOver: false,
      isStarted: false,
      lastMove: performance.now(),
      particles: [],
      shakeUntil: 0,
    };
    setScore(0);
    setGameOver(false);
    setIsStarted(false);
  };

  const spawnParticles = (x: number, y: number, color: string) => {
    for (let i = 0; i < 15; i++) {
      gameState.current.particles.push({
        x: x * CELL_SIZE + CELL_SIZE / 2,
        y: y * CELL_SIZE + CELL_SIZE / 2,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.5) * 12,
        life: 1.0,
        color: color,
      });
    }
  };

  const update = useCallback((time: number) => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const state = gameState.current;

    // --- Logic Update ---
    if (state.isStarted && !state.gameOver) {
      if (time - state.lastMove > TICK_RATE) {
        state.dir = state.nextDir;
        const head = state.snake[0];
        const newHead = { x: head.x + state.dir.x, y: head.y + state.dir.y };

        // Wall Collision
        if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
          state.gameOver = true;
          state.shakeUntil = time + 500;
          setGameOver(true);
        }
        // Self Collision
        else if (state.snake.some(s => s.x === newHead.x && s.y === newHead.y)) {
          state.gameOver = true;
          state.shakeUntil = time + 500;
          setGameOver(true);
        }
        else {
          state.snake.unshift(newHead);
          // Food Collision
          if (newHead.x === state.food.x && newHead.y === state.food.y) {
            state.score += 10;
            setScore(state.score);
            setHighScore(prev => Math.max(prev, state.score));
            
            // New food avoiding snake
            let newFood;
            while (true) {
              newFood = { x: Math.floor(Math.random() * GRID_SIZE), y: Math.floor(Math.random() * GRID_SIZE) };
              if (!state.snake.some(s => s.x === newFood.x && s.y === newFood.y)) break;
            }
            state.food = newFood;
            state.shakeUntil = time + 150;
            spawnParticles(newHead.x, newHead.y, '#00FFFF');
          } else {
            state.snake.pop();
          }
        }
        state.lastMove = time;
      }
    }

    // --- Drawing ---
    // Clear background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw Grid
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= CANVAS_SIZE; i += CELL_SIZE) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_SIZE); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(CANVAS_SIZE, i); ctx.stroke();
    }

    // Draw Food (Glitching)
    ctx.fillStyle = Math.floor(time / 50) % 2 === 0 ? '#FF00FF' : '#FFFFFF';
    ctx.fillRect(state.food.x * CELL_SIZE + 2, state.food.y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);

    // Draw Snake
    state.snake.forEach((s, i) => {
      ctx.fillStyle = i === 0 ? '#FFFFFF' : '#00FFFF';
      ctx.fillRect(s.x * CELL_SIZE + 1, s.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
      
      // Glitch effect on snake body occasionally
      if (Math.random() > 0.95 && !state.gameOver) {
        ctx.fillStyle = '#FF00FF';
        ctx.fillRect(s.x * CELL_SIZE + (Math.random()*4-2), s.y * CELL_SIZE + (Math.random()*4-2), CELL_SIZE - 2, CELL_SIZE - 2);
      }
    });

    // Draw Particles
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.04;
      if (p.life <= 0) {
        state.particles.splice(i, 1);
      } else {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.fillRect(p.x, p.y, 4, 4);
        ctx.globalAlpha = 1.0;
      }
    }

    // Handle Shake
    if (time < state.shakeUntil) {
      canvasRef.current.classList.add('shake');
    } else {
      canvasRef.current.classList.remove('shake');
    }

    requestRef.current = requestAnimationFrame(update);
  }, []);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [update]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }

      const state = gameState.current;

      if (state.gameOver) {
        if (e.key === 'Enter' || e.key === ' ') initGame();
        return;
      }

      if (!state.isStarted && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d"].includes(e.key.toLowerCase())) {
        state.isStarted = true;
        setIsStarted(true);
      }

      const dir = state.dir;
      switch (e.key.toLowerCase()) {
        case 'arrowup':
        case 'w':
          if (dir.y !== 1) state.nextDir = { x: 0, y: -1 };
          break;
        case 'arrowdown':
        case 's':
          if (dir.y !== -1) state.nextDir = { x: 0, y: 1 };
          break;
        case 'arrowleft':
        case 'a':
          if (dir.x !== 1) state.nextDir = { x: -1, y: 0 };
          break;
        case 'arrowright':
        case 'd':
          if (dir.x !== -1) state.nextDir = { x: 1, y: 0 };
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- Music Logic ---
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Audio play failed:", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentTrack]);

  const togglePlay = () => setIsPlaying(!isPlaying);
  const nextTrack = () => { setCurrentTrack((prev) => (prev + 1) % TRACKS.length); setIsPlaying(true); };
  const prevTrack = () => { setCurrentTrack((prev) => (prev - 1 + TRACKS.length) % TRACKS.length); setIsPlaying(true); };

  return (
    <div className="min-h-screen bg-black text-[#00FFFF] font-mono flex flex-col items-center justify-center p-4 overflow-hidden relative scanlines">
      <div className="static-noise"></div>

      {/* Header */}
      <header className="mb-6 text-center z-10">
        <h1 className="glitch text-4xl md:text-6xl tracking-widest uppercase" data-text="SYS.SNAKE_PROTOCOL">
          SYS.SNAKE_PROTOCOL
        </h1>
        <p className="text-[#FF00FF] tracking-widest uppercase text-sm mt-2">
          &gt;&gt; INITIALIZING... OK
        </p>
      </header>

      <div className="flex flex-col xl:flex-row gap-8 items-center xl:items-start z-10 w-full max-w-5xl justify-center">
        
        {/* Game Container */}
        <div className="flex flex-col items-center">
          {/* Score Board */}
          <div className="flex justify-between w-full max-w-[400px] mb-2 px-2 text-lg border-b border-[#00FFFF] pb-1">
            <div>
              <span className="text-[#FF00FF]">SCORE:</span> {score.toString().padStart(4, '0')}
            </div>
            <div>
              <span className="text-[#FF00FF]">HIGH:</span> {highScore.toString().padStart(4, '0')}
            </div>
          </div>

          {/* Game Board */}
          <div className="relative border-2 border-[#00FFFF] bg-black shadow-[0_0_15px_#00FFFF] p-1">
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="block bg-black w-full max-w-[400px] aspect-square"
            />

            {/* Overlays */}
            {!isStarted && !gameOver && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20">
                <p className="text-[#00FFFF] text-xl animate-pulse mb-4">&gt; AWAITING_INPUT</p>
                <p className="text-[#FF00FF] text-sm">[W,A,S,D] OR [ARROWS] TO START</p>
              </div>
            )}

            {gameOver && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20">
                <h2 className="glitch text-5xl text-[#FF00FF] mb-4" data-text="FATAL_ERROR">FATAL_ERROR</h2>
                <p className="text-[#00FFFF] mb-6 text-lg">&gt; SCORE_DUMP: {score}</p>
                <button
                  onClick={initGame}
                  className="px-4 py-2 border border-[#FF00FF] text-[#FF00FF] hover:bg-[#FF00FF] hover:text-black transition-colors uppercase tracking-widest"
                >
                  [ REBOOT_SYSTEM ]
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Music Player */}
        <div className="w-full max-w-[350px] border-2 border-[#FF00FF] bg-black p-4 shadow-[0_0_15px_#FF00FF] relative z-10">
          <audio ref={audioRef} src={TRACKS[currentTrack].url} onEnded={nextTrack} />

          <div className="text-[#00FFFF] text-sm mb-4 border-b border-[#FF00FF] pb-2 flex justify-between">
            <span>&gt;&gt; AUDIO_STREAM</span>
            <span className={isPlaying ? "animate-pulse text-[#FF00FF]" : "text-gray-600"}>
              {isPlaying ? "ACTIVE" : "STANDBY"}
            </span>
          </div>

          <div className="mb-6">
            <p className="text-xs text-[#FF00FF] mb-1">&gt; CURRENT_TRACK: {TRACKS[currentTrack].id}</p>
            <h3 className="text-xl text-white truncate glitch" data-text={TRACKS[currentTrack].title}>
              {TRACKS[currentTrack].title}
            </h3>
            
            {/* Fake visualizer */}
            <div className="flex items-end gap-1 h-6 mt-4 border-b border-[#00FFFF]/30 pb-1">
              {[...Array(16)].map((_, i) => (
                <div 
                  key={i} 
                  className="flex-1 bg-[#00FFFF] transition-all duration-75"
                  style={{ 
                    height: isPlaying ? `${Math.random() * 100}%` : '2px',
                    opacity: isPlaying ? 0.8 : 0.3
                  }}
                />
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={prevTrack} className="text-[#FF00FF] hover:bg-[#FF00FF] hover:text-black px-3 py-1 border border-[#FF00FF] transition-colors">
              [ &lt;&lt; ]
            </button>
            
            <button onClick={togglePlay} className="text-[#00FFFF] hover:bg-[#00FFFF] hover:text-black px-6 py-2 border border-[#00FFFF] transition-colors font-bold text-lg">
              {isPlaying ? '[ PAUSE ]' : '[ PLAY ]'}
            </button>
            
            <button onClick={nextTrack} className="text-[#FF00FF] hover:bg-[#FF00FF] hover:text-black px-3 py-1 border border-[#FF00FF] transition-colors">
              [ &gt;&gt; ]
            </button>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-3 text-sm">
            <span className="text-[#FF00FF]">&gt; VOL:</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-900 appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #00FFFF ${volume * 100}%, #111 ${volume * 100}%)`
              }}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
