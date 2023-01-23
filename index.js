const airtable = require('airtable-plus');
const express = require('express');
const app = express();
const http = require("http").createServer(app);
const fs = require("fs");
const path = require('path');
const ejs = require('ejs');
const Chart = require('chart.js');

// const { apiKey, baseID } = require("./keys.js");
const apiKey = process.env.apiKey;
const baseID = process.env.baseID;

const hallsTable = new airtable({tableName: "Halls", apiKey, baseID});
const competitionsTable = new airtable({tableName: "Competitions", apiKey, baseID});

const hallLabels = [1501, 1502, 1503, 1504, 1505, 1506, 1507];
const ordinals = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh'];

// set the view engine to ejs
app.set('view engine', 'ejs');

app.use(express.static(__dirname + "/public"));

app.set('views', path.join(__dirname, '/public/views'));

app.get('/', async (req, res) => {
	res.set('Cache-Control', 'public, max-age=25200');

    let pointData = await getPoints();
    let colorData = await getHallColors();
    res.render('index.ejs', {
        points: pointData,
        colors: colorData
    });
});


const server = http.listen(8080, () => {
    const host = server.address().address;
    const port = server.address().port;
  
    console.log(`App listening at http://localhost:${port}`);
});


async function getHallColors()
{
    let array = [];
    let data = await hallsTable.read();
    for (let i = 0; i < data.length; i++)
    {
        array.push(data[i].fields);
    }

    let colors = ['', '', '', '', '', '', ''];
    for (i = 0; i < array.length; i++)
    {
        colors[parseInt(array[i]["Hall"]) - 1 - 1500] = array[i]["Color"].toString();
    }
    return colors;
}

async function getPoints()
{
    let array = [];
    let data = await competitionsTable.read();

    for (let i = 0; i < data.length; i++)
    {
        array.push(data[i].fields);
    }

    let points = [0, 0, 0, 0, 0, 0, 0];

    array.forEach( game => {
        let max = parseInt(game["Max Points"]);
        let inc = parseInt(game["Increment"]);
        ordinals.forEach( place => {
            let rank = ordinals.indexOf(place) + 1; // rank 1-7
            let halls = game[place + ' Place'].split(', '); // split in case of ties
            halls.forEach( hall => {
                let idx = parseInt(hall) % 10 - 1 ; // 1501 -> 0, 1502 -> 1, etc.
                if (idx == -1) return; // happens when place was empty for game (i.e. tie or no show [riddles])
                points[idx] += max - (inc * (rank - 1));
            });
        });
    });
    let deducationData = await hallsTable.read();
    for (i = 0; i < deducationData.length; i++)
    {
        points[deducationData[i].fields["Hall"].substring(3, 4) - 1] -= deducationData[i].fields["Penalty Points"];
    }

    return points;
}