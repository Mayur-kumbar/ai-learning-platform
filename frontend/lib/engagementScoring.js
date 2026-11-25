export const ENGAGEMENT_WEIGHTS = {
  facePresence: 0.2,
  visualOrientation: 0.25,
  headOrientation: 0.15,
  tabFocus: 0.2,
  learningInteraction: 0.2,
};

export function estimateEngagement(observations, weights = ENGAGEMENT_WEIGHTS) {
  const available = Object.entries(weights).filter(([key, weight]) =>
    Number.isFinite(observations[key]) && weight > 0
  );
  const weightTotal = available.reduce((sum, [, weight]) => sum + weight, 0);
  if (weightTotal === 0 || available.length < 2) {
    return { score: null, confidence: 0, category: "insufficient" };
  }
  const score = available.reduce((sum, [key, weight]) => {
    return sum + Math.min(1, Math.max(0, observations[key])) * weight;
  }, 0) / weightTotal;
  const confidence = Math.min(1, weightTotal);
  const category = score >= 0.7 ? "high" : score >= 0.4 ? "moderate" : "low";
  return { score, confidence, category };
}

export function smoothValue(previous, next, alpha = 0.35) {
  if (!Number.isFinite(next)) return previous;
  if (!Number.isFinite(previous)) return next;
  return previous + Math.min(1, Math.max(0, alpha)) * (next - previous);
}

export function eyeAspectRatio(eye) {
  if (!Array.isArray(eye) || eye.length < 6) return null;
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const width = distance(eye[0], eye[3]);
  if (width < 1e-6) return null;
  return (distance(eye[1], eye[5]) + distance(eye[2], eye[4])) / (2 * width);
}

export function estimateGaze(landmarks) {
  if (!landmarks || landmarks.length < 478) return null;
  const eye = (corners, iris) => {
    const [left, right] = corners.map((index) => landmarks[index]);
    const center = landmarks[iris];
    const width = right.x - left.x;
    return width > 1e-6 ? (center.x - left.x) / width : null;
  };
  const left = eye([33, 133], 468);
  const right = eye([362, 263], 473);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
  const horizontal = (left + right) / 2;
  return { horizontal: Math.min(1, Math.max(0, horizontal)), confidence: 0.5 };
}

export function estimateHeadPose(matrix) {
  if (!matrix || matrix.length < 16) return null;
  const m = matrix;
  const yaw = Math.atan2(m[8], Math.hypot(m[0], m[4]));
  const pitch = Math.atan2(-m[9], m[10]);
  const roll = Math.atan2(m[4], m[0]);
  return { yaw: yaw * 180 / Math.PI, pitch: pitch * 180 / Math.PI, roll: roll * 180 / Math.PI };
}


export const FOCUS_HOLD_MS = Object.freeze({ absent: 6000, turned: 6000, closed: 4000 });

export function observeFace(result) {
  const faces = result?.faceLandmarks;
  const unknown = { signal: "unknown", facePresence: null, visualOrientation: null, headOrientation: null };
  if (!Array.isArray(faces) || faces.length > 1) return unknown;
  if (!faces.length) return { ...unknown, signal: "absent", facePresence: 0 };
  const pose = estimateHeadPose(result.facialTransformationMatrixes?.[0]?.data);
  if (!pose || !Number.isFinite(pose.yaw) || !Number.isFinite(pose.pitch)) return unknown;
  const gaze = estimateGaze(faces[0]);
  const angles = Math.max(Math.abs(pose.yaw) / 45, Math.abs(pose.pitch) / 40);
  const shapes = result.faceBlendshapes?.[0]?.categories || [];
  const blink = side => shapes.find(item => item.categoryName === "eyeBlink" + side)?.score;
  const closed = blink("Left") >= 0.7 && blink("Right") >= 0.7;
  const gazeOffset = gaze ? Math.abs(gaze.horizontal - 0.5) : null;
  const turned = angles >= 1 || (angles >= 0.6 && gazeOffset != null && gazeOffset > 0.28);
  return {
    signal: closed ? "closed" : turned ? "turned" : "present",
    facePresence: 1, headOrientation: Math.max(0, 1 - angles),
    visualOrientation: closed ? 0 : gazeOffset == null ? null : Math.max(0, 1 - 2 * gazeOffset),
  };
}

// Fresh frames with no face can trigger the first pause. A manual resume during the same episode
// stays effective until another full second of ordinary observations.
export function createFocusMonitor() {
  let armed = true;
  let previous;
  let since;
  let lastFrame;
  function interrupt() { previous = undefined; lastFrame = undefined; }
  function observe(signal, now) {
    if (signal !== previous || lastFrame == null || now - lastFrame > 2000 || now < lastFrame) {
      previous = signal;
      since = now;
    }
    lastFrame = now;
    if (signal === "present" && now - since >= 1000) armed = true;
    if (armed && Object.hasOwn(FOCUS_HOLD_MS, signal) && now - since >= FOCUS_HOLD_MS[signal]) {
      armed = false;
      return signal;
    }
    return null;
  }
  function secondsRemaining() {
    if (!armed || !Object.hasOwn(FOCUS_HOLD_MS, previous)) return null;
    return Math.max(0, Math.ceil((FOCUS_HOLD_MS[previous] - (lastFrame - since)) / 1000));
  }
  return { observe, interrupt, secondsRemaining };
}


export function pausePlayingLecture(video, youtube) {
  if (video && !video.paused() && !video.ended() && !video.seeking()) {
    video.pause();
    return true;
  }
  // YouTube IFrame API exposes PLAYING as 1; buffering and ended are separate states.
  if (youtube?.getPlayerState?.() === 1) {
    youtube.pauseVideo();
    return true;
  }
  return false;
}
