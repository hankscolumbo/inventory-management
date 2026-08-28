// lib/duplicateDetector.ts
import { GameLog } from '@prisma/client';

export interface DuplicatePair {
  id: string;
  gameA: GameLog;
  gameB: GameLog;
}

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[™®©]/g, '')
    .replace(/\s*[\(\[](ps4|ps5|ps3|ps vita|vr|pc|steam)[\)\]]/gi, '')
    .replace(/\b(ps4|ps5|ps4 & ps5)\b/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export function findPossibleDuplicates(logs: GameLog[]): DuplicatePair[] {
  const map = new Map<string, GameLog[]>();

  // Group logs by normalized title safely using nullish coalescing
  for (const log of logs) {
    const key = normalizeTitle(log.gameTitle);
    if (!key) continue;

    const group = map.get(key) ?? [];
    group.push(log);
    map.set(key, group);
  }

  const pairs: DuplicatePair[] = [];

  // Generate pair entries for any group with > 1 game
  map.forEach((group) => {
    if (group && group.length > 1) {
      for (let i = 0; i < group.length - 1; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const gameA = group[i];
          const gameB = group[j];

          // Explicit null check satisfies tsconfig array index access rules
          if (gameA && gameB) {
            pairs.push({
              id: `${gameA.id}-${gameB.id}`,
              gameA,
              gameB,
            });
          }
        }
      }
    }
  });

  return pairs;
}

