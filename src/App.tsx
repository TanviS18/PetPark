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
  GoogleAuthProvider, 
  signInWithPopup,
  signOut
} from 'firebase/auth';
import { Plus } from 'lucide-react';

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

  // Initialize Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
    });

    // Test Firestore connection
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. The client is offline.");
        }
      }
    };
    testConnection();

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Auth error:", err);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  // Sync pets from Firestore
  useEffect(() => {
    if (!isAuthReady) return;

    const q = query(collection(db, 'pets'), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const currentPetsMap = petsMapRef.current;
      const newPets: Pet[] = [];

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const id = doc.id;

        if (currentPetsMap.has(id)) {
          newPets.push(currentPetsMap.get(id)!);
        } else {
          const pet = new Pet({
            name: data.name,
            type: data.type,
            drawing: data.drawing,
            isUser: data.uid === auth.currentUser?.uid,
            canvasWidth: window.innerWidth,
            canvasHeight: window.innerHeight
          });
          pet.id = id; // Use Firestore ID
          currentPetsMap.set(id, pet);
          newPets.push(pet);
        }
      });

      // Clean up old pets
      const snapshotIds = new Set(snapshot.docs.map(d => d.id));
      for (const id of currentPetsMap.keys()) {
        if (!snapshotIds.has(id)) {
          currentPetsMap.delete(id);
        }
      }

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
        drawing: namingDrawing,
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

  return (
    <div className="w-full h-screen overflow-hidden bg-blue-400">
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
            <div className="absolute top-1/2 right-12 -translate-y-1/2 z-10 flex flex-col items-end text-right max-w-md gap-4">
              {!user ? (
                <button 
                  onClick={handleLogin}
                  className="bg-white hover:bg-gray-50 text-gray-800 text-xl font-bold px-8 py-4 rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95 border-2 border-gray-200 flex items-center gap-3"
                >
                  <img src="https://www.gstatic.com/firebase/anonymous-scan.png" alt="Google" className="w-6 h-6 hidden" />
                  <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg"><g transform="matrix(1, 0, 0, 1, 0, 0)"><path d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 4.95,16.25 4.95,12C4.95,7.75 8.36,4.73 12.19,4.73C15.19,4.73 17.05,6.11 18.1,7.18L20.14,5.14C18.41,3.48 15.65,2 12.19,2C6.51,2 2,6.51 2,12C2,17.49 6.51,22 12.19,22C17.47,22 21.56,18.49 21.56,12.11C21.56,11.72 21.49,11.4 21.35,11.1Z" fill="#4285F4"></path></g></svg>
                  Sign in with Google
                </button>
              ) : (
                <div className="flex flex-col items-end gap-4">
                  <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm p-2 rounded-full border border-white/50 shadow-sm">
                    <img src={user.photoURL || ''} alt="" className="w-10 h-10 rounded-full border-2 border-green-500" />
                    <div className="text-left pr-4">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Logged in as</p>
                      <p className="text-sm font-black text-gray-800">{user.displayName || 'Pet Lover'}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsDrawingOpen(true)}
                    className="bg-green-500 hover:bg-green-600 text-white text-2xl font-extrabold px-8 py-4 rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95 border-4 border-white/50"
                  >
                    Draw My Pet →
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="text-gray-500 hover:text-gray-700 text-sm font-bold underline underline-offset-4"
                  >
                    Sign Out
                  </button>
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
              <button 
                onClick={() => setIsGalleryOpen(false)}
                className="p-2 hover:bg-green-100 rounded-full transition-colors"
              >
                <Plus className="rotate-45 text-green-800" size={32} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {pets.map(pet => (
                  <div key={pet.id} className="bg-gray-50 rounded-2xl p-4 flex flex-col items-center gap-3 border-2 border-transparent hover:border-green-200 transition-all hover:shadow-md">
                    <div className="w-24 h-24 bg-white rounded-xl shadow-inner flex items-center justify-center overflow-hidden">
                      {pet.image ? (
                        <img src={pet.image.src} alt={pet.name} className="w-full h-full object-contain" />
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
