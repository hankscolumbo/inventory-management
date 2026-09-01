// app/actions/getGameDeals.ts
'use server';

export interface DealItem {
  dealID: string;
  storeName: string;
  storeIcon: string;
  salePrice: string;
  normalPrice: string;
  savings: number;
  dealUrl: string;
}

const CHEAPSHARK_HEADERS = {
  'User-Agent': 'playLog/1.0 (contact@playlog.app)',
  'Accept': 'application/json',
};

let storeCache: Record<string, { storeName: string; icon: string }> | null = null;

async function getStoreMap(): Promise<Record<string, { storeName: string; icon: string }>> {
  if (storeCache) return storeCache;

  try {
    const res = await fetch('https://www.cheapshark.com/api/1.0/stores', {
      headers: CHEAPSHARK_HEADERS,
      next: { revalidate: 86400 },
    });
    if (!res.ok) return {};
    const stores = await res.json();
    const map: Record<string, { storeName: string; icon: string }> = {};

    stores.forEach((s: any) => {
      if (s.isActive) {
        map[s.storeID] = {
          storeName: s.storeName,
          icon: `https://www.cheapshark.com${s.images.icon}`,
        };
      }
    });

    storeCache = map;
    return map;
  } catch {
    return {};
  }
}

function cleanTitleForSearch(title: string): string {
  return title
    .split(':')[0] // Strip subtitles after colons
    .split(' - ')[0] // Strip subtitles after dashes
    .replace(/[™®©]/g, '')
    .trim();
}

export async function getGameDeals(title: string, steamAppId?: number | null): Promise<DealItem[]> {
  if (!title && !steamAppId) return [];

  const storeMap = await getStoreMap();

  try {
    let gameId: string | null = null;

    // 1. Try Lookup by Steam App ID
    if (steamAppId) {
      try {
        const steamRes = await fetch(
          `https://www.cheapshark.com/api/1.0/games?steamAppID=${steamAppId}`,
          {
            headers: CHEAPSHARK_HEADERS,
            cache: 'no-store',
          }
        );
        if (steamRes.ok) {
          const steamData = await steamRes.json();
          if (Array.isArray(steamData) && steamData.length > 0) {
            gameId = String(steamData[0].gameID);
          }
        }
      } catch {}
    }

    // 2. Fallback Lookup by Sanitized Title
    if (!gameId && title) {
      const searchTitle = cleanTitleForSearch(title);
      try {
        const searchRes = await fetch(
          `https://www.cheapshark.com/api/1.0/games?title=${encodeURIComponent(searchTitle)}&limit=1`,
          {
            headers: CHEAPSHARK_HEADERS,
            cache: 'no-store',
          }
        );
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (Array.isArray(searchData) && searchData.length > 0) {
            gameId = String(searchData[0].gameID);
          }
        }
      } catch {}
    }

    if (!gameId) return [];

    // 3. Fetch Game Details & Store Deal Listings
    const detailsRes = await fetch(`https://www.cheapshark.com/api/1.0/games?id=${gameId}`, {
      headers: CHEAPSHARK_HEADERS,
      cache: 'no-store',
    });

    if (!detailsRes.ok) return [];
    const detailsData = await detailsRes.json();
    const dealsList = detailsData.deals || [];

    if (!Array.isArray(dealsList) || dealsList.length === 0) return [];

    return dealsList.slice(0, 6).map((deal: any) => {
      const storeInfo = storeMap[deal.storeID] || {
        storeName: `Store #${deal.storeID}`,
        icon: '',
      };

      const salePrice = deal.price || deal.salePrice || '0.00';
      const normalPrice = deal.retailPrice || deal.normalPrice || salePrice;
      const rawSavings = parseFloat(deal.savings || '0');

      return {
        dealID: deal.dealID,
        storeName: storeInfo.storeName,
        storeIcon: storeInfo.icon,
        salePrice,
        normalPrice,
        savings: Math.round(rawSavings),
        dealUrl: `https://www.cheapshark.com/redirect?dealID=${deal.dealID}`,
      };
    });
  } catch (error) {
    console.error('Error fetching CheapShark deals:', error);
    return [];
  }
}
