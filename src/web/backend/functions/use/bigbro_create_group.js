const { onCall, HttpsError } = require('firebase-functions/v2/https')
const logger = require('firebase-functions/logger')
const admin = require('firebase-admin')
const { getFirestore } = require('firebase-admin/firestore')

if (!admin.apps.length) {
  admin.initializeApp()
}

const db = getFirestore(admin.app, 'bbcv1')

exports.bigbro_create_group = onCall(async (request) => {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'You must be logged in to create a group.')
  }
  const createdBy = request.auth.uid

  const data = request.data
  if (!data || typeof data !== 'object') {
    throw new HttpsError('invalid-argument', 'Missing request data')
  }

  const groupName = data.name || data.group_id || data.groupId || data.id
  if (!groupName) {
    throw new HttpsError('invalid-argument', 'Missing group name')
  }

  try {
    const groupRef = db.collection('group').doc(String(groupName))
    const userRef = db.collection('users').doc(String(createdBy))

    await db.runTransaction(async (tx) => {
      const gSnap = await tx.get(groupRef)
      if (gSnap.exists) throw new HttpsError('already-exists', 'Group already exists')

      const uSnap = await tx.get(userRef)
      if (!uSnap.exists) throw new HttpsError('not-found', 'Creating user not found in database')

      const u = uSnap.data() || {}
      
      // Pull last_active from the user document or fallback to server time
      const userLastActive = u.last_active || u.lastActive || admin.firestore.Timestamp.now()

      const memberObj = {
        name: u.name || '',
        encode_face: u.encoded_face || u.encodedFace || u.encoded_face_array || null,
        department: u.department || null,
        time_logged: u.time_logged || {},
        total_time: Number(u.total_time) || 0,
        total_time_week: Number(u.total_time_week) || 0,
        last_active: userLastActive, // Nested inside member object
      }

      const serverTimestamp = admin.firestore.Timestamp.now()

      const groupData = {
        name: String(groupName),
        created_by: String(createdBy),
        createdAt: serverTimestamp,
        member: { [String(createdBy)]: memberObj },
      }

      tx.set(groupRef, groupData)
      tx.set(userRef, { group: String(groupName) }, { merge: true })
    })

    return { ok: true, group: String(groupName) }
  } catch (err) {
    if (err instanceof HttpsError) throw err
    logger.error('bigbro_create_group error:', err)
    throw new HttpsError('internal', err.message || 'Unknown error')
  }
})