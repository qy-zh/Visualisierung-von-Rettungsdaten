import { config } from "../config.js";
import fs from 'fs';
import path from 'path';
import { parse } from "date-format-parse";

// Get accident by ID
export const getAccidentById = (req, res) => {
  const id = req.params.id;

  // Read the JSON file for the given ID
  const filePath =path.resolve(`./accidents/accident_${id}`);
  console.log(filePath);
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      res.status(404).json({ error: 'Accident not found' });
    } else {
      try {
        const accident = JSON.parse(data);
        res.json(accident);
        console.log("accident was sent");
      } catch (error) {
        res.status(500).json({ error: 'Failed to parse accident data' });
      }
    }
  });
};



// Delete expired accidents older than 5 hours
export const deleteExpiredAccidents = () => {
  const folderPath = path.resolve('./mockData/accidents');

  fs.readdir(folderPath, 'utf8', (err, files) => {
    if (err) {
      console.error('Failed to read accidents data:', err);
      return;
    }

    files.forEach((file) => {
      const filePath = path.join(folderPath, file);

      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          console.error(`Failed to read accident file ${file}:`, err);
          return;
        }

        try {
          const accident = JSON.parse(data);
          const { date, time } = accident;
          const accidentTimestamp = new Date(`${date} ${time}`).getTime();
          const currentTimestamp = Date.now();
          const fiveHoursInMillis = 5 * 60 * 60 * 1000;

          if (currentTimestamp - accidentTimestamp > fiveHoursInMillis) {
            fs.unlink(filePath, (err) => {
              if (err) {
                console.error(`Failed to delete accident file ${file}:`, err);
              } else {
                console.log(`Accident file ${file} deleted successfully.`);
              }
            });
          }
        } catch (error) {
          console.error(`Failed to parse accident data from file ${file}:`, error);
        }
      });
    });
  });
};

//Auto delete every 5 hours
export const autoDeleteExpiredAccidents = (req, res) => {
  const expirationPeriodInHours = 5;
  deleteExpiredAccidents(); // Call the function immediately

  // Call the function every 5 hours
  setInterval(() => {
    deleteExpiredAccidents();
  }, expirationPeriodInHours * 60 * 60 * 1000); 

  res.send('Expired accidents have been deleted.');
};

export const createISAN = async (req, res) => {
  try {
    const isanNumber = req.body.ISAN;
    const isanArray = isanNumber.split(";");
    console.log("1");
    checkValidity(isanArray);
    const newCrash = {
      longtitude: Number(isanArray[0])/100000,
      latitude: Number(isanArray[1])/100000,
      time:
        isanArray[2].substring(0, 2) +
        ":" +
        isanArray[2].substring(2, 4) +
        ":" +
        isanArray[2].substring(4, 6),
      date:
        isanArray[3].substring(0, 4) +
        "-" +
        isanArray[3].substring(4, 6) +
        "-" +
        isanArray[3].substring(6, 8),
      force: Number(isanArray[4]),
      speed: Number(isanArray[5]),
      hsnTsn: isanArray[6] + isanArray[7],
      registrationNumber: isanArray[8],
      numberOfPassengers: Number(isanArray[9]),
    };
    const params = {
      force: newCrash.force,
      speed: newCrash.speed,
      hsn: isanArray[6],
      tsn: isanArray[7],
    };

    const queryString = new URLSearchParams(params).toString();
    const requestUrl = `${config.simulationUrl}?${queryString}`;
    console.log(requestUrl);
    const response = await fetch(requestUrl);
    console.log("after fetch");
    const data = await response.json();
    console.log(data);
    console.log("2");
    newCrash.mesh = JSON.parse(data.message.mesh); //data
    searchAndGroupAccidents(newCrash);
  
    res.status(201).json({ message: "Accident added successfully" });
  } catch (error) {
    res.status(403).json({ message: error.message });
  }
};


function checkValidity(isanArray) {
  if (isanArray.length != 10) throw new Error("Invalid isan");
  if (!isanArray[0].match(/^[-+]\d{8}$/))
    throw new Error("Invalid longtitude format");
  if (!isanArray[1].match(/^[-+]\d{7}$/))
    throw new Error("Invalid latitude format");
  if (!isanArray[2].match(/^\d{6}$/)) throw new Error("Invalid time format");
  if (!isanArray[3].match(/^\d{8}$/)) throw new Error("Invalid date format");
  if (!isanArray[4].match(/^\d+$/)) throw new Error("Invalid force format");
  if (!isanArray[5].match(/^\d{1,3}$/)) throw new Error("Invalid speed format");
  if (!isanArray[6].match(/^\d{4}$/)) throw new Error("Invalid HSN format");
  if (!isanArray[7].match(/^\w{3}$/)) throw new Error("Invalid TSN format");
  if (!isanArray[8].match(/^.{1,8}$/))
    throw new Error("Invalid vehicle registration number format");
  if (!isanArray[9].match(/^\d$/))
    throw new Error("Invalid number of passengers format");
}

function searchAndGroupAccidents(newCrash) {
  console.log("3");
  const folderPath = "./accidents";
  const files = fs.readdirSync(folderPath);
  const timeThreshold = 60 * 1000; // 1 minute in milliseconds
  const distanceThreshold = 100; // 100 meters
  console.log("4");
  for (const file of files) {
    if (file ===".gitkeep") continue;
    const filePath = path.join(folderPath, file);
    console.log("4.5");
    const existingAccident = JSON.parse(fs.readFileSync(filePath).toString());
    console.log("4.9");
    const dateTimeFormat = "YYYY-MM-DDHH:mm:ss";
    console.log(newCrash.date + newCrash.time);
    const timeDiff = Math.abs(
      parse(newCrash.date + newCrash.time, dateTimeFormat).getTime() -
        parse(existingAccident.date + existingAccident.time, dateTimeFormat).getTime()
    );
    console.log(timeDiff);
    console.log("5");
    const dist = distance(
      newCrash.latitude,
      newCrash.longtitude,
      //here only the first car is considered, otherwise too complicated....
      existingAccident.cars[0].latitude,
      existingAccident.cars[0].longtitude
    );
    console.log(dist);
    console.log("6");
    if (timeDiff <= timeThreshold && dist <= distanceThreshold) {
      existingAccident.cars.push({
        latitude: newCrash.latitude,
        longtitude: newCrash.longtitude,
        mesh: newCrash.mesh,
        registrationNumber: newCrash.registrationNumber,
        hsnTsn: newCrash.hsnTsn,
        numberOfPassengers: newCrash.numberOfPassengers,
        force: newCrash.force,
        speed: newCrash.speed,
      });
      fs.writeFileSync(filePath, JSON.stringify(existingAccident));
      return;
    }
  }

  let id = 0;
  while (true) {
    if (files.find((file) => file === `accident_${String(id)}`)) {
      id++;
      continue;
    }
    break;
  }

  const newAccident = {
    time: newCrash.time,
    date: newCrash.date,
    id: id,
    cars: [
      {
        latitude: newCrash.latitude,
        longtitude: newCrash.longtitude,
        mesh: newCrash.mesh,
        registrationNumber: newCrash.registrationNumber,
        hsnTsn: newCrash.hsnTsn,
        numberOfPassengers: newCrash.numberOfPassengers,
        force: newCrash.force,
        speed: newCrash.speed,
      },
    ],
  };
  fs.writeFileSync(
    path.join(folderPath, `accident_${String(id)}`),
    JSON.stringify(newAccident)
  );
}

//Haversine formula
function distance(latitude1, longtitude1, latitude2, longtitude2) {
  console.log(latitude1, longtitude1, latitude2, longtitude2);
  const earthRadius = 6371e3;
  const phi1 = (latitude1 * Math.PI) / 180;
  const phi2 = (latitude2 * Math.PI) / 180;
  const deltaPhi = ((latitude2 - latitude1) * Math.PI) / 180;
  const deltaLambda = ((longtitude2 - longtitude1) * Math.PI) / 180;

  const firstTerm =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const centralAngle =
    2 * Math.atan2(Math.sqrt(firstTerm), Math.sqrt(1 - firstTerm));

  return earthRadius * centralAngle;
}

// // Get all accidents
// export const getAllAccidents = (req, res) => {
//   const folderPath = path.resolve('./mockData/accidents');

//   fs.readdir(folderPath, 'utf8', (err, files) => {
//     if (err) {
//       res.status(500).json({ error: 'Failed to read accidents data' });
//     } else {
//       const accidents = [];
//       let count = 0;

//       files.forEach((file, index) => {
//         const filePath = path.join(folderPath, file);
        
//         fs.readFile(filePath, 'utf8', (err, data) => {
//           if (err) {
//             count++;
//             if (count === files.length) {
//               res.json(accidents);
//             }
//           } else {
//             try {
//               const accident = JSON.parse(data);
//               accidents.push(accident);
//             } catch (error) {
//               console.error(`Failed to parse accident data from file ${file}`);
//             }

//             count++;
//             if (count === files.length) {
//               res.json(accidents);
//             }
//           }
//         });
//       });
//     }
//   });
// };
