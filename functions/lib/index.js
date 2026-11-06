import { createHash } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { TrailValidationError, validateTrail } from './trailValidation.js';
initializeApp();
export const submitTrail = onCall({ region: 'asia-northeast1', maxInstances: 10, timeoutSeconds: 30 }, async (request) => {
    if (!request.auth)
        throw new HttpsError('unauthenticated', 'ログインが必要です。');
    const data = request.data;
    if (!data || typeof data !== 'object' || Array.isArray(data))
        throw new HttpsError('invalid-argument', '送信データが不正です。');
    const { id, trail } = data;
    if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(id))
        throw new HttpsError('invalid-argument', '作品IDが不正です。');
    const uid = request.auth.uid;
    const reference = getFirestore().doc(`drawings/${id}`);
    await getFirestore().runTransaction(async (transaction) => {
        const snapshot = await transaction.get(reference);
        if (!snapshot.exists)
            throw new HttpsError('not-found', '作品が見つかりません。');
        const drawing = snapshot.data();
        if (drawing.uid !== uid)
            throw new HttpsError('permission-denied', 'この作品には保存できません。');
        if (!(drawing.serverCreatedAt instanceof Timestamp))
            throw new HttpsError('failed-precondition', 'この作品は新しい検証形式に対応していません。ホームからゲームを開始し直してください。');
        let validated;
        try {
            validated = validateTrail(trail, drawing.serverCreatedAt.toMillis(), Date.now());
        }
        catch (error) {
            if (error instanceof TrailValidationError)
                throw new HttpsError('invalid-argument', error.message);
            throw error;
        }
        const trailHash = createHash('sha256').update(JSON.stringify(validated)).digest('hex');
        if (drawing.trailValidatedAt) {
            if (drawing.trailHash === trailHash)
                return;
            throw new HttpsError('failed-precondition', '保存済みの軌跡は変更できません。');
        }
        transaction.update(reference, {
            trail: validated,
            trailHash,
            trailValidationVersion: 1,
            trailValidatedAt: Timestamp.now(),
        });
    });
    return { saved: true };
});
