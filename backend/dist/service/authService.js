"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
class AuthService {
    /**
     * Create a user with email and password
     * Returns a user object similar to Firebase Auth
     */
    static async createUserWithEmailAndPassword(email, password) {
        // Generate a unique ID for the user
        const { v4: uuidv4 } = await Promise.resolve().then(() => __importStar(require('uuid')));
        const uid = uuidv4();
        return {
            user: {
                uid,
                email
            }
        };
    }
    /**
     * Sign in with email and password
     * This is now handled in the controller with bcrypt verification
     */
    static async signInWithEmailAndPassword(email, password, hashedPassword) {
        const passwordMatch = await bcrypt_1.default.compare(password, hashedPassword);
        if (!passwordMatch) {
            throw new Error('auth/wrong-password');
        }
        // Return a user object - the actual user ID should be passed from the controller
        return {
            user: {
                uid: '', // Will be set by controller
                email
            }
        };
    }
    /**
     * Send password reset email
     * In a local implementation, this would need to be handled differently
     * For now, we'll throw an error indicating this needs to be implemented
     */
    static async sendPasswordResetEmail(email) {
        // In a local implementation, you would:
        // 1. Generate a reset token
        // 2. Store it in the database with expiration
        // 3. Send email via a local email service (not Google)
        // For now, throw an error to indicate this needs implementation
        throw new Error('Password reset email functionality needs to be implemented with a local email service');
    }
}
exports.AuthService = AuthService;
