import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PET_TYPES } from '../constants';
import { strokesToDataURL } from '../lib/drawingUtils';

interface NamingModalProps {
  drawing: string;
  onRelease: (name: string, type: string) => void;
}

export function NamingModal({ drawing, onRelease }: NamingModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState('dog');

  const dataUrl = useMemo(() => strokesToDataURL(drawing), [drawing]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[3rem] p-10 w-full max-w-md shadow-2xl text-center"
      >
        <div className="w-48 h-48 mx-auto mb-8 bg-gray-50 rounded-[2rem] border-4 border-dashed border-green-200 flex items-center justify-center overflow-hidden">
          {dataUrl ? (
            <img src={dataUrl} alt="Your pet" className="w-full h-full object-contain p-4" />
          ) : (
            <div className="text-4xl">🐾</div>
          )}
        </div>

        <h2 className="text-3xl font-extrabold text-gray-800 mb-6">Name Your New Friend!</h2>
        
        <input 
          type="text" 
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter a name..."
          className="w-full px-6 py-4 rounded-2xl border-2 border-gray-200 focus:border-green-500 outline-none text-xl font-bold text-center mb-8"
          autoFocus
        />

        <div className="grid grid-cols-3 gap-3 mb-8">
          {PET_TYPES.map(p => (
            <button
              key={p.id}
              onClick={() => setType(p.id)}
              className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 ${type === p.id ? 'border-green-500 bg-green-50 scale-105' : 'border-gray-100 hover:border-green-200'}`}
            >
              <span className="text-2xl">{p.emoji}</span>
              <span className="text-[10px] font-bold uppercase text-gray-500">{p.label}</span>
            </button>
          ))}
        </div>

        <button 
          onClick={() => onRelease(name || 'Unnamed Pet', type)}
          disabled={!name.trim()}
          className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white py-5 rounded-2xl font-bold text-xl shadow-xl transition-all hover:scale-105 active:scale-95"
        >
          Release into Park!
        </button>
      </motion.div>
    </div>
  );
}
