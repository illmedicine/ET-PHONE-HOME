/**
 * ET-Phone-Home Frontend Application
 * Main orchestration layer for UI interactions and Firebase integration
 */

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const appState = {
    firebaseReady: false,
    isConnected: false,
    currentTab: 'audio',
    audioRecordingDuration: 0,
    videoRecordingDuration: 0,
    audioTimer: null,
    videoTimer: null,
    messages: {} // Track all uploaded messages
};

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing ET-Phone-Home Frontend...');

    // Setup tab navigation
    setupTabs();

    // Setup audio controls
    setupAudioControls();

    // Setup video controls
    setupVideoControls();

    // Setup alerts
    setupAlerts();

    // Initialize Firebase
    try {
        const fbReady = await initializeFirebase();
        appState.firebaseReady = fbReady;

        if (!fbReady) {
            showAlert('Firebase Configuration Required', 
                     'Please update firebaseConfig in js/config.js with your Firebase credentials.',
                     'warning');
        } else {
            updateConnectionStatus(true);
            loadAvailableDevices();
            setupStatusListeners();
        }
    } catch (error) {
        console.error('Initialization error:', error);
        showAlert('Initialization Failed', error.message, 'error');
    }

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        mediaCapture.cleanup();
    });
});

// ============================================================================
// TAB MANAGEMENT
// ============================================================================

function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');

            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            document.getElementById(tabName).classList.add('active');

            appState.currentTab = tabName;
        });
    });
}

// ============================================================================
// AUDIO CONTROLS
// ============================================================================

function setupAudioControls() {
    const startBtn = document.getElementById('startAudioBtn');
    const stopBtn = document.getElementById('stopAudioBtn');
    const playBtn = document.getElementById('playAudioBtn');
    const clearBtn = document.getElementById('clearAudioBtn');
    const uploadBtn = document.getElementById('uploadAudioBtn');

    startBtn.addEventListener('click', startAudioRecording);
    stopBtn.addEventListener('click', stopAudioRecording);
    playBtn.addEventListener('click', playAudioPreview);
    clearBtn.addEventListener('click', clearAudioRecording);
    uploadBtn.addEventListener('click', uploadAudioMessage);
}

async function startAudioRecording() {
    try {
        const startBtn = document.getElementById('startAudioBtn');
        const stopBtn = document.getElementById('stopAudioBtn');

        // Initialize recording
        await mediaCapture.initAudioRecording();
        mediaCapture.startAudioRecording();

        // Update UI
        startBtn.disabled = true;
        stopBtn.disabled = false;
        appState.audioRecordingDuration = 0;

        // Start timer
        appState.audioTimer = setInterval(() => {
            appState.audioRecordingDuration++;
            updateAudioStatus(`Recording... ${formatTime(appState.audioRecordingDuration)}`, 'info');
        }, 1000);

        updateAudioStatus('Recording started', 'info');
    } catch (error) {
        updateAudioStatus(`Error: ${error.message}`, 'error');
        console.error('Audio recording error:', error);
    }
}

function stopAudioRecording() {
    try {
        const startBtn = document.getElementById('startAudioBtn');
        const stopBtn = document.getElementById('stopAudioBtn');
        const playBtn = document.getElementById('playAudioBtn');
        const clearBtn = document.getElementById('clearAudioBtn');
        const uploadBtn = document.getElementById('uploadAudioBtn');

        // Stop recording
        mediaCapture.stopAudioRecording();

        // Stop timer
        if (appState.audioTimer) {
            clearInterval(appState.audioTimer);
        }

        // Update UI
        startBtn.disabled = false;
        stopBtn.disabled = true;
        playBtn.disabled = false;
        clearBtn.disabled = false;
        uploadBtn.disabled = false;

        const size = mediaCapture.audioChunks.length > 0 
            ? mediaCapture.audioChunks.reduce((sum, chunk) => sum + chunk.size, 0)
            : 0;

        updateAudioStatus(
            `Recording stopped. Duration: ${formatTime(appState.audioRecordingDuration)}, ` +
            `Size: ${(size / 1024).toFixed(1)}KB`,
            'success'
        );
    } catch (error) {
        updateAudioStatus(`Error: ${error.message}`, 'error');
        console.error('Error stopping audio:', error);
    }
}

async function playAudioPreview() {
    try {
        updateAudioStatus('Playing preview...', 'info');
        mediaCapture.playAudioPreview();
    } catch (error) {
        updateAudioStatus(`Error: ${error.message}`, 'error');
    }
}

function clearAudioRecording() {
    mediaCapture.clearAudioRecording();

    const startBtn = document.getElementById('startAudioBtn');
    const stopBtn = document.getElementById('stopAudioBtn');
    const playBtn = document.getElementById('playAudioBtn');
    const clearBtn = document.getElementById('clearAudioBtn');
    const uploadBtn = document.getElementById('uploadAudioBtn');

    startBtn.disabled = false;
    stopBtn.disabled = true;
    playBtn.disabled = true;
    clearBtn.disabled = true;
    uploadBtn.disabled = true;

    updateAudioStatus('Recording cleared', 'info');
}

async function uploadAudioMessage() {
    try {
        const targetDevice = document.getElementById('audioTarget').value;
        const caption = document.getElementById('audioCaption').value;

        if (!targetDevice.trim()) {
            updateAudioStatus('Please enter a target device ID', 'error');
            return;
        }

        if (mediaCapture.audioChunks.length === 0) {
            updateAudioStatus('No audio to upload', 'error');
            return;
        }

        // Validate device
        updateAudioStatus('Validating device...', 'info');
        const deviceValid = await mediaUploader.validateDevice(targetDevice);
        if (!deviceValid) {
            updateAudioStatus(`Device ${targetDevice} is not available`, 'warning');
        }

        // Get audio blob
        const audioBlob = await mediaCapture.getAudioBlob();
        updateAudioStatus('Audio validated. Uploading...', 'info');

        // Upload
        const result = await mediaUploader.uploadAudio(audioBlob, {
            caption,
            targetDevice,
            onProgress: (progress) => {
                updateAudioProgress(progress);
                updateAudioStatus(`Uploading: ${progress.toFixed(1)}%`, 'info');
            }
        });

        // Add to alerts
        addMessageAlert(result.messageId, {
            type: 'audio',
            caption: caption || 'Audio Message',
            device: targetDevice,
            status: 'uploaded'
        });

        // Setup status listener
        mediaUploader.onMessageStatusChanged(result.messageId, (status) => {
            updateMessageAlert(result.messageId, status.status);
        });

        updateAudioStatus('Upload successful!', 'success');
        clearAudioRecording();

    } catch (error) {
        updateAudioStatus(`Upload failed: ${error.message}`, 'error');
        console.error('Upload error:', error);
    }
}

function updateAudioStatus(message, type = 'info') {
    const statusEl = document.getElementById('audioStatus');
    statusEl.textContent = message;
    statusEl.className = `status-message show ${type}`;
}

function updateAudioProgress(progress) {
    const progressEl = document.getElementById('audioProgress');
    progressEl.style.width = `${progress}%`;
}

// ============================================================================
// VIDEO CONTROLS
// ============================================================================

function setupVideoControls() {
    const startBtn = document.getElementById('startVideoBtn');
    const stopBtn = document.getElementById('stopVideoBtn');
    const playBtn = document.getElementById('playVideoBtn');
    const clearBtn = document.getElementById('clearVideoBtn');
    const uploadBtn = document.getElementById('uploadVideoBtn');

    startBtn.addEventListener('click', startVideoRecording);
    stopBtn.addEventListener('click', stopVideoRecording);
    playBtn.addEventListener('click', playVideoPreview);
    clearBtn.addEventListener('click', clearVideoRecording);
    uploadBtn.addEventListener('click', uploadVideoMessage);
}

async function startVideoRecording() {
    try {
        const startBtn = document.getElementById('startVideoBtn');
        const stopBtn = document.getElementById('stopVideoBtn');
        const videoPreview = document.getElementById('videoPreview');

        // Initialize recording
        await mediaCapture.initVideoRecording(videoPreview);
        mediaCapture.startVideoRecording();

        // Update UI
        startBtn.disabled = true;
        stopBtn.disabled = false;
        appState.videoRecordingDuration = 0;

        // Start timer
        appState.videoTimer = setInterval(() => {
            appState.videoRecordingDuration++;
            updateVideoStatus(`Recording... ${formatTime(appState.videoRecordingDuration)}`, 'info');
        }, 1000);

        updateVideoStatus('Recording started', 'info');
    } catch (error) {
        updateVideoStatus(`Error: ${error.message}`, 'error');
        console.error('Video recording error:', error);
    }
}

function stopVideoRecording() {
    try {
        const startBtn = document.getElementById('startVideoBtn');
        const stopBtn = document.getElementById('stopVideoBtn');
        const playBtn = document.getElementById('playVideoBtn');
        const clearBtn = document.getElementById('clearVideoBtn');
        const uploadBtn = document.getElementById('uploadVideoBtn');

        // Stop recording
        mediaCapture.stopVideoRecording();

        // Stop timer
        if (appState.videoTimer) {
            clearInterval(appState.videoTimer);
        }

        // Update UI
        startBtn.disabled = false;
        stopBtn.disabled = true;
        playBtn.disabled = false;
        clearBtn.disabled = false;
        uploadBtn.disabled = false;

        const size = mediaCapture.videoChunks.length > 0
            ? mediaCapture.videoChunks.reduce((sum, chunk) => sum + chunk.size, 0)
            : 0;

        updateVideoStatus(
            `Recording stopped. Duration: ${formatTime(appState.videoRecordingDuration)}, ` +
            `Size: ${(size / 1024 / 1024).toFixed(2)}MB`,
            'success'
        );
    } catch (error) {
        updateVideoStatus(`Error: ${error.message}`, 'error');
        console.error('Error stopping video:', error);
    }
}

function playVideoPreview() {
    try {
        const videoPreview = document.getElementById('videoPreview');
        updateVideoStatus('Playing preview...', 'info');
        mediaCapture.playVideoPreview(videoPreview);
    } catch (error) {
        updateVideoStatus(`Error: ${error.message}`, 'error');
    }
}

function clearVideoRecording() {
    mediaCapture.clearVideoRecording();

    const startBtn = document.getElementById('startVideoBtn');
    const stopBtn = document.getElementById('stopVideoBtn');
    const playBtn = document.getElementById('playVideoBtn');
    const clearBtn = document.getElementById('clearVideoBtn');
    const uploadBtn = document.getElementById('uploadVideoBtn');
    const videoPreview = document.getElementById('videoPreview');

    startBtn.disabled = false;
    stopBtn.disabled = true;
    playBtn.disabled = true;
    clearBtn.disabled = true;
    uploadBtn.disabled = true;
    videoPreview.src = '';

    updateVideoStatus('Recording cleared', 'info');
}

async function uploadVideoMessage() {
    try {
        const targetDevice = document.getElementById('videoTarget').value;
        const caption = document.getElementById('videoCaption').value;

        if (!targetDevice.trim()) {
            updateVideoStatus('Please enter a target device ID', 'error');
            return;
        }

        if (mediaCapture.videoChunks.length === 0) {
            updateVideoStatus('No video to upload', 'error');
            return;
        }

        // Validate device
        updateVideoStatus('Validating device...', 'info');
        const deviceValid = await mediaUploader.validateDevice(targetDevice);
        if (!deviceValid) {
            updateVideoStatus(`Device ${targetDevice} is not available`, 'warning');
        }

        // Get video blob
        const videoBlob = await mediaCapture.getVideoBlob();
        updateVideoStatus('Video validated. Uploading...', 'info');

        // Upload
        const result = await mediaUploader.uploadVideo(videoBlob, {
            caption,
            targetDevice,
            duration: appState.videoRecordingDuration,
            onProgress: (progress) => {
                updateVideoProgress(progress);
                updateVideoStatus(`Uploading: ${progress.toFixed(1)}%`, 'info');
            }
        });

        // Add to alerts
        addMessageAlert(result.messageId, {
            type: 'video',
            caption: caption || 'Video Message',
            device: targetDevice,
            status: 'uploaded',
            duration: appState.videoRecordingDuration
        });

        // Setup status listener
        mediaUploader.onMessageStatusChanged(result.messageId, (status) => {
            updateMessageAlert(result.messageId, status.status);
        });

        updateVideoStatus('Upload successful!', 'success');
        clearVideoRecording();

    } catch (error) {
        updateVideoStatus(`Upload failed: ${error.message}`, 'error');
        console.error('Upload error:', error);
    }
}

function updateVideoStatus(message, type = 'info') {
    const statusEl = document.getElementById('videoStatus');
    statusEl.textContent = message;
    statusEl.className = `status-message show ${type}`;
}

function updateVideoProgress(progress) {
    const progressEl = document.getElementById('videoProgress');
    progressEl.style.width = `${progress}%`;
}

// ============================================================================
// ALERTS AND STATUS
// ============================================================================

function setupAlerts() {
    // Alerts container is already in HTML
}

function addMessageAlert(messageId, info) {
    const alertsList = document.getElementById('alertsList');

    // Remove placeholder if exists
    const placeholder = alertsList.querySelector('.placeholder');
    if (placeholder) {
        placeholder.remove();
    }

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert-item ${info.status}`;
    alertDiv.id = `alert-${messageId}`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'alert-content';

    const title = document.createElement('h4');
    title.textContent = `${info.type.toUpperCase()}: ${info.caption}`;

    const details = document.createElement('p');
    details.textContent = `Device: ${info.device} | Duration: ${formatTime(info.duration || 0)}`;

    contentDiv.appendChild(title);
    contentDiv.appendChild(details);

    const statusDiv = document.createElement('div');
    statusDiv.className = 'alert-status';
    statusDiv.textContent = info.status.toUpperCase();

    alertDiv.appendChild(contentDiv);
    alertDiv.appendChild(statusDiv);

    alertsList.insertBefore(alertDiv, alertsList.firstChild);

    // Store message info
    appState.messages[messageId] = info;
}

function updateMessageAlert(messageId, status) {
    const alertEl = document.getElementById(`alert-${messageId}`);
    if (alertEl) {
        alertEl.className = `alert-item ${status}`;
        const statusDiv = alertEl.querySelector('.alert-status');
        if (statusDiv) {
            statusDiv.textContent = status.toUpperCase();
        }
    }
}

function updateConnectionStatus(connected) {
    appState.isConnected = connected;
    const statusBadge = document.querySelector('.status-badge');
    if (statusBadge) {
        statusBadge.textContent = connected ? 'Connected' : 'Disconnected';
        statusBadge.className = `status-badge ${connected ? 'connected' : 'disconnected'}`;
    }
}

function showAlert(title, message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
    // Could implement a global alert UI here
}

// ============================================================================
// UTILITIES
// ============================================================================

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ============================================================================
// DEVICE MANAGEMENT
// ============================================================================

async function loadAvailableDevices() {
    try {
        const devices = await mediaUploader.getAvailableDevices();
        console.log('Available devices:', devices);

        // Could populate device selectors with autocomplete
        devices.forEach(device => {
            console.log(`Device: ${device.id} - Status: ${device.status}`);
        });
    } catch (error) {
        console.error('Failed to load devices:', error);
    }
}

// ============================================================================
// STATUS LISTENERS
// ============================================================================

function setupStatusListeners() {
    // Listen for new messages in the delivery alerts
    try {
        const messagesRef = getDatabaseRef(DATABASE_PATHS.MESSAGES);
        messagesRef.limitToLast(50).on('child_added', (snapshot) => {
            const message = snapshot.val();
            console.log('New message status:', message);
        });
    } catch (error) {
        console.error('Failed to setup status listeners:', error);
    }
}
