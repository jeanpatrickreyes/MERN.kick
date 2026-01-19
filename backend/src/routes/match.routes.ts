import MatchController from "../controllers/match.controller";
import { Router } from "express";

const matchRouter = Router();

matchRouter.get('/match-data', async (req, res) => {
    const startTime = Date.now();
    const origin = req.headers.origin || 'no-origin';
    const userAgent = req.headers['user-agent'] || 'no-user-agent';
    
    console.log('========================================');
    console.log('[ROUTE] /api/match/match-data - Request received');
    console.log('[ROUTE] Origin:', origin);
    console.log('[ROUTE] User-Agent:', userAgent);
    console.log('[ROUTE] Query params:', req.query);
    console.log('[ROUTE] Method:', req.method);
    console.log('[ROUTE] Headers:', JSON.stringify(req.headers, null, 2));
    console.log('========================================');
    
    try {
        // Add response headers for debugging
        res.on('finish', () => {
            const duration = Date.now() - startTime;
            console.log('[ROUTE] Response sent - Status:', res.statusCode, 'Duration:', duration + 'ms');
            console.log('[ROUTE] Response headers:', res.getHeaders());
        });
        
        await MatchController.getMatchs(req, res);
    } catch (error) {
        console.error('[ROUTE] Unhandled error in /match-data:', error);
        if (!res.headersSent) {
            res.status(500).json({ 
                error: 'Internal server error', 
                message: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString()
            });
        }
    }
});

matchRouter.get('/match-data/:id', async (req, res) => {
    await MatchController.getMatchDetails(req, res);
});

matchRouter.get('/match-analyze/:id', async (req, res) => {
    await MatchController.analyzeMatch(req, res);
});

matchRouter.get('/match-data/generate/:id',
    async (req, res) => {
        await MatchController.excelGenerate(req, res);
    });


matchRouter.get('/match-data/all/generate',
    async (req, res) => {
        await MatchController.excelGenerateAll(req, res);
    });



export { matchRouter };
