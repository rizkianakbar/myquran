export type PrayerName = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export type MethodId =
  | 'kemenag'
  | 'jakim'
  | 'mwl'
  | 'ummalqura'
  | 'isna'
  | 'egyptian'
  | 'karachi'
  | 'dubai'
  | 'kuwait'
  | 'qatar'
  | 'turkey'
  | 'tehran'
  | 'moonsighting';

/**
 * Where prayer times and the qibla are worked out for.
 */
export interface Place {
  /**
   * Null for "use my location", which has no name to show.
   */
  name: string | null;
  /**
   * Region and country, for telling same-named cities apart.
   */
  detail?: string;
  lat: number;
  lng: number;
  /**
   * IANA zone the times are shown in: the place's, not the device's.
   */
  timezone: string;
  /**
   * ISO country code, which picks the default calculation method.
   */
  country?: string;
}

export interface PrayerSettings {
  place: Place | null;
  /**
   * 'auto' uses the method of the place's country.
   */
  method: MethodId | 'auto';
  madhab: 'shafi' | 'hanafi';
  /**
   * Ask "have you prayed?" when the app is opened during a prayer's time.
   */
  reminders: boolean;
}

export interface PlaceResult {
  name: string;
  detail: string;
  lat: number;
  lng: number;
  timezone: string;
  country?: string;
}
