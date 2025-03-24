# Deploying Firebase Security Rules

To fix the "Missing or insufficient permissions" error, you need to deploy the Firestore security rules to your Firebase project. Follow these steps:

## Option 1: Using the Firebase Console (Recommended)

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project: "parkease-parastud"
3. In the left sidebar, click on "Firestore Database"
4. Click on the "Rules" tab
5. Copy the entire content from the `firestore.rules` file in your project
6. Paste it into the rules editor in the Firebase Console, replacing any existing content
7. Click "Publish" to deploy the rules

## Option 2: Using Firebase CLI (For future reference)

If you want to set up automated deployments in the future:

1. Install the Firebase CLI: `npm install -g firebase-tools`
2. Login to Firebase: `firebase login`
3. Initialize Firebase in your project: `firebase init firestore`
4. Deploy the rules: `firebase deploy --only firestore:rules`

## After Deploying Rules

1. Restart your app
2. The "Missing or insufficient permissions" error should be resolved
3. Your app should now be able to read and write to the Firestore database with proper permissions

## Troubleshooting

If you're still experiencing permission issues:
- Make sure you're signing in properly before accessing the database
- Check that your user has the necessary permissions according to the rules
- Verify that your app is using the correct Firebase project 