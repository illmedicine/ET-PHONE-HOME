/**
 * Media Capture and Compression Module
 * Handles audio/video recording, compression, and format conversion
 * Ensures all media meets ESP32-S3 constraints before upload
 */

class MediaCapture {
    constructor() {
        this.audioStream = null;
        this.audioContext = null;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;

        this.videoStream = null;
        this.videoRecorder = null;
        this.videoChunks = [];
        this.isVideoRecording = false;
    }

    /**
     * Initialize audio recording with constraints
     * @returns {Promise<void>}
     */
    async initAudioRecording() {
        try {
            const constraints = {
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: false
                }
            };

            this.audioStream = await navigator.mediaDevices.getUserMedia(constraints);
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Create recorder with appropriate settings
            const mimeType = this.getSupportedAudioMimeType();
            this.mediaRecorder = new MediaRecorder(this.audioStream, {
                mimeType: mimeType,
                audioBitsPerSecond: 128000 // 128 kbps for mono speech
            });

            this.setupAudioRecordingListeners();
        } catch (error) {
            throw new Error(`Audio initialization failed: ${error.message}`);
        }
    }

    /**
     * Get supported audio MIME type
     * @returns {string}
     */
    getSupportedAudioMimeType() {
        const types = [
            'audio/webm;codecs=opus',
            'audio/mp4',
            'audio/wav'
        ];

        for (let type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                return type;
            }
        }
        return 'audio/webm';
    }

    /**
     * Setup audio recording event listeners
     */
    setupAudioRecordingListeners() {
        this.audioChunks = [];

        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.audioChunks.push(event.data);
            }
        };

        this.mediaRecorder.onstop = () => {
            this.isRecording = false;
        };
    }

    /**
     * Start audio recording
     */
    startAudioRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state === 'inactive') {
            this.audioChunks = [];
            this.isRecording = true;
            this.mediaRecorder.start();
        }
    }

    /**
     * Stop audio recording
     */
    stopAudioRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
            this.isRecording = false;
        }
    }

    /**
     * Get audio blob and validate size
     * @returns {Promise<Blob>}
     */
    async getAudioBlob() {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });

        // Check size constraints
        if (audioBlob.size > MEDIA_CONFIG.AUDIO.maxSize) {
            throw new Error(
                `Audio file too large: ${(audioBlob.size / 1024).toFixed(1)}KB ` +
                `exceeds ${MEDIA_CONFIG.AUDIO.maxSize / 1024}KB limit`
            );
        }

        return audioBlob;
    }

    /**
     * Convert audio to PCM for ESP32 consumption
     * @param {Blob} audioBlob
     * @returns {Promise<ArrayBuffer>}
     */
    async convertAudioToPCM(audioBlob) {
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Resample to target rate if needed
        const targetSampleRate = MEDIA_CONFIG.AUDIO.sampleRate;
        let pcmData = audioBuffer.getChannelData(0); // Get first channel (mono)

        if (audioBuffer.sampleRate !== targetSampleRate) {
            pcmData = this.resampleAudio(pcmData, audioBuffer.sampleRate, targetSampleRate);
        }

        // Convert float32 to PCM16
        return this.float32ToInt16(pcmData);
    }

    /**
     * Resample audio to target sample rate
     * @param {Float32Array} audioData
     * @param {number} originalRate
     * @param {number} targetRate
     * @returns {Float32Array}
     */
    resampleAudio(audioData, originalRate, targetRate) {
        const ratio = originalRate / targetRate;
        const newLength = Math.round(audioData.length / ratio);
        const resampled = new Float32Array(newLength);

        let j = 0;
        for (let i = 0; i < newLength; i++) {
            const index = Math.floor(i * ratio);
            resampled[i] = audioData[index];
            j = index;
        }

        return resampled;
    }

    /**
     * Convert Float32 audio data to Int16 PCM
     * @param {Float32Array} float32Data
     * @returns {ArrayBuffer}
     */
    float32ToInt16(float32Data) {
        const int16Data = new Int16Array(float32Data.length);
        for (let i = 0; i < float32Data.length; i++) {
            // Clamp to [-1, 1] range
            let sample = Math.max(-1, Math.min(1, float32Data[i]));
            // Convert to Int16
            int16Data[i] = sample < 0
                ? sample * 0x8000 // -32768
                : sample * 0x7fff; // 32767
        }
        return int16Data.buffer;
    }

    /**
     * Play audio for preview
     * @returns {HTMLAudioElement}
     */
    playAudioPreview() {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
        return audio;
    }

    /**
     * Clear audio recording
     */
    clearAudioRecording() {
        this.audioChunks = [];
        this.isRecording = false;
        if (this.mediaRecorder) {
            this.mediaRecorder.stop();
        }
    }

    /**
     * Initialize video recording with constraints
     * @returns {Promise<void>}
     */
    async initVideoRecording(videoElement) {
        try {
            const constraints = {
                video: {
                    width: { ideal: MEDIA_CONFIG.VIDEO.width },
                    height: { ideal: MEDIA_CONFIG.VIDEO.height },
                    facingMode: 'user'
                },
                audio: false // No audio for video-only messages
            };

            this.videoStream = await navigator.mediaDevices.getUserMedia(constraints);
            videoElement.srcObject = this.videoStream;

            const mimeType = this.getSupportedVideoMimeType();
            this.videoRecorder = new MediaRecorder(this.videoStream, {
                mimeType: mimeType,
                videoBitsPerSecond: 500000 // 500 kbps for compressed video
            });

            this.setupVideoRecordingListeners();
        } catch (error) {
            throw new Error(`Video initialization failed: ${error.message}`);
        }
    }

    /**
     * Get supported video MIME type
     * @returns {string}
     */
    getSupportedVideoMimeType() {
        const types = [
            'video/webm;codecs=vp8',
            'video/webm;codecs=vp9',
            'video/webm',
            'video/mp4'
        ];

        for (let type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                return type;
            }
        }
        return 'video/webm';
    }

    /**
     * Setup video recording event listeners
     */
    setupVideoRecordingListeners() {
        this.videoChunks = [];

        this.videoRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.videoChunks.push(event.data);
            }
        };

        this.videoRecorder.onstop = () => {
            this.isVideoRecording = false;
        };
    }

    /**
     * Start video recording
     */
    startVideoRecording() {
        if (this.videoRecorder && this.videoRecorder.state === 'inactive') {
            this.videoChunks = [];
            this.isVideoRecording = true;
            this.videoRecorder.start();
        }
    }

    /**
     * Stop video recording
     */
    stopVideoRecording() {
        if (this.videoRecorder && this.videoRecorder.state === 'recording') {
            this.videoRecorder.stop();
            this.isVideoRecording = false;
        }
    }

    /**
     * Get video blob and validate size
     * @returns {Promise<Blob>}
     */
    async getVideoBlob() {
        const videoBlob = new Blob(this.videoChunks, { type: 'video/webm' });

        // Check size constraints
        if (videoBlob.size > MEDIA_CONFIG.VIDEO.maxSize) {
            throw new Error(
                `Video file too large: ${(videoBlob.size / 1024 / 1024).toFixed(2)}MB ` +
                `exceeds ${MEDIA_CONFIG.VIDEO.maxSize / 1024 / 1024}MB limit`
            );
        }

        return videoBlob;
    }

    /**
     * Play video for preview
     * @param {HTMLVideoElement} videoElement
     */
    playVideoPreview(videoElement) {
        const videoBlob = new Blob(this.videoChunks, { type: 'video/webm' });
        const videoUrl = URL.createObjectURL(videoBlob);
        videoElement.src = videoUrl;
        videoElement.play();
    }

    /**
     * Clear video recording
     */
    clearVideoRecording() {
        this.videoChunks = [];
        this.isVideoRecording = false;
        if (this.videoRecorder) {
            this.videoRecorder.stop();
        }
        if (this.videoStream) {
            this.videoStream.getTracks().forEach(track => track.stop());
        }
    }

    /**
     * Stop all streams and cleanup
     */
    cleanup() {
        if (this.audioStream) {
            this.audioStream.getTracks().forEach(track => track.stop());
        }
        if (this.videoStream) {
            this.videoStream.getTracks().forEach(track => track.stop());
        }
        if (this.audioContext) {
            this.audioContext.close();
        }
    }
}

// Create global instance
const mediaCapture = new MediaCapture();
