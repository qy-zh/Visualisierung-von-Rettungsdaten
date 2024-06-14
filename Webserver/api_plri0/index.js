import express from "express";
import bodyParser from 'body-parser';
import router from "./routes/index.js";
import cors from "cors";
const app = express();
const PORT = 5000;
app.use(cors({ origin: '*' }));
app.use(bodyParser.json());
app.use("/", router);

app.listen(PORT, () =>console.log(`Server running on port: http://localhost:${PORT}`));


