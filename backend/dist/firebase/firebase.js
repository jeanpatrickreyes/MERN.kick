"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auth = exports.db = void 0;
// Local database replacement for Firebase
const db_1 = require("../database/db");
Object.defineProperty(exports, "db", { enumerable: true, get: function () { return db_1.db; } });
// Auth service (replacement for Firebase Auth)
exports.auth = {
// This is a placeholder - authentication is now handled via bcrypt in controllers
// Keeping this export for backward compatibility
};
