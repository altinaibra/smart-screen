export type ScreenPlatform = 'Unknown' | 'LgWebOs' | 'SamsungTizen' | 'AndroidTv' | 'SonyBravia' | 'Browser';
export type Orientation = 'Landscape' | 'Portrait';
export type MediaType = 'Image' | 'Video';
export type SlideType = 'Image' | 'Video' | 'Menu' | 'Text' | 'WebPage' | 'Promo' | 'Combo' | 'Brand';
export type MediaFit = 'Cover' | 'Contain';
/** Ndryshon tekstet në TV (POROSI / REZERVO / KONTAKT) dhe emërtimet në panel. */
export type BusinessType = 'restaurant' | 'barber' | 'shop';

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
  badge?: string | null;
  price?: number | null;
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
  tagline?: string | null;
  slogan?: string | null;
  openingTime?: string | null;
  closingTime?: string | null;
  phone?: string | null;
  socialHandle?: string | null;
  screenLanguage: 'sq' | 'en';
  businessType: BusinessType;
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

export interface PaymentMethod {
  paymentMethodId: number;
  paymentMethodCode: string;
  paymentMethodName: string;
  status: boolean;
  isDefault: boolean;
  sortOrder: number;
  entryDate: string;
  fiscalType: number;
  rowVersion?: string | null;
}

export interface ServerInfo {
  addresses: string[];
  port: number;
}

export interface LoginResponse {
  token: string;
  username: string;
  expiresAt: string;
  role: UserRole;
}

/**
 * Owner = pronari i aplikacionit (sheh të gjithë klientët); Admin = administratori i një klienti;
 * User = vetëm bizneset/ekranet që i janë dhënë.
 */
export type UserRole = 'Owner' | 'Admin' | 'User';

/** fullAccess = false kur përdoruesi kontrollon vetëm disa ekrane të biznesit. */
export interface Business {
  id: number;
  name: string;
  businessType: BusinessType;
  logoUrl?: string | null;
  fullAccess: boolean;
  screenCount: number;
}

export interface Me {
  id: number;
  username: string;
  role: UserRole;
  /** Menaxhon bizneset dhe përdoruesit (pronari ose administratori i klientit). */
  isAdmin: boolean;
  isOwner: boolean;
  /** Klienti aktiv; për pronarin null derisa të hyjë në një klient. */
  client: { id: number; name: string } | null;
  businesses: Business[];
}

export interface Client {
  id: number;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  businessCount: number;
  userCount: number;
  screenCount: number;
  screensOnline: number;
}

/** businessIds = qasje e plotë; screenIds = ekrane të veçanta në biznese të tjera. */
export interface User {
  id: number;
  username: string;
  role: UserRole;
  createdAt: string;
  businessIds: number[];
  screenIds: number[];
}

export interface AccessOption {
  id: number;
  name: string;
  screens: { id: number; name: string; location?: string | null }[];
}

export interface Dashboard {
  screensTotal: number;
  screensOnline: number;
  mediaCount: number;
  playlistCount: number;
  productCount: number;
  screens: Screen[];
}

/** Etiketat përkthehen: t(`platform.${platform}`), t(`slideType.${type}`). */
export const slideTypes: SlideType[] = ['Promo', 'Combo', 'Menu', 'Brand', 'Image', 'Video', 'Text', 'WebPage'];
