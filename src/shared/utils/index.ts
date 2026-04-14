import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const capitalize = (str: string) => {
  return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export const formatTimestamp = (timestamp: any) => {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString([], { 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

export const isSmartMatch = (name1: string, source1: string, name2: string, source2: string) => {
  const n1 = name1.toLowerCase().trim();
  const s1 = source1.toLowerCase().trim();
  const n2 = name2.toLowerCase().trim();
  const s2 = source2.toLowerCase().trim();

  // A match happens if sources are very similar AND names are very similar
  // We use a lower threshold for length to allow shorter matches like "Orb"
  const sourceMatch = s1 === s2 || (s1.length >= 3 && s2.length >= 3 && (s1.includes(s2) || s2.includes(s1)));
  const nameMatch = n1 === n2 || (n1.length >= 2 && n2.length >= 2 && (n1.includes(n2) || n2.includes(n1)));

  return sourceMatch && nameMatch;
};

export const APP_LOGO_URL = "https://res.cloudinary.com/dydhpzure/image/upload/v1776006876/properties/jmRnKy9MOjMlknf859PoSGcSBzY2/xgdrmtz20cefd5i87z1c.png";
