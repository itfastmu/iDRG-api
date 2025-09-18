import Elysia from "elysia";
import { sql } from "./connection";

const get = new Elysia({ prefix: '/grab' })
    .get(
        "/list",
        async (query: { mulai: String, sampai: String }) => {
            const tanggal = query.mulai ? query.sampai ? `AND reg_periksa.tgl_registrasi BETWEEN '${query.mulai}' AND '${query.sampai}'` : `AND reg_periksa.tgl_registrasi >= '${query.mulai}'` : `AND YEAR(reg_periksa.tgl_registrasi) = YEAR(CURDATE()) AND MONTH(reg_periksa.tgl_registrasi) = MONTH(CURDATE())`;

            const fields = "reg_periksa.no_rawat, reg_periksa.no_rkm_medis, reg_periksa.tgl_registrasi, case when status_lanjut = 'Ralan' then 'Rawat Jalan' else 'Rawat Inap' end as status, bridging_sep.no_sep, bridging_sep.no_kartu, pasien.nm_pasien, pasien.tgl_lahir, pasien.jk";

            const raw = await sql(`SELECT ${fields} FROM reg_periksa LEFT JOIN pasien ON reg_periksa.no_rkm_medis = pasien.no_rkm_medis LEFT JOIN bridging_sep ON reg_periksa.no_rawat = bridging_sep.no_rawat WHERE reg_periksa.kd_pj = 'BPJ' ${tanggal} ORDER BY reg_periksa.tgl_registrasi`);
            return { data: raw };
        })

export default get;