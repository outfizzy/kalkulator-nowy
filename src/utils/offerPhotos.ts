// Centralized Photo Storage Functions
import type { OfferPhotos } from '../types';

const OFFER_PHOTOS_KEY = 'offerPhotos';

// Get all offer photos from storage
function getAllOfferPhotos(): OfferPhotos[] {
    const data = localStorage.getItem(OFFER_PHOTOS_KEY);
    if (!data) return [];

    return JSON.parse(data, (key, value) => {
        if (key === 'updatedAt') return new Date(value);
        return value;
    });
}

// Save all offer photos to storage
function saveAllOfferPhotos(offerPhotos: OfferPhotos[]): void {
    localStorage.setItem(OFFER_PHOTOS_KEY, JSON.stringify(offerPhotos));
}

// Get photos for a specific offer
export function getOfferPhotos(offerId: string): string[] {
    const allPhotos = getAllOfferPhotos();
    const offerPhotos = allPhotos.find(op => op.offerId === offerId);
    return offerPhotos ? offerPhotos.photos : [];
}

// Add a photo to an offer
export function addOfferPhoto(offerId: string, photo: string): void {
    const allPhotos = getAllOfferPhotos();
    const existingIndex = allPhotos.findIndex(op => op.offerId === offerId);

    if (existingIndex >= 0) {
        // Update existing
        allPhotos[existingIndex].photos.push(photo);
        allPhotos[existingIndex].updatedAt = new Date();
    } else {
        // Create new
        allPhotos.push({
            offerId,
            photos: [photo],
            updatedAt: new Date()
        });
    }

    saveAllOfferPhotos(allPhotos);
}

// Remove a photo from an offer by index
export function removeOfferPhoto(offerId: string, photoIndex: number): void {
    const allPhotos = getAllOfferPhotos();
    const existingIndex = allPhotos.findIndex(op => op.offerId === offerId);

    if (existingIndex >= 0) {
        allPhotos[existingIndex].photos = allPhotos[existingIndex].photos.filter((_, i) => i !== photoIndex);
        allPhotos[existingIndex].updatedAt = new Date();
        saveAllOfferPhotos(allPhotos);
    }
}

// Update all photos for an offer
export function updateOfferPhotos(offerId: string, photos: string[]): void {
    const allPhotos = getAllOfferPhotos();
    const existingIndex = allPhotos.findIndex(op => op.offerId === offerId);

    if (existingIndex >= 0) {
        allPhotos[existingIndex].photos = photos;
        allPhotos[existingIndex].updatedAt = new Date();
    } else {
        allPhotos.push({
            offerId,
            photos,
            updatedAt: new Date()
        });
    }

    saveAllOfferPhotos(allPhotos);
}
