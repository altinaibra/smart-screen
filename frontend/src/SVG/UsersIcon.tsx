import React from 'react';
import type { SvgIconProps } from './types';

/** Përdoruesit – nga https://www.svgrepo.com/ */
const UsersIcon: React.FC<SvgIconProps> = ({ size = '1em', color = 'currentColor', className }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg"
    className={className} aria-hidden="true" focusable="false">
    <path d="M16 19C16 16.7909 13.3137 15 10 15C6.68629 15 4 16.7909 4 19M20 16C20 14.4 18.8 13.2 17 12.7M14 4.5C15.5 5 16.5 6.2 16.5 8C16.5 9.8 15.5 11 14 11.5M13.5 8C13.5 9.933 11.933 11.5 10 11.5C8.067 11.5 6.5 9.933 6.5 8C6.5 6.067 8.067 4.5 10 4.5C11.933 4.5 13.5 6.067 13.5 8Z"
      stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default UsersIcon;
