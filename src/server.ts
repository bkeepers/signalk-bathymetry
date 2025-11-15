import express from "express";
import { createApi } from "./api.js";

const PORT = process.env.PORT || 3000;

const app = express();
app.use(createApi());
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
