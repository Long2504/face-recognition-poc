# Models

## Phase 2 face detector

- File: `version-RFB-320.onnx`
- Model: Ultra-Light-Fast-Generic-Face-Detector-1MB, RFB-320
- Input: RGB `1 × 3 × 240 × 320`, normalized bằng `(pixel - 127) / 128`
- Output: 4,420 confidence pairs và normalized bounding boxes
- SHA-256: `34CD7E60AEFF28744C657DE7A3DC64E872D506741DE66987F3426F2B79F88017`
- Source: https://github.com/Linzaer/Ultra-Light-Fast-Generic-Face-Detector-1MB
- License: MIT, xem `LICENSE.ultra-light-face-detector`

Vite dùng thư mục này làm static `publicDir`; inference vẫn chạy hoàn toàn trong browser.

## ONNX Runtime WebAssembly

`ort-wasm-simd-threaded.wasm` được phục vụ trực tiếp từ root URL. Đường dẫn explicit
này tránh trường hợp Vite dev server trả `index.html` cho URL WASM được suy luận sai.
File được lấy từ package `onnxruntime-web` đang khóa trong `package-lock.json`.

## Phase 4 face embedding

- File: `w600k_mbf.onnx`
- Model pack: InsightFace `buffalo_sc`, MobileFaceNet@WebFace600K
- Input: RGB `1 × 3 × 112 × 112`, normalized bằng `(pixel - 127.5) / 127.5`
- Output: `1 × 512`, sau đó được L2-normalize trong browser
- SHA-256: `9CC6E4A75F0E2BF0B1AED94578F144D15175F357BDC05E815E5C4A02B319EB4F`
- Source: https://github.com/deepinsight/insightface/releases/tag/model-zoo
- Terms: pretrained model chỉ dành cho nghiên cứu phi thương mại; xem `MODEL_LICENSE.insightface.txt`
