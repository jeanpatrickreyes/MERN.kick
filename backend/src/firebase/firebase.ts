// Local database replacement for Firebase
import { db } from "../database/db";

// Export db for backward compatibility
export { db };

// Auth service (replacement for Firebase Auth)
export const auth = {
    // This is a placeholder - authentication is now handled via bcrypt in controllers
    // Keeping this export for backward compatibility
};
