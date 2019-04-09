const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const mongo = require("mongoose");

const host = 'localhost:27017';
const dbName = 'schedulator';

var db = mongo.connect("mongodb://" + host + "/" + dbName, (err, response) => {
    if (err) {console.log(err);}
    else {console.log('Successfully connected to Mongodb!');}
});

var app = express();
app.use(bodyParser());
app.use(bodyParser.json({limit: '5mb'}));
app.use(bodyParser.urlencoded({extended: true}));

app.use(function(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:4200');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});

const SettingsSchema = new mongo.Schema({
    timeslots: [String],
    batches: [String],
    rooms: [String],
    teachers: [String],
}, {versionKey: false});

var settingsModel = mongo.model('settings', SettingsSchema, 'settings');

// get settings data
app.get('/settings/all', (req, res) => {
    console.log('Received request: ' + req.url);
    // let's assume for now there is only one entry in settings collection
    settingsModel.findOne({}, function(err, data) {
        if (err) {res.status(500).send(err.message);}
        else {res.send(data);}
    });
});

// update settings
app.post('/settings/save', (req, res) => {
    console.log('Received POST request on ' + req.url);
    const toInsert = new settingsModel(req.body);
    console.log('Updating settings: ' + JSON.stringify(toInsert));
    settingsModel.findOneAndUpdate({}, toInsert, (err) => {
        if (err) {res.status(500).send(err.message);}
        else {res.status(200).send('Settings successfully updated!');}
    });
});

const ScheduleSchema = new mongo.Schema({
    time: String,
    batch: String,
    room: String,
    teacher: String,
    subject: String
}, {versionKey: false});

var model = mongo.model('schedules', ScheduleSchema, 'schedules');

// get all schedule data
app.get('/schedules/all', (req, res) => {
    console.log('Received request: ' + req.url);
    model.find({}, function(err, data) {
        if (err) {res.status(500).send(err.message);}
        else {res.send(data);}
    });
});

// get all schedules per teacher, room or batch 
app.get('/schedules/find', (req, res) => {
    console.log('Received request: ' + req.url + ' with search query: ' + req.query);
    if (req.query.teacher) {
        model.find({teacher: req.query.teacher}, function(err, data) {
            if (err) {res.status(500).send(err.message);}
            else {res.send(data);}
        });
    } else if (req.query.room) {
        model.find({room: req.query.room}, function(err, data) {
            if (err) {res.status(500).send(err.message);}
            else {res.send(data);}
        });
    } else if (req.query.batch) {
        model.find({batch: req.query.batch}, function(err, data) {
            if (err) {res.status(500).send(err.message);}
            else {res.send(data);}
        });
    } else {
        res.status(500).send('Please specify either a room, a batch or a teacher in request parameters');
    }
});

// adding a new schedule entry
app.post('/schedules/save', (req, res) => {
    console.log('Received POST request on ' + req.url + ' with content ' + JSON.stringify(req.body));
    const mod = new model(req.body);
    
    // Find first to see if no conflicts on the time slot
    model.find({time: mod.time}, (err, data) => {
        if (err) {res.status(500).send(err.message);}
        else if (data) {
            var conflicts = [];
            data.forEach(element => {
                if (element.teacher == mod.teacher) {conflicts.push(mod.teacher + ' is already taken')}
                if (element.batch === mod.batch) {conflicts.push('Batch ' + mod.batch + ' is already taken')}
                if (element.room == mod.room) {conflicts.push(mod.room + ' is already taken')}
            });
            if (conflicts.length > 0) {
                console.log('Found the following conflicts: ' + JSON.stringify(conflicts));
                res.status(500).send(conflicts.join('. ') + '.');
            } else {
                console.log('No conflicting record found. Inserting...');
                mod.save((err, data) => {
                    if (err) {res.status(500).send(err.message);}
                    else {
                    	console.log('Record successfully inserted: ' + JSON.stringify(data));
                    	res.status(200).send('Successfully inserted!');
                    }
                });
            }
        }
    });

});

// deleting entry by ID
app.delete('/schedules/:id', (req, res) => {
    console.log('Received DELETE request on ' + req.url);
    model.deleteOne({_id: req.params.id}, err => {
        if (err) {res.status(500).send(err.message);}
        else {res.status(200).send('Record successfully deleted!');}
    }) 
});

// launching the app
app.listen('3000', function() {
    console.log('Schedulator listening on port 3000...');
})