"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchTeamSimilarity = void 0;
const string_similarity_1 = __importDefault(require("string-similarity"));
const matchTeamSimilarity = (fixtures, homeName, awayName) => {
    // Validate fixtures is an array
    if (!fixtures || !Array.isArray(fixtures) || fixtures.length === 0) {
        return null;
    }
    let bestMatch = null;
    let highestScore = 0;
    for (let fix of fixtures) {
        const homeScore = string_similarity_1.default.compareTwoStrings(fix.home.toLowerCase(), homeName.toLowerCase());
        const awayScore = string_similarity_1.default.compareTwoStrings(fix.away.toLowerCase(), awayName.toLowerCase());
        const avgScore = (homeScore + awayScore) / 2;
        if (avgScore > 0.55 && avgScore > highestScore) {
            highestScore = avgScore;
            bestMatch = fix;
        }
    }
    if (!bestMatch) {
        for (let fix of fixtures) {
            const homeScore = string_similarity_1.default.compareTwoStrings(fix.home.toLowerCase(), homeName.toLowerCase());
            const awayScore = string_similarity_1.default.compareTwoStrings(fix.away.toLowerCase(), awayName.toLowerCase());
            const avgScore = (homeScore + awayScore) / 2;
            if (avgScore > 0.40 && avgScore > highestScore) {
                highestScore = avgScore;
                bestMatch = fix;
            }
        }
    }
    if (!bestMatch) {
        for (let fix of fixtures) {
            const homeScore = string_similarity_1.default.compareTwoStrings(fix.home.toLowerCase(), homeName.toLowerCase());
            const awayScore = string_similarity_1.default.compareTwoStrings(fix.away.toLowerCase(), awayName.toLowerCase());
            const avgScore = (homeScore + awayScore) / 2;
            if (avgScore > 0.30 && avgScore > highestScore) {
                highestScore = avgScore;
                bestMatch = fix;
            }
        }
    }
    if (!bestMatch) {
        for (let fix of fixtures) {
            const homeScore = string_similarity_1.default.compareTwoStrings(fix.home.toLowerCase(), homeName.toLowerCase());
            const awayScore = string_similarity_1.default.compareTwoStrings(fix.away.toLowerCase(), awayName.toLowerCase());
            const avgScore = (homeScore + awayScore) / 2;
            if (avgScore > 0.15 && avgScore > highestScore) {
                highestScore = avgScore;
                bestMatch = fix;
            }
        }
    }
    return bestMatch || null;
};
exports.matchTeamSimilarity = matchTeamSimilarity;
