var fs = require('fs');
var express = require('express');
var path = require('path');
var app = express();
const bodyParser = require('body-parser');
const usersFilePath = './users.json';
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
require('dotenv').config();


const cors = require('cors');
app.use(cors());

app.use((req, res, next) => {
  // CORS policy hatası almamak için. Cors policy hatası front ve back farklı portta olunca alınıyor.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,PATCH");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = process.env.DB;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.render('login');
});

let loggedInUser = '';

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    await client.connect();
    const db = client.db('sample_mflix');
    const users = db.collection('users');
    const user = await users.findOne({ username: username, password: password });

    if (user) {
      loggedInUser = user.username; // Kullanıcı adını geçici olarak tut
      res.redirect('/mainpage');
    } else {
      res.send('Your username or password is wrong');
    }
  } catch (err) {
    console.error('MongoDB connection error:', err);
    res.status(500).send('An error occurred');
  } finally {
    await client.close();
  }
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', async (req, res) => {
  const { username, password, name, mail } = req.body;

  try {
    await client.connect();
    const db = client.db('sample_mflix');
    const users = db.collection('users');

    // Kullanıcı adı veya e-posta zaten kullanılıyor mu kontrol et
    const existingUser = await users.findOne({
      $or: [{ username: username }, { mail: mail }]
    });

    if (existingUser) {
      res.send('Username or email already exists');
      return;
    }

    // Yeni kullanıcıyı kaydet
    const newUser = {
      username: username,
      password: password,
      name: name,
      visitedMuseums: [],
      wantToVisitMuseums: [],
      mail: mail
    };

    await users.insertOne(newUser);
    res.redirect('/login'); // Login sayfasına yönlendir

  } catch (err) {
    console.error('MongoDB connection error:', err);
    res.status(500).send('An error occurred');

  } finally {
    await client.close();
  }
});

app.get('/mainpage', async (req, res) => {
  try {
    await client.connect();
    const db = client.db('sample_mflix');
    const users = db.collection('users');
    const user = await users.findOne({ username: loggedInUser });

    const visitedMuseums = user.visitedMuseums || [];
    const wantToVisitMuseums = user.wantToVisitMuseums || [];

    res.render('index', { username: loggedInUser, visitedMuseums, wantToVisitMuseums });
  } catch (err) {
    console.error('MongoDB connection error:', err);
    res.status(500).send('An error occurred');
  } finally {
    await client.close();
  }
});

app.post('/save-visit', async (req, res) => {
  const { museumName, status } = req.body;

  try {
    await client.connect();
    const db = client.db('sample_mflix');
    const users = db.collection('users');

    if (status === 'visited') {
      await users.updateOne(
        { username: loggedInUser },
        { $addToSet: { visitedMuseums: museumName } }
      );
    }
    if (status === 'wishlist') {
      await users.updateOne(
        { username: loggedInUser },
        { $addToSet: { wantToVisitMuseums: museumName } }
      );
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('MongoDB connection error:', err);
    res.status(500).send('An error occurred');
  } finally {
    await client.close();
  }
});

app.get('/search', (req, res) => {
  res.render('search');
});

app.get('/user-profile', async (req, res) => {
  const { username } = req.query;

  try {
    await client.connect();
    const db = client.db('sample_mflix');
    const users = db.collection('users');

    const userProfile = await users.findOne({ username });

    if (userProfile) {
      res.render('user-profile', { userProfile });
    } else {
      res.render('search', { errorMessage: 'User not found' });
    }
  } catch (err) {
    console.error('MongoDB connection error:', err);
    res.status(500).send('An error occurred');
  } finally {
    await client.close();
  }
});

app.get('/leaderboard', async (req, res) => {
  try {
    await client.connect();
    const db = client.db('sample_mflix');
    const users = db.collection('users');

    const leaderboardData = await users
      .aggregate([
        { $project: { username: 1, visitedMuseumsCount: { $size: '$visitedMuseums' } } },
        { $sort: { visitedMuseumsCount: -1 } },
        { $limit: 10 },
      ])
      .toArray();

      res.json({ leaderboardData }); // Pass leaderboardData directly as a local variable

  } catch (err) {
    console.error('MongoDB query error:', err);
    res.status(500).send('An error occurred');
  } finally {
    await client.close();
  }
});

app.get('/logout', (req, res) => {
  loggedInUser = ''; // Geçici kullanıcıyı temizle
  res.redirect('/');
});


var iller = require('./app_server/routes/illerRoute');

var mainController = function (req, res) {
  res.render('index', { username: loggedInUser });
};

var searchController = function (req, res) {
  res.render('search', { username: loggedInUser });
};

/*var mapController = function(req, res) {
  res.render('iller', { username: loggedInUser });
};*/

var profileController = async function(req, res) {
  try {
    await client.connect();
    const db = client.db('sample_mflix');
    const users = db.collection('users');
    const user = await users.findOne({ username: loggedInUser });

    const visitedMuseums = user.visitedMuseums || [];
    const wantToVisitMuseums = user.wantToVisitMuseums || [];

    res.render('profile', { username: loggedInUser, visitedMuseums, wantToVisitMuseums });
  } catch (err) {
    console.error('MongoDB connection error:', err);
    res.status(500).send('An error occurred');
  } finally {
    await client.close();
  }
};

var leaderboardController = function(req, res) {
  res.render('leaderboard', { username: loggedInUser });
};


app.get('/mainpage', mainController);
app.get('/mainpage/search', searchController);
app.get('/mainpage/profile', profileController);
app.get('/mainpage/leaderboard', leaderboardController);
//app.get('/mainpage/map', mapController);
app.use('/mainpage/map', iller);
app.listen(process.env.PORT || 1907);