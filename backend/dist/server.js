"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const match_routes_1 = require("./routes/match.routes");
const node_cron_1 = __importDefault(require("node-cron"));
const path_1 = __importDefault(require("path"));
const match_controller_1 = __importDefault(require("./controllers/match.controller"));
const users_routes_1 = require("./routes/users.routes");
const admin_routes_1 = require("./routes/admin.routes");
const home_routes_copy_1 = require("./routes/home.routes copy");
const records_routes_1 = require("./routes/records.routes");
const config_routes_1 = require("./routes/config.routes");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// CORS Configuration
// For local development: specify exact origin and allow credentials
// For production: can use wildcard or specific domain
const corsOptions = {
    origin: (origin, callback) => {
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
        }
        else {
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
app.use((0, cors_1.default)(corsOptions));
// Add cache-control headers for API routes to prevent caching
app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});
app.use(express_1.default.json());
// Static files with proper cache control
// Hashed files (JS, CSS) can be cached for 1 year, index.html should not be cached
const frontendDistPath = path_1.default.join(__dirname, "../../frontend/dist");
console.log(`[SERVER] Serving static files from: ${frontendDistPath}`);
app.use(express_1.default.static(frontendDistPath, {
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
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, 'uploads')));
app.use("/api/home", home_routes_copy_1.homeRouter);
app.use("/api/match", match_routes_1.matchRouter);
app.use("/api/user", users_routes_1.usersRouter);
app.use("/api/admin", admin_routes_1.adminRouter);
app.use("/api/records", records_routes_1.recordsRouter);
app.use("/api/config", config_routes_1.configRouter);
app.get('*', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, "../../frontend/dist/index.html"));
});
node_cron_1.default.schedule('0 0 * * *', () => {
    console.log("UPDATE MATCHES....");
    match_controller_1.default.getMatchResults();
});
app.listen(PORT, () => {
    //  MatchController.getMatchResults();
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
