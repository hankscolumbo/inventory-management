// types/game.ts

/**
 * Core interface for any game item displayed in grids, cards, or lists across playLog.
 * Supports data originating from IGDB, Steam, or local database logs.
 */
export interface GameItem {
  id?: string;
  gameTitle: string;
  coverUrl?: string | null;
  igdbId?: number | null;
  steamAppId?: number | null;
  status?: string;
  substatus?: string | null;
  rating?: number | null;
  review?: string | null;
  playtimeHours?: number | null;
  platforms?: string[];
  isOwned?: boolean;
  playedOn?: Date | string | null;
  releaseYear?: number | null;
}

/**
 * Standard shape returned by IGDB browse and search endpoints.
 */
export interface BrowseGame {
  id: number;
  name: string;
  coverUrl: string | null;
  releaseYear: number | null;
  rating: number | null;
}

/**
 * Standard shape expected by LogModal when creating or updating a user log.
 */
export interface LogModalGame {
  id: number;
  name: string;
  coverUrl?: string | null;
  isSteamApp?: boolean;
}

/**
 * Props shape for GameCardActions component.
 */
export interface GameCardActionsProps {
  item: GameItem;
  initialLog?: GameItem | null;
  userLists?: { id: string; title: string }[];
}
