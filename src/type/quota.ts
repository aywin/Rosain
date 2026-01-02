// type/quota.ts

/**
 * Plans disponibles sur la plateforme
 */
export type Plan = "gratuit" | "eleve" | "famille";

/**
 * Limites quotidiennes pour un service donné
 */
export interface ServiceLimit {
    exo_assistant: number;
    video_assistant: number;
    image_upload: number;
}

/**
 * Document de la collection quotas/
 */
export interface Quota {
    user_id: string;
    plan: Plan;
    daily_limits: ServiceLimit;
    usage_today: ServiceLimit;
    last_reset: Date;
    created_at: Date;
    updated_at: Date;
}



/**
 * Statut d'une souscription
 */
export type SubscriptionStatus = "active" | "canceled" | "expired" | "past_due";

/**
 * Document de la collection subscriptions/ (optionnel, pour Stripe)
 */
export interface Subscription {
    id: string;
    user_id: string;
    plan: Plan;
    status: SubscriptionStatus;
    stripe_customer_id?: string;
    stripe_subscription_id?: string;
    stripe_price_id?: string;
    current_period_start: Date;
    current_period_end: Date;
    cancel_at_period_end: boolean;
    canceled_at?: Date | null;
    created_at: Date;
    updated_at: Date;
}

/**
 * Informations de quota retournées par l'API
 */
export interface QuotaInfo {
    used: number;
    limit: number;
    remaining: number;
    percentage: number;
}

/**
 * Réponse API avec info quota
 */
export interface ApiResponseWithQuota<T> {
    data?: T;
    error?: string;
    quota?: QuotaInfo;
    upgrade_url?: string;
}