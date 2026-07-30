// Lightweight face encoder wrapper using @vladmandic/face-api if available.
// Expects models to be placed in /public/models/ (e.g. public/models/face_detection_model-shard1)

let faceapi = null
let modelsLoaded = false

export async function ensureFaceApi() {
  if (faceapi && modelsLoaded) return
  try {
    faceapi = await import('@vladmandic/face-api')
  } catch (err) {
    throw new Error('Face API not installed. Run `npm install @vladmandic/face-api` or include a browser build.')
  }
}

export async function loadModels(baseUrl = '/models') {
  await ensureFaceApi()
  // use tiny face detector + face recognition model
  const opts = faceapi.nets.tinyFaceDetector.loadFromUri
  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(baseUrl),
      faceapi.nets.faceLandmark68Net.loadFromUri(baseUrl),
      faceapi.nets.faceRecognitionNet.loadFromUri(baseUrl),
    ])
    modelsLoaded = true
  } catch (err) {
    console.error('Failed to load face-api models from', baseUrl, err)
    throw err
  }
}

export async function encodeImageFile(file, options = { detection: { inputSize: 160, scoreThreshold: 0.5 } }) {
  if (!modelsLoaded) await loadModels()
  const img = await fileToImage(file)
  const detection = await faceapi
    .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions(options.detection))
    .withFaceLandmarks()
    .withFaceDescriptor()

  // explicit validation: detection must exist and descriptor must be numeric array of expected length
  if (!detection || !detection.descriptor || !Array.isArray(detection.descriptor) && !(detection.descriptor instanceof Float32Array)) {
    throw new Error('No face detected. Try another photo with more light and a clear view of the face.')
  }

  const descArray = Array.from(detection.descriptor)
  // common face descriptor length for face-recognition models is 128
  if (descArray.length < 64) {
    throw new Error('Face detected but descriptor looks invalid (too short). Try a clearer photo.')
  }

  return descArray
}

function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = (e) => reject(e)
    img.src = URL.createObjectURL(file)
  })
}
