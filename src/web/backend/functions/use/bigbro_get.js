const { onRequest } = require('firebase-functions/v2/https')
const logger = require('firebase-functions/logger')
const admin = require('firebase-admin')
const { getFirestore } = require('firebase-admin/firestore')

if (!admin.apps.length) {
  admin.initializeApp()
}

const db = getFirestore(admin.app, 'bbcv1')

exports.bigbro_get = onRequest(async (req, res) => {
  // Handle CORS if needed or standard JSON parsing
  res.set('Access-Control-Allow-Origin', '*')
  
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'GET, POST')
    res.set('Access-Control-Allow-Headers', 'Content-Type')
    res.status(204).send('')
    return
  }

  try {
    // For onRequest, data is in req.body.data (if sent with data wrapper) or directly in req.body
    const body = req.body.data || req.body
    const buildClubId = body.build_club_id || body.buildClubId || body.id

    if (!buildClubId) {
      res.status(400).json({ error: 'Missing build_club_id' })
      return
    }

    const userRef = db.collection('users').doc(String(buildClubId))
    const userSnap = await userRef.get()
    if (!userSnap.exists) {
      res.status(404).json({ error: 'User document not found' })
      return
    }

    const userData = userSnap.data() || {}

    const groupsSnap = await db.collection('group').get()
    let matchedGroup = null
    for (const doc of groupsSnap.docs) {
      const g = doc.data()
      if (g && g.member && Object.prototype.hasOwnProperty.call(g.member, String(buildClubId))) {
        matchedGroup = { id: doc.id, data: g }
        break
      }
    }

    if (matchedGroup) {
      const membersObj = matchedGroup.data.member || {}
      const members = Object.keys(membersObj).map((memberId) => {
        const m = membersObj[memberId] || {}
        const encoded = m.encode_face || m.encoded_face || m.encodedFace || m.encodedFaceArray || null
        return {
          id: memberId,
          name: m.name || '',
          encoded_face: encoded,
        }
      })
      res.status(200).json({ ok: true, group: matchedGroup.id, members })
      return
    }

    const encoded = userData.encoded_face || userData.encodedFace || userData.encoded_face_array || null
    res.status(200).json({ 
      ok: true, 
      members: [{ id: String(buildClubId), name: userData.name || '', encoded_face: encoded }] 
    })

  } catch (err) {
    logger.error('bigbro_get error:', err)
    res.status(500).json({ error: err.message || 'Unknown error' })
  }
})