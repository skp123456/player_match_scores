const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "cricketMatchDetails.db");

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () => {
      console.log("Server is Running at http://localhost:3000");
    });
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const convertDbObjToResponseObj = (dbObj) => {
  return {
    playerId: dbObj.player_id,
    playerName: dbObj.player_name,
  };
};

const convertMatchObjToResponseObj = (matchObj) => {
  return {
    matchId: matchObj.match_id,
    match: matchObj.match,
    year: matchObj.year,
  };
};

//Get players list API

app.get("/players/", async (request, response) => {
  const getPlayersListQuery = `

        SELECT *
        FROM player_details;
    `;
  const playersList = await db.all(getPlayersListQuery);
  response.send(
    playersList.map((eachPlayer) => convertDbObjToResponseObj(eachPlayer))
  );
});

//Get player API

app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerQuery = `

        SELECT *
        FROM player_details
        WHERE
        player_id = ${playerId};
    `;
  const player = await db.get(getPlayerQuery);
  response.send(convertDbObjToResponseObj(player));
});

//Update player details API

app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const playerDetails = request.body;
  const { playerName } = playerDetails;
  const updatePlayerDetailsQuery = `
        UPDATE player_details
        SET
        player_name = '${playerName}'
        WHERE
        player_id = ${playerId};
    `;
  await db.run(updatePlayerDetailsQuery);
  response.send("Player Details Updated");
});

//Get match details API

app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const getMatchQuery = `
        SELECT *
        FROM match_details
        WHERE
        match_id = ${matchId};
    `;
  const match = await db.get(getMatchQuery);
  response.send(convertMatchObjToResponseObj(match));
});

//Get match list API

app.get("/players/:playerId/matches", async (request, response) => {
  const { playerId } = request.params;
  const getMatchListQuery = `
    SELECT 
    match_details.match_id,
    match_details.match,
    match_details.year
    FROM match_details
    INNER JOIN player_match_score
    ON match_details.match_id = player_match_score.match_id
    WHERE
    player_match_score.player_id = ${playerId};
    `;
  const matchList = await db.all(getMatchListQuery);
  response.send(
    matchList.map((eachObj) => convertMatchObjToResponseObj(eachObj))
  );
});

//Get players list API

app.get("/matches/:matchId/players", async (request, response) => {
  const { matchId } = request.params;

  const getPlayersListByMatchQuery = `

        SELECT 
        player_details.player_id,
        player_details.player_name
        FROM player_details
        INNER JOIN player_match_score
        ON player_details.player_id = player_match_score.player_id
        WHERE
        player_match_score.match_id = ${matchId};
    `;
  const playerList = await db.all(getPlayersListByMatchQuery);
  response.send(
    playerList.map((eachObj) => convertDbObjToResponseObj(eachObj))
  );
});

//Get total data API

app.get("/players/:playerId/playerScores", async (request, response) => {
  const { playerId } = request.params;
  const getTotalDataQuery = `
        SELECT 
        player_details.player_id AS playerId,
        player_details.player_name AS playerName,
        SUM(player_match_score.score) AS totalScore,
        SUM(player_match_score.fours) AS totalFours,
        SUM(player_match_score.sixes) AS totalSixes
        FROM player_details
        INNER JOIN player_match_score
        ON player_details.player_id = player_match_score.player_id
        WHERE
        player_details.player_id = ${playerId};
    `;
  const totalData = await db.get(getTotalDataQuery);
  response.send(totalData);
});

module.exports = app;
