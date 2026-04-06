/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DrawingModal } from './components/DrawingModal';
import { NamingModal } from './components/NamingModal';
import { ParkView } from './components/ParkView';
import { Pet } from './Pet';
import { RANDOM_PET_NAMES } from './constants';
import { db, auth } from './firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  query, 
  orderBy, 
  limit,
  getDocFromServer,
  doc
} from 'firebase/firestore';
import { 
  onAuthStateChanged, 
  User, 
  signInAnonymously
} from 'firebase/auth';
import { Plus, Download, Upload } from 'lucide-react';

type Screen = 'welcome' | 'park';

export default function App() {
  const [screen, setScreen] = useState<Screen>('welcome');
  const [isDrawingOpen, setIsDrawingOpen] = useState(false);
  const [namingDrawing, setNamingDrawing] = useState<string | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [isNight, setIsNight] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const petsMapRef = useRef<Map<string, Pet>>(new Map());

  const [authError, setAuthError] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem('petpark_user_data');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (Array.isArray(parsed)) {
          const loadedPets = parsed.map(p => new Pet({
            name: p.name,
            type: p.type,
            strokes: p.drawing,
            isUser: true,
            canvasWidth: 800,
            canvasHeight: 600
          }));
          setPets(loadedPets);
          loadedPets.forEach(p => petsMapRef.current.set(p.id, p));
        }
      } catch (e) {
        console.error("Failed to load from localStorage", e);
      }
    }
  }, []);

  // Save to localStorage whenever pets change
  useEffect(() => {
    const dataToSave = pets.map(p => ({
      name: p.name,
      type: p.type,
      drawing: p.strokes ? JSON.stringify(p.strokes) : null
    }));
    localStorage.setItem('petpark_user_data', JSON.stringify(dataToSave));
  }, [pets]);

  // Initialize Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (!u) {
        signInAnonymously(auth).catch(err => {
          console.error("Anonymous Auth error:", err);
          if (err.code === 'auth/admin-restricted-operation') {
            setAuthError("Anonymous Auth is disabled in your Firebase Console.");
          } else {
            setAuthError(err.message);
          }
        });
      } else {
        setAuthError(null);
      }
      setUser(u);
      setIsAuthReady(true);
    });

    // Test Firestore connection
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error: any) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. The client is offline.");
        }
      }
    };
    testConnection();

    return () => unsubscribe();
  }, []);

  // Sync pets from Firestore (Optional, keeping as backup but prioritizing local)
  useEffect(() => {
    if (!isAuthReady) return;

    const q = query(collection(db, 'pets'), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const currentPetsMap = petsMapRef.current;
      const newPets: Pet[] = [...pets]; // Start with local pets

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const id = doc.id;

        if (!currentPetsMap.has(id)) {
          const pet = new Pet({
            name: data.name,
            type: data.type,
            strokes: data.drawing,
            isUser: data.uid === auth.currentUser?.uid,
            canvasWidth: 800,
            canvasHeight: 600
          });
          pet.id = id;
          currentPetsMap.set(id, pet);
          newPets.push(pet);
        }
      });

      // Clean up old pets from map if they were deleted from Firestore
      const snapshotIds = new Set(snapshot.docs.map(d => d.id));
      // We only clean up if they were Firestore pets (have Firestore-like IDs)
      // For now, let's just keep it simple and not over-sync
      
      setPets(newPets);
    }, (error) => {
      console.error('Firestore Error: ', JSON.stringify({
        error: error.message,
        operationType: 'list',
        path: 'pets',
        authInfo: {
          userId: auth.currentUser?.uid,
          email: auth.currentUser?.email
        }
      }));
    });

    return () => unsubscribe();
  }, [isAuthReady, user]);

  const handleDrawDone = (drawingDataUrl: string) => {
    setIsDrawingOpen(false);
    setNamingDrawing(drawingDataUrl);
  };

  const handleRelease = async (name: string, type: string) => {
    if (!namingDrawing || !auth.currentUser) return;
    
    try {
      await addDoc(collection(db, 'pets'), {
        name,
        type,
        drawing: namingDrawing, // This is now a JSON string of strokes
        uid: auth.currentUser.uid,
        createdAt: serverTimestamp()
      });
      
      setNamingDrawing(null);
      setScreen('park');
    } catch (error) {
      console.error('Firestore Error: ', JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        operationType: 'create',
        path: 'pets',
        authInfo: {
          userId: auth.currentUser?.uid
        }
      }));
    }
  };

  const exportPets = async () => {
    const savedData = localStorage.getItem('petpark_user_data');
    if (savedData) {
      try {
        await navigator.clipboard.writeText(savedData);
        alert("Zoo exported to clipboard!");
      } catch (err) {
        console.error("Failed to copy", err);
        alert("Failed to export to clipboard.");
      }
    }
  };

  const importPets = async () => {
    const input = prompt("Paste your Zoo JSON string here:");
    if (!input) return;
    try {
      const data = JSON.parse(input);
      if (Array.isArray(data)) {
        localStorage.setItem('petpark_user_data', input);
        window.location.reload(); // Reload to apply changes
      } else {
        alert("Invalid Zoo format.");
      }
    } catch (err) {
      console.error("Import error:", err);
      alert("Failed to import. Invalid JSON.");
    }
  };

  return (
    <div className="w-full h-screen overflow-hidden">
      <AnimatePresence mode="wait">
        {screen === 'welcome' && (
          <motion.div 
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative w-full h-full p-12 overflow-hidden"
          >
            {/* Background Park Preview - Shifted Left with Floating Animation handled inside ParkView */}
            <div className="absolute inset-0 z-0">
              <ParkView pets={pets} onShowGallery={() => setIsGalleryOpen(true)} isNight={false} toggleNight={() => {}} isWelcomeScreen={true} />
            </div>

            {/* Logo - Top Left */}
            <div className="relative z-10 flex flex-col items-start">
              <div className="flex items-center font-black text-5xl tracking-tight drop-shadow-xl select-none text-green-600">
                PetPark
              </div>
            </div>

            {/* Content - Right Side */}
            <div className="absolute top-1/2 right-4 -translate-y-1/2 z-10 flex flex-col items-end text-right max-w-md">
              {authError ? (
                <div className="bg-red-50 border-2 border-red-200 p-6 rounded-3xl shadow-xl text-left max-w-sm">
                  <h3 className="text-red-800 font-black text-xl mb-2">Auth Error</h3>
                  <p className="text-red-600 text-sm font-bold mb-4">
                    {authError}
                  </p>
                  <div className="bg-white p-3 rounded-xl border border-red-100 text-xs font-mono text-red-500 mb-4">
                    Firebase: Error (auth/admin-restricted-operation)
                  </div>
                  <p className="text-gray-600 text-xs mb-4">
                    To fix this, please go to your <a href="https://console.firebase.google.com/project/gen-lang-client-0946362208/authentication/providers" target="_blank" className="text-sky-500 underline font-bold">Firebase Console</a> and:
                  </p>
                  <ol className="text-xs text-gray-600 list-decimal pl-4 space-y-1 mb-4">
                    <li>Go to <strong>Authentication &gt; Sign-in method</strong></li>
                    <li>Click <strong>Add new provider</strong></li>
                    <li>Select <strong>Anonymous</strong> and click <strong>Enable</strong></li>
                    <li>Click <strong>Save</strong></li>
                  </ol>
                  <button 
                    onClick={() => window.location.reload()}
                    className="w-full bg-red-500 hover:bg-red-600 text-white font-black py-2 rounded-full transition-colors"
                  >
                    I've enabled it, Refresh
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4 items-end mr-4">
                  <button 
                    onClick={() => setIsDrawingOpen(true)}
                    className="bg-green-500 hover:bg-green-600 text-white text-2xl font-extrabold px-8 py-4 rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95 border-4 border-white/50"
                  >
                    Draw My Pet →
                  </button>
                  <div className="text-green-800 font-bold text-sm bg-white/50 px-4 py-2 rounded-full backdrop-blur-sm">
                    {pets.length} Pets in the Park
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {screen === 'park' && (
          <motion.div 
            key="park"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full h-full"
          >
            <ParkView 
              pets={pets} 
              onShowGallery={() => setIsGalleryOpen(true)} 
              isNight={isNight}
              toggleNight={() => setIsNight(!isNight)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <DrawingModal 
        isOpen={isDrawingOpen} 
        onClose={() => setIsDrawingOpen(false)} 
        onDone={handleDrawDone} 
      />

      {namingDrawing && (
        <NamingModal 
          drawing={namingDrawing} 
          onRelease={handleRelease} 
        />
      )}

      {isGalleryOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col"
          >
            <div className="p-6 flex justify-between items-center bg-green-50">
              <div className="flex items-center gap-3">
                <div className="flex items-center font-black text-2xl tracking-tight select-none text-green-600">
                  PetPark
                </div>
                <div className="h-6 w-1 bg-green-200 rounded-full" />
                <h2 className="text-2xl font-black text-green-800">Gallery</h2>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={exportPets}
                  className="flex items-center gap-2 bg-white hover:bg-gray-50 text-green-700 px-4 py-2 rounded-xl font-bold text-sm border-2 border-green-100 transition-all"
                  title="Export Zoo to Clipboard"
                >
                  <Download size={18} /> Export My Zoo
                </button>
                <button 
                  onClick={importPets}
                  className="flex items-center gap-2 bg-white hover:bg-gray-50 text-green-700 px-4 py-2 rounded-xl font-bold text-sm border-2 border-green-100 transition-all"
                  title="Import Zoo from Clipboard"
                >
                  <Upload size={18} /> Import Zoo
                </button>
                <div className="w-px h-8 bg-green-200 mx-2" />
                <button 
                  onClick={() => setIsGalleryOpen(false)}
                  className="p-2 hover:bg-green-100 rounded-full transition-colors"
                >
                  <Plus className="rotate-45 text-green-800" size={32} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {pets.map(pet => (
                  <div key={pet.id} className="bg-gray-50 rounded-2xl p-4 flex flex-col items-center gap-3 border-2 border-transparent hover:border-green-200 transition-all hover:shadow-md">
                    <div className="w-24 h-24 bg-white rounded-xl shadow-inner flex items-center justify-center overflow-hidden">
                      {pet.strokes ? (
                        <img src={pet.toDataURL()} alt={pet.name} className="w-full h-full object-contain" />
                      ) : (
                        <div className="text-4xl">🐾</div>
                      )}
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-gray-800">{pet.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{pet.type}</p>
                    </div>
                  </div>
                ))}
                {pets.length === 0 && (
                  <div className="col-span-full py-12 text-center text-gray-400">
                    <p className="text-xl font-bold">No pets yet!</p>
                    <p>Be the first to draw one!</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-6 bg-gray-50 flex justify-center">
              <button 
                onClick={() => {
                  setIsGalleryOpen(false);
                  setIsDrawingOpen(true);
                }}
                className="bg-green-500 hover:bg-green-600 text-white font-bold px-8 py-3 rounded-full shadow-lg transition-transform hover:scale-105"
              >
                Draw Your Own Pet!
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
