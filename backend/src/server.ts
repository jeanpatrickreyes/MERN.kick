import path from 'path';
import dotenv from 'dotenv';
// Load .env from backend directory so MongoDB/Redis env vars are set even when cwd is repo root
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
import { connectMongo, isMongoEnabled, checkMongoConnection } from './database/mongodb';
import { checkRedisConnection, isRedisConfigured } from './cache/redis';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import compression from 'compression';
import { matchRouter } from './routes/match.routes';
import { syncHkjcToMatches } from './service/syncHkjc';
import { runAnalysisBatch } from './service/analysisWorker';
import { cacheDelPattern } from './cache/redis';
import { usersRouter } from './routes/users.routes';
import { adminRouter } from './routes/admin.routes';
import { homeRouter } from './routes/home.routes copy';
import { recordsRouter } from './routes/records.routes';
import { records2Router } from './routes/records2.routes';
import { configRouter } from './routes/config.routes';

const app = express();
const PORT = process.env.PORT || 3000;

// CORS Configuration
const corsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
            console.log('[CORS] Request with no origin, allowing');
            return callback(null, true);
        }

        const allowedOrigins = process.env.NODE_ENV === 'production'
            ? [process.env.CORS_ORIGIN || 'https://kicksystem.ai', 'https://www.kicksystem.ai']
            : ['http://localhost:5173', 'http://localhost:4000', 'http://localhost:3000', process.env.CORS_ORIGIN || 'https://kicksystem.ai'].filter(Boolean);

        if (process.env.NODE_ENV !== 'production') {
            console.log('[CORS] Checking origin:', origin);
            console.log('[CORS] Allowed origins:', allowedOrigins);
            console.log('[CORS] NODE_ENV:', process.env.NODE_ENV || 'development');
        }

        if (allowedOrigins.includes(origin)) {
            if (process.env.NODE_ENV !== 'production') {
                console.log('[CORS] Origin allowed:', origin);
            }
            callback(null, true);
        } else {
            console.error('[CORS] Origin NOT allowed:', origin);
            if (process.env.NODE_ENV !== 'production') {
                console.error('[CORS] Allowed origins are:', allowedOrigins);
            }
            callback(new Error(`Not allowed by CORS. Origin: ${origin}, Allowed: ${allowedOrigins.join(', ')}`));
        }
    },
    credentials: true, // Required when using withCredentials: true in frontend
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma'],
};

// Enable compression for all responses (gzip/brotli)
app.use(compression({
    level: 6,
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    }
}));

// Request logging middleware (before CORS) - only in development
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        const timestamp = new Date().toISOString();
        console.log(`[SERVER] ${timestamp} ${req.method} ${req.path}`);
        console.log(`[SERVER] Origin: ${req.headers.origin || 'no-origin'}`);
        console.log(`[SERVER] User-Agent: ${req.headers['user-agent']?.substring(0, 50) || 'no-user-agent'}`);
        next();
    });
}

app.use(cors(corsOptions));

// Add cache-control headers for API routes - optimize caching for GET requests
app.use('/api', (req, res, next) => {
    // For GET requests, allow short-term caching (30 seconds)
    if (req.method === 'GET') {
        res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
    } else {
        // For POST/PUT/DELETE, prevent caching
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
    next();
});

// Parse cookies (e.g. sessionId) so auth can work when browser sends cookie without Authorization header
app.use(cookieParser());

// Increase body parser limits for file uploads
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));

// Health check: verify MongoDB and Redis connections
app.get("/api/health", async (_req, res) => {
  const mongoEnabled = isMongoEnabled();
  const redisConfigured = isRedisConfigured();
  const mongoOk = mongoEnabled ? checkMongoConnection() : null;
  const redisOk = redisConfigured ? await checkRedisConnection() : null;
  res.json({
    ok: (mongoOk !== false) && (redisOk !== false),
    mongo: mongoEnabled ? { connected: mongoOk } : { configured: false },
    redis: redisConfigured ? { connected: redisOk } : { configured: false },
  });
});

// API routes must come BEFORE static files
app.use("/api/home", homeRouter);
app.use("/api/match", matchRouter);
app.use("/api/user", usersRouter);
app.use("/api/admin", adminRouter);
app.use("/api/records", recordsRouter);
app.use("/api/records2", records2Router);
app.use("/api/config", configRouter);

// Static files with proper cache control
const frontendDistPath = path.join(__dirname, "../../frontend/dist");
console.log(`[SERVER] Serving static files from: ${frontendDistPath}`);
app.use(express.static(frontendDistPath, {
    maxAge: '1y',
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
        // Don't cache index.html - always fetch fresh
        if (filePath.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
    }
}));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, "../../frontend/dist/index.html"));
});

async function start() {
    if (isMongoEnabled()) {
        try {
            await connectMongo();
            console.log("[STARTUP] MongoDB connected:", checkMongoConnection());
        } catch (err) {
            console.error("[STARTUP] MongoDB connection failed (ECONNREFUSED = MongoDB not running).");
            console.error("[STARTUP] Start MongoDB (e.g. docker run -d -p 27017:27017 mongo) or remove MONGODB_URI from .env to use JSON file database.");
            console.error("[STARTUP] Server will start anyway; DB requests will fail until MongoDB is up.");
        }
    } else {
        console.log("[STARTUP] MongoDB not configured (MONGODB_URI not set)");
    }
    if (isRedisConfigured()) {
        try {
            const redisOk = await checkRedisConnection();
            console.log("[STARTUP] Redis connected:", redisOk);
            if (!redisOk) console.warn("[STARTUP] Redis configured but ping failed - cache will be skipped");
        } catch (err) {
            console.warn("[STARTUP] Redis connection failed (cache disabled):", (err as Error).message);
        }
    } else {
        console.log("[STARTUP] Redis not configured");
    }
    // Clear matches list cache so first request gets fresh list from HKJC (avoids showing stale extra dates)
    cacheDelPattern('matches:list:*').then(() => console.log("[STARTUP] Cleared matches list cache"));

    // On website load: sync HKJC to DB *before* accepting requests (so matches are in DB when user opens site)
    const SYNC_TIMEOUT_MS = 45000;
    console.log("[STARTUP] Syncing HKJC to DB (max wait " + SYNC_TIMEOUT_MS / 1000 + "s)...");
    await Promise.race([
        syncHkjcToMatches(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("sync timeout")), SYNC_TIMEOUT_MS)),
    ]).then(() => console.log("[STARTUP] HKJC sync completed.")).catch((e) => {
        console.error("[STARTUP] syncHkjc failed or timed out:", e?.message || e);
    });

    // After sync: trigger analysis worker once (batch Gemini for pending matches; Redis lock prevents duplicates)
    setImmediate(() => {
        runAnalysisBatch()
            .then((r) => { if (r.ran) console.log("[STARTUP] Analysis batch ran, processed:", r.processed); })
            .catch((e) => console.warn("[STARTUP] Analysis batch error:", e));
    });

    // Every 5 minutes: refresh matches from HKJC, then run analysis worker for pending/stale
    const FIVE_MINS_MS = 5 * 60 * 1000;
    setInterval(() => {
        syncHkjcToMatches()
            .then(() => runAnalysisBatch())
            .then((r) => { if (r.ran && r.processed) console.log("[cron] Analysis batch processed", r.processed); })
            .catch((e) => console.error("[syncHkjc] interval failed:", e));
    }, FIVE_MINS_MS);

    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}
start().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
