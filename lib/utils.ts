export function getIGDBCoverURL(url?: string): string {
    if (!url) return '/placeholder-cover.jpg'; // fallback if no cover exists

    /// IGDB urls start with "images.igdb.com/..." so ensure it has https:
    const fullUrl = url.startsWith('//') ? 'https:${url}' : url;

    // replace thumbnail resolution with larger cover art
    return fullUrl.replace('t_thumb', 't_cover_big');
}