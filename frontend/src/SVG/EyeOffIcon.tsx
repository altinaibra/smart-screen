import React from 'react';
import type { SvgIconProps } from './types';

/** Fshih fjalëkalimin (sy i vizatuar) – nga https://www.svgrepo.com/ */
const EyeOffIcon: React.FC<SvgIconProps> = ({ size = '1em', color = 'currentColor', className }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg"
    className={className} aria-hidden="true" focusable="false">
    <path d="M4 4L20 20M10.5 5.1C11 5 11.5 5 12 5C17.7273 5 21 12 21 12C20.5 13.1 19.8 14.1 19 15M6.6 6.6C4.3 8.1 3 12 3 12C3 12 6.27273 19 12 19C13.9 19 15.5 18.2 16.8 17.2M9.9 9.9C9.3 10.5 9 11.2 9 12C9 13.6569 10.3431 15 12 15C12.8 15 13.5 14.7 14.1 14.1"
      stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default EyeOffIcon;
