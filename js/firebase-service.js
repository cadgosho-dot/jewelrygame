import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app-check.js';
import {
  initializeAuth,
  GoogleAuthProvider,
  EmailAuthProvider,
  onAuthStateChanged,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  browserPopupRedirectResolver,
  signInWithCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  reauthenticateWithPopup,
  reauthenticateWithCredential,
  deleteUser,
  reload,
  signOut,
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import {
  getFirestore,
  collection,
  query,
  where,
  limit,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';
import { securityConfig } from './security-config.js';
import { SAVE_KEY, chooseNewestSavedState } from './game-data-core.js';
import { readIndexedDbSave, writeIndexedDbSave } from './local-save-storage.js?v=0.10.867';

const previewMode = ['localhost', '127.0.0.1'].includes(location.hostname)
  && new URLSearchParams(location.search).get('preview') === '1';

let auth = null;
let db = null;
let unsubscribeSession = null;
let appCheckConfigured = false;
let firebaseInitialized = false;

const GOOGLE_CREDENTIAL_HANDOFF_KEY = 'jxj-google-credential-handoff-v1';
const GOOGLE_CREDENTIAL_MAX_AGE_MS = 5 * 60 * 1000;

function effectiveFirebaseConfig() {
  const sameFirebaseHosting = location.hostname === firebaseConfig.authDomain
    || location.hostname === `${firebaseConfig.projectId}.web.app`
    || location.hostname === `${firebaseConfig.projectId}.firebaseapp.com`;
  return sameFirebaseHosting ? { ...firebaseConfig, authDomain: location.hostname } : firebaseConfig;
}

function safeSessionStorage() {
  try { return window.sessionStorage; } catch (_) { return null; }
}

async function consumeGoogleCredentialHandoff() {
  const storage = safeSessionStorage();
  if (!storage || auth?.currentUser) return false;
  let payload = null;
  try {
    payload = JSON.parse(storage.getItem(GOOGLE_CREDENTIAL_HANDOFF_KEY) || 'null');
  } catch (_) {
    storage.removeItem(GOOGLE_CREDENTIAL_HANDOFF_KEY);
    return false;
  }
  if (!payload?.idToken && !payload?.accessToken) return false;
  const createdAt = Number(payload.createdAt) || 0;
  const expiresAt = Number(payload.expiresAt) || (createdAt + GOOGLE_CREDENTIAL_MAX_AGE_MS);
  if (!createdAt || Date.now() > expiresAt) {
    storage.removeItem(GOOGLE_CREDENTIAL_HANDOFF_KEY);
    return false;
  }
  try {
    const credential = GoogleAuthProvider.credential(payload.idToken || null, payload.accessToken || null);
    await signInWithCredential(auth, credential);
    storage.removeItem(GOOGLE_CREDENTIAL_HANDOFF_KEY);
    return true;
  } catch (error) {
    storage.removeItem(GOOGLE_CREDENTIAL_HANDOFF_KEY);
    logAuthError('google-credential-handoff', error);
    return false;
  }
}

function authErrorDiagnostics(stage, error) {
  const customData = error?.customData || {};
  const serverMessage = customData?._tokenResponse?.error?.message
    || customData?._serverResponse?.error?.message
    || '';
  return {
    stage,
    code: error?.code || '',
    name: error?.name || '',
    message: error?.message || '',
    serverMessage,
    hostname: location.hostname,
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
    appCheckConfigured,
    firebaseInitialized,
  };
}

function logAuthError(stage, error) {
  console.error(`[Firebase Auth] ${stage}`, authErrorDiagnostics(stage, error));
}

function validAppCheckConfig() {
  const config = securityConfig?.appCheck || {};
  return config.enabled === true
    && config.provider === 'recaptcha-enterprise'
    && typeof config.siteKey === 'string'
    && config.siteKey.length > 20
    && !config.siteKey.includes('REPLACE_WITH_');
}

export async function initializeFirebase() {
  if (previewMode) return { previewMode: true, configured: true, appCheckConfigured: false };
  const app = initializeApp(effectiveFirebaseConfig());

  // App Check はFirebaseサービスへ接続する前に初期化する。
  if (validAppCheckConfig()) {
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(securityConfig.appCheck.siteKey),
      isTokenAutoRefreshEnabled: true,
    });
    appCheckConfigured = true;
  } else if (securityConfig?.appCheck?.enabled) {
    throw new Error('App Checkの設定が不完全です。SECURITY_SETUP.mdを確認してください。');
  }

  auth = initializeAuth(app, {
    // v0.10.707: restore the original persistence order so existing users are
    // read from IndexedDB and can continue from their saved game without logging in again.
    persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence],
    // v0.10.666: the main game signs Google users in via credential handoff, not popup/redirect.
    // Do not initialize the popup/redirect resolver during every launch; it creates the auth iframe.
    popupRedirectResolver: undefined,
  });
  auth.languageCode = 'ja';
  // 初回の認証状態が確定してから、専用ログインページがsessionStorageへ渡した
  // Google資格情報を必要な場合だけ再交換する。永続化反映が遅いブラウザでもログインを引き継げる。
  await auth.authStateReady();
  if (!auth.currentUser) await consumeGoogleCredentialHandoff();
  db = getFirestore(app);
  firebaseInitialized = true;
  return { previewMode: false, configured: true, appCheckConfigured };
}

export function observeAuth(callback) {
  if (previewMode) {
    queueMicrotask(() => callback({ uid: 'preview-user', displayName: 'Preview', email: 'preview@local', emailVerified: true, providerData: [] }));
    return () => {};
  }
  if (!auth) throw new Error('Firebaseの初期化が完了していません。');
  return onAuthStateChanged(auth, callback);
}

export async function emailLogin(email, password) {
  if (previewMode) return null;
  try {
    return (await signInWithEmailAndPassword(auth, email, password)).user;
  } catch (error) {
    logAuthError('email-login', error);
    throw error;
  }
}

export async function emailSignup(email, password) {
  if (previewMode) return { user: null, verificationSent: true, verificationError: null };
  let result;
  try {
    result = await createUserWithEmailAndPassword(auth, email, password);
  } catch (error) {
    logAuthError('email-signup-create-account', error);
    throw error;
  }

  // アカウント作成後の確認メール送信は別工程として扱う。
  // 送信だけ失敗した場合に、作成済みアカウントまで「登録失敗」と誤表示しない。
  try {
    await sendEmailVerification(result.user);
    return { user: result.user, verificationSent: true, verificationError: null };
  } catch (error) {
    logAuthError('email-signup-send-verification', error);
    return { user: result.user, verificationSent: false, verificationError: error };
  }
}

export function needsEmailVerification(user = auth?.currentUser) {
  if (!user || previewMode) return false;
  const usesPassword = user.providerData?.some((provider) => provider.providerId === 'password');
  return Boolean(usesPassword && !user.emailVerified);
}

export async function resendVerificationEmail() {
  if (previewMode) return;
  if (!auth?.currentUser) throw new Error('ログインしていません。');
  try {
    await sendEmailVerification(auth.currentUser);
  } catch (error) {
    logAuthError('resend-verification-email', error);
    throw error;
  }
}

export async function refreshAuthUser() {
  if (previewMode) return auth?.currentUser || null;
  if (!auth?.currentUser) return null;
  await reload(auth.currentUser);
  return auth.currentUser;
}

export async function requestPasswordReset(email) {
  if (previewMode) return;
  await sendPasswordResetEmail(auth, email);
}

export function currentProviderKind(user = auth?.currentUser) {
  const providers = user?.providerData?.map((provider) => provider.providerId) || [];
  if (providers.includes('google.com')) return 'google';
  if (providers.includes('password')) return 'password';
  return 'unknown';
}

export async function logout() {
  if (previewMode) {
    location.href = location.pathname;
    return;
  }
  await signOut(auth);
}

// v0.10.722: 現在セーブは常にサブコレクションへ分割保存する。
// users/{uid} 直下は旧セーブ互換の読み取り専用とし、1文書上限の影響を完全に避ける。
const CLOUD_INLINE_SAFE_BYTES = 0;
const CLOUD_CHUNK_RAW_BYTES = 384 * 1024;
const CLOUD_CHUNK_MAX_COUNT = 64;
// 強制終了などで参照されないまま残った世代だけを、十分な猶予後に少量ずつ掃除する。
const ORPHAN_CHUNK_MIN_AGE_MS = 24 * 60 * 60 * 1000;
const ORPHAN_CHUNK_CLEANUP_LIMIT = 256;
const cloudStorageMetaByUid = new Map();
const orphanCleanupAttemptedUids = new Set();

function cloudSaveError(code, message, detail = null) {
  const error = new Error(message);
  error.code = code;
  if (detail) error.detail = detail;
  return error;
}

function normalizeCloudCode(error) {
  return String(error?.code || '').replace(/^firestore\//, '');
}

function isCloudDocumentSizeError(error) {
  const code = normalizeCloudCode(error);
  const message = String(error?.message || '');
  return code === 'invalid-argument'
    && /cannot be written because its size|exceeds the maximum allowed size|maximum allowed size/i.test(message);
}

function cloudUtf8Bytes(text) {
  return new TextEncoder().encode(String(text || ''));
}

function bytesToBase64(bytes) {
  let binary = '';
  const step = 0x8000;
  for (let index = 0; index < bytes.length; index += step) {
    binary += String.fromCharCode(...bytes.subarray(index, Math.min(index + step, bytes.length)));
  }
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(String(value || ''));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function encodeCloudChunks(raw) {
  const bytes = cloudUtf8Bytes(raw);
  const count = Math.ceil(bytes.length / CLOUD_CHUNK_RAW_BYTES);
  if (count > CLOUD_CHUNK_MAX_COUNT) {
    throw cloudSaveError(
      'jxj/cloud-save-too-large',
      'セーブデータがクラウド保存の上限を超えています。端末には保存済みです。',
      { bytes: bytes.length, chunks: count },
    );
  }
  const chunks = [];
  for (let index = 0; index < count; index += 1) {
    const start = index * CLOUD_CHUNK_RAW_BYTES;
    const end = Math.min(start + CLOUD_CHUNK_RAW_BYTES, bytes.length);
    chunks.push(bytesToBase64(bytes.subarray(start, end)));
  }
  return { bytes: bytes.length, chunks };
}

function decodeCloudChunks(encodedChunks) {
  const parts = encodedChunks.map((chunk) => base64ToBytes(chunk));
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const joined = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    joined.set(part, offset);
    offset += part.length;
  }
  return new TextDecoder().decode(joined);
}

function cloudChunkDocId(generation, index) {
  return `${generation}-${String(index).padStart(3, '0')}`;
}

async function mergeUserRoot(uid, payload) {
  const userRef = doc(db, 'users', uid);
  try {
    await updateDoc(userRef, payload);
  } catch (error) {
    if (normalizeCloudCode(error) !== 'not-found') throw error;
    await setDoc(userRef, payload, { merge: true });
  }
}

async function cleanupChunkGeneration(uid, metadata) {
  if (!metadata || metadata.mode !== 'chunked') return;
  const generation = String(metadata.generation || '');
  const count = Math.max(0, Math.floor(Number(metadata.count) || 0));
  if (!generation || !count) return;
  await Promise.allSettled(Array.from({ length: count }, (_, index) => (
    deleteDoc(doc(db, 'users', uid, 'saveChunks', cloudChunkDocId(generation, index)))
  )));
}

async function cleanupOldOrphanChunks(uid) {
  if (previewMode || !uid || orphanCleanupAttemptedUids.has(uid)) return;
  // 保存成功の主経路を遅くしないため、同じページセッションでは1回だけ試す。
  orphanCleanupAttemptedUids.add(uid);
  try {
    const currentMetadata = await readCurrentCloudMetadata(uid);
    const firstProtectedGeneration = currentMetadata?.mode === 'chunked'
      ? String(currentMetadata.generation || '')
      : '';
    if (!firstProtectedGeneration) return;

    const cutoff = new Date(Date.now() - ORPHAN_CHUNK_MIN_AGE_MS);
    const oldChunks = await getDocs(query(
      collection(db, 'users', uid, 'saveChunks'),
      where('updatedAt', '<', cutoff),
      limit(ORPHAN_CHUNK_CLEANUP_LIMIT),
    ));
    if (oldChunks.empty) return;

    // 問い合わせ中に別タブが保存しても、問い合わせ前後の現行世代を両方保護する。
    const latestMetadata = await readCurrentCloudMetadata(uid);
    const latestProtectedGeneration = latestMetadata?.mode === 'chunked'
      ? String(latestMetadata.generation || '')
      : '';
    const protectedGenerations = new Set(
      [firstProtectedGeneration, latestProtectedGeneration].filter(Boolean),
    );
    const deletions = oldChunks.docs
      .filter((snapshot) => {
        const generation = String(snapshot.data()?.generation || '');
        return generation && !protectedGenerations.has(generation);
      })
      .map((snapshot) => deleteDoc(snapshot.ref));
    if (deletions.length) await Promise.allSettled(deletions);
  } catch (error) {
    // 掃除は容量最適化だけ。失敗してもゲーム保存・起動・プレゼントの成功判定へ影響させない。
    console.warn('古い未参照クラウドチャンクの掃除を見送りました。ゲーム保存は継続します。', error);
  }
}

function shouldRetryCloudSave(error, attempt) {
  if (attempt >= 2) return false;
  const code = normalizeCloudCode(error);
  return [
    'aborted',
    'cancelled',
    'deadline-exceeded',
    'internal',
    'network-request-failed',
    'permission-denied',
    'resource-exhausted',
    'unauthenticated',
    'unavailable',
    'unknown',
  ].includes(code);
}

async function refreshCloudAuthIfUseful(error) {
  const code = normalizeCloudCode(error);
  if (!['permission-denied', 'unauthenticated'].includes(code)) return;
  try {
    await auth?.currentUser?.getIdToken?.(true);
  } catch (_) {}
}

async function runCloudSaveWithRetry(operation) {
  let lastError = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!shouldRetryCloudSave(error, attempt)) throw error;
      if (attempt === 0) await refreshCloudAuthIfUseful(error);
      await new Promise((resolve) => setTimeout(resolve, 350 * (2 ** attempt)));
    }
  }
  throw lastError;
}

async function readChunkedGameState(uid, metadata) {
  const generation = String(metadata?.generation || '');
  const count = Math.max(0, Math.floor(Number(metadata?.count) || 0));
  if (!generation || !count || count > CLOUD_CHUNK_MAX_COUNT) {
    throw cloudSaveError('jxj/cloud-save-invalid-metadata', 'クラウドセーブの管理情報を確認できません。');
  }
  const snapshots = await Promise.all(Array.from({ length: count }, (_, index) => (
    getDoc(doc(db, 'users', uid, 'saveChunks', cloudChunkDocId(generation, index)))
  )));
  const encodedChunks = snapshots.map((snapshot, index) => {
    if (!snapshot.exists()) {
      throw cloudSaveError(
        'jxj/cloud-save-chunk-missing',
        'クラウドセーブの一部を読み込めませんでした。端末保存がある場合はそちらを優先します。',
        { generation, index },
      );
    }
    return String(snapshot.data()?.data || '');
  });
  try {
    return JSON.parse(decodeCloudChunks(encodedChunks));
  } catch (error) {
    throw cloudSaveError(
      'jxj/cloud-save-decode-failed',
      'クラウドセーブを復元できませんでした。端末保存がある場合はそちらを優先します。',
      { cause: String(error?.message || error) },
    );
  }
}

function cloudSaveMetaRef(uid) {
  return doc(db, 'users', uid, 'saveMeta', 'current');
}

async function readCurrentCloudMetadata(uid) {
  const metaSnapshot = await getDoc(cloudSaveMetaRef(uid));
  return metaSnapshot.exists() ? (metaSnapshot.data() || null) : null;
}

export async function getCloudSaveDiagnostics(uid) {
  const base = {
    chunkRawBytes: CLOUD_CHUNK_RAW_BYTES,
    maxCount: CLOUD_CHUNK_MAX_COUNT,
  };

  if (previewMode) {
    const raw = uid ? String(localStorage.getItem(`jewelrygame-preview-${uid}`) || '') : '';
    const bytes = raw ? cloudUtf8Bytes(raw).length : 0;
    return {
      ...base,
      mode: 'preview',
      source: 'preview',
      bytes,
      count: bytes ? Math.ceil(bytes / CLOUD_CHUNK_RAW_BYTES) : 0,
      saveRevision: 0,
      updatedAt: '',
    };
  }

  if (!uid) {
    return { ...base, mode: 'none', source: 'none', bytes: 0, count: 0, saveRevision: 0, updatedAt: '' };
  }

  let metadata = null;
  let source = 'cloud';
  try {
    metadata = await readCurrentCloudMetadata(uid);
    if (metadata) cloudStorageMetaByUid.set(uid, metadata);
  } catch (error) {
    metadata = cloudStorageMetaByUid.get(uid) || null;
    if (!metadata) throw error;
    source = 'cache';
  }

  if (!metadata) {
    return { ...base, mode: 'none', source, bytes: 0, count: 0, saveRevision: 0, updatedAt: '' };
  }

  return {
    ...base,
    mode: String(metadata.mode || 'unknown'),
    source,
    bytes: Math.max(0, Math.floor(Number(metadata.bytes) || 0)),
    count: Math.max(0, Math.floor(Number(metadata.count) || 0)),
    saveRevision: Math.max(0, Math.floor(Number(metadata.saveRevision) || 0)),
    updatedAt: String(metadata.updatedAt || ''),
  };
}

export async function loadState(uid) {
  if (previewMode) {
    const saved = localStorage.getItem(`jewelrygame-preview-${uid}`);
    return saved ? JSON.parse(saved) : null;
  }

  // v0.10.722: 新方式の小さなメタ文書を最優先で確認する。
  // users/{uid} 直下が旧gameStateで上限ぎりぎりでも、読み込み・保存を継続できる。
  const currentMetadata = await readCurrentCloudMetadata(uid);
  if (currentMetadata?.mode === 'chunked') {
    const loaded = await readChunkedGameState(uid, currentMetadata);
    cloudStorageMetaByUid.set(uid, currentMetadata);
    return loaded;
  }

  // 旧方式との互換読み込み。新方式で一度保存されるまでは従来データを利用する。
  const snapshot = await getDoc(doc(db, 'users', uid));
  if (!snapshot.exists()) {
    cloudStorageMetaByUid.delete(uid);
    return null;
  }
  const data = snapshot.data() || {};
  const legacyMetadata = data.gameStateStorage || null;
  if (legacyMetadata?.mode === 'chunked') {
    const loaded = await readChunkedGameState(uid, legacyMetadata);
    cloudStorageMetaByUid.set(uid, legacyMetadata);
    return loaded;
  }
  cloudStorageMetaByUid.set(uid, legacyMetadata || { mode: 'inline-legacy' });
  return data.gameState || null;
}

export async function saveState(uid, state) {
  // v0.10.774: チャンク本体を先に別世代へ書き、最後のメタ切替だけを
  // compare-and-swap付きトランザクションで確定する。別端末の新しい保存を
  // 古い端末が後から上書きすることを防ぐ。
  const clean = { ...state, updatedAt: new Date().toISOString() };
  if (previewMode) {
    localStorage.setItem(`jewelrygame-preview-${uid}`, JSON.stringify(clean));
    return;
  }

  const raw = JSON.stringify(clean);
  const encoded = encodeCloudChunks(raw);
  const previousMetadata = await readCurrentCloudMetadata(uid).catch(() => cloudStorageMetaByUid.get(uid) || null);
  const generation = `${Math.max(0, Math.floor(Number(clean.saveRevision) || 0))}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const metadata = {
    mode: 'chunked',
    version: 2,
    encoding: 'base64-utf8-v1',
    generation,
    count: encoded.chunks.length,
    bytes: encoded.bytes,
    saveRevision: Math.max(0, Math.floor(Number(clean.saveRevision) || 0)),
    updatedAt: clean.updatedAt,
  };
  const metadataIdentityMatches = (left, right) => Boolean(
    left?.mode === 'chunked'
      && right?.mode === 'chunked'
      && String(left.generation || '') === String(right.generation || '')
      && Math.max(0, Math.floor(Number(left.saveRevision) || 0)) === Math.max(0, Math.floor(Number(right.saveRevision) || 0)),
  );

  const writtenChunkRefs = [];
  try {
    await runCloudSaveWithRetry(async () => {
      for (let index = 0; index < encoded.chunks.length; index += 1) {
        const chunkRef = doc(db, 'users', uid, 'saveChunks', cloudChunkDocId(generation, index));
        await setDoc(chunkRef, {
          generation,
          index,
          count: encoded.chunks.length,
          data: encoded.chunks[index],
          updatedAt: serverTimestamp(),
        });
        writtenChunkRefs[index] = chunkRef;
      }
    });
  } catch (error) {
    await Promise.allSettled(writtenChunkRefs.filter(Boolean).map((ref) => deleteDoc(ref)));
    throw error;
  }

  try {
    await runCloudSaveWithRetry(async () => {
      const metaRef = cloudSaveMetaRef(uid);
      await runTransaction(db, async (transaction) => {
        const metaSnapshot = await transaction.get(metaRef);
        const currentMetadata = metaSnapshot.exists() ? (metaSnapshot.data() || null) : null;
        const expectedMatches = previousMetadata?.mode === 'chunked'
          ? metadataIdentityMatches(currentMetadata, previousMetadata)
          : !currentMetadata;
        const currentRevision = Math.max(0, Math.floor(Number(currentMetadata?.saveRevision) || 0));
        const nextRevision = Math.max(0, Math.floor(Number(metadata.saveRevision) || 0));
        const currentTimestamp = Date.parse(String(currentMetadata?.updatedAt || ''));
        const nextTimestamp = Date.parse(String(metadata.updatedAt || ''));
        const sameRevisionButOlder = nextRevision === currentRevision
          && Number.isFinite(currentTimestamp)
          && Number.isFinite(nextTimestamp)
          && nextTimestamp < currentTimestamp;

        if (!expectedMatches || nextRevision < currentRevision || sameRevisionButOlder) {
          throw cloudSaveError(
            'jxj/cloud-save-conflict',
            '別の端末で新しいゲームデータが保存されています。この端末の保存データは残っています。',
            {
              expectedGeneration: String(previousMetadata?.generation || ''),
              currentGeneration: String(currentMetadata?.generation || ''),
              currentRevision,
              nextRevision,
            },
          );
        }
        transaction.set(metaRef, metadata);
      });
    });
  } catch (error) {
    const currentMetadata = await readCurrentCloudMetadata(uid).catch(() => null);
    if (!metadataIdentityMatches(currentMetadata, metadata)) {
      await Promise.allSettled(writtenChunkRefs.filter(Boolean).map((ref) => deleteDoc(ref)));
      throw error;
    }
  }

  cloudStorageMetaByUid.set(uid, metadata);
  if (previousMetadata?.mode === 'chunked' && previousMetadata.generation !== generation) {
    void cleanupChunkGeneration(uid, previousMetadata);
  }
  void cleanupOldOrphanChunks(uid);
}

async function deleteUserSaveSubcollections(uid) {
  if (previewMode || !uid) return;
  // 親ドキュメントを消してもFirestoreのサブコレクションは自動削除されないため、
  // 現在のゲーム保存で利用する既知サブコレクションを先に明示的に掃除する。
  const chunkSnapshots = await getDocs(collection(db, 'users', uid, 'saveChunks'));
  const deletions = chunkSnapshots.docs.map((snapshot) => deleteDoc(snapshot.ref));
  deletions.push(deleteDoc(cloudSaveMetaRef(uid)));
  deletions.push(deleteDoc(sessionDocRef(uid)));
  await Promise.all(deletions);
  cloudStorageMetaByUid.delete(uid);
  orphanCleanupAttemptedUids.delete(uid);
}

export async function deleteGameData(uid) {
  if (previewMode) {
    localStorage.removeItem(`jewelrygame-preview-${uid}`);
    return;
  }
  await deleteUserSaveSubcollections(uid);
  await setDoc(doc(db, 'users', uid), {
    gameState: null,
    gameStateStorage: null,
    activeSession: null,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function deleteAccountCompletely(password = '') {
  if (previewMode) {
    localStorage.clear();
    return;
  }
  const user = auth?.currentUser;
  if (!user) throw new Error('ログインしていません。');
  const providerKind = currentProviderKind(user);

  // アカウント削除はセキュリティ上、直前の本人確認が必要。
  if (providerKind === 'google') {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await reauthenticateWithPopup(user, provider, browserPopupRedirectResolver);
  } else if (providerKind === 'password') {
    if (!password) {
      const error = new Error('ゲーム用パスワードを入力してください。');
      error.code = 'auth/missing-password';
      throw error;
    }
    const credential = EmailAuthProvider.credential(user.email || '', password);
    await reauthenticateWithCredential(user, credential);
  } else {
    const error = new Error('このログイン方法ではアカウントを削除できません。');
    error.code = 'auth/unsupported-provider';
    throw error;
  }

  // 再認証が成功した後に既知サブコレクションを先に削除し、
  // 残存セーブを作らない状態で親ドキュメントと認証アカウントを削除する。
  await deleteUserSaveSubcollections(user.uid);
  await deleteDoc(doc(db, 'users', user.uid));
  await deleteUser(user);
}

function sessionDocRef(uid) {
  return doc(db, 'users', uid, 'session', 'current');
}

export async function claimSession(uid, sessionId) {
  if (previewMode) return;
  await setDoc(sessionDocRef(uid), {
    id: sessionId,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

export function watchSession(uid, sessionId, onTakenOver) {
  if (previewMode || !db) return () => {};
  if (unsubscribeSession) unsubscribeSession();
  unsubscribeSession = onSnapshot(sessionDocRef(uid), (snapshot) => {
    if (!snapshot.exists()) return;
    const active = snapshot.data();
    // v0.10.826: 初回スナップショットも検査する。claimSession() 完了後に
    // 監視を開始するため、初回から別IDなら監視開始前に他画面へ奪取された状態。
    if (active?.id && active.id !== sessionId) onTakenOver(active);
  });
  return unsubscribeSession;
}

export async function heartbeat(uid, sessionId) {
  if (previewMode || !db) return true;
  try {
    // v0.10.826: heartbeat はセッション所有者だけが更新できるようCAS化する。
    // 旧画面がバックグラウンドから復帰しても、新しい画面のIDを上書きしない。
    return await runTransaction(db, async (transaction) => {
      const ref = sessionDocRef(uid);
      const snapshot = await transaction.get(ref);
      const active = snapshot.exists() ? snapshot.data() : null;
      if (active?.id && active.id !== sessionId) return false;
      transaction.set(ref, {
        id: sessionId,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      return true;
    });
  } catch (error) {
    console.warn('Heartbeat failed:', error);
    return null;
  }
}


const PREVIEW_GIFT_STORAGE_KEY = 'jewelrygame-preview-gifts-v1';
const GIFT_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function giftServiceError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function normalizeGiftCodeValue(value) {
  const compact = String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (compact.startsWith('JXJ') && compact.length === 11) {
    return `JXJ-${compact.slice(3, 7)}-${compact.slice(7, 11)}`;
  }
  return String(value || '').trim().toUpperCase();
}

function randomGiftCode() {
  const bytes = new Uint8Array(8);
  globalThis.crypto?.getRandomValues?.(bytes);
  const chars = Array.from(bytes, (byte, index) => {
    const fallback = Math.floor(Math.random() * GIFT_CODE_ALPHABET.length);
    return GIFT_CODE_ALPHABET[(Number(byte) || fallback + index) % GIFT_CODE_ALPHABET.length];
  }).join('');
  return `JXJ-${chars.slice(0, 4)}-${chars.slice(4, 8)}`;
}

function cleanGiftPayload(payload) {
  try { return JSON.parse(JSON.stringify(payload)); }
  catch (_) { throw giftServiceError('gift/invalid', 'プレゼント内容を確認できません。'); }
}

function prepareGiftGameState(gameState) {
  const clean = structuredClone(gameState || {});
  clean.saveRevision = Math.max(0, Math.floor(Number(clean.saveRevision) || 0)) + 1;
  clean.updatedAt = new Date().toISOString();
  return clean;
}

function readPreviewGiftStore() {
  try { return JSON.parse(localStorage.getItem(PREVIEW_GIFT_STORAGE_KEY) || '{}'); }
  catch (_) { return {}; }
}

function writePreviewGiftStore(store) {
  localStorage.setItem(PREVIEW_GIFT_STORAGE_KEY, JSON.stringify(store));
}

function requireGiftUser(uid) {
  if (!uid) throw giftServiceError('gift/not-authenticated', 'ログイン情報を確認できません。');
  if (!previewMode && auth?.currentUser?.uid !== uid) throw giftServiceError('gift/not-authenticated', 'ログイン情報が一致しません。');
}

function applyGiftMutation(gameState, mutator, payload, code) {
  if (typeof mutator !== 'function') throw giftServiceError('gift/invalid-mutation', 'プレゼント在庫処理を確認できません。');
  const draft = structuredClone(gameState || {});
  const result = mutator(draft, structuredClone(payload || {}), code);
  return prepareGiftGameState(result && typeof result === 'object' ? result : draft);
}

function giftMetadataMatches(left, right) {
  if (!left || !right) return false;
  return left.mode === 'chunked'
    && right.mode === 'chunked'
    && String(left.generation || '') === String(right.generation || '')
    && Math.max(0, Math.floor(Number(left.saveRevision) || 0)) === Math.max(0, Math.floor(Number(right.saveRevision) || 0));
}

function giftLocalSaveKey(uid) {
  return `${SAVE_KEY}-${uid}`;
}

function isGiftLocalQuotaError(error) {
  const name = String(error?.name || '');
  const code = Number(error?.code);
  const message = String(error?.message || '');
  return name === 'QuotaExceededError'
    || name === 'NS_ERROR_DOM_QUOTA_REACHED'
    || code === 22
    || code === 1014
    || /quota|storage.*full|容量|領域/i.test(message);
}

async function readGiftLocalState(uid) {
  let legacyState = null;
  try {
    const raw = localStorage.getItem(giftLocalSaveKey(uid));
    if (raw) {
      const parsed = JSON.parse(raw);
      legacyState = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    }
  } catch (_) {}

  let indexedState = null;
  try {
    indexedState = await readIndexedDbSave(uid);
  } catch (_) {}

  return chooseNewestSavedState(indexedState, legacyState).state;
}

function writeGiftLocalStateSafely(uid, nextState) {
  const key = giftLocalSaveKey(uid);
  const raw = JSON.stringify(nextState);
  try {
    localStorage.setItem(key, raw);
  } catch (error) {
    if (!isGiftLocalQuotaError(error)) return false;
    // v0.10.762と同じ考え方で、巨大な重複コピーだけを解放して最新1本を再試行する。
    try { localStorage.removeItem(`${key}-backup`); } catch (_) {}
    try { localStorage.removeItem(`${key}-pre-migration`); } catch (_) {}
    try { localStorage.removeItem(`${key}-corrupt`); } catch (_) {}
    try { localStorage.setItem(`${key}-storage-mode`, 'single-copy'); } catch (_) {}
    try { localStorage.setItem(key, raw); }
    catch (_) { return false; }
  }
  try { localStorage.setItem(`${SAVE_KEY}-settings`, JSON.stringify(nextState?.settings || {})); } catch (_) {}
  try { localStorage.setItem(`${key}-last-saved-at`, String(nextState?.updatedAt || new Date().toISOString())); } catch (_) {}
  return true;
}

async function readGiftCloudBase(uid) {
  const metadata = await readCurrentCloudMetadata(uid);
  if (metadata?.mode !== 'chunked') {
    throw giftServiceError('gift/no-save', 'プレゼント処理前のクラウドセーブを確認できません。');
  }
  // saveGame() が直前にクラウドへ送った世代を使う。旧 users/{uid}.gameState は参照しない。
  const gameState = await readChunkedGameState(uid, metadata);
  const cloudRevision = Math.max(0, Math.floor(Number(metadata.saveRevision) || 0));
  const localState = await readGiftLocalState(uid);
  const localRevision = Math.max(0, Math.floor(Number(localState?.saveRevision) || 0));
  // 端末の方が新しい場合だけ、クラウド保存失敗後の古い状態でプレゼント処理するのを防ぐ。
  // 端末容量不足で端末側だけ古い場合は、より新しいクラウドを正として継続する。
  if (localState && localRevision > cloudRevision) {
    throw giftServiceError('gift/save-conflict', '最新のゲームデータをクラウドへ保存できていません。もう一度お試しください。');
  }
  return { metadata, gameState };
}

export async function confirmGiftCloudSave(uid, expectedRevision = 0) {
  requireGiftUser(uid);
  if (previewMode) {
    const saved = localStorage.getItem(`jewelrygame-preview-${uid}`);
    if (!saved) throw giftServiceError('gift/cloud-save-unavailable', 'プレゼント発行前の保存を確認できませんでした。');
    return true;
  }

  let metadata = null;
  try {
    // キャッシュへフォールバックせずFirestoreを直接確認する。
    // これによりsaveGame()内部で通信失敗が処理済みになっていても、
    // プレゼント発行だけが古いクラウド状態で進むことを防ぐ。
    metadata = await readCurrentCloudMetadata(uid);
  } catch (error) {
    const wrapped = giftServiceError('gift/cloud-save-unavailable', 'プレゼント発行前のクラウド保存を確認できませんでした。');
    wrapped.cause = error;
    throw wrapped;
  }

  const cloudRevision = Math.max(0, Math.floor(Number(metadata?.saveRevision) || 0));
  const requiredRevision = Math.max(0, Math.floor(Number(expectedRevision) || 0));
  if (metadata?.mode !== 'chunked' || cloudRevision < requiredRevision) {
    throw giftServiceError('gift/cloud-save-unavailable', 'プレゼント発行前のクラウド保存が完了していません。');
  }
  cloudStorageMetaByUid.set(uid, metadata);
  return true;
}

async function stageGiftChunkedState(uid, nextState) {
  const encoded = encodeCloudChunks(JSON.stringify(nextState));
  const generation = `gift-${Math.max(0, Math.floor(Number(nextState.saveRevision) || 0))}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const metadata = {
    mode: 'chunked',
    version: 2,
    encoding: 'base64-utf8-v1',
    generation,
    count: encoded.chunks.length,
    bytes: encoded.bytes,
    saveRevision: Math.max(0, Math.floor(Number(nextState.saveRevision) || 0)),
    updatedAt: String(nextState.updatedAt || new Date().toISOString()),
  };
  const writtenChunkRefs = [];
  try {
    await runCloudSaveWithRetry(async () => {
      for (let index = 0; index < encoded.chunks.length; index += 1) {
        const chunkRef = doc(db, 'users', uid, 'saveChunks', cloudChunkDocId(generation, index));
        await setDoc(chunkRef, {
          generation,
          index,
          count: encoded.chunks.length,
          data: encoded.chunks[index],
          updatedAt: serverTimestamp(),
        });
        writtenChunkRefs[index] = chunkRef;
      }
    });
  } catch (error) {
    void Promise.allSettled(writtenChunkRefs.filter(Boolean).map((ref) => deleteDoc(ref)));
    throw error;
  }
  return { metadata, writtenChunkRefs };
}

function cleanupStagedGiftState(staged) {
  if (!staged?.writtenChunkRefs?.length) return;
  void Promise.allSettled(staged.writtenChunkRefs.filter(Boolean).map((ref) => deleteDoc(ref)));
}

async function commitGiftChunkedTransition(uid, expectedMetadata, nextState, transactionBody, recoverCommitted) {
  const staged = await stageGiftChunkedState(uid, nextState);
  const metaRef = cloudSaveMetaRef(uid);
  const finalizeCommitted = async (result) => {
    cloudStorageMetaByUid.set(uid, staged.metadata);
    try {
      await writeIndexedDbSave(uid, nextState);
    } catch (error) {
      console.warn('プレゼント確定後のIndexedDB端末保存に失敗しました。localStorage／クラウドの保存を維持します。', error);
    }
    writeGiftLocalStateSafely(uid, nextState);
    if (expectedMetadata?.mode === 'chunked' && expectedMetadata.generation !== staged.metadata.generation) {
      void cleanupChunkGeneration(uid, expectedMetadata);
    }
    void cleanupOldOrphanChunks(uid);
    return result;
  };
  try {
    const result = await runTransaction(db, async (transaction) => {
      const metaSnapshot = await transaction.get(metaRef);
      const currentMetadata = metaSnapshot.exists() ? (metaSnapshot.data() || null) : null;
      if (!giftMetadataMatches(currentMetadata, expectedMetadata)) {
        throw giftServiceError('gift/save-conflict', 'ゲームデータの保存状態が更新されました。もう一度お試しください。');
      }
      const value = await transactionBody(transaction);
      // 大きなセーブ本体は事前に別世代へ書き、小さな参照先だけをgift文書と原子的に切り替える。
      transaction.set(metaRef, staged.metadata);
      return value;
    });
    return await finalizeCommitted(result);
  } catch (error) {
    // 応答だけ失われ、サーバーではコミット済みのケースを保護する。
    // この固有generationが現行ならgift更新も同じトランザクションで確定済みなので、
    // 参照中チャンクを削除せず成功結果を復元する。
    const currentMetadata = await readCurrentCloudMetadata(uid).catch(() => null);
    if (giftMetadataMatches(currentMetadata, staged.metadata)) {
      return await finalizeCommitted(typeof recoverCommitted === 'function' ? recoverCommitted() : { gameState: nextState });
    }
    cleanupStagedGiftState(staged);
    throw error;
  }
}

export function normalizeGiftCode(value) {
  return normalizeGiftCodeValue(value);
}

export async function createGiftCode(uid, senderName, payload, removeFromGameState) {
  requireGiftUser(uid);
  if (!payload || typeof payload !== 'object') throw giftServiceError('gift/invalid', 'プレゼント内容を確認できません。');
  const cleanPayload = cleanGiftPayload(payload);

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = randomGiftCode();
    const createdAtIso = new Date().toISOString();
    if (previewMode) {
      const store = readPreviewGiftStore();
      if (store[code]) continue;
      const saved = localStorage.getItem(`jewelrygame-preview-${uid}`);
      const gameState = saved ? JSON.parse(saved) : null;
      if (!gameState) throw giftServiceError('gift/no-save', 'プレゼント作成前にゲームを保存してください。');
      const nextState = applyGiftMutation(gameState, removeFromGameState, cleanPayload, code);
      const gift = {
        code,
        senderUid: uid,
        senderName: String(senderName || 'プレイヤー').slice(0, 40),
        payload: structuredClone(cleanPayload),
        status: 'pending',
        createdAtIso,
        claimedBy: null,
        claimedAtIso: '',
        cancelledAtIso: '',
      };
      store[code] = gift;
      writePreviewGiftStore(store);
      localStorage.setItem(`jewelrygame-preview-${uid}`, JSON.stringify(nextState));
      return { code, gift, gameState: nextState };
    }

    const giftRef = doc(db, 'gifts', code);
    if ((await getDoc(giftRef)).exists()) continue;
    const { metadata: expectedMetadata, gameState } = await readGiftCloudBase(uid);
    const nextState = applyGiftMutation(gameState, removeFromGameState, cleanPayload, code);
    const gift = {
      code,
      senderUid: uid,
      senderName: String(senderName || 'プレイヤー').slice(0, 40),
      payload: structuredClone(cleanPayload),
      status: 'pending',
      createdAt: serverTimestamp(),
      createdAtIso,
      claimedBy: null,
      claimedAtIso: '',
      cancelledAtIso: '',
    };
    try {
      return await commitGiftChunkedTransition(uid, expectedMetadata, nextState, async (transaction) => {
        const giftSnapshot = await transaction.get(giftRef);
        if (giftSnapshot.exists()) throw giftServiceError('gift/code-collision', 'プレゼントコードが重複しました。');
        transaction.set(giftRef, gift);
        return { code, gift: { ...gift, createdAt: null }, gameState: nextState };
      }, () => ({ code, gift: { ...gift, createdAt: null }, gameState: nextState }));
    } catch (error) {
      if (error?.code === 'gift/code-collision') continue;
      throw error;
    }
  }
  throw giftServiceError('gift/code-generation-failed', 'プレゼントコードを発行できませんでした。もう一度お試しください。');
}

export async function inspectGiftCode(codeValue) {
  const code = normalizeGiftCodeValue(codeValue);
  if (!/^JXJ-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) throw giftServiceError('gift/invalid-code', 'プレゼントコードの形式を確認してください。');
  if (previewMode) {
    const gift = readPreviewGiftStore()[code];
    if (!gift) throw giftServiceError('gift/not-found', 'プレゼントコードが見つかりません。');
    return structuredClone(gift);
  }
  if (!auth?.currentUser) throw giftServiceError('gift/not-authenticated', 'ログインしてください。');
  const snapshot = await getDoc(doc(db, 'gifts', code));
  if (!snapshot.exists()) throw giftServiceError('gift/not-found', 'プレゼントコードが見つかりません。');
  return { code: snapshot.id, ...snapshot.data() };
}

export async function claimGiftCode(uid, recipientName, codeValue, addToGameState) {
  requireGiftUser(uid);
  const code = normalizeGiftCodeValue(codeValue);
  if (previewMode) {
    const store = readPreviewGiftStore();
    const gift = store[code];
    if (!gift) throw giftServiceError('gift/not-found', 'プレゼントコードが見つかりません。');
    if (gift.status === 'claimed') throw giftServiceError('gift/already-claimed', 'このプレゼントは受け取り済みです。');
    if (gift.status === 'cancelled') throw giftServiceError('gift/cancelled', 'このプレゼントは取り消されています。');
    if (gift.senderUid === uid) throw giftServiceError('gift/self-claim', '自分で発行したプレゼントは受け取れません。');
    const saved = localStorage.getItem(`jewelrygame-preview-${uid}`);
    const gameState = saved ? JSON.parse(saved) : null;
    if (!gameState) throw giftServiceError('gift/no-save', 'プレゼント受取前にゲームを保存してください。');
    const nextState = applyGiftMutation(gameState, addToGameState, gift.payload, code);
    gift.status = 'claimed';
    gift.claimedBy = uid;
    gift.recipientName = String(recipientName || 'プレイヤー').slice(0, 40);
    gift.claimedAtIso = new Date().toISOString();
    store[code] = gift;
    writePreviewGiftStore(store);
    localStorage.setItem(`jewelrygame-preview-${uid}`, JSON.stringify(nextState));
    return { gift: structuredClone(gift), gameState: nextState };
  }

  const giftRef = doc(db, 'gifts', code);
  const firstSnapshot = await getDoc(giftRef);
  if (!firstSnapshot.exists()) throw giftServiceError('gift/not-found', 'プレゼントコードが見つかりません。');
  const initialGift = { code: firstSnapshot.id, ...firstSnapshot.data() };
  if (initialGift.status === 'claimed') throw giftServiceError('gift/already-claimed', 'このプレゼントは受け取り済みです。');
  if (initialGift.status === 'cancelled') throw giftServiceError('gift/cancelled', 'このプレゼントは取り消されています。');
  if (initialGift.status !== 'pending') throw giftServiceError('gift/unavailable', 'このプレゼントは現在受け取れません。');
  if (initialGift.senderUid === uid) throw giftServiceError('gift/self-claim', '自分で発行したプレゼントは受け取れません。');

  const { metadata: expectedMetadata, gameState } = await readGiftCloudBase(uid);
  const nextState = applyGiftMutation(gameState, addToGameState, initialGift.payload, code);
  const claimedAtIso = new Date().toISOString();
  return commitGiftChunkedTransition(uid, expectedMetadata, nextState, async (transaction) => {
    const currentSnapshot = await transaction.get(giftRef);
    if (!currentSnapshot.exists()) throw giftServiceError('gift/not-found', 'プレゼントコードが見つかりません。');
    const gift = { code: currentSnapshot.id, ...currentSnapshot.data() };
    if (gift.status === 'claimed') throw giftServiceError('gift/already-claimed', 'このプレゼントは受け取り済みです。');
    if (gift.status === 'cancelled') throw giftServiceError('gift/cancelled', 'このプレゼントは取り消されています。');
    if (gift.status !== 'pending') throw giftServiceError('gift/unavailable', 'このプレゼントは現在受け取れません。');
    if (gift.senderUid === uid) throw giftServiceError('gift/self-claim', '自分で発行したプレゼントは受け取れません。');
    if (JSON.stringify(cleanGiftPayload(gift.payload)) !== JSON.stringify(cleanGiftPayload(initialGift.payload))) {
      throw giftServiceError('gift/unavailable', 'プレゼント内容が更新されました。もう一度確認してください。');
    }
    transaction.update(giftRef, {
      status: 'claimed',
      claimedBy: uid,
      recipientName: String(recipientName || 'プレイヤー').slice(0, 40),
      claimedAt: serverTimestamp(),
      claimedAtIso,
    });
    return { gift: { ...gift, status: 'claimed', claimedBy: uid, claimedAtIso }, gameState: nextState };
  }, () => ({
    gift: { ...initialGift, status: 'claimed', claimedBy: uid, recipientName: String(recipientName || 'プレイヤー').slice(0, 40), claimedAtIso },
    gameState: nextState,
  }));
}

export async function cancelGiftCode(uid, codeValue, restoreToGameState) {
  requireGiftUser(uid);
  const code = normalizeGiftCodeValue(codeValue);
  if (previewMode) {
    const store = readPreviewGiftStore();
    const gift = store[code];
    if (!gift) throw giftServiceError('gift/not-found', 'プレゼントコードが見つかりません。');
    if (gift.senderUid !== uid) throw giftServiceError('gift/not-owner', 'このプレゼントは取り消せません。');
    if (gift.status === 'claimed') throw giftServiceError('gift/already-claimed', 'このプレゼントはすでに受け取られています。');
    if (gift.status === 'cancelled') throw giftServiceError('gift/cancelled', 'このプレゼントはすでに取り消されています。');
    const saved = localStorage.getItem(`jewelrygame-preview-${uid}`);
    const gameState = saved ? JSON.parse(saved) : null;
    if (!gameState) throw giftServiceError('gift/no-save', 'ゲームデータを確認できません。');
    const nextState = applyGiftMutation(gameState, restoreToGameState, gift.payload, code);
    gift.status = 'cancelled';
    gift.cancelledAtIso = new Date().toISOString();
    store[code] = gift;
    writePreviewGiftStore(store);
    localStorage.setItem(`jewelrygame-preview-${uid}`, JSON.stringify(nextState));
    return { gift: structuredClone(gift), gameState: nextState };
  }

  const giftRef = doc(db, 'gifts', code);
  const firstSnapshot = await getDoc(giftRef);
  if (!firstSnapshot.exists()) throw giftServiceError('gift/not-found', 'プレゼントコードが見つかりません。');
  const initialGift = { code: firstSnapshot.id, ...firstSnapshot.data() };
  if (initialGift.senderUid !== uid) throw giftServiceError('gift/not-owner', 'このプレゼントは取り消せません。');
  if (initialGift.status === 'claimed') throw giftServiceError('gift/already-claimed', 'このプレゼントはすでに受け取られています。');
  if (initialGift.status === 'cancelled') throw giftServiceError('gift/cancelled', 'このプレゼントはすでに取り消されています。');
  if (initialGift.status !== 'pending') throw giftServiceError('gift/unavailable', 'このプレゼントは現在取り消せません。');

  const { metadata: expectedMetadata, gameState } = await readGiftCloudBase(uid);
  const nextState = applyGiftMutation(gameState, restoreToGameState, initialGift.payload, code);
  const cancelledAtIso = new Date().toISOString();
  return commitGiftChunkedTransition(uid, expectedMetadata, nextState, async (transaction) => {
    const currentSnapshot = await transaction.get(giftRef);
    if (!currentSnapshot.exists()) throw giftServiceError('gift/not-found', 'プレゼントコードが見つかりません。');
    const gift = { code: currentSnapshot.id, ...currentSnapshot.data() };
    if (gift.senderUid !== uid) throw giftServiceError('gift/not-owner', 'このプレゼントは取り消せません。');
    if (gift.status === 'claimed') throw giftServiceError('gift/already-claimed', 'このプレゼントはすでに受け取られています。');
    if (gift.status === 'cancelled') throw giftServiceError('gift/cancelled', 'このプレゼントはすでに取り消されています。');
    if (gift.status !== 'pending') throw giftServiceError('gift/unavailable', 'このプレゼントは現在取り消せません。');
    if (JSON.stringify(cleanGiftPayload(gift.payload)) !== JSON.stringify(cleanGiftPayload(initialGift.payload))) {
      throw giftServiceError('gift/unavailable', 'プレゼント内容が更新されました。もう一度確認してください。');
    }
    transaction.update(giftRef, {
      status: 'cancelled',
      cancelledAt: serverTimestamp(),
      cancelledAtIso,
    });
    return { gift: { ...gift, status: 'cancelled', cancelledAtIso }, gameState: nextState };
  }, () => ({ gift: { ...initialGift, status: 'cancelled', cancelledAtIso }, gameState: nextState }));
}

export function giftErrorMessage(error) {
  const messages = {
    'gift/not-authenticated': 'ログイン状態を確認してください。',
    'gift/invalid-code': 'プレゼントコードの形式を確認してください。',
    'gift/not-found': 'プレゼントコードが見つかりません。',
    'gift/already-claimed': 'このプレゼントはすでに受け取られています。',
    'gift/cancelled': 'このプレゼントは取り消されています。',
    'gift/self-claim': '自分で発行したプレゼントは受け取れません。',
    'gift/not-owner': 'このプレゼントは取り消せません。',
    'gift/unavailable': 'このプレゼントは現在利用できません。',
    'gift/no-save': 'ゲームデータを保存してから、もう一度お試しください。',
    'gift/cloud-save-unavailable': 'クラウド保存を完了できませんでした。通信状態を確認して、もう一度お試しください。',
    'gift/save-conflict': '最新のゲームデータをクラウドへ保存してから、もう一度お試しください。',
    'gift/code-generation-failed': 'プレゼントコードを発行できませんでした。もう一度お試しください。',
    'permission-denied': 'プレゼント機能のFirebaseルールが未反映の可能性があります。管理者へお知らせください。',
    'firestore/permission-denied': 'プレゼント機能のFirebaseルールが未反映の可能性があります。管理者へお知らせください。',
  };
  return messages[error?.code] || error?.message || 'プレゼント処理を完了できませんでした。';
}

export function firebaseErrorMessage(error, context = '') {
  const code = error?.code || '';
  if (context === 'cloud-save') {
    const normalized = String(code || '').replace(/^firestore\//, '');
    const cloudMessages = {
      'aborted': 'クラウド保存が一時的に中断されました。端末には保存済みです。',
      'cancelled': 'クラウド保存が中断されました。端末には保存済みです。',
      'deadline-exceeded': 'クラウド保存がタイムアウトしました。端末には保存済みです。',
      'internal': 'クラウド側で一時的なエラーが発生しました。端末には保存済みです。',
      'invalid-argument': 'クラウド保存データが1件の容量上限を超えました。端末には保存済みです。',
      'network-request-failed': '通信できないためクラウド保存できません。端末には保存済みです。',
      'permission-denied': 'クラウド保存の認証または権限を確認できません。端末には保存済みです。',
      'resource-exhausted': 'クラウド側の利用制限に達しています。端末には保存済みです。',
      'invalid-argument': 'クラウド保存形式を切り替えています。端末には保存済みです。',
      'unauthenticated': 'ログイン情報を確認できないためクラウド保存できません。端末には保存済みです。',
      'unavailable': 'クラウドサービスへ接続できません。端末には保存済みです。',
      'jxj/cloud-save-too-large': 'セーブデータが非常に大きく、クラウドへ保存できません。端末には保存済みです。',
      'jxj/cloud-save-invalid-metadata': 'クラウドセーブの管理情報を確認できません。端末保存は保持されています。',
      'jxj/cloud-save-chunk-missing': 'クラウドセーブの一部を確認できません。端末保存は保持されています。',
      'jxj/cloud-save-decode-failed': 'クラウドセーブを復元できません。端末保存は保持されています。',
    };
    return cloudMessages[normalized] || cloudMessages[code] || error?.message || 'クラウド保存に失敗しました。端末には保存済みです。';
  }
  const messages = {
    'auth/invalid-email': 'メールアドレスの形式を確認してください。',
    'auth/missing-email': 'メールアドレスを入力してください。',
    'auth/missing-password': 'パスワードを入力してください。',
    'auth/weak-password': 'パスワードは10文字以上で設定してください。',
    'auth/password-does-not-meet-requirements': 'パスワードがFirebaseで設定された条件を満たしていません。文字数や文字の種類を確認してください。',
    'auth/email-already-in-use': 'このメールアドレスでは新規登録できません。すでに作成済みの場合は「ログインして始める」をお試しください。',
    'auth/invalid-credential': 'メールアドレスまたはパスワードが正しくありません。',
    'auth/invalid-login-credentials': 'メールアドレスまたはパスワードが正しくありません。',
    'auth/wrong-password': 'メールアドレスまたはパスワードが正しくありません。',
    'auth/user-disabled': 'このアカウントは現在利用できません。',
    'auth/operation-not-allowed': 'メールアドレスでの登録がFirebase側で有効になっていません。管理者へお知らせください。',
    'auth/app-not-authorized': 'この公開URLはFirebase認証の利用を許可されていません。管理者へお知らせください。',
    'auth/unauthorized-domain': 'この公開URLはFirebase認証の承認済みドメインに登録されていません。管理者へお知らせください。',
    'auth/invalid-api-key': 'FirebaseのAPIキー設定を確認できませんでした。管理者へお知らせください。',
    'auth/quota-exceeded': '確認メールの送信上限に達しました。時間をおいてから再送してください。',
    'auth/invalid-recipient-email': '確認メールの送信先を確認できませんでした。メールアドレスを確認してください。',
    'auth/invalid-sender': 'Firebaseの確認メール送信者設定に問題があります。管理者へお知らせください。',
    'auth/popup-closed-by-user': 'Googleログインがキャンセルされました。',
    'auth/cancelled-popup-request': '別のGoogleログイン画面が開いています。開いている画面で操作してください。',
    'auth/popup-blocked': 'Googleログイン画面を開けませんでした。SafariまたはChromeの通常タブでゲームを開き、もう一度お試しください。',
    'auth/redirect-cancelled-by-user': 'Googleログインがキャンセルされました。',
    'auth/web-storage-unsupported': 'このブラウザではログイン情報を保存できません。通常のブラウザで開いてください。',
    'auth/operation-not-supported-in-this-environment': 'この環境ではGoogleログインを利用できません。通常のブラウザで開いてください。',
    'auth/network-request-failed': '通信できません。インターネット接続を確認してください。',
    'auth/too-many-requests': '短時間に操作が集中しました。時間をおいてからお試しください。',
    'auth/requires-recent-login': '安全のため、いったんログアウトして再ログインしてから実行してください。',
    'auth/unsupported-provider': 'このログイン方法では操作できません。',
  };
  if (code === 'auth/internal-error') {
    if (context === 'google-login') return 'Googleログインを完了できませんでした。ページを再読み込みして、もう一度お試しください。';
    if (context === 'email-verification') return '確認メールを送信できませんでした。アカウントは作成済みの可能性があります。画面の「確認メールを再送」をお試しください。';
    if (context === 'email-signup') return 'Firebaseが新規登録処理を完了できませんでした。ページを再読み込みしても続く場合は、Firebase認証設定を管理者が確認する必要があります。';
    if (context === 'email-login') return 'Firebaseがメールログイン処理を完了できませんでした。ページを再読み込みして、もう一度お試しください。';
    return 'Firebase認証処理を完了できませんでした。ページを再読み込みして、もう一度お試しください。';
  }
  return messages[code] || error?.message || '処理を完了できませんでした。もう一度お試しください。';
}
