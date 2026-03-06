// ── WebRTC Manager for Linzoo Calls ──────────────────────────

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

export class WebRTCCall {
  constructor({ onLocalStream, onRemoteStream, onIceCandidate, onStateChange }) {
    this.pc = null;
    this.localStream = null;
    this.remoteStream = null;
    this.onLocalStream = onLocalStream || (() => {});
    this.onRemoteStream = onRemoteStream || (() => {});
    this.onIceCandidate = onIceCandidate || (() => {});
    this.onStateChange = onStateChange || (() => {});
    this._isVideo = false;
    this._muted = false;
    this._videoOff = false;
  }

  async init(isVideo = false) {
    this._isVideo = isVideo;
    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    this.pc.onicecandidate = (e) => {
      if (e.candidate) this.onIceCandidate(e.candidate);
    };

    this.pc.ontrack = (e) => {
      this.remoteStream = e.streams[0];
      this.onRemoteStream(this.remoteStream);
    };

    this.pc.onconnectionstatechange = () => {
      this.onStateChange(this.pc.connectionState);
    };

    this.pc.oniceconnectionstatechange = () => {
      if (this.pc.iceConnectionState === 'failed') {
        this.pc.restartIce();
      }
    };

    // Get user media
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: isVideo ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
      });
      this.onLocalStream(this.localStream);
      this.localStream.getTracks().forEach(t => this.pc.addTrack(t, this.localStream));
    } catch (err) {
      throw new Error('Could not access microphone/camera: ' + err.message);
    }
  }

  async createOffer() {
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    return offer;
  }

  async handleOffer(sdp) {
    await this.pc.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return answer;
  }

  async handleAnswer(sdp) {
    await this.pc.setRemoteDescription(new RTCSessionDescription(sdp));
  }

  async addIceCandidate(candidate) {
    if (this.pc.remoteDescription) {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }

  setMuted(muted) {
    this._muted = muted;
    this.localStream?.getAudioTracks().forEach(t => { t.enabled = !muted; });
  }

  setVideoOff(off) {
    this._videoOff = off;
    this.localStream?.getVideoTracks().forEach(t => { t.enabled = !off; });
  }

  async startScreenShare() {
    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const videoTrack = screen.getVideoTracks()[0];
      const sender = this.pc.getSenders().find(s => s.track?.kind === 'video');
      if (sender) await sender.replaceTrack(videoTrack);
      videoTrack.onended = () => this.stopScreenShare();
      return screen;
    } catch (err) {
      throw new Error('Screen share failed: ' + err.message);
    }
  }

  async stopScreenShare() {
    if (!this._isVideo) return;
    const camTrack = this.localStream?.getVideoTracks()[0];
    const sender = this.pc.getSenders().find(s => s.track?.kind === 'video');
    if (sender && camTrack) await sender.replaceTrack(camTrack);
  }

  getAudioLevel() {
    if (!this.localStream) return 0;
    const ctx = new AudioContext();
    const src = ctx.createMediaStreamSource(this.localStream);
    const analyser = ctx.createAnalyser();
    src.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    return data.reduce((a, b) => a + b, 0) / data.length / 255;
  }

  destroy() {
    this.localStream?.getTracks().forEach(t => t.stop());
    this.pc?.close();
    this.localStream = null;
    this.remoteStream = null;
    this.pc = null;
  }
}

export function drawWaveform(canvas, audioBuffer, color = '#4d8dff') {
  if (!canvas || !audioBuffer) return;
  const ctx = canvas.getContext('2d');
  const data = audioBuffer.getChannelData(0);
  const w = canvas.width;
  const h = canvas.height;
  const step = Math.ceil(data.length / w);
  const amp = h / 2;

  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();

  for (let i = 0; i < w; i++) {
    let min = 1, max = -1;
    for (let j = 0; j < step; j++) {
      const v = data[i * step + j];
      if (v < min) min = v;
      if (v > max) max = v;
    }
    ctx.moveTo(i, (1 + min) * amp);
    ctx.lineTo(i, (1 + max) * amp);
  }
  ctx.stroke();
}

export async function decodeAudioBlob(blob) {
  const ctx = new AudioContext();
  const buf = await blob.arrayBuffer();
  return await ctx.decodeAudioData(buf);
}
