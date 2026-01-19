/**
 * Calculate the number of crowns based on win rate
 * @param winRate - The win rate percentage (0-100)
 * @returns Number of crowns (0, 1, 2, or 3)
 */
export function getCrownCount(winRate: number): number {
    if (winRate > 90) return 3;
    if (winRate > 80) return 2;
    if (winRate > 70) return 1;
    return 0;
}

