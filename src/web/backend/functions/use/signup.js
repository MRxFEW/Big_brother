const { onCall, HttpsError } = require('firebase-functions/v2/https')
const logger = require('firebase-functions/logger')
const admin = require('firebase-admin')
const { getFirestore } = require('firebase-admin/firestore')

if (!admin.apps.length) {
  admin.initializeApp()
}

const db = getFirestore(admin.app,'bbcv1');

exports.signup = onCall(async (request) => {
  const data = request.data

  if (!data || typeof data !== 'object') {
    throw new HttpsError('invalid-argument', 'Missing request data')
  }

  const buildClubId = data.build_club_id || data.build_clubId || data.buildClubId
  const name = data.name
  const department = data.department || ''
  const encodedFace = data.encoded_face || data.encodedFace || data.encodedFaceArray
  const email = data.email
  const password = data.password

  if (!buildClubId) throw new HttpsError('invalid-argument', 'Missing build_club_id')
  if (!name) throw new HttpsError('invalid-argument', 'Missing name')
  if (!encodedFace) throw new HttpsError('invalid-argument', 'Missing encoded_face')
  if (!email) throw new HttpsError('invalid-argument', 'Missing email')
  if (!password) throw new HttpsError('invalid-argument', 'Missing password')

  try {
    const userDocRef = db.collection('users').doc(String(buildClubId))
    const userDoc = await userDocRef.get()

    if (userDoc.exists) {
      throw new HttpsError('already-exists', 'A user with this build_club_id already exists')
    }

    // Pass uid explicitly only if it passes string validation, or let Auth generate it
    const authPayload = {
      email,
      password,
      displayName: name,
    }

    // Only set explicit UID if buildClubId is a clean alphanumeric string
    if (buildClubId && /^[a-zA-Z0-9_-]{1,128}$/.test(String(buildClubId))) {
      authPayload.uid = String(buildClubId)
    }

    const createdUser = await admin.auth().createUser(authPayload)

    const docData = {
      build_club_id: String(buildClubId),
      name,
      department: department || '',
      encoded_face: encodedFace,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      uid: createdUser.uid,
    }

    await userDocRef.set(docData)

    return { ok: true, uid: createdUser.uid }
  } catch (err) {
    if (err instanceof HttpsError) throw err
    logger.error('signup error:', err)
    throw new HttpsError('internal', err.message || 'Unknown error')
  }
})