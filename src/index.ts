import { Elysia } from "elysia";
import post from "./post";
import get from "./get";
import cors from "@elysiajs/cors";

const app = new Elysia()
    .use(cors())
    .get("/", () => "Hello Elysia")
    .use(post)
    .use(get)
    .listen(3000);

console.log(
    `🦊 API iDRG berjalan di ${app.server?.hostname}:${app.server?.port}`
);
