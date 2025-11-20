import express from "express";
import { createApi } from "./api.js";

const app = express();
app.use(createApi());

export default app;
