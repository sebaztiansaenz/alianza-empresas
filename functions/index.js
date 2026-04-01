const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

/**
 * Callable function: processApprovedExceptions
 * - Input: { empresaId: string, updateAhorros?: boolean }
 * - Auth: requires caller to have a Firestore `user` doc with `userType: 'Admin'`.
 * - Behavior: finds APPROVED Depositado transactions for the empresa, for each transaction
 *   that hasn't been processed (checked in `processedPayments`) creates new
 *   `NovedadesAhorros` documents with estado 'Activo' referencing the original novedad
 *   (originNovedadId). Marks transaction as processed in `processedPayments`.
 */

exports.processApprovedExceptions = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'La llamada requiere autenticación.');
  }

  const uid = context.auth.uid;
  const userRef = db.collection('user').doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists || userSnap.data().userType !== 'Admin') {
    throw new functions.https.HttpsError('permission-denied', 'Acceso denegado: solo administradores.');
  }

  const { empresaId, updateAhorros = false } = data || {};
  if (!empresaId) {
    throw new functions.https.HttpsError('invalid-argument', 'Falta empresaId.');
  }

  try {
    const txSnap = await db.collection('transactions')
      .where('empresaId', '==', empresaId)
      .where('transactionType', '==', 'Depositado')
      .where('status', '==', 'APPROVED')
      .get();

    if (txSnap.empty) {
      return { processed: 0, message: 'No hay transacciones APPROVED para esta empresa.' };
    }

    let processedCount = 0;

    for (const txDoc of txSnap.docs) {
      const txId = txDoc.id;
      const tx = txDoc.data();

      const processedRef = db.collection('processedPayments').doc(txId);
      const processedSnap = await processedRef.get();
      if (processedSnap.exists) continue; // idempotencia

      // buscar novedades en excepcion de pago
      const novSnap = await db.collection('NovedadesAhorros')
        .where('empresaid', '==', empresaId)
        .where('estado', '==', 'Excepción de pago')
        .get();

      if (!novSnap.empty) {
        const batch = db.batch();
        novSnap.docs.forEach(nd => {
          const orig = nd.data();
          const newRef = db.collection('NovedadesAhorros').doc();
          const newDoc = {
            ...orig,
            estado: 'Activo',
            originNovedadId: nd.id,
            processedByTransaction: txId,
            processedAt: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdByFunction: true
          };
          batch.set(newRef, newDoc);
        });

        // opcional: actualizar ahorros si se solicita
        if (updateAhorros) {
          const ahorrosSnap = await db.collection('ahorros')
            .where('company', '==', db.collection('companies').doc(empresaId))
            .get().catch(() => ({ empty: true }));
          if (!ahorrosSnap.empty) {
            ahorrosSnap.docs.forEach(aDoc => {
              const aRef = aDoc.ref;
              // ejemplo no destructivo: borrar excepcionPagoMes y setear lastPaidAt
              batch.update(aRef, {
                excepcionPagoMes: admin.firestore.FieldValue.delete(),
                lastPaidAt: admin.firestore.FieldValue.serverTimestamp()
              });
            });
          }
        }

        await batch.commit();
      }

      await processedRef.set({ processedAt: admin.firestore.FieldValue.serverTimestamp(), empresaId, processedBy: uid });
      processedCount++;
    }

    return { processed: processedCount };
  } catch (err) {
    console.error('Error en processApprovedExceptions:', err);
    throw new functions.https.HttpsError('internal', 'Error procesando excepciones.');
  }
});
