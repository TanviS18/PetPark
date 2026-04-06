import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, X, Check, Undo, Trash2, Palette, MousePointer2 } from 'lucide-react';
import { PET_PALETTE } from '../constants';
import { cn } from '../lib/utils';

interface DrawingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDone: (drawingDataUrl: string) => void;
}

declare const Hands: any;
declare const CameraUtils: any;

export const DrawingModal: React.FC<DrawingModalProps> = ({ isOpen, onClose, onDone }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const cursorCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [colorIndex, setColorIndex] = useState(7); // Default brown
  const [brushSize, setBrushSize] = useState(8);
  const [isDrawing, setIsDrawing] = useState(false);
  const [handDetected, setHandDetected] = useState(false);
  const [gestureText, setGestureText] = useState("");
  const [drawingMode, setDrawingMode] = useState<'finger' | 'mouse'>('finger');

  const strokesRef = useRef<any[]>([]);
  const currentStrokeRef = useRef<any[]>([]);
  const lastPointRef = useRef<{ x: number, y: number } | null>(null);
  const gestureTimersRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!isOpen) return;

    let camera: any = null;
    let hands: any = null;

    if (drawingMode === 'finger') {
      let isClosed = false;
      hands = new Hands({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      hands.onResults(onResults);

      camera = new (window as any).Camera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current && hands && !isClosed) {
            try {
              await hands.send({ image: videoRef.current });
            } catch (e) {
              console.error("MediaPipe error:", e);
            }
          }
        },
        width: 640,
        height: 480
      });
      camera.start();

      const cleanup = () => {
        isClosed = true;
        if (camera) {
          camera.stop();
        }
        if (hands) {
          hands.close();
        }
      };

      // Initialize canvases
      const resize = () => {
        [bgCanvasRef, drawCanvasRef, cursorCanvasRef].forEach(ref => {
          if (ref.current) {
            ref.current.width = 800;
            ref.current.height = 600;
          }
        });
        drawGrid();
      };
      resize();

      return cleanup;
    } else {
      // Mouse mode initialization
      const resize = () => {
        [bgCanvasRef, drawCanvasRef, cursorCanvasRef].forEach(ref => {
          if (ref.current) {
            ref.current.width = 800;
            ref.current.height = 600;
          }
        });
        drawGrid();
      };
      resize();
    }
  }, [isOpen, drawingMode]);

  // Mouse Drawing Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (drawingMode !== 'mouse') return;
    const rect = drawCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = (e.clientX - rect.left) * (800 / rect.width);
    const y = (e.clientY - rect.top) * (600 / rect.height);
    
    setIsDrawing(true);
    currentStrokeRef.current = [];
    drawPoint(x, y);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (drawingMode !== 'mouse' || !isDrawing) return;
    const rect = drawCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = (e.clientX - rect.left) * (800 / rect.width);
    const y = (e.clientY - rect.top) * (600 / rect.height);
    
    drawPoint(x, y);
  };

  const handleMouseUp = () => {
    if (drawingMode !== 'mouse' || !isDrawing) return;
    setIsDrawing(false);
    if (currentStrokeRef.current.length > 0) {
      strokesRef.current.push({
        points: currentStrokeRef.current,
        color: PET_PALETTE[colorIndex],
        size: brushSize
      });
    }
    lastPointRef.current = null;
  };

  const drawGrid = () => {
    const ctx = bgCanvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 800, 600);
    ctx.fillStyle = '#fdfdfd';
    ctx.fillRect(0, 0, 800, 600);
    
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 1;
    for (let x = 0; x < 800; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 600); ctx.stroke();
    }
    for (let y = 0; y < 600; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(800, y); ctx.stroke();
    }

    // Bounding box
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = PET_PALETTE[colorIndex];
    ctx.strokeRect(200, 100, 400, 400);
    ctx.setLineDash([]);
    ctx.fillStyle = '#999';
    ctx.font = '14px Nunito';
    ctx.textAlign = 'center';
    ctx.fillText('Draw your pet here', 400, 90);
  };

  const onResults = (results: any) => {
    const ctx = cursorCanvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 800, 600);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      setHandDetected(true);
      const landmarks = results.multiHandLandmarks[0];
      
      // Index finger tip (landmark 8)
      const x = (1 - landmarks[8].x) * 800;
      const y = landmarks[8].y * 600;

      // Cursor
      ctx.fillStyle = PET_PALETTE[colorIndex];
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2 + 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Gesture Recognition
      handleGestures(landmarks, x, y);
    } else {
      setHandDetected(false);
      setIsDrawing(false);
      lastPointRef.current = null;
    }
  };

  const handleGestures = (lm: any, x: number, y: number) => {
    // Simple finger counting / state
    const isIndexUp = lm[8].y < lm[6].y;
    const isMiddleUp = lm[12].y < lm[10].y;
    const isRingUp = lm[16].y < lm[14].y;
    const isPinkyUp = lm[20].y < lm[18].y;
    const isThumbUp = lm[4].x < lm[3].x; // Simplified

    // Drawing logic
    if (isIndexUp && !isMiddleUp && !isRingUp && !isPinkyUp) {
      if (!isDrawing) {
        setIsDrawing(true);
        currentStrokeRef.current = [];
      }
      drawPoint(x, y);
    } else {
      if (isDrawing) {
        setIsDrawing(false);
        if (currentStrokeRef.current.length > 0) {
          strokesRef.current.push({
            points: currentStrokeRef.current,
            color: PET_PALETTE[colorIndex],
            size: brushSize
          });
        }
        lastPointRef.current = null;
      }
    }

    // Peace (Next Color)
    if (isIndexUp && isMiddleUp && !isRingUp && !isPinkyUp) {
      updateTimer('peace', 800, () => setColorIndex(prev => (prev + 1) % PET_PALETTE.length));
      setGestureText("✌️ Next Color");
    } else if (isIndexUp && isMiddleUp && isRingUp && !isPinkyUp) {
      updateTimer('three', 800, () => setColorIndex(prev => (prev - 1 + PET_PALETTE.length) % PET_PALETTE.length));
      setGestureText("🤟 Prev Color");
    } else if (isIndexUp && isMiddleUp && isRingUp && isPinkyUp && !isThumbUp) {
      updateTimer('palm', 600, () => setBrushSize(prev => Math.min(prev + 2, 30)));
      setGestureText("✋ Brush Size Up");
    } else if (isIndexUp && isThumbUp && !isMiddleUp && !isRingUp && !isPinkyUp) {
      // Pinch simplified
      updateTimer('pinch', 600, () => setBrushSize(prev => Math.max(prev - 2, 2)));
      setGestureText("🤏 Brush Size Down");
    } else if (isThumbUp && isPinkyUp && !isIndexUp && !isMiddleUp && !isRingUp) {
      updateTimer('shaka', 1000, undo);
      setGestureText("🤙 Undo");
    } else if (!isIndexUp && !isMiddleUp && !isRingUp && !isPinkyUp) {
      updateTimer('fist', 1500, clear);
      setGestureText("✊ Clear All");
    } else {
      setGestureText("");
      gestureTimersRef.current = {};
    }
  };

  const updateTimer = (key: string, duration: number, action: () => void) => {
    const now = Date.now();
    if (!gestureTimersRef.current[key]) {
      gestureTimersRef.current[key] = now;
    } else if (now - gestureTimersRef.current[key] > duration) {
      action();
      gestureTimersRef.current[key] = now + 1000000; // Prevent repeat
    }
  };

  const drawPoint = (x: number, y: number) => {
    const ctx = drawCanvasRef.current?.getContext('2d');
    if (!ctx) return;

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.setLineDash([]); // Ensure solid lines
    ctx.strokeStyle = PET_PALETTE[colorIndex];
    ctx.lineWidth = brushSize;

    if (lastPointRef.current) {
      ctx.beginPath();
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    
    lastPointRef.current = { x, y };
    currentStrokeRef.current.push({ x, y });
  };

  const undo = () => {
    strokesRef.current.pop();
    redraw();
  };

  const clear = () => {
    strokesRef.current = [];
    redraw();
  };

  const redraw = () => {
    const ctx = drawCanvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 800, 600);
    strokesRef.current.forEach(stroke => {
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.setLineDash([]); // Ensure solid lines
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.beginPath();
      if (stroke.points.length > 0) {
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      }
    });
  };

  const handleDone = () => {
    if (strokesRef.current.length === 0) return;
    // Return the strokes as a JSON string for consistency
    onDone(JSON.stringify(strokesRef.current));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center"
        >
          {/* Top Bar */}
          <div className="w-full max-w-4xl flex items-center justify-between p-4 text-white">
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
              <X size={24} />
            </button>
            
            <div className="flex bg-white/10 p-1 rounded-xl">
              <button 
                onClick={() => setDrawingMode('finger')}
                className={cn(
                  "px-4 py-2 rounded-lg font-bold transition flex items-center gap-2",
                  drawingMode === 'finger' ? "bg-blue-500 text-white" : "hover:bg-white/5"
                )}
              >
                <Camera size={18} /> Finger
              </button>
              <button 
                onClick={() => setDrawingMode('mouse')}
                className={cn(
                  "px-4 py-2 rounded-lg font-bold transition flex items-center gap-2",
                  drawingMode === 'mouse' ? "bg-blue-500 text-white" : "hover:bg-white/5"
                )}
              >
                <MousePointer2 size={18} /> Mouse
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: PET_PALETTE[colorIndex] }} />
                <span className="text-sm">Brush: {brushSize}px</span>
              </div>
            </div>
            <button 
              onClick={handleDone}
              className="flex items-center gap-2 bg-green-500 hover:bg-green-600 px-6 py-2 rounded-full font-bold transition"
            >
              Done <Check size={20} />
            </button>
          </div>

          {/* Main Canvas Area */}
          <div className="relative w-[800px] h-[600px] bg-white rounded-xl overflow-hidden shadow-2xl">
            <canvas ref={bgCanvasRef} className="absolute inset-0" />
            <canvas 
              ref={drawCanvasRef} 
              className={cn("absolute inset-0", drawingMode === 'mouse' ? "cursor-crosshair" : "cursor-none")}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
            <canvas ref={cursorCanvasRef} className="absolute inset-0 pointer-events-none" />
            
            {/* Gesture Feedback */}
            {gestureText && drawingMode === 'finger' && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full font-bold animate-bounce">
                {gestureText}
              </div>
            )}

            {/* Instructions */}
            {drawingMode === 'finger' && !handDetected && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm">
                <div className="bg-white p-6 rounded-2xl text-center shadow-xl">
                  <Camera className="mx-auto mb-4 text-blue-500" size={48} />
                  <h3 className="text-xl font-bold mb-2">Show your hand!</h3>
                  <p className="text-gray-600">Use your index finger to draw.</p>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Controls / Palette */}
          <div className="w-full max-w-4xl mt-6 flex flex-col gap-6 px-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-2 max-w-md">
                {PET_PALETTE.map((color, i) => (
                  <button
                    key={color}
                    onClick={() => setColorIndex(i)}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-transform hover:scale-110",
                      colorIndex === i ? "border-white scale-125" : "border-transparent"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>

              <div className="flex items-center gap-4 bg-white/10 px-4 py-2 rounded-2xl">
                <span className="text-white/60 text-xs font-bold uppercase tracking-wider">Brush Size</span>
                <input 
                  type="range" 
                  min="2" 
                  max="40" 
                  value={brushSize} 
                  onChange={(e) => setBrushSize(parseInt(e.target.value))}
                  className="w-32 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <span className="text-white font-mono w-8 text-center">{brushSize}</span>
              </div>

              <div className="flex gap-4">
                <button onClick={undo} className="p-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition">
                  <Undo size={24} />
                </button>
                <button onClick={clear} className="p-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition">
                  <Trash2 size={24} />
                </button>
              </div>
            </div>
          </div>

          {/* Webcam PiP */}
          {drawingMode === 'finger' && (
            <div className="fixed bottom-4 right-4 w-48 h-36 bg-black rounded-lg overflow-hidden border-2 border-white/20 shadow-xl">
              <video ref={videoRef} className="w-full h-full object-cover scale-x-[-1]" autoPlay playsInline muted />
              <div className="absolute bottom-1 left-2 text-[10px] text-white/50 font-mono">WEBCAM LIVE</div>
            </div>
          )}

          {/* Gesture Cheat Sheet */}
          {drawingMode === 'finger' && (
            <div className="fixed bottom-4 left-4 text-white/40 text-xs flex flex-col gap-1">
              <div>☝️ Index: Draw</div>
              <div>✌️ Peace: Next Color</div>
              <div>🤟 3-Fingers: Prev Color</div>
              <div>✋ Palm: Size Up</div>
              <div>🤏 Pinch: Size Down</div>
              <div>🤙 Shaka: Undo</div>
              <div>✊ Fist: Clear</div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
