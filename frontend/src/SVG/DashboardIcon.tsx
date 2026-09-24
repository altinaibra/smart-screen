import React from 'react';
import type { SvgIconProps } from './types';

/** Paneli (dashboard) – nga https://www.svgrepo.com/ */
const DashboardIcon: React.FC<SvgIconProps> = ({ size = '1em', color = 'currentColor', className }) => {
  const line = { stroke: color, strokeWidth: 2, strokeLinecap: 'round' } as const;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg"
      className={className} aria-hidden="true" focusable="false">
      <path d="M12 12C12 11.4477 12.4477 11 13 11H19C19.5523 11 20 11.4477 20 12V19C20 19.5523 19.5523 20 19 20H13C12.4477 20 12 19.5523 12 19V12Z" {...line} />
      <path d="M4 5C4 4.44772 4.44772 4 5 4H8C8.55228 4 9 4.44772 9 5V19C9 19.5523 8.55228 20 8 20H5C4.44772 20 4 19.5523 4 19V5Z" {...line} />
      <path d="M12 5C12 4.44772 12.4477 4 13 4H19C19.5523 4 20 4.44772 20 5V7C20 7.55228 19.5523 8 19 8H13C12.4477 8 12 7.55228 12 7V5Z" {...line} />
    </svg>
  );
};

export default DashboardIcon;
