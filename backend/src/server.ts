import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { matchRouter } from './routes/match.routes';
import cron from 'node-cron';
import path from 'path';
import MatchController from './controllers/match.controller';
import { usersRouter } from './routes/users.routes';
import { adminRouter } from './routes/admin.routes';
import { homeRouter } from './routes/home.routes copy';
import { recordsRouter } from './routes/records.routes';
import { configRouter } from './routes/config.routes';

const app = express();
const PORT = process.env.PORT || 3000;

// CORS Configuration
// For local development: specify exact origin and allow credentials
// For production: can use wildcard or specific domain
const corsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
            console.log('[CORS] Request with no origin, allowing');
            return callback(null, true);
        }
        
        const allowedOrigins = process.env.NODE_ENV === 'production'
            ? [process.env.CORS_ORIGIN || 'https://kicksystem.ai']
            : ['http://localhost:5173', 'http://localhost:3000', process.env.CORS_ORIGIN || 'https://kicksystem.ai'].filter(Boolean);
        
        console.log('[CORS] Checking origin:', origin);
        console.log('[CORS] Allowed origins:', allowedOrigins);
        console.log('[CORS] NODE_ENV:', process.env.NODE_ENV || 'development');
        
        if (allowedOrigins.includes(origin)) {
            console.log('[CORS] Origin allowed:', origin);
            callback(null, true);
        } else {
            console.error('[CORS] Origin NOT allowed:', origin);
            console.error('[CORS] Allowed origins are:', allowedOrigins);
            callback(new Error(`Not allowed by CORS. Origin: ${origin}, Allowed: ${allowedOrigins.join(', ')}`));
        }
    },
    credentials: true, // Required when using withCredentials: true in frontend
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma'],
};

// Request logging middleware (before CORS)
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[SERVER] ${timestamp} ${req.method} ${req.path}`);
    console.log(`[SERVER] Origin: ${req.headers.origin || 'no-origin'}`);
    console.log(`[SERVER] User-Agent: ${req.headers['user-agent']?.substring(0, 50) || 'no-user-agent'}`);
    next();
});

app.use(cors(corsOptions));

// Add cache-control headers for API routes to prevent caching
app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

app.use(express.json());

// Static files with proper cache control
// Hashed files (JS, CSS) can be cached for 1 year, index.html should not be cached
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
app.use("/api/home", homeRouter);
app.use("/api/match", matchRouter);
app.use("/api/user", usersRouter);
app.use("/api/admin", adminRouter);
app.use("/api/records", recordsRouter);
app.use("/api/config", configRouter);

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, "../../frontend/dist/index.html"));
});

cron.schedule('0 0 * * *', () => {
    console.log("UPDATE MATCHES....");
    MatchController.getMatchResults();
});


app.listen(PORT, () => {
    //  MatchController.getMatchResults();
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
