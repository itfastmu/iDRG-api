// src/types.ts
export interface User {
    id: number;
    username: string;
    password?: string;
    nama: string;
    nik: string;
    level: "admin" | "user";
}

declare module 'elysia' {
    interface Store {
        user?: User;
    }
}
