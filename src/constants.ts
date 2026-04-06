export const PET_PALETTE = [
  '#FF6B6B', // coral red
  '#FF8E53', // orange
  '#FFD93D', // yellow
  '#6BCB77', // green
  '#4D96FF', // blue
  '#C77DFF', // purple
  '#FF6FC8', // pink
  '#A0522D', // brown
  '#F5CBA7', // beige
  '#2C3E50', // dark grey
  '#FFFFFF', // white
  '#000000', // black
  '#F08080', // light coral
  '#98D8C8', // mint
];

export const PET_SPEEDS: Record<string, number> = { 
  dog: 1.2, cat: 0.9, bunny: 1.4, hamster: 0.7, bird: 1.6, turtle: 0.3, lizard: 0.6, fish: 0.5, other: 0.8 
};

export const PET_SOUNDS: Record<string, string> = { 
  dog: 'Woof!', cat: 'Meow~', bunny: '*thump*', hamster: 'Squeak!', bird: 'Tweet!', turtle: '...', lizard: 'Hiss', fish: 'Blub', other: 'Hello!' 
};

export const RANDOM_PET_NAMES = [
  'Biscuit', 'Mochi', 'Pepper', 'Noodle', 'Pretzel',
  'Waffles', 'Dumpling', 'Oreo', 'Peanut', 'Cookie',
  'Sprout', 'Mango', 'Pickle', 'Butterscotch', 'Gizmo'
];

export const PET_TYPES = [
  { id: 'dog', emoji: '🐕', label: 'Dog' },
  { id: 'cat', emoji: '🐈', label: 'Cat' },
  { id: 'bunny', emoji: '🐇', label: 'Bunny' },
  { id: 'hamster', emoji: '🐹', label: 'Hamster' },
  { id: 'bird', emoji: '🦜', label: 'Bird' },
  { id: 'turtle', emoji: '🐢', label: 'Turtle' },
  { id: 'lizard', emoji: '🦎', label: 'Lizard' },
  { id: 'fish', emoji: '🐠', label: 'Fish' },
  { id: 'other', emoji: '⭐', label: 'Other' },
];
