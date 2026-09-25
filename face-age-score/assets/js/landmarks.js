/* ==========================================================================
   顔ランドマーク検出（MediaPipe Face Landmarker、ブラウザ内で実行）
   - 写真は端末内で処理し、どこにも送らない
   - 478点のランドマークから、6ゾーンのマーカー位置（写真内の相対座標）を決める
   - 失敗時は null を返し、呼び出し側は AI が返した位置にフォールバックする
   ========================================================================== */
(function () {
  'use strict';

  var VER = '0.10.14';
  var BUNDLE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@' + VER + '/vision_bundle.mjs';
  var WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@' + VER + '/wasm';
  var MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

  var landmarkerPromise = null;

  function getLandmarker() {
    if (!landmarkerPromise) {
      landmarkerPromise = import(BUNDLE).then(function (vision) {
        return vision.FilesetResolver.forVisionTasks(WASM).then(function (fileset) {
          return vision.FaceLandmarker.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: MODEL },
            runningMode: 'IMAGE',
            numFaces: 1
          });
        });
      }).catch(function (e) {
        landmarkerPromise = null;
        throw e;
      });
    }
    return landmarkerPromise;
  }

  /* MediaPipe Face Mesh の頂点番号。画像上の右側＝被写体の左側。 */
  var IDX = {
    forehead: 151,        // 眉間の少し上（額の中央）
    eyeOuterR: 263,       // 画像右の目の目尻
    underEyeR: 450,       // 画像右の目の下（下まぶたの下）
    cheekL: 50,           // 画像左の頬の中央
    cheekR: 280,          // 画像右の頬の中央
    noseAlaR: 358,        // 画像右の小鼻
    mouthCornerR: 291,    // 画像右の口角
    jawL: 172             // 画像左の顎の輪郭（エラの下）
  };

  function pt(lms, i) { return { x: lms[i].x, y: lms[i].y }; }
  function mix(a, b, t) { return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; }

  function zonePoints(lms) {
    var noseAla = pt(lms, IDX.noseAlaR), mouth = pt(lms, IDX.mouthCornerR), cheekR = pt(lms, IDX.cheekR);
    var foldMid = mix(noseAla, mouth, 0.55);
    return {
      hitai: pt(lms, IDX.forehead),
      memoto: pt(lms, IDX.eyeOuterR),
      meshita: pt(lms, IDX.underEyeR),
      hoho: pt(lms, IDX.cheekL),
      hourei: mix(foldMid, cheekR, 0.2),
      line: pt(lms, IDX.jawL)
    };
  }

  /* img: 読み込み済みの <img>。戻り値: {hitai:{x,y}, ...} または null */
  function detectZonePoints(img) {
    if (!img || !img.naturalWidth) return Promise.resolve(null);
    return getLandmarker().then(function (lm) {
      var res = lm.detect(img);
      var faces = res && res.faceLandmarks;
      if (!faces || !faces.length) return null;
      return zonePoints(faces[0]);
    }).catch(function (e) {
      console.warn('[landmarks] 検出に失敗。AIの位置にフォールバックします:', e && e.message);
      return null;
    });
  }

  window.FAS = window.FAS || {};
  window.FAS.detectZonePoints = detectZonePoints;
})();
