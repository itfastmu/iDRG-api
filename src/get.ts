import Elysia, { t } from "elysia";
import { sql } from "./connection";

const get = new Elysia({ prefix: '/grab' })
    .get(
        "/list",
        async ({ query }) => {
            console.log('lewat', query)
            const tanggal = query.mulai ? query.sampai ? `AND reg_periksa.tgl_registrasi BETWEEN '${query.mulai}' AND '${query.sampai}'` : `AND reg_periksa.tgl_registrasi >= '${query.mulai}'` : `AND YEAR(reg_periksa.tgl_registrasi) = YEAR(CURDATE()) AND MONTH(reg_periksa.tgl_registrasi) = MONTH(CURDATE())`;

            const fields = "reg_periksa.no_rawat, reg_periksa.no_rkm_medis, reg_periksa.tgl_registrasi, case when status_lanjut = 'Ralan' then 'Rawat Jalan' else 'Rawat Inap' end as status, bridging_sep.no_sep, bridging_sep.no_kartu, pasien.nm_pasien, pasien.tgl_lahir, pasien.jk";

            const raw = await sql(`SELECT ${fields} FROM reg_periksa LEFT JOIN pasien ON reg_periksa.no_rkm_medis = pasien.no_rkm_medis LEFT JOIN bridging_sep ON reg_periksa.no_rawat = bridging_sep.no_rawat WHERE reg_periksa.kd_pj = 'BPJ' ${tanggal} ORDER BY reg_periksa.tgl_registrasi`);
            return { data: raw };
        }, {
        query: t.Object({ mulai: t.Optional(t.String()), sampai: t.Optional(t.String()) })
    })
    .get(
        "/icd/:code/:type",
        async ({ params, query }) => {
            const table = params.type === 'idrg' ? 'idrg.icd_codes' : 'idrg.icd_codes_inacbg';
            const codeField = params.code === '9' ? `system LIKE 'ICD_9%'` : `system LIKE 'ICD_10%'`;
            const keyword = query.keyword ? `AND code LIKE '${query.keyword.toUpperCase()}%' OR code2 LIKE '${query.keyword.toUpperCase()}%' OR description LIKE '%${query.keyword}%'` : '';
            const raw = await sql(`SELECT * FROM ${table} WHERE ${codeField} ${keyword} ORDER BY code2`);
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