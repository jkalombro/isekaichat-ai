import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const capitalize = (str: string) => {
  const minorWords = ['a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'from', 'by', 'of', 'in', 'with'];
  return str.toLowerCase().split(' ').map((word, index) => {
    if (index > 0 && minorWords.includes(word)) return word;
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
};

export const formatTimestamp = (timestamp: any) => {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString([], { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric',
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

export const isSmartMatch = (name1: string, source1: string, name2: string, source2: string) => {
  const n1 = name1.toLowerCase().trim();
  const s1 = source1.toLowerCase().trim();
  const n2 = name2.toLowerCase().trim();
  const s2 = source2.toLowerCase().trim();

  // A match happens if sources are very similar (exact match or one contains the other)
  const sourceMatch = s1 === s2 || (s1.length >= 3 && s2.length >= 3 && (s1.includes(s2) || s2.includes(s1)));
  if (!sourceMatch) return false;

  // Split names into individual words to check for reversed names (Morty Smith vs Smith Morty)
  const words1 = n1.split(/\s+/).filter(w => w.length > 0);
  const words2 = n2.split(/\s+/).filter(w => w.length > 0);

  // 1. Direct match or containment
  if (n1 === n2 || (n1.length >= 3 && n2.length >= 3 && (n1.includes(n2) || n2.includes(n1)))) return true;

  // 2. Reversed Name Match: Check if all words in names match, regardless of order
  // Only if they have more than one word
  if (words1.length > 1 && words1.length === words2.length) {
    const sorted1 = [...words1].sort().join(' ');
    const sorted2 = [...words2].sort().join(' ');
    if (sorted1 === sorted2) return true;
  }

  // 3. Partial Name Match: One name's words are a complete subset of the other
  // e.g., "Morty" vs "Morty Smith"
  const isSubset = words1.every(w => words2.includes(w)) || words2.every(w => words1.includes(w));
  if (isSubset && (words1.length > 0 && words2.length > 0)) return true;

  return false;
};

export const APP_LOGO_URL = "https://res.cloudinary.com/dydhpzure/image/upload/v1776006876/properties/jmRnKy9MOjMlknf859PoSGcSBzY2/xgdrmtz20cefd5i87z1c.png";
