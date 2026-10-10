# Firebase Cloud Functions

## How to Deploy `createStaffUser` Function

1. **Install Firebase CLI**:
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Initialize Functions (if needed)**:
   ```bash
   firebase use <your-project-id>
   ```

4. **Install Functions Dependencies**:
   ```bash
   cd functions
   npm install
   ```

5. **Deploy Functions**:
   ```bash
   firebase deploy --only functions
   ```

The client app includes a local secondary Firebase app fallback so you can test creating staff users directly during development without deploying functions first, while preventing the active admin from being logged out.
