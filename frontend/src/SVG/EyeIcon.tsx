import React from 'react';
import type { SvgIconProps } from './types';

/** Shfaq fjalëkalimin (sy) – nga https://www.svgrepo.com/ */
const EyeIcon: React.FC<SvgIconProps> = ({ size = '1em', color = 'currentColor', className }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg"
    className={className} aria-hidden="true" focusable="false">
    <path d="M3 12C3 12 6.27273 5 12 5C17.7273 5 21 12 21 12C21 12 17.7273 19 12 19C6.27273 19 3 12 3 12Z"
      stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12Z"
      stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default EyeIcon;
