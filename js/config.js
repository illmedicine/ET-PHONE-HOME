/**
 * Firebase Configuration Module
 * Manages initialization and access to Firebase services
 * Configure with your Firebase project credentials
 */

/**
 * Firebase Configuration for ET-Phone-Home
 * Project: ETPHONE
 * Project ID: etphone-d829e
 * Project Number: 127946177550
 * 
 * IMPORTANT: 
 * - apiKey and appId MUST be obtained from Firebase Console
 * - Other fields are auto-configured from project specs
 */
const firebaseConfig = {
    apiKey: "AIzaSyBjrCgXfr_csV72_fxGW98xv-brJrgZxPU",
    authDomain: "etphone-d829e.firebaseapp.com",
    projectId: "etphone-d829e",
    storageBucket: "etphone-d829e.firebasestorage.app",
    databaseURL: "https://etphone-d829e.firebaseio.com",
    messagingSenderId: "127946177550",
    appId: "1:127946177550:web:0f3bb82ca8d2ce9261505f"
};

// Initialize Firebase
let firebase_app = null;
let firebase_storage = null;
let firebase_database = null;
let firebase_firestore = null;

/**
 * Initialize Firebase services
 * @returns {Promise<boolean>} - true if initialization successful
 */
async function initializeFirebase() {
    try {
        // Check if config has been set
        if (firebaseConfig.apiKey === "YOUR_API_KEY") {
            console.warn("Firebase configuration not set. Please update firebaseConfig in config.js");
            return false;
        }

        // Initialize Firebase
        firebase_app = firebase.initializeApp(firebaseConfig);

        // Get references to services
        firebase_storage = firebase.storage();
        firebase_database = firebase.database();
        firebase_firestore = firebase.firestore();

        console.log("Firebase initialized successfully");
        return true;
    } catch (error) {
        console.error("Firebase initialization failed:", error);
        return false;
    }
}

/**
 * Get Firebase Storage reference
 * @returns {firebase.storage.Storage}
 */
function getStorage() {
    if (!firebase_storage) {
        throw new Error("Firebase Storage not initialized");
    }
    return firebase_storage;
}

/**
 * Get Firebase Database reference
 * @returns {firebase.database.Database}
 */
function getDatabase() {
    if (!firebase_database) {
        throw new Error("Firebase Database not initialized");
    }
    return firebase_database;
}

/**
 * Get Firebase Firestore reference
 * @returns {firebase.firestore.Firestore}
 */
function getFirestore() {
    if (!firebase_firestore) {
        throw new Error("Firebase Firestore not initialized");
    }
    return firebase_firestore;
}

/**
 * Get a reference to a storage file
 * @param {string} path - Path to the file in storage
 * @returns {firebase.storage.Reference}
 */
function getStorageRef(path) {
    return getStorage().ref(path);
}

/**
 * Get a reference to a database path
 * @param {string} path - Path to the data in database
 * @returns {firebase.database.Reference}
 */
function getDatabaseRef(path) {
    return getDatabase().ref(path);
}

/**
 * Get a reference to a Firestore collection/document
 * @param {string} path - Path to the document (e.g., 'collection/document')
 * @returns {firebase.firestore.DocumentReference}
 */
function getFirestoreRef(path) {
    const parts = path.split('/');
    let ref = getFirestore();
    for (let part of parts) {
        ref = ref.collection(part);
    }
    return ref;
}

// Configuration constants for media constraints
const MEDIA_CONFIG = {
    AUDIO: {
        sampleRate: 16000, // 16kHz for voice announcements
        channels: 1, // Mono only
        maxSize: 500 * 1024, // 500 KB max for audio payloads
        mimeType: 'audio/wav'
    },
    VIDEO: {
        width: 240,
        height: 240, // or 320x240
        fps: 15,
        maxSize: 2 * 1024 * 1024, // 2 MB max for video payloads
        mimeType: 'video/webm'
    }
};

// Storage bucket paths
const STORAGE_PATHS = {
    AUDIO: 'audio-messages',
    VIDEO: 'video-messages',
    METADATA: 'metadata'
};

// Database paths
const DATABASE_PATHS = {
    DEVICES: 'devices',
    MESSAGES: 'messages',
    STATUS: 'status'
};

// Firestore collections
const FIRESTORE_COLLECTIONS = {
    DEVICES: 'devices',
    MESSAGES: 'messages',
    STATUS: 'message-status'
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeFirebase,
        getStorage,
        getDatabase,
        getFirestore,
        getStorageRef,
        getDatabaseRef,
        getFirestoreRef,
        MEDIA_CONFIG,
        STORAGE_PATHS,
        DATABASE_PATHS,
        FIRESTORE_COLLECTIONS
    };
}
