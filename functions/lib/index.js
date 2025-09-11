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
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleInstallmentsDaily = void 0;
exports.computeMinimumPaymentForBank = computeMinimumPaymentForBank;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const date_fns_1 = require("date-fns");
admin.initializeApp();
const db = admin.firestore();
// Helpers
const fmt = (d) => (0, date_fns_1.format)(d, 'yyyy-MM-dd');
// Expected schema:
// users/{uid}/cards/{cardId} with fields: statementDate (string dd or yyyy-mm-dd), currentDebt (number), creditLimit (number), bankName (string), status (string), cardColor (string|null), installmentPlans: [{ id, description, total, monthlyAmount, remaining, posted, nextDate (yyyy-mm-dd|null), startDate }]
// users/{uid}/cards/{cardId}/entries collection with card entries
async function postOneInstallment(uid, cardId, card, p) {
    const planId = p.id;
    const amount = Number(p.monthlyAmount) || 0;
    if (!amount)
        return;
    const entryDate = p.nextDate || fmt(new Date());
    const desc = `${p.description || 'Taksit'} (Taksit ${(p.posted || 0) + 1}/${(p.posted || 0) + (p.remaining || 0)})`;
    // Add entry
    await db.collection('users').doc(uid).collection('cards').doc(cardId).collection('entries').add({
        cardId,
        type: 'harcama',
        amount,
        description: desc,
        date: entryDate,
        planId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // Update card debt and minimum payment
    const nextDebt = Math.max(0, Number(card.currentDebt || 0) + amount);
    const minPayment = computeMinimumPaymentForBank(card.bankName, Number(card.creditLimit) || 0, nextDebt);
    // Advance plan
    const remain = Math.max(0, Number(p.remaining || 0) - 1);
    const posted = Number(p.posted || 0) + 1;
    const nextDate = remain > 0 && p.nextDate ? fmt((0, date_fns_1.addMonths)(new Date(p.nextDate), 1)) : null;
    const newPlans = (card.installmentPlans || []).map((x) => x.id === planId ? { ...x, remaining: remain, posted, nextDate } : x);
    await db.collection('users').doc(uid).collection('cards').doc(cardId).update({
        currentDebt: nextDebt,
        minimumPayment: minPayment,
        installmentPlans: newPlans,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}
// Server-side mirror of client bank rules to keep minimum payments consistent
function computeMinimumPaymentForBank(bankName, creditLimit, currentDebt) {
    if (!currentDebt || currentDebt <= 0)
        return 0;
    // BDDK taban oranları (limit esaslı)
    const LIMIT_T1_MAX = 15000;
    const LIMIT_T2_MAX = 20000;
    const RATE_T1 = 0.30;
    const RATE_T2 = 0.35;
    const RATE_T3 = 0.40;
    const DEFAULT_MIN_AMOUNT = 100;
    function floorRateByLimit(limit) {
        const lim = Number(limit || 0);
        if (lim <= 0)
            return RATE_T1;
        if (lim <= LIMIT_T1_MAX)
            return RATE_T1;
        if (lim <= LIMIT_T2_MAX)
            return RATE_T2;
        return RATE_T3;
    }
    const floorRate = floorRateByLimit(creditLimit);
    // Minimal inline map for bank-specific minima or higher defaults
    const BANK_MIN = {
        "İş Bankası": 120,
        "Garanti BBVA": 120,
        "Yapı Kredi": 120,
        "Akbank": 100,
    };
    const BANK_DEFAULT_RATE = {
    // If a bank applies a higher default than the floor, reflect it
    };
    let rate = Math.max(floorRate, BANK_DEFAULT_RATE[bankName] || floorRate);
    const minAmount = BANK_MIN[bankName] || DEFAULT_MIN_AMOUNT;
    const amount = Math.round(currentDebt * rate);
    return Math.max(minAmount, amount);
}
exports.scheduleInstallmentsDaily = functions
    .region('europe-west1')
    .pubsub.schedule('0 3 * * *') // Every day at 03:00 Europe/West
    .timeZone('Europe/Istanbul')
    .onRun(async () => {
    const today = fmt(new Date());
    // Iterate users
    const usersSnap = await db.collection('users').get();
    for (const userDoc of usersSnap.docs) {
        const uid = userDoc.id;
        // For each card
        const cardsSnap = await db.collection('users').doc(uid).collection('cards').get();
        for (const cDoc of cardsSnap.docs) {
            const card = cDoc.data();
            const cardId = cDoc.id;
            const plans = Array.isArray(card.installmentPlans) ? card.installmentPlans : [];
            for (const p of plans) {
                if (p && p.remaining > 0 && p.nextDate && p.nextDate <= today) {
                    await postOneInstallment(uid, cardId, card, p);
                }
            }
        }
    }
    return null;
});
