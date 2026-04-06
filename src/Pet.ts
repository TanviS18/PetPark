import { PET_SPEEDS, PET_SOUNDS, PET_PALETTE } from './constants';

export type PetState = 'idle' | 'walking' | 'running' | 'sleeping' | 'playing';

export interface PetBubble {
  text: string;
  timer: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  points: Point[];
  color: string;
  size: number;
}

export class Pet {
  id: string;
  name: string;
  type: string;
  strokes: Stroke[] | null;
  isUser: boolean;
  
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  state: PetState = 'idle';
  stateTimer: number = 0;
  nextStateChange: number;
  
  color: string;
  size: number;
  facing: number = 1;
  friend: Pet | null = null;
  bubble: PetBubble | null = null;

  private cachedCanvas: HTMLCanvasElement | null = null;

  constructor({ name, type, strokes, isUser, canvasWidth, canvasHeight }: { 
    name: string, 
    type: string, 
    strokes?: Stroke[] | string | null, 
    isUser: boolean,
    canvasWidth: number,
    canvasHeight: number
  }) {
    this.id = Math.random().toString(36).substring(2, 9);
    this.name = name;
    this.type = type;
    this.isUser = isUser;

    if (typeof strokes === 'string') {
      try {
        this.strokes = JSON.parse(strokes);
      } catch (e) {
        console.error("Failed to parse strokes", e);
        this.strokes = null;
      }
    } else {
      this.strokes = strokes || null;
    }

    // Position - random start on the circular island area
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const radius = Math.min(canvasWidth, canvasHeight) * 0.3;
    
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * radius;
    this.x = centerX + Math.cos(angle) * r;
    this.y = centerY + Math.sin(angle) * r;

    this.targetX = this.x;
    this.targetY = this.y;
    this.speed = PET_SPEEDS[type] || 0.8;
    this.nextStateChange = 2000 + Math.random() * 4000;

    this.color = PET_PALETTE[Math.floor(Math.random() * PET_PALETTE.length)];
    this.size = isUser ? 60 : 30 + Math.random() * 20;
  }

  render(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, facing: number) {
    if (!this.strokes) return;

    if (!this.cachedCanvas) {
      this.cachedCanvas = document.createElement('canvas');
      this.cachedCanvas.width = 800;
      this.cachedCanvas.height = 600;
      const cCtx = this.cachedCanvas.getContext('2d');
      if (cCtx) {
        this.strokes.forEach(stroke => {
          cCtx.lineJoin = 'round';
          cCtx.lineCap = 'round';
          cCtx.strokeStyle = stroke.color;
          cCtx.lineWidth = stroke.size;
          cCtx.beginPath();
          if (stroke.points.length > 0) {
            cCtx.moveTo(stroke.points[0].x, stroke.points[0].y);
            for (let i = 1; i < stroke.points.length; i++) {
              cCtx.lineTo(stroke.points[i].x, stroke.points[i].y);
            }
            cCtx.stroke();
          }
        });
      }
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(facing, 1);
    
    // The original drawing was on 800x600, but we captured 400x400 from (200, 100)
    // To keep it simple, let's just render the relevant part
    const sourceX = 200;
    const sourceY = 100;
    const sourceSize = 400;
    
    ctx.drawImage(
      this.cachedCanvas, 
      sourceX, sourceY, sourceSize, sourceSize, 
      -size / 2, -size / 2, size, size
    );
    ctx.restore();
  }

  toDataURL(): string {
    if (!this.strokes) return '';
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 400;
    tempCanvas.height = 400;
    const tCtx = tempCanvas.getContext('2d');
    if (tCtx) {
      this.strokes.forEach(stroke => {
        tCtx.lineJoin = 'round';
        tCtx.lineCap = 'round';
        tCtx.strokeStyle = stroke.color;
        tCtx.lineWidth = stroke.size;
        tCtx.beginPath();
        if (stroke.points.length > 0) {
          tCtx.moveTo(stroke.points[0].x - 200, stroke.points[0].y - 100);
          for (let i = 1; i < stroke.points.length; i++) {
            tCtx.lineTo(stroke.points[i].x - 200, stroke.points[i].y - 100);
          }
          tCtx.stroke();
        }
      });
    }
    return tempCanvas.toDataURL();
  }

  update(dt: number, allPets: Pet[], canvasWidth: number, canvasHeight: number) {
    this.stateTimer += dt;
    if (this.stateTimer > this.nextStateChange) {
      this.chooseNewState(allPets, canvasWidth, canvasHeight);
    }

    // Move toward target
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.hypot(dx, dy);
    
    if (dist > 5) {
      const spd = this.state === 'running' ? this.speed * 2.5 : this.speed;
      this.x += (dx / dist) * spd * dt * 0.06;
      this.y += (dy / dist) * spd * dt * 0.06;
      this.facing = dx > 0 ? 1 : -1;
    }

    // Keep in park bounds (elliptical island)
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const radiusX = Math.min(canvasWidth, canvasHeight) * 0.38;
    const radiusY = radiusX * 0.7;
    
    // Ellipse equation: (x-cx)^2/rx^2 + (y-cy)^2/ry^2 <= 1
    const dxFromCenter = this.x - centerX;
    const dyFromCenter = this.y - centerY;
    const normalizedDist = (dxFromCenter * dxFromCenter) / (radiusX * radiusX) + 
                          (dyFromCenter * dyFromCenter) / (radiusY * radiusY);
    
    if (normalizedDist > 0.8) { // 0.8 is safer to stay well within the green
      const angle = Math.atan2(dyFromCenter, dxFromCenter);
      this.x = centerX + Math.cos(angle) * radiusX * 0.8;
      this.y = centerY + Math.sin(angle) * radiusY * 0.8;
      
      // Change target back toward center
      this.targetX = centerX + (Math.random() - 0.5) * radiusX * 0.4;
      this.targetY = centerY + (Math.random() - 0.5) * radiusY * 0.4;
    }

    // Bubble timer
    if (this.bubble) {
      this.bubble.timer -= dt;
      if (this.bubble.timer <= 0) this.bubble = null;
    }
  }

  chooseNewState(allPets: Pet[], canvasWidth: number, canvasHeight: number) {
    this.stateTimer = 0;
    this.nextStateChange = 2000 + Math.random() * 5000;
    const roll = Math.random();
    
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const radius = Math.min(canvasWidth, canvasHeight) * 0.3;

    if (roll < 0.3) {
      this.state = 'walking';
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * radius;
      this.targetX = centerX + Math.cos(angle) * r;
      this.targetY = centerY + Math.sin(angle) * r;
    } else if (roll < 0.45) {
      this.state = 'sleeping';
      this.bubble = { text: 'zzz', timer: 3000 };
    } else if (roll < 0.6) {
      this.state = 'running';
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * radius;
      this.targetX = centerX + Math.cos(angle) * r;
      this.targetY = centerY + Math.sin(angle) * r;
      this.bubble = { text: PET_SOUNDS[this.type] || '!', timer: 1500 };
    } else if (roll < 0.75) {
      const others = allPets.filter(p => p !== this);
      if (others.length > 0) {
        const nearest = others.reduce((a, b) =>
          Math.hypot(a.x - this.x, a.y - this.y) < Math.hypot(b.x - this.x, b.y - this.y) ? a : b);
        this.state = 'playing';
        this.friend = nearest;
        this.targetX = nearest.x + (Math.random() - 0.5) * 60;
        this.targetY = nearest.y + (Math.random() - 0.5) * 40;
        this.bubble = { text: '♥', timer: 2500 };
      }
    } else {
      this.state = 'idle';
    }
  }
}
