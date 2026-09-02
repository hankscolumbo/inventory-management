// app/actions/getGameDeals.ts
'use server';

export interface DealItem {
  dealID: string;
  dealId: string; // Alias for camelCase compatibility
  storeID: string;
  storeName: string;
  storeIcon: string;
  salePrice: string;
  normalPrice: string;
  savings: string;
  dealUrl: string;
}

interface StoreInfo {
  name: string;
  icon: string;
}

const FALLBACK_STORES: Record<string, StoreInfo> = {
  '1': { name: 'Steam', icon: 'https://www.cheapshark.com/img/stores/icons/0.png' },
  '2': { name: 'GamersGate', icon: 'https://www.cheapshark.com/img/stores/icons/1.png' },
  '3': { name: 'GreenManGaming', icon: 'https://www.cheapshark.com/img/stores/icons/2.png' },
  '7': { name: 'GOG', icon: 'https://www.cheapshark.com/img/stores/icons/6.png' },
  '11': { name: 'Humble Store', icon: 'https://www.cheapshark.com/img/stores/icons/10.png' },
  '13': { name: 'GameBillet', icon: 'https://www.cheapshark.com/img/stores/icons/12.png' },
  '15': { name: 'Fanatical', icon: 'https://www.cheapshark.com/img/stores/icons/14.png' },
  '25': { name: 'Epic Games', icon: 'https://www.cheapshark.com/img/stores/icons/24.png' },
  '27': { name: 'Gamesplanet', icon: 'https://www.cheapshark.com/img/stores/icons/26.png' },
  '30': { name: 'IndieGala', icon: 'https://www.cheapshark.com/img/stores/icons/29.png' },
};

async function getStoreMap(): Promise<Record<string, StoreInfo>> {
  try {
    const res = await fetch('https://www.cheapshark.com/api/1.0/stores', {
      headers: { 'User-Agent': 'GamingCatalog/1.0' },
      next: { revalidate: 86400 },
    });

    if (res.ok) {
      const stores = await res.json();
      if (Array.isArray(stores)) {
        const dynamicMap: Record<string, StoreInfo> = {};
        for (const store of stores) {
          if (store.storeID) {
            dynamicMap[store.storeID] = {
              name: store.storeName || `Store #${store.storeID}`,
              icon: store.images?.icon
                ? `https://www.cheapshark.com${store.images.icon}`
                : `https://www.cheapshark.com/img/stores/icons/${Math.max(0, Number(store.storeID) - 1)}.png`,
            };
          }
        }
        return { ...FALLBACK_STORES, ...dynamicMap };
      }
    }
  } catch (error) {
    console.error('Error fetching CheapShark store list:', error);
  }

  return FALLBACK_STORES;
}

function normalizeTitle(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

function isTitleMatch(requestedTitle: string, resultTitle: string): boolean {
  const normRequested = normalizeTitle(requestedTitle);
  const normResult = normalizeTitle(resultTitle);

  if (normRequested === normResult) return true;

  if (normRequested.includes(normResult) || normResult.includes(normRequested)) {
    const minLength = Math.min(normRequested.length, normResult.length);
    const maxLength = Math.max(normRequested.length, normResult.length);
    return minLength / maxLength >= 0.75;
  }

  return false;
}

export async function getGameDeals(
  gameTitle: string,
  steamAppId?: number | null
): Promise<DealItem[]> {
  if (!gameTitle && !steamAppId) return [];

  try {
    let targetGameId: string | null = null;

    if (steamAppId) {
      const steamRes = await fetch(
        `https://www.cheapshark.com/api/1.0/games?steamAppID=${steamAppId}`,
        { headers: { 'User-Agent': 'GamingCatalog/1.0' }, next: { revalidate: 3600 } }
      );

      if (steamRes.ok) {
        const steamGames = await steamRes.json();
        if (Array.isArray(steamGames) && steamGames.length > 0) {
          targetGameId = steamGames[0].gameID;
        }
      }
    }

    if (!targetGameId && gameTitle) {
      const titleRes = await fetch(
        `https://www.cheapshark.com/api/1.0/games?title=${encodeURIComponent(gameTitle)}&limit=10`,
        { headers: { 'User-Agent': 'GamingCatalog/1.0' }, next: { revalidate: 3600 } }
      );

      if (titleRes.ok) {
        const games = await titleRes.json();

        if (Array.isArray(games) && games.length > 0) {
          const matchedGame = games.find((g: any) => {
            if (steamAppId && g.steamAppID && Number(g.steamAppID) === steamAppId) {
              return true;
            }
            return isTitleMatch(gameTitle, g.external);
          });

          if (matchedGame) {
            targetGameId = matchedGame.gameID;
          }
        }
      }
    }

    if (!targetGameId) return [];

    const [gameDetailRes, storeMap] = await Promise.all([
      fetch(`https://www.cheapshark.com/api/1.0/games?id=${targetGameId}`, {
        headers: { 'User-Agent': 'GamingCatalog/1.0' },
        next: { revalidate: 1800 },
      }),
      getStoreMap(),
    ]);

    if (!gameDetailRes.ok) return [];

    const gameDetail = await gameDetailRes.json();
    const deals = gameDetail.deals || [];

    return deals.map((d: any) => {
      const store = storeMap[d.storeID] || {
        name: `Store #${d.storeID}`,
        icon: `https://www.cheapshark.com/img/stores/icons/${Math.max(0, Number(d.storeID) - 1)}.png`,
      };

      return {
        dealID: d.dealID,
        dealId: d.dealID,
        storeID: d.storeID,
        storeName: store.name,
        storeIcon: store.icon,
        salePrice: d.price,
        normalPrice: d.retailPrice,
        savings: Math.round(parseFloat(d.savings || '0')).toString(),
        dealUrl: `https://www.cheapshark.com/redirect?dealID=${d.dealID}`,
      };
    });
  } catch (error) {
    console.error('Error fetching game deals:', error);
    return [];
  }
}

