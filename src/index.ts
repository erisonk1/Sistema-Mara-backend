import express from "express";
import cors from "cors";
import router from "./routes";

const app = express();

app.use(cors({
  origin: "*", // em produção troque pelo domínio da Vercel ex: "https://sistema-mara.vercel.app"
}));

app.use(express.json());
app.use("/", router);

// Railway injeta PORT automaticamente. Em dev usa 4000.
const PORT = Number(process.env.PORT) || 4000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
