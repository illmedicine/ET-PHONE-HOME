/**
 * FIREBASE CONFIGURATION TEMPLATE
 * 
 * INSTRUCTIONS:
 * 1. Go to https://console.firebase.google.com/
 * 2. Create a new project or select existing
 * 3. Go to Project Settings (gear icon)
 * 4. Copy the values below from your Firebase project config
 * 5. Replace YOUR_* placeholders with actual values
 * 6. NEVER commit this file with real credentials to version control
 * 7. Use .gitignore to prevent accidental commits
 * 
 * For sensitive deployments:
 * - Use environment variables
 * - Load config from secure backend
 * - Use Firebase Authentication for access control
 */

// TODO: Replace with your Firebase project configuration
const firebaseConfig = {
    // Get from Firebase Console → Project Settings → Web API Key
    apiKey: "YOUR_API_KEY",
    
    // Format: {projectId}.firebaseapp.com
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    
    // From Firebase Console → Project Settings
    projectId: "YOUR_PROJECT_ID",
    
    // Format: {projectId}.appspot.com
    storageBucket: "YOUR_PROJECT.appspot.com",
    
    // Format: https://{projectId}.firebaseio.com
    databaseURL: "https://YOUR_PROJECT.firebaseio.com",
    
    // From Firebase Console → Project Settings → Service Accounts
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    
    // From Firebase Console → Your App ID
    appId: "YOUR_APP_ID"
};

/**
 * EXAMPLE (filled):
 * 
 * const firebaseConfig = {
 *     apiKey: "AIzaSyDsxXuqJW8z-q1KZj5K7B8L9M0N1O2P3Q4",
 *     authDomain: "et-phone-home.firebaseapp.com",
 *     projectId: "et-phone-home",
 *     storageBucket: "et-phone-home.appspot.com",
 *     databaseURL: "https://et-phone-home.firebaseio.com",
 *     messagingSenderId: "123456789012",
 *     appId: "1:123456789012:web:a1b2c3d4e5f6g7h8i9j0"
 * };
 */

// Copy the firebaseConfig object from the template above into config.js
// Then uncomment and customize the rest of config.js
