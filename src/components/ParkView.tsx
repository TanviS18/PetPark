import React, { useEffect, useRef, useState } from 'react';
import { Pet } from '../Pet';
import { PET_PALETTE, PET_TYPES } from '../constants';
import { Plus, Camera, Heart } from 'lucide-react';
import { cn } from '../lib/utils';

interface ParkViewProps {
  pets: Pet[];
  onShowGallery: () => void;
  isNight: boolean;
  toggleNight: () => void;
  isWelcomeScreen?: boolean;
}

export const ParkView: React.FC<ParkViewProps> = ({ pets, onShowGallery, isNight, toggleNight, isWelcomeScreen = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const uiLayerRef = useRef<HTMLDivElement>(null);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const timeRef = useRef(0);
  const requestRef = useRef<number>(null);
  const lastTimeRef = useRef<number>(0);

  // Pre-seeded decorative elements
  const grassTuftsRef = useRef(Array.from({ length: 49 }, (_, i) => {
    const gridX = (i % 7) / 6;
    const gridY = Math.floor(i / 7) / 6;
    const bladesCount = 4 + Math.floor(Math.random() * 3);
    return {
      x: gridX + (Math.random() - 0.5) * 0.05,
      y: gridY + (Math.random() - 0.5) * 0.05,
      color: ['#3D8A1A', '#4CAF50', '#2E7D32'][Math.floor(Math.random() * 3)],
      seed: Math.random() * 100,
      blades: Array.from({ length: bladesCount }, () => ({
        height: 8 + Math.random() * 6,
        offsetFactor: (Math.random() - 0.5) * 6
      }))
    };
  }));

  const flowersRef = useRef([
    { x: 0.15, y: 0.25, petalColor: '#FF1493', centerColor: '#FFFF00', size: 22, rotation: 0.5, seed: 1 },
    { x: 0.82, y: 0.18, petalColor: '#FF4500', centerColor: '#FFFFFF', size: 24, rotation: 1.2, seed: 2 },
    { x: 0.48, y: 0.85, petalColor: '#FFD700', centerColor: '#FFA500', size: 20, rotation: 2.5, seed: 3 },
    { x: 0.12, y: 0.72, petalColor: '#9370DB', centerColor: '#FFFF00', size: 26, rotation: 3.1, seed: 4 },
    { x: 0.88, y: 0.65, petalColor: '#00BFFF', centerColor: '#FFFFFF', size: 22, rotation: 4.8, seed: 5 },
    { x: 0.32, y: 0.92, petalColor: '#FF69B4', centerColor: '#FFA500', size: 28, rotation: 0.2, seed: 6 },
    { x: 0.72, y: 0.45, petalColor: '#FF1493', centerColor: '#FFFF00', size: 21, rotation: 1.5, seed: 7 },
    { x: 0.38, y: 0.12, petalColor: '#FF4500', centerColor: '#FFFFFF', size: 23, rotation: 2.8, seed: 8 },
    { x: 0.62, y: 0.75, petalColor: '#FFD700', centerColor: '#FFA500', size: 25, rotation: 5.2, seed: 9 },
  ]);

  const fishRef = useRef(Array.from({ length: 2 }, (_, i) => ({
    x: (Math.random() - 0.5) * 0.5,
    y: (Math.random() - 0.5) * 0.5,
    targetX: (Math.random() - 0.5) * 0.8,
    targetY: (Math.random() - 0.5) * 0.8,
    angle: Math.random() * Math.PI * 2,
    speed: 0.0002 + Math.random() * 0.0003,
    size: 10 + Math.random() * 4,
    phase: Math.random() * Math.PI * 2
  })));

  const toysRef = useRef([
    { emoji: '⚽', angle: 0.2, r: 0.65 },         // Right, slightly down
    { emoji: '🦴', angle: Math.PI / 2, r: 0.8 },  // Bottom
    { emoji: '🎾', angle: Math.PI * 1.7, r: 0.55 }, // Top Right area on grass
    { emoji: '🧶', angle: Math.PI * 1.5, r: 0.7 }, // Top
  ]);

  const ripplesRef = useRef<any[]>([]);
  const lastRippleTimeRef = useRef(0);

  const cloudsRef = useRef(Array.from({ length: 4 }, () => ({
    x: Math.random() * 1000,
    y: 50 + Math.random() * 100,
    speed: 0.2 + Math.random() * 0.5,
    size: 40 + Math.random() * 40
  })));

  const starsRef = useRef(Array.from({ length: 150 }, () => ({
    x: Math.random() * 1000,
    y: Math.random() * 400,
    size: 0.5 + Math.random() * 1.5,
    opacity: Math.random(),
    twinkleSpeed: 0.001 + Math.random() * 0.002
  })));

  const animate = (timestamp: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const dt = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;
    timeRef.current += dt;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Update dimensions
    if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    draw(ctx, canvas, dt);
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [pets, isNight]);

  const draw = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, dt: number) => {
    const w = canvas.width;
    const h = canvas.height;

    // 1. Sky
    const skyGradient = ctx.createLinearGradient(0, 0, 0, h);
    if (isNight) {
      skyGradient.addColorStop(0, '#020210'); // Very dark blue/black
      skyGradient.addColorStop(0.5, '#0a0a3a'); // Deep blue
      skyGradient.addColorStop(1, '#1a1a4a'); // Dark blue
    } else {
      skyGradient.addColorStop(0, '#87CEEB');
      skyGradient.addColorStop(0.7, '#FFF9C4');
      skyGradient.addColorStop(1, '#FFF4E0');
    }
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, w, h);

    // Stars
    if (isNight) {
      starsRef.current.forEach(star => {
        star.opacity = 0.2 + Math.abs(Math.sin(timeRef.current * star.twinkleSpeed + star.x)) * 0.8;
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
        ctx.beginPath();
        ctx.arc(star.x * (w / 1000), star.y * (h / 600), star.size, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Clouds
    ctx.fillStyle = isNight ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)';
    cloudsRef.current.forEach(cloud => {
      cloud.x += cloud.speed * dt * 0.05;
      if (cloud.x > w + 100) cloud.x = -100;
      drawCloud(ctx, cloud.x, cloud.y, cloud.size);
    });

    // Sun/Moon
    if (isNight) {
      const moonX = w - 100;
      const moonY = 80;
      const moonSize = 40;

      // Moon Glow
      const moonGlow = ctx.createRadialGradient(moonX, moonY, moonSize * 0.5, moonX, moonY, moonSize * 2);
      moonGlow.addColorStop(0, 'rgba(255, 249, 196, 0.3)');
      moonGlow.addColorStop(1, 'rgba(255, 249, 196, 0)');
      ctx.fillStyle = moonGlow;
      ctx.beginPath(); ctx.arc(moonX, moonY, moonSize * 2, 0, Math.PI * 2); ctx.fill();

      // Moon Body
      ctx.fillStyle = '#FFF9C4';
      ctx.shadowBlur = 15;
      ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
      ctx.beginPath(); ctx.arc(moonX, moonY, moonSize, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;

      // Crescent effect - cut out a circle from the moon
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath(); ctx.arc(moonX - 15, moonY - 5, moonSize, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';

      // Adding some subtle craters to the remaining part
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      [[5, -5, 6], [12, 10, 4], [5, 15, 3]].forEach(([cx, cy, cr]) => {
        ctx.beginPath(); ctx.arc(moonX + cx, moonY + cy, cr, 0, Math.PI * 2); ctx.fill();
      });
    } else {
      const sunX = w - 100;
      const sunY = 80;
      const sunSize = 50;
      const pulse = Math.sin(Date.now() * 0.002) * 5;
      
      // Sun Glow
      const sunGlow = ctx.createRadialGradient(sunX, sunY, sunSize * 0.8, sunX, sunY, sunSize * 3);
      sunGlow.addColorStop(0, 'rgba(255, 215, 0, 0.4)');
      sunGlow.addColorStop(1, 'rgba(255, 215, 0, 0)');
      ctx.fillStyle = sunGlow;
      ctx.beginPath(); ctx.arc(sunX, sunY, sunSize * 3, 0, Math.PI * 2); ctx.fill();

      // Sun Rays
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.2)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 + Date.now() * 0.0005;
        const rayLen = sunSize * 2 + Math.sin(Date.now() * 0.003 + i) * 10;
        ctx.beginPath();
        ctx.moveTo(sunX + Math.cos(angle) * sunSize, sunY + Math.sin(angle) * sunSize);
        ctx.lineTo(sunX + Math.cos(angle) * rayLen, sunY + Math.sin(angle) * rayLen);
        ctx.stroke();
      }

      ctx.fillStyle = '#FFD700';
      ctx.shadowBlur = 30 + pulse;
      ctx.shadowColor = '#FFD700';
      ctx.beginPath(); ctx.arc(sunX, sunY, sunSize + pulse/2, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }

    // 2. Circular Island (Floating Garden)
    const floatOffset = isWelcomeScreen ? Math.sin(timeRef.current / 1000) * 15 : 0;
    const shiftX = isWelcomeScreen ? -w * 0.15 : 0;
    const breathingScale = 1 + Math.sin(timeRef.current / 2000) * 0.015; // Subtle breathing
    
    ctx.save();
    ctx.translate(shiftX, floatOffset);

    const centerX = w / 2;
    const centerY = h / 2;
    const radius = Math.min(w, h) * 0.38;
    const radiusX = radius;
    const radiusY = radius * 0.7;

    // Apply breathing scaling to the entire island including elements
    ctx.translate(centerX, centerY);
    ctx.scale(breathingScale, breathingScale);
    ctx.translate(-centerX, -centerY);

    // Island Shadow (on the "void")
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(centerX + 30, centerY + 60, radius, radius * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Island Side (3D effect)
    ctx.fillStyle = '#5D4037'; // Darker dirt
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + 30, radius, radius * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#795548'; // Lighter dirt
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + 15, radius, radius * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Grass Top
    ctx.fillStyle = isNight ? '#2E7D32' : '#5DBB63';
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, radius, radius * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Decorative Elements (Grass & Flowers)
    const islandTime = Date.now();
    
    // Helper to check if point is on island
    const isOnIsland = (px: number, py: number) => {
      const dx = px - centerX;
      const dy = py - centerY;
      return (dx * dx) / (radiusX * radiusX) + (dy * dy) / (radiusY * radiusY) <= 0.85;
    };

    // Grass Tufts
    grassTuftsRef.current.forEach(tuft => {
      const tx = centerX + (tuft.x - 0.5) * radiusX * 1.8;
      const ty = centerY + (tuft.y - 0.5) * radiusY * 1.8;
      if (isOnIsland(tx, ty)) {
        drawGrassTuft(ctx, tx, ty, tuft.color, islandTime + tuft.seed * 100, tuft.blades);
      }
    });

    // Flowers
    flowersRef.current.forEach(flower => {
      const fx = centerX + (flower.x - 0.5) * radiusX * 1.7;
      const fy = centerY + (flower.y - 0.5) * radiusY * 1.7;
      if (isOnIsland(fx, fy)) {
        drawFlower(ctx, fx, fy, flower.petalColor, flower.centerColor, flower.size, flower.rotation, islandTime, flower.seed);
      }
    });

    // Bench above the fountain
    drawBench(ctx, centerX, centerY - 80, 1.0);

    // Fountain in the middle
    ctx.fillStyle = '#BDBDBD';
    ctx.beginPath(); ctx.ellipse(centerX, centerY - 20, 40, 20, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#90CAF9';
    ctx.beginPath(); ctx.ellipse(centerX, centerY - 25, 30, 15, 0, 0, Math.PI * 2); ctx.fill();
    // Water spray
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    for(let i=0; i<5; i++) {
      const h = 20 + Math.sin(Date.now()*0.005 + i) * 10;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - 25);
      ctx.quadraticCurveTo(centerX + (i-2)*10, centerY - 25 - h, centerX + (i-2)*15, centerY - 20);
      ctx.stroke();
    }

    // Pond
    const pondX = centerX - radius * 0.5;
    const pondY = centerY + radius * 0.2;
    const pondRX = radius * 0.25;
    const pondRY = radius * 0.15;

    // Pond Depth (3D rim)
    ctx.fillStyle = isNight ? '#0D47A1' : '#1976D2';
    ctx.beginPath();
    ctx.ellipse(pondX, pondY + 5, pondRX, pondRY, 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Simple Pond Water
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(pondX, pondY, pondRX, pondRY, 0.5, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = '#4A90D9';
    ctx.fillRect(pondX - pondRX, pondY - pondRY, pondRX * 2, pondRY * 2);

    // Golden Fishes
    const fishTime = islandTime * 0.001;
    fishRef.current.forEach(fish => {
      // Move toward target
      const dx = fish.targetX - fish.x;
      const dy = fish.targetY - fish.y;
      const dist = Math.hypot(dx, dy);
      
      if (dist < 0.05) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * 0.8;
        fish.targetX = Math.cos(a) * r;
        fish.targetY = Math.sin(a) * r;
      } else {
        fish.x += (dx / dist) * fish.speed * dt;
        fish.y += (dy / dist) * fish.speed * dt;
        fish.angle = Math.atan2(dy, dx);
      }
      
      const fx = pondX + fish.x * pondRX;
      const fy = pondY + fish.y * pondRY;
      
      ctx.save();
      ctx.translate(fx, fy);
      // Bobbing
      const bob = Math.sin(fishTime * 3 + fish.phase) * 2;
      ctx.translate(0, bob);
      ctx.rotate(fish.angle + Math.PI / 2);
      
      // Fish Body
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.ellipse(0, 0, fish.size, fish.size * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Tail
      ctx.beginPath();
      const tailWobble = Math.sin(fishTime * 10 + fish.phase) * 0.6;
      ctx.moveTo(-fish.size * 0.8, 0);
      ctx.lineTo(-fish.size * 1.5, -fish.size * 0.5 + tailWobble);
      ctx.lineTo(-fish.size * 1.5, fish.size * 0.5 + tailWobble);
      ctx.closePath();
      ctx.fill();
      
      ctx.restore();
    });

    // Simple shimmer
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(pondX, pondY, pondRX * 0.8, pondRY * 0.8, 0.5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore(); // End Pond Clip

    // Big Stones
    drawPebble(ctx, pondX + pondRX + 15, pondY + 10, 25, 15, 0.4, '#9E9E9E');
    drawPebble(ctx, centerX - radius * 0.7 - 25, centerY - radius * 0.1 + 45, 30, 18, -0.2, '#8D8D7A');

    // Trees
    drawTree(ctx, centerX + radius * 0.6, centerY - radius * 0.3, isNight);
    drawTree(ctx, centerX - radius * 0.7, centerY - radius * 0.1, isNight);

    // 3. Toys
    ctx.font = '24px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    toysRef.current.forEach(toy => {
      const tx = centerX + Math.cos(toy.angle) * radiusX * toy.r;
      const ty = centerY + Math.sin(toy.angle) * radiusY * toy.r;
      ctx.fillText(toy.emoji, tx, ty);
    });

    // 4. Pets
    pets.forEach(pet => {
      pet.update(dt, pets, w, h);
      if (pet.isUser) {
        drawUserPet(ctx, pet);
      } else {
        drawRandomPet(ctx, pet);
      }
      drawPetName(ctx, pet);
    });

    // 4. Interactions (Hearts)
    pets.forEach(pet => {
      if (pet.state === 'playing' && pet.friend) {
        const midX = (pet.x + pet.friend.x) / 2;
        const midY = (pet.y + pet.friend.y) / 2 - 40;
        ctx.fillStyle = '#FF6B6B';
        ctx.font = '20px Arial';
        ctx.fillText('❤️', midX, midY - (Date.now() % 1000) / 20);
      }
    });

    ctx.restore();
  };

  const drawCloud = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    ctx.save();
    
    // Cloud Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    ctx.beginPath();
    ctx.arc(x + 5, y + 5, size, 0, Math.PI * 2);
    ctx.arc(x + size * 0.6 + 5, y - size * 0.3 + 5, size * 0.8, 0, Math.PI * 2);
    ctx.arc(x + size * 1.2 + 5, y + 5, size * 0.7, 0, Math.PI * 2);
    ctx.fill();

    // Cloud Body with Gradient for 3D effect
    const grad = ctx.createRadialGradient(x + size * 0.5, y - size * 0.2, 0, x + size * 0.5, y - size * 0.2, size * 1.5);
    grad.addColorStop(0, 'white');
    grad.addColorStop(0.8, '#F5F5F5');
    grad.addColorStop(1, '#E0E0E0');
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.arc(x + size * 0.6, y - size * 0.3, size * 0.8, 0, Math.PI * 2);
    ctx.arc(x + size * 1.2, y, size * 0.7, 0, Math.PI * 2);
    ctx.fill();

    // Fluffy highlights
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(x - size * 0.2, y - size * 0.2, size * 0.4, 0, Math.PI * 2);
    ctx.arc(x + size * 0.4, y - size * 0.5, size * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  const drawTree = (ctx: CanvasRenderingContext2D, x: number, y: number, night: boolean) => {
    const time = Date.now() * 0.001;
    const sway = Math.sin(time) * 2;
    const breath = 1 + Math.sin(time * 0.5) * 0.02;
    
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(sway * Math.PI / 180);
    ctx.scale(breath, breath);
    
    // Trunk Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(-8, 5, 20, 60);

    // Trunk
    const trunkGrad = ctx.createLinearGradient(-10, 0, 10, 0);
    trunkGrad.addColorStop(0, '#3E2723');
    trunkGrad.addColorStop(0.5, '#5D4037');
    trunkGrad.addColorStop(1, '#3E2723');
    ctx.fillStyle = trunkGrad;
    ctx.fillRect(-10, 0, 20, 60);
    
    // Leaves (3D layers)
    const leafColors = night 
      ? ['#1B5E20', '#2E7D32', '#388E3C'] 
      : ['#2E7D32', '#388E3C', '#4CAF50'];

    // Back layer
    ctx.fillStyle = leafColors[0];
    ctx.beginPath(); ctx.arc(0, -20, 45, 0, Math.PI * 2); ctx.fill();
    
    // Middle layer
    ctx.fillStyle = leafColors[1];
    ctx.beginPath(); ctx.arc(-25, -15, 35, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(25, -15, 35, 0, Math.PI * 2); ctx.fill();
    
    // Top layer
    ctx.fillStyle = leafColors[2];
    ctx.beginPath(); ctx.arc(0, -45, 40, 0, Math.PI * 2); ctx.fill();
    
    // Highlights
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath(); ctx.arc(-10, -50, 15, 0, Math.PI * 2); ctx.fill();
    
    ctx.restore();
  };

  const drawGrassTuft = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string, time: number, blades: any[]) => {
    for (let i = 0; i < blades.length; i++) {
      const blade = blades[i];
      const offsetX = blade.offsetFactor;
      const height = blade.height;
      const sway = 0; // No movement
      ctx.beginPath();
      ctx.moveTo(x + offsetX, y);
      ctx.quadraticCurveTo(
        x + offsetX + sway, y - height * 0.6,
        x + offsetX + sway * 1.5, y - height
      );
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  };

  const drawFlower = (ctx: CanvasRenderingContext2D, x: number, y: number, petalColor: string, centerColor: string, size: number, rotation: number, time: number, seed: number) => {
    ctx.save();
    ctx.translate(x, y);
    // Gentle sway
    const sway = Math.sin(time * 0.0008 + seed) * 0.06;
    ctx.rotate(sway);

    // Stem
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(size * 0.2, -size * 0.5, 0, -size);
    ctx.strokeStyle = '#3D7A1A';
    ctx.lineWidth = size * 0.12;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.translate(0, -size);

    // Petals (5, irregular)
    for (let i = 0; i < 5; i++) {
      ctx.save();
      ctx.rotate((i / 5) * Math.PI * 2 + rotation);
      ctx.beginPath();
      ctx.ellipse(0, -size * 0.32, size * 0.14, size * 0.3, 0, 0, Math.PI * 2);
      ctx.fillStyle = petalColor;
      ctx.globalAlpha = 0.88;
      ctx.fill();
      ctx.restore();
    }

    // Leaf on stem (small)
    ctx.save();
    ctx.translate(size * 0.1, size * 0.4);
    ctx.rotate(0.5);
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.08, size * 0.18, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#4CAF50';
    ctx.globalAlpha = 0.9;
    ctx.fill();
    ctx.restore();

    // Center
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = centerColor;
    ctx.fill();
    ctx.restore();
  };

  const drawPebble = (ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rotation: number, color: string) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    // Main pebble body
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    // Subtle highlight
    ctx.beginPath();
    ctx.ellipse(-rx * 0.2, -ry * 0.25, rx * 0.35, ry * 0.3, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fill();
    // Subtle shadow edge
    ctx.beginPath();
    ctx.ellipse(rx * 0.1, ry * 0.2, rx * 0.7, ry * 0.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fill();
    ctx.restore();
  };

  const drawBench = (ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) => {
    const s = scale || 1;
    ctx.save();
    ctx.translate(x, y);

    // Cast shadow
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.ellipse(2*s, 8*s, 28*s, 8*s, 0, 0, Math.PI*2);
    ctx.fill();

    // Bench legs (4 dark brown rectangles)
    ctx.fillStyle = '#5D4037';
    [[-18,-2],[18,-2],[-18,8],[18,8]].forEach(([lx,ly]) => {
      ctx.fillRect(lx*s-2*s, ly*s, 4*s, 12*s);
    });

    // Seat planks (3 horizontal planks, medium brown)
    const plankColors = ['#8D6E63','#A1887F','#8D6E63'];
    plankColors.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      // @ts-ignore - roundRect is available in modern browsers
      if (ctx.roundRect) {
        // @ts-ignore
        ctx.roundRect((-22+i*1)*s, (-4+i*0.5)*s, 44*s, 5*s, 2*s);
      } else {
        ctx.rect((-22+i*1)*s, (-4+i*0.5)*s, 44*s, 5*s);
      }
      ctx.fill();
    });

    // Backrest planks (2 planks, slightly angled for isometric)
    ['#8D6E63','#A1887F'].forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.save();
      ctx.transform(1, -0.15, 0, 1, 0, 0); // slight skew for iso look
      ctx.beginPath();
      // @ts-ignore
      if (ctx.roundRect) {
        // @ts-ignore
        ctx.roundRect((-20+i)*s, (-18-i*4)*s, 40*s, 4*s, 2*s);
      } else {
        ctx.rect((-20+i)*s, (-18-i*4)*s, 40*s, 4*s);
      }
      ctx.fill();
      ctx.restore();
    });

    // Backrest supports
    ctx.fillStyle = '#5D4037';
    [[-14,0],[14,0]].forEach(([lx]) => {
      ctx.fillRect(lx*s-1.5*s, -18*s, 3*s, 14*s);
    });

    ctx.restore();
  };

  const getCausticPath = (cx: number, cy: number, r: number, time: number, seed: number) => {
    const points = 8;
    let d = '';
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const noise = Math.sin(time * 0.8 + seed + angle * 3) * 0.3 + 0.7;
      const x = cx + Math.cos(angle) * r * noise;
      const y = cy + Math.sin(angle) * r * noise * 0.5; // squished for isometric
      d += i === 0 ? `M ${x} ${y}` : ` Q ${cx + Math.cos(angle-0.2)*r*noise} ${cy + Math.sin(angle-0.2)*r*noise*0.5} ${x} ${y}`;
    }
    return d + ' Z';
  };

  const drawSparkle = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, opacity: number) => {
    ctx.strokeStyle = `rgba(255,255,255,${opacity})`;
    ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x-size, y); ctx.lineTo(x+size, y); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y-size); ctx.lineTo(x, y+size); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x-size*0.6, y-size*0.6); ctx.lineTo(x+size*0.6, y+size*0.6); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x+size*0.6, y-size*0.6); ctx.lineTo(x-size*0.6, y+size*0.6); ctx.stroke();
  };

  const drawRandomPet = (ctx: CanvasRenderingContext2D, pet: Pet) => {
    ctx.save();
    ctx.translate(pet.x, pet.y);
    ctx.scale(pet.facing, 1);
    
    const wobble = (pet.state === 'walking' || pet.state === 'running') 
      ? Math.sin(Date.now() * 0.01 * pet.speed) * 0.1 : 0;
    ctx.rotate(wobble);
    
    const s = pet.size / 40;
    ctx.scale(s, s);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.beginPath(); ctx.ellipse(0, 20, 15, 5, 0, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = pet.color;
    switch(pet.type) {
      case 'dog': drawDog(ctx, pet.color); break;
      case 'cat': drawCat(ctx, pet.color); break;
      case 'bunny': drawBunny(ctx, pet.color); break;
      default: drawGeneric(ctx, pet.color);
    }
    ctx.restore();
  };

  const drawDog = (ctx: CanvasRenderingContext2D, color: string) => {
    ctx.beginPath(); ctx.ellipse(0, 5, 18, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(20, -5, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.arc(28, -4, 2, 0, Math.PI * 2); ctx.fill(); // Nose
    ctx.beginPath(); ctx.arc(22, -8, 2.5, 0, Math.PI * 2); ctx.fill(); // Eye
  };

  const drawCat = (ctx: CanvasRenderingContext2D, color: string) => {
    ctx.beginPath(); ctx.ellipse(0, 5, 15, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(18, -6, 10, 0, Math.PI * 2); ctx.fill();
    // Ears
    ctx.beginPath(); ctx.moveTo(11, -13); ctx.lineTo(14, -22); ctx.lineTo(18, -13); ctx.fill();
    ctx.beginPath(); ctx.moveTo(19, -13); ctx.lineTo(23, -22); ctx.lineTo(26, -13); ctx.fill();
  };

  const drawBunny = (ctx: CanvasRenderingContext2D, color: string) => {
    ctx.beginPath(); ctx.ellipse(0, 6, 14, 13, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(16, -4, 10, 0, Math.PI * 2); ctx.fill();
    // Ears
    ctx.beginPath(); ctx.ellipse(11, -18, 4, 12, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(20, -18, 4, 12, 0.3, 0, Math.PI * 2); ctx.fill();
  };

  const drawGeneric = (ctx: CanvasRenderingContext2D, color: string) => {
    ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(12, -8, 8, 0, Math.PI * 2); ctx.fill();
  };

  const drawUserPet = (ctx: CanvasRenderingContext2D, pet: Pet) => {
    if (!pet.image) return;
    ctx.save();
    ctx.translate(pet.x, pet.y);
    ctx.scale(pet.facing, 1);
    
    if (pet.state === 'walking' || pet.state === 'running') {
      ctx.rotate(Math.sin(Date.now() * 0.008) * 0.06);
    }

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath(); ctx.ellipse(0, pet.size / 2 + 4, pet.size / 2, 8, 0, 0, Math.PI * 2); ctx.fill();

    ctx.drawImage(pet.image, -pet.size / 2, -pet.size / 2, pet.size, pet.size);
    ctx.restore();
  };

  const drawPetName = (ctx: CanvasRenderingContext2D, pet: Pet) => {
    ctx.save();
    ctx.translate(pet.x, pet.y + pet.size / 2 + 15);
    
    // Name Tag Background
    const padding = 8;
    ctx.font = 'bold 12px Nunito, sans-serif';
    const textWidth = ctx.measureText(pet.name).width;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    // @ts-ignore
    if (ctx.roundRect) {
      // @ts-ignore
      ctx.roundRect(-textWidth / 2 - padding, -10, textWidth + padding * 2, 20, 10);
    } else {
      ctx.rect(-textWidth / 2 - padding, -10, textWidth + padding * 2, 20);
    }
    ctx.fill();
    
    // Name Text
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pet.name, 0, 0);

    // Bubble if exists
    if (pet.bubble) {
      ctx.translate(0, -pet.size - 35);
      const bubbleText = pet.bubble.text;
      const bPadding = 10;
      ctx.font = '14px Nunito, sans-serif';
      const bWidth = ctx.measureText(bubbleText).width;
      
      ctx.fillStyle = 'white';
      ctx.beginPath();
      // @ts-ignore
      if (ctx.roundRect) {
        // @ts-ignore
        ctx.roundRect(-bWidth / 2 - bPadding, -12, bWidth + bPadding * 2, 24, 12);
      } else {
        ctx.rect(-bWidth / 2 - bPadding, -12, bWidth + bPadding * 2, 24);
      }
      ctx.fill();
      
      ctx.strokeStyle = '#eee';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#333';
      ctx.fillText(bubbleText, 0, 0);
    }
    
    ctx.restore();
  };

  const takeScreenshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'pet-park.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full" />
      
      {/* Controls */}
      <div className="absolute bottom-6 right-6 flex flex-col sm:flex-row gap-3 z-50">
        <button 
          onClick={onShowGallery}
          className="p-4 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg transition-transform hover:scale-110 flex items-center gap-2 font-bold"
        >
          Show Pet Gallery
        </button>
        <button 
          onClick={takeScreenshot}
          className="p-4 bg-white/90 hover:bg-white rounded-full shadow-lg transition-transform hover:scale-110"
        >
          <Camera className="text-gray-600" />
        </button>
      </div>
    </div>
  );
};
