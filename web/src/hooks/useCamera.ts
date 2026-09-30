import { useCallback, useEffect, useRef, useState } from 'react';

export type CameraMetrics = { width: number; height: number; fps: number };

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRequestRef = useRef<number | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState('');
  const [metrics, setMetrics] = useState<CameraMetrics>({ width: 0, height: 0, fps: 0 });

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const allDevices = await navigator.mediaDevices.enumerateDevices();
    const cameras = allDevices.filter((device) => device.kind === 'videoinput');
    setDevices(cameras);
    setSelectedDeviceId((current) => current || cameras[0]?.deviceId || '');
  }, []);

  const stop = useCallback(() => {
    if (frameRequestRef.current !== null) cancelAnimationFrame(frameRequestRef.current);
    frameRequestRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsRunning(false);
    setMetrics({ width: 0, height: 0, fps: 0 });
  }, []);

  const start = useCallback(async (deviceId?: string) => {
    stop();
    setError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Trình duyệt không hỗ trợ camera hoặc trang không ở secure context.');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: deviceId ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } } : { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error('Không tìm thấy video preview.');
      video.srcObject = stream;
      await video.play();
      setIsRunning(true);
      await refreshDevices();

      let frames = 0;
      let lastSample = performance.now();
      const countFrame = (now: number) => {
        frames += 1;
        const elapsed = now - lastSample;
        if (elapsed >= 1000) {
          setMetrics({ width: video.videoWidth, height: video.videoHeight, fps: Math.round((frames * 1000) / elapsed) });
          frames = 0;
          lastSample = now;
        }
        frameRequestRef.current = requestAnimationFrame(countFrame);
      };
      frameRequestRef.current = requestAnimationFrame(countFrame);
    } catch (reason) {
      stop();
      const message = reason instanceof Error ? reason.message : 'Không thể mở camera.';
      setError(message);
    }
  }, [refreshDevices, stop]);

  useEffect(() => {
    void refreshDevices();
    navigator.mediaDevices?.addEventListener('devicechange', refreshDevices);
    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', refreshDevices);
      stop();
    };
  }, [refreshDevices, stop]);

  const selectDevice = useCallback((deviceId: string) => {
    setSelectedDeviceId(deviceId);
    if (streamRef.current) void start(deviceId);
  }, [start]);

  return { videoRef, devices, selectedDeviceId, selectDevice, isRunning, error, metrics, start: () => start(selectedDeviceId), stop };
}
