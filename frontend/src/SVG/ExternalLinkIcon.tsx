import React from 'react';
import type { SvgIconProps } from './types';

/** Hap në dritare të re (shigjetë lart-djathtas) – nga https://www.svgrepo.com/ */
const ExternalLinkIcon: React.FC<SvgIconProps> = ({ size = '1em', color = 'currentColor', className }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg"
    className={className} aria-hidden="true" focusable="false">
    <path d="M7 17L17 7M17 7H8M17 7V16" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default ExternalLinkIcon;
