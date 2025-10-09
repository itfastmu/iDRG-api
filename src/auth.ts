import { Elysia, t } from "elysia";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { sql } from "./connection";

import type { User } from './types';
// 🔹 Token aktif sementara (token -> user)
const activeTokens = new Map<string, User>();

// ✅ Middleware autentikasi global reusable
export const authMiddleware = new Elysia()
    .derive({ as: 'scoped' }, async ({ request }: { request: Request }) => {
        const authHeader = request.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer "))
            throw new Response("Unauthorized", { status: 401 });
        const token = authHeader.split(" ")[1];
        const user = activeTokens.get(token);
        if (!user)
            throw new Response("Invalid or expired token", { status: 401 });
        // inject user (nik, username, nama, level)
        return { user: user };
    });

// ✅ Plugin untuk login
export const authPlugin = () =>
    new Elysia().post(
        "/login",
        async ({ body }) => {
            const rows: any = await sql(
                "SELECT id, username, password, nama, nik, level FROM idrg.users WHERE username = ?",
                [body.username]
            );
            if (!rows.length)
                return new Response("User not found", { status: 401 });

            const user: User = rows[0];
            const valid = await bcrypt.compare(body.password, String(user?.password));
            if (!valid)
                return new Response("Invalid password", { status: 401 });

            // generate token baru
            const token = crypto.randomBytes(32).toString("hex");

            activeTokens.set(token, {
                id: user.id,
                username: user.username,
                nama: user.nama,
                nik: user.nik,
                level: user.level,
            });

            return {
                message: "Login success",
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    nama: user.nama,
                    nik: user.nik,
                    level: user.level,
                },
            };
        },
        {
            body: t.Object({
                username: t.String(),
                password: t.String(),
            }),
        }
    );

// ✅ Plugin untuk register (khusus admin)
export const registerPlugin = () =>
    new Elysia().use(authMiddleware).post(
        "/register",
        async ({ body, user }: { body: any; user: User }) => {
            // hanya admin yang boleh menambah user baru
            if (user.level !== "admin")
                return new Response("Forbidden: Admin only", { status: 403 });

            // cek apakah username atau NIK sudah ada
            const [exists]: any = await sql(
                "SELECT id FROM idrg.users WHERE username = ? OR nik = ?",
                [body.username, body.nik]
            );
            if (exists.length > 0)
                return new Response("User already exists", { status: 400 });

            const hashed = await bcrypt.hash(body.password, 10);

            await sql(
                "INSERT INTO idrg.users (username, password, nama, nik, level) VALUES (?, ?, ?, ?, ?)",
                [body.username, hashed, body.nama, body.nik, body.level || "user"]
            );

            return { message: "User registered successfully" };
        },
        {
            body: t.Object({
                username: t.String(),
                password: t.String(),
                nama: t.String(),
                nik: t.String(),
                level: t.Optional(t.String(["admin", "user"])),
            }),
        }
    );
