export interface PamphletShow {
  slug: string;
  venueLabel?: string;
  dateLabel?: string;
  doorsOpen?: string;
}

export interface Pamphlet {
  id: string;
  label?: string;
  shows: PamphletShow[];
  showDoors?: boolean;
  showQr?: boolean;
  pinTopRsvp?: boolean;
  tags?: string;
  venueImg?: string;
  venueImgWidth?: number;
  venueImgOffsetY?: number;
  centerLogo?: boolean;
  taglineAlign?: string;
  address?: string;
  doorsOpen?: string;
  scale?: number;
}
