
export const GeocodingService = {
    search: async (address: string): Promise<{ lat: number; lng: number } | null> => {
        try {
            if (!address || address.length < 5) return null;

            // 1. Clean Address
            const cleanAddress = address
                .replace(/\/\d+/, '') // Remove /12
                .replace(/\s(top|apt|whg)\.?\s?\d+/i, '') // Remove apt identifiers
                .trim();

            const query = encodeURIComponent(cleanAddress);

            // Nominatim Free Tier: Requires User-Agent. Rate limit 1/s.
            // We should add a small delay if we were processing batches, but for single request it's fine.
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`, {
                headers: {
                    'User-Agent': 'OfferApp/1.0 (contact@polendach24.de)'
                }
            });

            if (!response.ok) return null;

            const data = await response.json();
            if (data && data.length > 0) {
                return {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon)
                };
            }
            return null;
        } catch (error) {
            console.error('Geocoding error:', error);
            return null;
        }
    }
};
