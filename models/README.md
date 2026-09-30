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
