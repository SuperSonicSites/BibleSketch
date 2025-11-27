
import React, { useEffect, useState, useRef } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  type: 'sparkle' | 'confetti' | 'star' | 'ring';
  rotation?: number;
}

export const CelebrationEffect: React.FC<{ onComplete?: () => void }> = ({ onComplete }) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [visible, setVisible] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Play celebration sound (optional - comment out if not wanted)
    // audioRef.current = new Audio('/celebration.mp3');
    // audioRef.current.volume = 0.3;
    // audioRef.current.play().catch(() => {});

    // Generate particles - MORE of them for bigger impact
    const colors = [
      '#FCD34D', // Gold
      '#FBBF24', // Amber  
      '#7C3AED', // Purple
      '#A78BFA', // Light Purple
      '#34D399', // Emerald
      '#F472B6', // Pink
      '#FDE68A', // Light Gold
      '#C084FC', // Violet
    ];

    const newParticles: Particle[] = [];
    
    // Create burst sparkles from center
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 2;
      const distance = 20 + Math.random() * 30;
      newParticles.push({
        id: i,
        x: 50 + Math.cos(angle) * distance,
        y: 35 + Math.sin(angle) * distance * 0.6,
        size: Math.random() * 14 + 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 0.2,
        duration: Math.random() * 1 + 1.2,
        type: 'sparkle',
      });
    }

    // Create falling confetti - more pieces
    for (let i = 30; i < 80; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: -5 - Math.random() * 15,
        size: Math.random() * 10 + 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 0.8,
        duration: Math.random() * 2.5 + 2,
        type: 'confetti',
        rotation: Math.random() * 360,
      });
    }

    // Create golden stars
    for (let i = 80; i < 95; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 50 + 15,
        size: Math.random() * 20 + 14,
        color: colors[Math.floor(Math.random() * 2)], // Gold/Amber only
        delay: Math.random() * 0.5,
        duration: Math.random() * 1 + 1.2,
        type: 'star',
      });
    }

    // Create expanding rings
    for (let i = 95; i < 98; i++) {
      newParticles.push({
        id: i,
        x: 50,
        y: 35,
        size: 50 + i * 30,
        color: i % 2 === 0 ? '#FCD34D' : '#7C3AED',
        delay: i * 0.15,
        duration: 1.5,
        type: 'ring',
      });
    }

    setParticles(newParticles);

    // Hide after animation
    const timer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, 4000);

    return () => {
      clearTimeout(timer);
      audioRef.current?.pause();
    };
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {/* Multiple layered glow bursts */}
      <div 
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full animate-celebration-glow"
        style={{
          background: 'radial-gradient(circle, rgba(252,211,77,0.5) 0%, rgba(124,58,237,0.3) 30%, transparent 60%)',
        }}
      />
      <div 
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full animate-celebration-glow"
        style={{
          background: 'radial-gradient(circle, rgba(124,58,237,0.2) 0%, rgba(252,211,77,0.1) 40%, transparent 70%)',
          animationDelay: '0.1s',
        }}
      />

      {/* Particles */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className={`absolute ${
            particle.type === 'sparkle' 
              ? 'animate-celebration-sparkle' 
              : particle.type === 'star'
              ? 'animate-celebration-star'
              : particle.type === 'ring'
              ? 'animate-celebration-ring'
              : 'animate-celebration-fall'
          }`}
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`,
          }}
        >
          {particle.type === 'star' ? (
            <svg
              width={particle.size}
              height={particle.size}
              viewBox="0 0 24 24"
              fill={particle.color}
              className="drop-shadow-lg"
              style={{ filter: `drop-shadow(0 0 ${particle.size/3}px ${particle.color})` }}
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          ) : particle.type === 'sparkle' ? (
            <div
              className="rounded-full"
              style={{
                width: particle.size,
                height: particle.size,
                backgroundColor: particle.color,
                boxShadow: `0 0 ${particle.size * 1.5}px ${particle.color}, 0 0 ${particle.size * 0.5}px white`,
              }}
            />
          ) : particle.type === 'ring' ? (
            <div
              className="rounded-full border-2"
              style={{
                width: particle.size,
                height: particle.size,
                borderColor: particle.color,
                marginLeft: -particle.size / 2,
                marginTop: -particle.size / 2,
                opacity: 0.6,
              }}
            />
          ) : (
            <div
              style={{
                width: particle.size,
                height: particle.size * 0.6,
                backgroundColor: particle.color,
                borderRadius: '2px',
                transform: `rotate(${particle.rotation}deg)`,
                boxShadow: `0 2px 4px rgba(0,0,0,0.1)`,
              }}
            />
          )}
        </div>
      ))}

      {/* Success message - bigger and more prominent */}
      <div className="absolute top-[28%] left-1/2 -translate-x-1/2 -translate-y-1/2 animate-celebration-message">
        <div className="bg-white/95 backdrop-blur-md rounded-3xl px-10 py-5 shadow-2xl border-2 border-amber-200/50">
          <p className="text-3xl md:text-4xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-purple-500 to-amber-500 whitespace-nowrap">
            ✨ Your creation is ready! ✨
          </p>
        </div>
      </div>
    </div>
  );
};

