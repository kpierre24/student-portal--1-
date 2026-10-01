import { Request, Response, NextFunction } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { createClient } from "redis";
import { logger } from "../../lib/logger";

// Initialize Redis client if REDIS_URL is present
let redisClient: ReturnType<typeof createClient> | undefined;
let isRedisConnected = false;

if (process.env.REDIS_URL) {
  redisClient = createClient({
    url: process.env.REDIS_URL,
    // Add reconnect strategy for resilience
    socket: {
      reconnectStrategy: (retries) => Math.min(retries * 50, 2000),
    },
  });

  redisClient.on("error", (err) => logger.error("Redis Client Error", err));
  redisClient.on("ready", () => {
    isRedisConnected = true;
    logger.info("Redis connected and ready for rate limiting.");
  });

  // Start connection
  redisClient.connect().catch((err) => {
    logger.error("Failed to connect to Redis:", err);
  });
}

/**
 * Rate Limiting Middleware
 * Supports isolated bucket tracking per route category using Redis (if configured) or Memory store.
 * Identifies users by authenticated user ID (if available) or trusted client IP.
 */
export function rateLimiter(maxRequests = 100, windowMs = 15 * 60 * 1000, bucketName = "global") {
  return rateLimit({
    windowMs,
    max: maxRequests,
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    // Key generator prioritizes authenticated user ID over IP address
    keyGenerator: (req: Request) => {
      // 1. Authenticated User Identity
      if (req.user && req.user.userId) {
        return `${bucketName}:user:${req.user.userId}`;
      }
      
      // 2. Fallback to Express trusted IP (which properly parses x-forwarded-for when trust proxy is configured)
      const rawIp = req.ip || req.socket.remoteAddress || "127.0.0.1";
      const ip = ipKeyGenerator(rawIp) || "unknown-ip";
      return `${bucketName}:ip:${ip}`;
    },
    // Handler triggered when limit is exceeded
    handler: (req: Request, res: Response, next: NextFunction, options) => {
      const clientIp = req.ip || req.socket.remoteAddress || "unknown-ip";
      const identifier = req.user?.userId ? `user:${req.user.userId}` : `ip:${clientIp}`;
      
      logger.warn(`Rate limit exceeded [bucket: ${bucketName}] for ${identifier} on endpoint: ${req.originalUrl}`);
      
      res.status(options.statusCode).json({
        error: "Too Many Requests",
        message: `Rate limit exceeded for ${bucketName} operations. Please try again later.`,
        retryAfterSeconds: Math.ceil(windowMs / 1000),
      });
    },
    // Use Redis store if connected, otherwise fallback to default memory store
    store: redisClient 
      ? new RedisStore({
          sendCommand: (...args: string[]) => {
            if (isRedisConnected && redisClient) {
              return redisClient.sendCommand(args);
            }
            throw new Error("Redis not connected");
          },
          prefix: `ratelimit:${bucketName}:`
        })
      : undefined, 
  });
}

// Specialized rate limiters for high-risk, resource-intensive, or sensitive operations
export const authRateLimiter = rateLimiter(15, 15 * 60 * 1000, "auth"); // 15 requests / 15 mins
export const aiRateLimiter = rateLimiter(30, 15 * 60 * 1000, "ai"); // 30 requests / 15 mins (LLM evaluations)
export const paymentsRateLimiter = rateLimiter(40, 15 * 60 * 1000, "payments"); // 40 requests / 15 mins (financial mutations)
export const assignmentsRateLimiter = rateLimiter(50, 15 * 60 * 1000, "assignments"); // 50 requests / 15 mins (homework uploads)
export const driveProxyRateLimiter = rateLimiter(240, 15 * 60 * 1000, "drive-proxy"); // 240 requests / 15 mins (Google Drive/Sheets multi-tab proxy)
export const adminRateLimiter = rateLimiter(60, 15 * 60 * 1000, "admin"); // 60 requests / 15 mins (audit logs & admin ops)
export const stateRateLimiter = rateLimiter(80, 15 * 60 * 1000, "state"); // 80 requests / 15 mins (state sync)
export const githubRateLimiter = rateLimiter(30, 15 * 60 * 1000, "github"); // 30 requests / 15 mins (git operations)
export const generalApiRateLimiter = rateLimiter(1000, 15 * 60 * 1000, "general-api"); // 1000 requests / 15 mins

/**
 * HTTP Security Headers Middleware
 * Appends industry-standard protective HTTP response headers.
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(self), microphone=(self)");
  next();
}

/**
 * Sanitizes input text to prevent XSS payloads in request body
 */
function sanitizeString(str: string): string {
  return str
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "");
}

/**
 * Recursively sanitizes user input in string values of JSON body
 */
function sanitizeObject(obj: any): any {
  if (typeof obj === "string") {
    return sanitizeString(obj);
  } else if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  } else if (obj !== null && typeof obj === "object") {
    const cleaned: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      cleaned[key] = sanitizeObject(obj[key]);
    }
    return cleaned;
  }
  return obj;
}

/**
 * Request Body Sanitization Middleware
 */
export function sanitizeBody(req: Request, res: Response, next: NextFunction) {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeObject(req.body);
  }
  next();
}

/**
 * Validates repository URL for git cloning
 */
export function isValidGitUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  // Strictly enforce valid GitHub HTTPS repository URLs
  const githubPattern = /^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(\.git)?$/;
  return githubPattern.test(url.trim());
}
