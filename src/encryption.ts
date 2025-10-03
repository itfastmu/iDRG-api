import crypto from "crypto";
const hexKey: any = Bun.env.KEY
// Encrypt Function
export function inacbg_encrypt(data: any) {
    // convert hex key -> Buffer
    const key = Buffer.from(hexKey, "hex");

    if (key.length !== 32) {
        throw new Error("Needs a 256-bit key!");
    }

    // IV size for AES-256-CBC
    const ivSize = 16;
    const iv = crypto.randomBytes(ivSize);

    // Encrypt
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    let encrypted = cipher.update(data, "utf8");
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    // Create signature
    const signatureFull = crypto.createHmac("sha256", key)
        .update(encrypted)
        .digest();
    const signature = signatureFull.subarray(0, 10);

    // Combine signature + iv + encrypted, then base64
    const combined = Buffer.concat([signature, iv, encrypted]);
    const encoded = combined.toString("base64");
    return encoded;
}

// Decrypt Function
export function inacbg_decrypt(encoded: any) {
    const key = Buffer.from(hexKey, "hex");

    if (key.length !== 32) {
        throw new Error("Needs a 256-bit key!");
    }
    const decoded = Buffer.from(encoded, "base64");

    const signature = decoded.subarray(0, 10);
    const iv = decoded.subarray(10, 10 + 16);
    const encrypted = decoded.subarray(10 + 16);

    // Recalculate signature
    const calcSigFull = crypto.createHmac("sha256", key)
        .update(encrypted)
        .digest();
    const calcSig = calcSigFull.subarray(0, 10);

    if (!inacbg_compare(signature, calcSig)) {
        return "SIGNATURE_NOT_MATCH";
    }

    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString("utf8");
}

// Compare Function (constant time)
function inacbg_compare(a: any, b: any) {
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
}

// ------------------
// Contoh Penggunaan
// ------------------
// const hexKey = crypto.randomBytes(32).toString("hex"); // contoh key 256-bit hex
// const data = "Halo Dunia, ini data rahasia!";

// const encrypted = inacbg_encrypt(data, hexKey);
// console.log("Encrypted:", encrypted);

// const decrypted = inacbg_decrypt(encrypted, hexKey);
// console.log("Decrypted:", decrypted);
