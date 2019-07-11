# Services
Services are libraries that involves performing a certain action that no other code in the application can accomplish. For example, HTTP requests.

### Notes
##### Reusable
Services should have all it needs to function or passed in a configuration parameter to initialize. For example, in Firebase, we firstly initialize the library with the following code:
```js
// Initialize Firebase
var config = {
  apiKey: "<API_KEY>",
  authDomain: "<PROJECT_ID>.firebaseapp.com",
  databaseURL: "https://<DATABASE_NAME>.firebaseio.com",
  projectId: "<PROJECT_ID>",
  storageBucket: "<BUCKET>.appspot.com",
  messagingSenderId: "<SENDER_ID>",
};

firebase.initializeApp(config);
```

Afterwards, you can make any requests to Firebase.
```js
firebase.database().ref("MyTable");
```


##### Naming Convention
The vendors must be named after a vendor and not by their action. There should not be any `sync.js` file. Instead, there should be `Torc.js` with a `sync()` function definition.
