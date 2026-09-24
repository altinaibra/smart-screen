import React from 'react';
import type { SvgIconProps } from './types';

/** Bizneset (dyqan / lokal) – nga https://www.svgrepo.com/ */
const BusinessIcon: React.FC<SvgIconProps> = ({ size = '1em', color = 'currentColor', className }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg"
    className={className} aria-hidden="true" focusable="false">
    <path d="M4 10V19C4 19.5523 4.44772 20 5 20H19C19.5523 20 20 19.5523 20 19V10M9 20V15C9 14.4477 9.44772 14 10 14H14C14.5523 14 15 14.4477 15 15V20M3 10L5 4H19L21 10C21 11.1046 20.1046 12 19 12C17.8954 12 17 11.1046 17 10C17 11.1046 16.1046 12 15 12H14.5C13.3954 12 12.5 11.1046 12.5 10H11.5C11.5 11.1046 10.6046 12 9.5 12H9C7.89543 12 7 11.1046 7 10C7 11.1046 6.10457 12 5 12C3.89543 12 3 11.1046 3 10Z"
      stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default BusinessIcon;
