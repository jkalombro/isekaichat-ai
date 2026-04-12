import React from 'react';
import { APP_LOGO_URL } from '../utils';

interface AppLogoProps {
  className?: string;
}

export const AppLogo = ({ className }: AppLogoProps) => (
  <img 
    src={APP_LOGO_URL} 
    alt="IsekaiChat Logo" 
    className={className} 
    referrerPolicy="no-referrer"
  />
);
