const { onCall, HttpsError } = require('firebase-functions/v2/https')
const logger = require('firebase-functions/logger')
const admin = require('firebase-admin')
const { getFirestore } = require('firebase-admin/firestore')

if (!admin.apps.length) {
  admin.initializeApp()
}

const db = getFirestore(admin.app, 'bbcv1')

exports.bigbro_join_group = onCall(async (request) => {
  const data = request.data
  if (!data || typeof data !== 'object') throw new HttpsError('invalid-argument', 'Missing request data')

  const groupId = data.group_id || data.groupId || data.id
  const buildClubId = data.build_club_id || data.buildClubId || data.id

  if (!groupId) throw new HttpsError('invalid-argument', 'Missing group_id')
  if (!buildClubId) throw new HttpsError('invalid-argument', 'Missing build_club_id')

  try {
    const groupRef = db.collection('group').doc(String(groupId))
    const userRef = db.collection('users').doc(String(buildClubId))

    await db.runTransaction(async (tx) => {
      const gSnap = await tx.get(groupRef)
      if (!gSnap.exists) throw new HttpsError('not-found', 'Group not found')

      const uSnap = await tx.get(userRef)
      if (!uSnap.exists) throw new HttpsError('not-found', 'User not found')

      const g = gSnap.data() || {}
      const u = uSnap.data() || {}

      const membersObj = Object.assign({}, g.member || {})
      if (Object.prototype.hasOwnProperty.call(membersObj, String(buildClubId))) {
        throw new HttpsError('already-exists', 'User already in group')
      }

      // Pull last_active directly from the user database document
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

      membersObj[String(buildClubId)] = memberObj

      tx.set(groupRef, { member: membersObj }, { merge: true })
      tx.set(userRef, { group: String(groupId) }, { merge: true })
    })

    return { ok: true, group: String(groupId) }
  } catch (err) {
    if (err instanceof HttpsError) throw err
    logger.error('bigbro_join_group error:', err)
    throw new HttpsError('internal', err.message || 'Unknown error')
  }
})