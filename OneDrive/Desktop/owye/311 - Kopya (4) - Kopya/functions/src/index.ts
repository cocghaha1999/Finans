import * as admin from 'firebase-admin'
import * as functions from 'firebase-functions'
import { addMonths, format } from 'date-fns'

admin.initializeApp()
const db = admin.firestore()

// Helpers
const fmt = (d: Date) => format(d, 'yyyy-MM-dd')

// Expected schema:
// users/{uid}/cards/{cardId} with fields: statementDate (string dd or yyyy-mm-dd), currentDebt (number), creditLimit (number), bankName (string), status (string), cardColor (string|null), installmentPlans: [{ id, description, total, monthlyAmount, remaining, posted, nextDate (yyyy-mm-dd|null), startDate }]
// users/{uid}/cards/{cardId}/entries collection with card entries

async function postOneInstallment(uid: string, cardId: string, card: FirebaseFirestore.DocumentData, p: any) {
  const planId = p.id
  const amount = Number(p.monthlyAmount) || 0
  if (!amount) return
  const entryDate = p.nextDate || fmt(new Date())
  const desc = `${p.description || 'Taksit'} (Taksit ${(p.posted || 0) + 1}/${(p.posted || 0) + (p.remaining || 0)})`

  // Add entry
  await db.collection('users').doc(uid).collection('cards').doc(cardId).collection('entries').add({
    cardId,
    type: 'harcama',
    amount,
    description: desc,
    date: entryDate,
    planId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  })

  // Update card debt and minimum payment
  const nextDebt = Math.max(0, Number(card.currentDebt || 0) + amount)
  const minPayment = computeMinimumPaymentForBank(card.bankName as string, Number(card.creditLimit) || 0, nextDebt)

  // Advance plan
  const remain = Math.max(0, Number(p.remaining || 0) - 1)
  const posted = Number(p.posted || 0) + 1
  const nextDate = remain > 0 && p.nextDate ? fmt(addMonths(new Date(p.nextDate), 1)) : null

  const newPlans = (card.installmentPlans || []).map((x: any) => x.id === planId ? { ...x, remaining: remain, posted, nextDate } : x)

  await db.collection('users').doc(uid).collection('cards').doc(cardId).update({
    currentDebt: nextDebt,
    minimumPayment: minPayment,
    installmentPlans: newPlans,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  })
}

// Compute min payment similar to client logic; adjust per your bank rules
export function computeMinimumPaymentForBank(bankName: string, creditLimit: number, currentDebt: number) {
  // Example rule: min 20% of currentDebt, at least 0
  const pct = 0.2
  const val = Math.max(0, Math.round(currentDebt * pct))
  return val
}

export const scheduleInstallmentsDaily = functions
  .region('europe-west1')
  .pubsub.schedule('0 3 * * *') // Every day at 03:00 Europe/West
  .timeZone('Europe/Istanbul')
  .onRun(async () => {
    const today = fmt(new Date())

    // Iterate users
    const usersSnap = await db.collection('users').get()

    for (const userDoc of usersSnap.docs) {
      const uid = userDoc.id
      // For each card
      const cardsSnap = await db.collection('users').doc(uid).collection('cards').get()
      for (const cDoc of cardsSnap.docs) {
        const card = cDoc.data()
        const cardId = cDoc.id
        const plans: any[] = Array.isArray(card.installmentPlans) ? card.installmentPlans : []
        for (const p of plans) {
          if (p && p.remaining > 0 && p.nextDate && p.nextDate <= today) {
            await postOneInstallment(uid, cardId, card, p)
          }
        }
      }
    }

    return null
  })
