/**
 * Configuration centralisée de l'API
 * Gère automatiquement l'URL du backend selon l'environnement
 */

// URL du backend selon l'environnement
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

/**
 * Configuration de l'API
 */
export const apiConfig = {
    baseUrl: API_BASE_URL,

    // Endpoints
    endpoints: {
        transcript: {
            getYoutubeTranscript: '/transcript/get_youtube_transcript',
        },
        assistant: {
            chat: '/ai_assistant_chat',
            exo: '/ai_assistant_exo',
        },
    },

    // Timeout par défaut (30 secondes)
    timeout: 30000,
};

/**
 * Utilitaire pour construire une URL complète
 */
export const buildApiUrl = (endpoint: string, params?: Record<string, string>): string => {
    const url = new URL(endpoint, API_BASE_URL);

    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.append(key, value);
        });
    }

    return url.toString();
};

/**
 * Utilitaire pour vérifier si on est en mode développement
 */
export const isDevelopment = (): boolean => {
    return process.env.NODE_ENV === 'development';
};

/**
 * Utilitaire pour vérifier si on est en production
 */
export const isProduction = (): boolean => {
    return process.env.NODE_ENV === 'production';
};

/**
 * Log de l'environnement au démarrage (uniquement en dev)
 */
if (isDevelopment() && typeof window !== 'undefined') {
    console.log('🔧 API Configuration:', {
        baseUrl: API_BASE_URL,
        environment: process.env.NODE_ENV,
    });
}