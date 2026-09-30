/**
 * rating.ts — Issue #802
 * "Construct explicit highly robust native specific User rating structures internally"
 *
 * Complete rating system types and interfaces for:
 *  - User ratings and reviews
 *  - Creator reputation scores
 *  - Star-based rating systems
 *  - Review moderation and verification
 *  - Analytics and insights
 */

// ─── Constants ────────────────────────────────────────────────────────────────

export const MAX_RATING = 5;
export const MIN_RATING = 1;
export const MAX_REVIEW_LENGTH = 1000;
export const MAX_REVIEW_IMAGES = 3;
export const RATING_DECIMAL_PLACES = 1;

// ─── Rating Types ────────────────────────────────────────────────────────────

export type RatingType = 
  | 'creator'        // Creator portfolio rating
  | 'project'        // Project/task rating
  | 'message'        // Message feedback
  | 'service'        // Service rating
  | 'review'         // Review rating (helpfulness)
  | 'overall';       // Overall user reputation

export type RatingStatus = 
  | 'pending'        // Awaiting verification
  | 'active'         // Published and visible
  | 'flagged'        // Flagged for review
  | 'removed'        // Removed by moderator
  | 'disputed'       // Under dispute resolution;

export type RatingTrend = 'up' | 'down' | 'flat';

// ─── Core Rating Interface ───────────────────────────────────────────────────

export interface UserRating {
  id: string;
  ratingId: string;
  userId: string;
  ratedUserId: string; // The user being rated
  ratingValue: number; // 1-5
  ratingType: RatingType;
  title?: string;
  description?: string;
  images?: string[];
  status: RatingStatus;
  createdAt: string; // ISO 8601
  updatedAt?: string;
  verified: boolean; // Verified purchase/interaction
  helpfulCount: number;
  notHelpfulCount: number;
  reviewerId?: string; // For review ratings
}

// ─── Rating Summary ──────────────────────────────────────────────────────────

export interface RatingSummary {
  averageRating: number;
  totalRatings: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  ratingTrend: RatingTrend;
  lastRatingDate: string;
  reviewCount: number;
  verifiedRatings: number;
}

// ─── User Reputation Interface ───────────────────────────────────────────────

export interface UserReputation {
  userId: string;
  username: string;
  avatarUrl?: string;
  overallScore: number; // 0-100
  ratingScore: number; // 0-5 average
  totalRatingsReceived: number;
  totalRatingsGiven: number;
  responseRate: number; // 0-100%
  completionRate: number; // 0-100%
  qualityScore: number; // 0-100
  reliabilityScore: number; // 0-100
  communicationScore: number; // 0-100
  trend: RatingTrend;
  lastUpdated: string;
  badges: string[];
}

// ─── Star Rating Components ──────────────────────────────────────────────────

export interface StarRatingConfig {
  maxStars: number;
  interactive: boolean;
  starSize: number;
  gap: number;
  emptyColor?: string;
  filledColor?: string;
  halfStar?: boolean;
}

export interface StarRatingProps {
  rating: number;
  config?: StarRatingConfig;
  onRatingChange?: (rating: number) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

// ─── Review Interfaces ───────────────────────────────────────────────────────

export interface Review {
  id: string;
  ratingId: string;
  userId: string;
  ratedUserId: string;
  title: string;
  content: string;
  rating: number;
  images: string[];
  pros?: string[];
  cons?: string[];
  isVerified: boolean;
  createdAt: string;
  updatedAt?: string;
  helpful: number;
  notHelpful: number;
  response?: ReviewResponse;
}

export interface ReviewResponse {
  content: string;
  respondedBy: string;
  respondedAt: string;
}

// ─── Rating Analytics ────────────────────────────────────────────────────────

export interface RatingAnalytics {
  userId: string;
  totalRatings: number;
  averageRating: number;
  topCategories: {
    category: RatingType;
    count: number;
    average: number;
  }[];
  ratingChanges: {
    date: string;
    change: number;
    count: number;
  }[];
  reviewerInsights: {
    averageRatingGiven: number;
    averageRatingReceived: number;
    overlapWith: string[]; // Users with similar rating patterns
  };
}

// ─── Review Submission ───────────────────────────────────────────────────────

export interface ReviewSubmission {
  ratedUserId: string;
  ratingValue: number;
  title?: string;
  content?: string;
  images?: string[];
  pros?: string[];
  cons?: string[];
}

// ─── Rating Submission Response ──────────────────────────────────────────────

export interface RatingSubmissionResult {
  success: boolean;
  ratingId?: string;
  error?: string;
  needsModeration: boolean;
  waitTimeMinutes?: number;
}

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Calculate average rating from distribution
 */
export function calculateAverageRating(distribution: {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}): number {
  const total = distribution[1] + distribution[2] + distribution[3] + distribution[4] + distribution[5];
  
  if (total === 0) return 0;
  
  const weightedSum = 
    distribution[1] * 1 +
    distribution[2] * 2 +
    distribution[3] * 3 +
    distribution[4] * 4 +
    distribution[5] * 5;
  
  return parseFloat((weightedSum / total).toFixed(RATING_DECIMAL_PLACES));
}

/**
 * Get rating distribution from array of ratings
 */
export function getRatingDistribution(ratings: number[]): {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
} {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  
  ratings.forEach((rating) => {
    const rounded = Math.round(rating);
    if (rounded >= 1 && rounded <= 5) {
      distribution[rounded]++;
    }
  });
  
  return distribution;
}

/**
 * Validate rating value
 */
export function isValidRating(rating: number): boolean {
  return rating >= MIN_RATING && rating <= MAX_RATING;
}

/**
 * Round rating to decimal places
 */
export function roundRating(rating: number): number {
  return parseFloat(rating.toFixed(RATING_DECIMAL_PLACES));
}

// ─── Types for API ───────────────────────────────────────────────────────────

export interface GetRatingsRequest {
  userId?: string;
  ratedUserId?: string;
  type?: RatingType;
  status?: RatingStatus;
  limit?: number;
  offset?: number;
  includeDistribution?: boolean;
}

export interface GetRatingsResponse {
  ratings: UserRating[];
  distribution?: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface SubmitRatingRequest {
  ratedUserId: string;
  ratingValue: number;
  type?: RatingType;
  title?: string;
  description?: string;
  images?: string[];
}

export interface SubmitRatingResponse {
  success: boolean;
  rating?: UserRating;
  error?: string;
  moderationRequired: boolean;
}

export interface UpdateRatingRequest {
  ratingId: string;
  title?: string;
  description?: string;
  images?: string[];
}

export interface UpdateRatingResponse {
  success: boolean;
  rating?: UserRating;
  error?: string;
}

export interface DeleteRatingRequest {
  ratingId: string;
}

export interface DeleteRatingResponse {
  success: boolean;
  error?: string;
}

export interface GetRatingSummaryRequest {
  userId: string;
  type?: RatingType;
}

export interface GetRatingSummaryResponse {
  summary: RatingSummary;
  reputation?: UserReputation;
}

export interface GiveHelpfulVoteRequest {
  ratingId: string;
  helpful: boolean;
}

export interface GiveHelpfulVoteResponse {
  success: boolean;
  helpfulCount: number;
  notHelpfulCount: number;
  error?: string;
}