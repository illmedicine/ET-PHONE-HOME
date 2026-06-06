/**
 * Media Upload and Firebase Signaling Module
 * Handles uploading media to Firebase Storage and triggering device notifications
 */

class MediaUploader {
    constructor() {
        this.uploads = {}; // Track ongoing uploads
        this.messageId = 0;
    }

    /**
     * Generate unique message ID
     * @returns {string}
     */
    generateMessageId() {
        return `msg_${Date.now()}_${++this.messageId}`;
    }

    /**
     * Build metadata JSON payload
     * @param {Object} options
     * @returns {Object}
     */
    buildMetadata(options) {
        const {
            messageId,
            type, // 'audio' or 'video'
            caption,
            targetDevice,
            fileSize,
            duration,
            timestamp
        } = options;

        return {
            id: messageId,
            type: type,
            caption: caption || '',
            targetDevice: targetDevice,
            fileSize: fileSize,
            duration: duration || 0,
            timestamp: timestamp || new Date().toISOString(),
            status: 'pending',
            uploadedAt: new Date().toISOString()
        };
    }

    /**
     * Upload audio message to Firebase Storage
     * @param {Blob} audioBlob
     * @param {Object} options
     * @returns {Promise<Object>} - Upload result with metadata
     */
    async uploadAudio(audioBlob, options) {
        const {
            caption = '',
            targetDevice,
            onProgress = null
        } = options;

        try {
            const messageId = this.generateMessageId();
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const storePath = `${STORAGE_PATHS.AUDIO}/${targetDevice}/${messageId}.webm`;

            // Build metadata
            const metadata = this.buildMetadata({
                messageId,
                type: 'audio',
                caption,
                targetDevice,
                fileSize: audioBlob.size,
                timestamp
            });

            // Create storage reference
            const storageRef = getStorageRef(storePath);

            // Start upload
            const uploadTask = storageRef.put(audioBlob, {
                contentType: 'audio/webm',
                customMetadata: {
                    messageId: messageId,
                    caption: caption,
                    targetDevice: targetDevice
                }
            });

            // Handle upload progress
            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    if (onProgress) onProgress(progress);
                },
                (error) => {
                    throw new Error(`Upload failed: ${error.message}`);
                }
            );

            // Wait for completion
            await uploadTask;

            // Get download URL
            const downloadUrl = await storageRef.getDownloadURL();

            // Publish signaling message to device
            await this.signalDevice(targetDevice, {
                messageId: messageId,
                type: 'audio',
                downloadUrl: downloadUrl,
                metadata: metadata
            });

            // Update status database
            await this.updateMessageStatus(messageId, 'uploaded', {
                downloadUrl: downloadUrl,
                metadata: metadata
            });

            return {
                success: true,
                messageId: messageId,
                downloadUrl: downloadUrl,
                metadata: metadata
            };
        } catch (error) {
            console.error('Audio upload failed:', error);
            throw error;
        }
    }

    /**
     * Upload video message to Firebase Storage
     * @param {Blob} videoBlob
     * @param {Object} options
     * @returns {Promise<Object>} - Upload result with metadata
     */
    async uploadVideo(videoBlob, options) {
        const {
            caption = '',
            targetDevice,
            onProgress = null,
            duration = 0
        } = options;

        try {
            const messageId = this.generateMessageId();
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const storePath = `${STORAGE_PATHS.VIDEO}/${targetDevice}/${messageId}.webm`;

            // Build metadata
            const metadata = this.buildMetadata({
                messageId,
                type: 'video',
                caption,
                targetDevice,
                fileSize: videoBlob.size,
                duration: duration,
                timestamp
            });

            // Create storage reference
            const storageRef = getStorageRef(storePath);

            // Start upload
            const uploadTask = storageRef.put(videoBlob, {
                contentType: 'video/webm',
                customMetadata: {
                    messageId: messageId,
                    caption: caption,
                    targetDevice: targetDevice,
                    duration: duration.toString()
                }
            });

            // Handle upload progress
            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    if (onProgress) onProgress(progress);
                },
                (error) => {
                    throw new Error(`Upload failed: ${error.message}`);
                }
            );

            // Wait for completion
            await uploadTask;

            // Get download URL
            const downloadUrl = await storageRef.getDownloadURL();

            // Publish signaling message to device
            await this.signalDevice(targetDevice, {
                messageId: messageId,
                type: 'video',
                downloadUrl: downloadUrl,
                metadata: metadata
            });

            // Update status database
            await this.updateMessageStatus(messageId, 'uploaded', {
                downloadUrl: downloadUrl,
                metadata: metadata
            });

            return {
                success: true,
                messageId: messageId,
                downloadUrl: downloadUrl,
                metadata: metadata
            };
        } catch (error) {
            console.error('Video upload failed:', error);
            throw error;
        }
    }

    /**
     * Signal device via Firebase Realtime Database
     * Write to a device-specific queue that the ESP32 monitors
     * @param {string} deviceId
     * @param {Object} message
     * @returns {Promise<void>}
     */
    async signalDevice(deviceId, message) {
        try {
            const deviceRef = getDatabaseRef(`${DATABASE_PATHS.DEVICES}/${deviceId}/messages`);

            // Add message to device queue
            await deviceRef.push({
                ...message,
                queuedAt: firebase.database.ServerValue.TIMESTAMP,
                status: 'pending'
            });

            console.log(`Device ${deviceId} signaled for message ${message.messageId}`);
        } catch (error) {
            console.error('Device signaling failed:', error);
            throw error;
        }
    }

    /**
     * Update message status in database
     * @param {string} messageId
     * @param {string} status - 'pending', 'uploaded', 'acknowledged', 'played', 'failed'
     * @param {Object} metadata
     * @returns {Promise<void>}
     */
    async updateMessageStatus(messageId, status, metadata = {}) {
        try {
            const statusRef = getDatabaseRef(`${DATABASE_PATHS.MESSAGES}/${messageId}`);

            await statusRef.update({
                status: status,
                statusUpdatedAt: firebase.database.ServerValue.TIMESTAMP,
                ...metadata
            });

            console.log(`Message ${messageId} status updated to: ${status}`);
        } catch (error) {
            console.error('Status update failed:', error);
            throw error;
        }
    }

    /**
     * Listen for message status updates
     * @param {string} messageId
     * @param {Function} callback
     * @returns {Function} - Unsubscribe function
     */
    onMessageStatusChanged(messageId, callback) {
        try {
            const statusRef = getDatabaseRef(`${DATABASE_PATHS.MESSAGES}/${messageId}`);

            const listener = statusRef.on('value', (snapshot) => {
                if (snapshot.exists()) {
                    callback(snapshot.val());
                }
            });

            // Return unsubscribe function
            return () => {
                statusRef.off('value', listener);
            };
        } catch (error) {
            console.error('Failed to setup status listener:', error);
            throw error;
        }
    }

    /**
     * Validate target device exists and is connected
     * @param {string} deviceId
     * @returns {Promise<boolean>}
     */
    async validateDevice(deviceId) {
        try {
            const deviceRef = getDatabaseRef(`${DATABASE_PATHS.DEVICES}/${deviceId}`);
            const snapshot = await deviceRef.once('value');

            if (!snapshot.exists()) {
                throw new Error(`Device ${deviceId} not found`);
            }

            const device = snapshot.val();
            if (device.status !== 'connected' && device.status !== 'online') {
                console.warn(`Device ${deviceId} is not connected (status: ${device.status})`);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Device validation failed:', error);
            return false;
        }
    }

    /**
     * Get list of available devices
     * @returns {Promise<Array>}
     */
    async getAvailableDevices() {
        try {
            const devicesRef = getDatabaseRef(DATABASE_PATHS.DEVICES);
            const snapshot = await devicesRef.once('value');

            if (!snapshot.exists()) {
                return [];
            }

            const devices = [];
            snapshot.forEach((childSnapshot) => {
                const device = childSnapshot.val();
                devices.push({
                    id: childSnapshot.key,
                    ...device
                });
            });

            return devices;
        } catch (error) {
            console.error('Failed to get devices:', error);
            return [];
        }
    }

    /**
     * Get message delivery status
     * @param {string} messageId
     * @returns {Promise<Object>}
     */
    async getMessageStatus(messageId) {
        try {
            const statusRef = getDatabaseRef(`${DATABASE_PATHS.MESSAGES}/${messageId}`);
            const snapshot = await statusRef.once('value');

            if (!snapshot.exists()) {
                throw new Error(`Message ${messageId} not found`);
            }

            return snapshot.val();
        } catch (error) {
            console.error('Failed to get message status:', error);
            return null;
        }
    }

    /**
     * Cancel ongoing upload
     * @param {string} messageId
     * @returns {Promise<void>}
     */
    async cancelUpload(messageId) {
        try {
            if (this.uploads[messageId]) {
                // Abort the upload task
                this.uploads[messageId].cancel();
                delete this.uploads[messageId];

                // Update status
                await this.updateMessageStatus(messageId, 'cancelled');
            }
        } catch (error) {
            console.error('Failed to cancel upload:', error);
            throw error;
        }
    }
}

// Create global instance
const mediaUploader = new MediaUploader();
