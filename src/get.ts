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
            const fields = "reg_periksa.no_rawat, reg_periksa.no_rkm_medis, reg_periksa.tgl_registrasi, case when status_lanjut = 'Ralan' then 'Rawat Jalan' else 'Rawat Inap' end as status, bridging_sep.no_sep, bridging_sep.no_kartu, bridging_sep.klsrawat, pasien.nm_pasien, pasien.tgl_lahir, pasien.jk, c.id AS id_claim, c.status_claim";

            const raw = await sql(`SELECT ${fields} FROM reg_periksa LEFT JOIN pasien ON reg_periksa.no_rkm_medis = pasien.no_rkm_medis LEFT JOIN bridging_sep ON reg_periksa.no_rawat = bridging_sep.no_rawat LEFT JOIN idrg.claims AS c ON bridging_sep.no_sep = c.nomor_sep WHERE reg_periksa.kd_pj = 'BPJ' ${tanggal} ORDER BY reg_periksa.tgl_registrasi`);
            return { data: raw };
        }, {
        params: t.Object({ type: t.Optional(t.Union([t.Literal("rajal"), t.Literal("ranap")])) }),
        query: t.Object({ mulai: t.Optional(t.String()), sampai: t.Optional(t.String()) })
    })
    .get(
        "/pasien/*",
        async ({ params }) => {
            // const tanggal = query.mulai ? query.sampai ? `AND reg_periksa.tgl_registrasi BETWEEN '${query.mulai}' AND '${query.sampai}'` : `AND reg_periksa.tgl_registrasi >= '${query.mulai}'` : `AND YEAR(reg_periksa.tgl_registrasi) = YEAR(CURDATE()) AND MONTH(reg_periksa.tgl_registrasi) = MONTH(CURDATE())`;

            const fields = `r.no_rawat, r.no_rkm_medis, r.kd_poli, r.tgl_registrasi, case when status_lanjut = 'Ralan' then 'Rawat Jalan' else 'Rawat Inap' end as status, bs.no_sep, bs.no_kartu, bs.klsrawat, bs.klsnaik, p.nm_pasien, p.tgl_lahir, p.jk, CASE WHEN n.bb IS NULL THEN '-' ELSE n.bb END AS berat, CASE WHEN tb.kesimpulan_skrining = 'Terduga TBC' THEN 1 ELSE 0 END AS tb, k.stts_pulang, d.nm_dokter as dokter,cl.id as claim_id, cl.status_claim, 
            CASE
                WHEN r.kd_poli = 'IGDK' THEN pi.td
                ELSE pr.td
            END AS td,
            MIN(STR_TO_DATE(CONCAT(k.tgl_masuk, ' ', k.jam_masuk), '%Y-%m-%d %H:%i:%s')) AS waktu_masuk,
            MAX(
                NULLIF(
                    STR_TO_DATE(CONCAT(k.tgl_keluar, ' ', k.jam_keluar), '%Y-%m-%d %H:%i:%s'),
                    '0000-00-00 00:00:00'
                )
            ) AS waktu_keluar,
            SUM(case when b.status IN  ('Ralan Dokter Paramedis','Ranap Dokter Paramedis') and b.nm_perawatan not like '%terapi%' then b.totalbiaya ELSE 0 END) AS prosedur_non_bedah,
            SUM(case when b.status='Operasi' then b.totalbiaya ELSE 0 END) AS prosedur_bedah,
            SUM(case when b.status IN ('Ralan Dokter','Ranap Dokter') then b.totalbiaya ELSE 0 END) AS konsultasi,
            0 as tenaga_ahli,
            SUM(case when b.status IN ('Ralan Paramedis','Ranap Paramedis') then b.totalbiaya ELSE 0 END) AS keperawatan,
            0 as penunjang,
            SUM(case when b.status = 'Radiologi' then b.totalbiaya ELSE 0 END) AS radiologi,
            SUM(case when b.status = 'Laborat' then b.totalbiaya ELSE 0 END) AS laboratorium,
            0 as pelayanan_darah,
            SUM(case when b.status IN  ('Ralan Dokter Paramedis','Ranap Dokter Paramedis') and b.nm_perawatan like '%terapi%' then b.totalbiaya ELSE 0 END) AS rehabilitasi,
            SUM(case when b.status = 'Kamar' then b.totalbiaya ELSE 0 END)+r.biaya_reg AS kamar,
            0 as rawat_intensif,
            SUM(case when b.status IN ('Obat', 'Retur Obat', 'Resep Pulang') and b.nm_perawatan not like '%kemo%' and b.nm_perawatan not like '%kronis%' then b.totalbiaya ELSE 0 END) AS obat,
            SUM(case when b.status = 'Obat' and b.nm_perawatan like '%kronis%' then b.totalbiaya ELSE 0 END) AS obat_kronis,
            SUM(case when b.status = 'Obat' and b.nm_perawatan like '%kemo%' then b.totalbiaya ELSE 0 END) AS obat_kemeterapi,
            0 as alkes,
            SUM(case when b.status = 'Tambahan' then b.totalbiaya ELSE 0 END) AS bmhp,
            SUM(case when b.status IN ('Harian','Service') then b.totalbiaya ELSE 0 END) AS sewa_alat`;

            try {
                const raw = await sql(`SELECT ${fields} FROM reg_periksa AS r LEFT JOIN pasien AS p ON r.no_rkm_medis = p.no_rkm_medis LEFT JOIN bridging_sep AS bs ON r.no_rawat = bs.no_rawat LEFT JOIN kamar_inap as k on r.no_rawat = k.no_rawat LEFT JOIN billing AS b ON r.no_rawat = b.no_rawat LEFT JOIN penilaian_medis_ranap_neonatus AS n ON r.no_rawat = n.no_rawat LEFT JOIN skrining_tbc AS tb ON r.no_rawat = tb.no_rawat LEFT JOIN dokter AS d ON r.kd_dokter = d.kd_dokter LEFT JOIN idrg.claims AS cl ON bs.no_sep = cl.nomor_sep LEFT JOIN penilaian_medis_igd as pi ON r.no_rawat = pi.no_rawat LEFT JOIN penilaian_medis_ralan AS pr ON r.no_rawat = pr.no_rawat WHERE r.kd_pj = 'BPJ' AND r.no_rawat = ? GROUP BY r.no_rawat`, [params['*']]);
                return { data: raw };
            } catch (error) {
                console.log(error);
            }
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
    .get(
        "/claimed/:id",
        async ({ params }) => {
            const raw = await sql(`SELECT * FROM idrg.claims WHERE id = ?`, [params.id]);
            const diagnosa_inacbg = await sql(`SELECT * FROM idrg.diagnosa_inacbg WHERE claim_id = ?`, [params.id]);
            const prosedur_inacbg = await sql(`SELECT * FROM idrg.procedures_inacbg WHERE claim_id = ?`, [params.id]);
            const grouping_inacbg: any = await sql(`SELECT * FROM idrg.grouping_inacbg WHERE claim_id = ?`, [params.id]);
            const special_cmg = await sql(`SELECT * FROM idrg.grouping_inacbg_special_cmg WHERE grouping_inacbg_id = ?`, [grouping_inacbg[0].id]) || null;
            return {
                ...raw[0],
                diagnosa_inacbg,
                prosedur_inacbg,
                grouping_inacbg,
                special_cmg
            };
        }, {
        params: t.Object({ id: t.Number() })
    })
    .get(
        "/idrg/:id",
        async ({ params }) => {
            const diagnosa_idrg = await sql(`SELECT * FROM idrg.diagnosa WHERE claim_id = ?`, [params.id]);
            const prosedur_idrg = await sql(`SELECT * FROM idrg.procedures WHERE claim_id = ?`, [params.id]);
            const grouping_result: any = await sql(`SELECT * FROM idrg.grouping_results WHERE claim_id = ?`, [params.id]);
            let grouping_idrg = {};

            if (grouping_result.length > 0) {
                const date = new Date(grouping_result[0].created_at);
                const options = { year: 'numeric' as const, month: 'long' as const, day: 'numeric' as const };
                const formattedDate = date.toLocaleDateString('id-ID', options);

                // Format waktu menjadi "10:05"
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                const formattedTime = `${hours}.${minutes}`;
                grouping_idrg = { ...grouping_result[0], info: `iDRG @ ${formattedDate} pukul ${formattedTime}` };
            }
            return {
                diagnosa_idrg,
                prosedur_idrg,
                grouping_idrg
            };
        }, {
        params: t.Object({ id: t.Number() })
    })
    .get(
        "/inacbg/:id",
        async ({ params }) => {
            const diagnosa_inacbg = await sql(`SELECT * FROM idrg.diagnosa_inacbg WHERE claim_id = ?`, [params.id]);
            const prosedur_inacbg = await sql(`SELECT * FROM idrg.procedures_inacbg WHERE claim_id = ?`, [params.id]);
            const grouping_inacbg: any = await sql(`SELECT * FROM idrg.grouping_inacbg WHERE claim_id = ? RETURNING id`, [params.id]);
            const special_cmg = await sql(`SELECT * FROM idrg.grouping_inacbg_special_cmg WHERE grouping_inacbg_id = ?`, [grouping_inacbg.id]) || null;
            const special_cmg_option = await sql(`SELECT * FROM idrg.grouping_inacbg_special_cmg_option WHERE grouping_inacbg_id = ?`, [grouping_inacbg.id]) || null;
            return {
                diagnosa_inacbg,
                prosedur_inacbg,
                grouping_inacbg,
                special_cmg,
                special_cmg_option
            };
        }, {
        params: t.Object({ id: t.Number() })
    })

export default get;