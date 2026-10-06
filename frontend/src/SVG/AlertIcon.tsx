import React from 'react';
import type { SvgIconProps } from './types';

/** Njoftim urgjent (altoparlant) – nga https://www.svgrepo.com/ */
const AlertIcon: React.FC<SvgIconProps> = ({ size = '1em', color = 'currentColor', className }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg"
    className={className} aria-hidden="true" focusable="false">
    <path d="M3 10V14C3 14.5523 3.44772 15 4 15H7L13 19V5L7 9H4C3.44772 9 3 9.44772 3 10Z"
      stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M17 9C17.6 9.8 18 10.85 18 12C18 13.15 17.6 14.2 17 15M19.5 6.5C20.75 8 21.5 9.9 21.5 12C21.5 14.1 20.75 16 19.5 17.5"
      stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default AlertIcon;
