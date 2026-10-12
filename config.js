const firebaseConfig = {
  apiKey: "AIzaSyBX3WfzrgP6zpetgC8tOXvvSO4D7DBQcbQ",
  authDomain: "proyecto-tecnologico-9fb83.firebaseapp.com",
  projectId: "proyecto-tecnologico-9fb83",
  storageBucket: "proyecto-tecnologico-9fb83.firebasestorage.app",
  messagingSenderId: "73308891003",
  appId: "1:73308891003:web:09f955dd1daefb8f34ffde",
  measurementId: "G-BEEQXX02H3"
};

const FIREBASE_OK = !!firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith("PEGA");
let auth = null,
  db = null;
if (FIREBASE_OK) {
  firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
  db = firebase.firestore();
}