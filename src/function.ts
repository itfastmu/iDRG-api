import { inacbg_decrypt, inacbg_encrypt } from "./encryption";

const mode = Bun.env.MODE === "debug" ? "?mode=debug" : "";

export const forward = async (body: unknown) => {
    if (!Bun.env.EKLAIM_URL) {
        throw new Error("EKLAIM_URL environment variable is not defined");
    }

    let header: any = { "Content-Type": "application/json" }
    body = typeof body === "string" ? body : JSON.stringify(body)
    if (Bun.env.MODE !== "debug") {
        body = inacbg_encrypt(body);
        header = { "Content-Type": "application/x-www-form-urlencoded" }
    }
    const raw: any = await fetch(Bun.env.EKLAIM_URL + mode, {
        method: "POST",
        headers: header,
        body: typeof body === "string" ? body : JSON.stringify(body),
    });
    try {
        let res: any
        if (Bun.env.MODE !== "debug") {
            const text = await raw.text();
            const m = text.match(/----BEGIN ENCRYPTED DATA----\s*([\s\S]*?)\s*----END ENCRYPTED DATA----/);
            res = m ? m[1] : null;
            res = inacbg_decrypt(res);
            res = JSON.parse(res)
        } else {
            res = await raw.json();
        }
        return res;
    } catch (error) {
        console.log(error);
    }



    if (!Bun.env.EKLAIM_URL) {
        throw new Error("EKLAIM_URL environment variable is not defined");
    }
    try {
        const res = await fetch(Bun.env.EKLAIM_URL + mode, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        return await res.json();
    } catch (error) {
        console.log(error);
    }
};