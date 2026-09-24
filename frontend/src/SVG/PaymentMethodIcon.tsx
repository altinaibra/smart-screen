import React from 'react';
import type { SvgIconProps } from './types';

/** Mënyrat e pagesës (kartë) – nga https://www.svgrepo.com/ */
const PaymentMethodIcon: React.FC<SvgIconProps> = ({ size = '1em', color = 'currentColor', className }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg"
    className={className} aria-hidden="true" focusable="false">
    <rect x="3" y="6" width="18" height="13" rx="2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 10H20.5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M7 15H9" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default PaymentMethodIcon;
