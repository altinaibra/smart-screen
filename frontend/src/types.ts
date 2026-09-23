export type ScreenPlatform = 'Unknown' | 'LgWebOs' | 'SamsungTizen' | 'AndroidTv' | 'SonyBravia' | 'Browser';
export type Orientation = 'Landscape' | 'Portrait';
export type MediaType = 'Image' | 'Video';
export type SlideType = 'Image' | 'Video' | 'Menu' | 'Text' | 'WebPage';
export type MediaFit = 'Cover' | 'Contain';

export interface Schedule {
  id?: number | null;
  playlistId: number;
  playlistName?: string | null;
  daysOfWeek: number;
  startTime: string;
  endTime: string;
  priority: number;
}

export interface Screen {
  id: number;
  name: string;
  location?: string | null;
  platform: ScreenPlatform;
  resolutionWidth: number;
  resolutionHeight: number;
  orientation: Orientation;
  defaultPlaylistId?: number | null;
  defaultPlaylistName?: string | null;
  isOnline: boolean;
  lastSeenAt?: string | null;
  createdAt: string;
  schedules: Schedule[];
}

export interface Media {
  id: number;
  name: string;
  type: MediaType;
  url: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface PlaylistSummary {
  id: number;
  name: string;
  description?: string | null;
  itemCount: number;
  totalDurationSeconds: number;
  screenCount: number;
  updatedAt: string;
}

export interface PlaylistItem {
  id?: number | null;
  type: SlideType;
  durationSeconds: number;
  isEnabled: boolean;
  title?: string | null;
  text?: string | null;
  url?: string | null;
  backgroundColor?: string | null;
  textColor?: string | null;
  fit: MediaFit;
  mediaAssetId?: number | null;
  mediaAsset?: Media | null;
  menuCategoryId?: number | null;
}

export interface Playlist {
  id: number;
  name: string;
  description?: string | null;
  updatedAt: string;
  items: PlaylistItem[];
}

export interface Product {
  id: number;
  categoryId: number;
  name: string;
  description?: string | null;
  price: number;
  oldPrice?: number | null;
  imageAssetId?: number | null;
  imageUrl?: string | null;
  isAvailable: boolean;
  isFeatured: boolean;
  sortOrder: number;
}

export interface Category {
  id: number;
  name: string;
  sortOrder: number;
  products: Product[];
}

export interface Settings {
  businessName: string;
  logoAssetId?: number | null;
  logoUrl?: string | null;
  primaryColor: string;
  accentColor: string;
  currency: string;
  showTicker: boolean;
  tickerText?: string | null;
  showClock: boolean;
  timeZoneId: string;
}

export interface Currency {
  currencyId: number;
  currencyCode: string;
  currencyName: string;
  currencySymbol: string;
  exchangeRate: number;
  status: boolean;
  isMainCurrency: boolean;
  entryDate: string;
  fiscalType: number;
  rowVersion?: string | null;
}

export interface Dashboard {
  screensTotal: number;
  screensOnline: number;
  mediaCount: number;
  playlistCount: number;
  productCount: number;
  screens: Screen[];
}

export const platformLabels: Record<ScreenPlatform, string> = {
  Unknown: 'I panjohur',
  LgWebOs: 'LG webOS',
  SamsungTizen: 'Samsung Tizen',
  AndroidTv: 'Android TV / Box',
  SonyBravia: 'Sony Bravia',
  Browser: 'Shfletues / PC',
};

export const slideTypeLabels: Record<SlideType, string> = {
  Image: 'Foto',
  Video: 'Video',
  Menu: 'Menu me çmime',
  Text: 'Tekst / Njoftim',
  WebPage: 'Faqe web',
};
