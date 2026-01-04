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
const PORT = 3000;

// CORS Configuration
// For local development: specify exact origin and allow credentials
// For production: can use wildcard or specific domain
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? '*' // Production: allow all (or specify your domain)
        : 'http://localhost:5173', // Development: exact origin required for credentials
    credentials: true, // Required when using withCredentials: true in frontend
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma'],
};

app.use(cors(corsOptions));


app.use(express.json());
app.use(express.static(path.join(__dirname, "../../frontend/dist")));

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
