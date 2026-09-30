export const FACE_DETECTION_CONFIG = {
  modelPath: '/version-RFB-320.onnx',
  inputWidth: 320,
  inputHeight: 240,
  confidenceThreshold: 0.5,
  iouThreshold: 0.3,
  maxDetections: 20,
  targetIntervalMs: 160,
} as const;

export const FACE_QUALITY_CONFIG = {
  minimumConfidence: 0.7,
  minimumFaceSizePx: 96,
  edgeMarginRatio: 0.03,
  minimumBlurScore: 80,
  blurSampleMaxSize: 160,
} as const;
