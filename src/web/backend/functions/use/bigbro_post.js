const { onRequest } = require('firebase-functions/v2/https')
const logger = require('firebase-functions/logger')
const admin = require('firebase-admin')
const { getFirestore } = require('firebase-admin/firestore')

if (!admin.apps.length) {
  admin.initializeApp()
}

const db = getFirestore(admin.app, 'bbcv1')

async function verifyPasswordWithApiKey(email, password) {
  const apiKey = process.env.FIREBASE_API_KEY
  if (!apiKey) {
    logger.error('verifyPasswordWithApiKey: FIREBASE_API_KEY is missing from environment!')
    return false
  }
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    })
    const body = await res.json()
    if (!res.ok) {
      logger.error('Google Auth REST API error response:', body)
      return false
    }
    return !!body && !!body.idToken
  } catch (err) {
    logger.error('verifyPasswordWithApiKey network error', err)
    return false
  }
}

function toMillis(val) {
  if (val === undefined || val === null) return null
  if (typeof val === 'number') {
    if (String(val).length === 10) return val * 1000
    return val
  }
  if (typeof val === 'string') {
    const d = Date.parse(val)
    return isNaN(d) ? null : d
  }
  if (val && typeof val === 'object') {
    if (val._seconds !== undefined) return val._seconds * 1000 + (val._nanoseconds || 0) / 1e6
  }
  return null
}

exports.bigbro_post = onRequest({ secrets: ["MY_API_KEY"] }, async (req, res) => {
  // Set CORS headers for external script access
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.status(204).send('')
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  try {
    // Support both raw body and wrapped data formats
    const data = req.body.data || req.body || {}

    const buildClubId = data.build_club_id || data.buildClubId || data.id
    const gmail = data.gmail || data.email
    const password = data.password
    const timeLoggedRaw = data.time_logged || data.timeLogged || 0
    const activeTimeRaw = data.active_time || data.activeTime || data.active

    if (!buildClubId) {
      res.status(400).json({ error: 'Missing build_club_id' })
      return
    }
    if (!gmail) {
      res.status(400).json({ error: 'Missing gmail/email' })
      return
    }
    if (!password) {
      res.status(401).json({ error: 'Missing password for authentication' })
      return
    }

    const timeLogged = Number(timeLoggedRaw) || 0
    if (activeTimeRaw === undefined || activeTimeRaw === null) {
      res.status(400).json({ error: 'Missing active_time (must be provided by client)' })
      return
    }

    const activeMs = toMillis(activeTimeRaw)
    if (activeMs === null || isNaN(activeMs)) {
      res.status(400).json({ error: 'Invalid active_time format' })
      return
    }

    const dateKey = new Date(activeMs).toISOString().slice(0, 10)

    let authenticated = false
    if (password) {
      const ok = await verifyPasswordWithApiKey(gmail, password)
      if (!ok) {
        res.status(401).json({ error: 'Email/password authentication failed' })
        return
      }
      authenticated = true
    }

    if (!authenticated) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    const userRef = db.collection('users').doc(String(buildClubId))

    await db.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef)
      if (!userSnap.exists) {
        throw new Error('User document not found')
      }

      const userData = userSnap.data() || {}

      // Update personal user document fields
      const userTimeLogged = Object.assign({}, userData.time_logged || {})
      userTimeLogged[dateKey] = Number(((userTimeLogged[dateKey] || 0) + timeLogged).toFixed(2))

      const newTotal = Number(((userData.total_time || 0) + timeLogged).toFixed(2))
      const newWeek = Number(((userData.total_time_week || 0) + timeLogged).toFixed(2))
      const lastActiveTs = admin.firestore.Timestamp.fromMillis(activeMs)

      tx.set(userRef, {
        time_logged: userTimeLogged,
        total_time: newTotal,
        total_time_week: newWeek,
        last_active: lastActiveTs,
      }, { merge: true })

      // Check if user belongs to a group and update group member record accordingly
      const groupsSnap = await tx.get(db.collection('group'))
      for (const gdoc of groupsSnap.docs) {
        const g = gdoc.data() || {}
        if (g && g.member && Object.prototype.hasOwnProperty.call(g.member, String(buildClubId))) {
          const groupRef = db.collection('group').doc(gdoc.id)
          const membersObj = Object.assign({}, g.member || {})
          const memberObj = Object.assign({}, membersObj[String(buildClubId)] || {})

          const memberTimeLogged = Object.assign({}, memberObj.time_logged || {})
          memberTimeLogged[dateKey] = Number(((memberTimeLogged[dateKey] || 0) + timeLogged).toFixed(2))

          memberObj.time_logged = memberTimeLogged
          memberObj.total_time = Number(((memberObj.total_time || 0) + timeLogged).toFixed(2))
          memberObj.total_time_week = Number(((memberObj.total_time_week || 0) + timeLogged).toFixed(2))
          memberObj.last_active = lastActiveTs

          membersObj[String(buildClubId)] = memberObj

          tx.set(groupRef, { member: membersObj }, { merge: true })
          break
        }
      }
    })

    res.status(200).json({ ok: true, date: dateKey, added: timeLogged })
  } catch (err) {
    logger.error('bigbro_post error:', err)
    res.status(500).json({ error: err.message || 'Unknown error' })
  }
})