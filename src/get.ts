import Elysia, { t } from "elysia";
import { sql } from "./connection";

const get = new Elysia({ prefix: '/grab' })
    .get(
        "/list/:type?",
        async ({ params, query }) => {
            let tanggal = query.mulai ? query.sampai ? `AND reg_periksa.tgl_registrasi BETWEEN '${query.mulai}' AND '${query.sampai}'` : `AND reg_periksa.tgl_registrasi >= '${query.mulai}'` : `AND YEAR(reg_periksa.tgl_registrasi) = YEAR(CURDATE()) AND MONTH(reg_periksa.tgl_registrasi) = MONTH(CURDATE())`;
            if (params.type) {
                if (params.type === 'rajal') {
                    tanggal += ` AND reg_periksa.status_lanjut = 'Ralan'`;
                } else if (params.type === 'ranap') {
                    tanggal += ` AND reg_periksa.status_lanjut = 'Ranap'`;
                }
            }
            const fields = "reg_periksa.no_rawat, reg_periksa.no_rkm_medis, reg_periksa.tgl_registrasi, case when status_lanjut = 'Ralan' then 'Rawat Jalan' else 'Rawat Inap' end as status, bridging_sep.no_sep, bridging_sep.no_kartu, pasien.nm_pasien, pasien.tgl_lahir, pasien.jk";

            const raw = await sql(`SELECT ${fields} FROM reg_periksa LEFT JOIN pasien ON reg_periksa.no_rkm_medis = pasien.no_rkm_medis LEFT JOIN bridging_sep ON reg_periksa.no_rawat = bridging_sep.no_rawat WHERE reg_periksa.kd_pj = 'BPJ' ${tanggal} ORDER BY reg_periksa.tgl_registrasi`);
            return { data: raw };
        }, {
        params: t.Object({ type: t.Optional(t.Union([t.Literal("rajal"), t.Literal("ranap")])) }),
        query: t.Object({ mulai: t.Optional(t.String()), sampai: t.Optional(t.String()) })
    })
    .get(
        "/pasien/*",
        async ({ params }) => {
            // const tanggal = query.mulai ? query.sampai ? `AND reg_periksa.tgl_registrasi BETWEEN '${query.mulai}' AND '${query.sampai}'` : `AND reg_periksa.tgl_registrasi >= '${query.mulai}'` : `AND YEAR(reg_periksa.tgl_registrasi) = YEAR(CURDATE()) AND MONTH(reg_periksa.tgl_registrasi) = MONTH(CURDATE())`;

            const fields = `reg_periksa.no_rawat, reg_periksa.no_rkm_medis, reg_periksa.tgl_registrasi, case when status_lanjut = 'Ralan' then 'Rawat Jalan' else 'Rawat Inap' end as status, bridging_sep.no_sep, bridging_sep.no_kartu, pasien.nm_pasien, pasien.tgl_lahir, pasien.jk, MIN(STR_TO_DATE(CONCAT(k.tgl_masuk, ' ', k.jam_masuk), '%Y-%m-%d %H:%i:%s')) AS waktu_masuk_awal,
            MAX(
                NULLIF(
                    STR_TO_DATE(CONCAT(k.tgl_keluar, ' ', k.jam_keluar), '%Y-%m-%d %H:%i:%s'),
                    '0000-00-00 00:00:00'
                )
            ) AS waktu_keluar_akhir`;

            const raw = await sql(`SELECT ${fields} FROM reg_periksa LEFT JOIN pasien ON reg_periksa.no_rkm_medis = pasien.no_rkm_medis LEFT JOIN bridging_sep ON reg_periksa.no_rawat = bridging_sep.no_rawat LEFT JOIN kamar_inap as k on reg_periksa.no_rawat = k.no_rawat WHERE reg_periksa.kd_pj = 'BPJ' AND reg_periksa.no_rawat = ? GROUP BY reg_periksa.no_rawat`, [params['*']]);
            return { data: raw };
        }, {
        params: t.Object({ '*': t.RegExp(/^\d{4}\/\d{2}\/\d{2}\/\d{6}$/) })
    })
    .get(
        "/dokter",
        async () => {
            const fields = `nm_dokter as nama`;

            const raw = await sql(`SELECT ${fields} FROM dokter WHERE status = '1'`);
            return { data: raw };
        })
    .get(
        "/icd/:code/:type",
        async ({ params, query }) => {
            const table = params.type === 'idrg' ? 'idrg.icd_codes' : 'idrg.icd_codes_inacbg';
            const codeField = params.code === '9' ? `system LIKE 'ICD_9%'` : `system LIKE 'ICD_10%'`;
            const keyword = query.keyword ? `AND (code LIKE '${query.keyword.toUpperCase()}%' OR code2 LIKE '${query.keyword.toUpperCase()}%' OR description LIKE '%${query.keyword}%')` : '';
            console.log(`SELECT * FROM ${table} WHERE ${codeField} ${keyword} ORDER BY code2 LIMIT 50`);
            const raw = await sql(`SELECT * FROM ${table} WHERE ${codeField} ${keyword} ORDER BY code2 LIMIT 50`);
            const tambahan = params.type === 'idrg' ? 'dan jika accpdx = N maka tidak boleh dijadikan primary diagnosis"' : '';
            return {
                message: `Jika validcode = 0 maka tidak boleh dipilih ${tambahan}`,
                length: raw.length,
                data: raw,
            };
        }, {
        params: t.Object({ code: t.Union([t.Literal("9"), t.Literal("10")]), type: t.Union([t.Literal("idrg"), t.Literal("inacbg")]) }),
        query: t.Object({ keyword: t.Optional(t.String()) })
    })

export default get;