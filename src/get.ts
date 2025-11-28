import Elysia, { t } from "elysia";
import { sql } from "./connection";
import { inacbg_decrypt, inacbg_encrypt } from "./encryption";
import { authMiddleware } from "./auth";
import { forward } from "./function";

const mode = Bun.env.MODE === "debug" ? "?mode=debug" : "";

const get = new Elysia({ prefix: '/grab' })
    // .use(authMiddleware)
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
    .get("/resume/:no_rawat", async ({ params }) => {
        const formattedNoRawat = params.no_rawat.replace(/-/g, "/");

        const raw = await sql(
            `
    SELECT 
        r.*,
        p.nama AS nama_petugas_radiologi
    FROM resume_pasien_ranap r
    LEFT JOIN periksa_radiologi pr ON pr.no_rawat = r.no_rawat
    LEFT JOIN petugas p ON p.nip = pr.nip
    WHERE r.no_rawat = ?
    LIMIT 1
    `,
            [formattedNoRawat]
        );

        return { data: raw[0] };
    }, {
        params: t.Object({ no_rawat: t.String() })
    })



    .get("/triase/:no_rawat", async ({ params }) => {
        const formattedNoRawat = params.no_rawat.replace(/-/g, "/");

        try {
            const triase = await sql(
                `SELECT 
        igd.no_rawat, igd.tgl_kunjungan, igd.cara_masuk, igd.kode_kasus,
        mk.macam_kasus, igd.tekanan_darah, igd.pernapasan,igd.nadi, igd.suhu,
        igd.saturasi_o2, igd.nyeri, sek.anamnesa_singkat, sek.catatan,
        sek.plan, sek.tanggaltriase
      FROM data_triase_igd AS igd
      LEFT JOIN data_triase_igdsekunder AS sek ON sek.no_rawat = igd.no_rawat
      LEFT JOIN master_triase_macam_kasus AS mk ON mk.kode_kasus = igd.kode_kasus
      WHERE igd.no_rawat = ?
      LIMIT 1`,
                [formattedNoRawat]
            );

            // 🔹 Gabungkan semua skala 1–5 dengan UNION ALL
            const pemeriksaan = await sql(
                `
      SELECT p.nama_pemeriksaan, s1.pengkajian_skala1 AS pengkajian
      FROM data_triase_igddetail_skala1 d1
      LEFT JOIN master_triase_skala1 s1 ON s1.kode_skala1 = d1.kode_skala1
      LEFT JOIN master_triase_pemeriksaan p ON p.kode_pemeriksaan = s1.kode_pemeriksaan
      WHERE d1.no_rawat = ?

      UNION ALL

      SELECT p.nama_pemeriksaan, s2.pengkajian_skala2 AS pengkajian
      FROM data_triase_igddetail_skala2 d2
      LEFT JOIN master_triase_skala2 s2 ON s2.kode_skala2 = d2.kode_skala2
      LEFT JOIN master_triase_pemeriksaan p ON p.kode_pemeriksaan = s2.kode_pemeriksaan
      WHERE d2.no_rawat = ?

      UNION ALL

      SELECT p.nama_pemeriksaan, s3.pengkajian_skala3 AS pengkajian
      FROM data_triase_igddetail_skala3 d3
      LEFT JOIN master_triase_skala3 s3 ON s3.kode_skala3 = d3.kode_skala3
      LEFT JOIN master_triase_pemeriksaan p ON p.kode_pemeriksaan = s3.kode_pemeriksaan
      WHERE d3.no_rawat = ?

      UNION ALL

      SELECT p.nama_pemeriksaan, s4.pengkajian_skala4 AS pengkajian
      FROM data_triase_igddetail_skala4 d4
      LEFT JOIN master_triase_skala4 s4 ON s4.kode_skala4 = d4.kode_skala4
      LEFT JOIN master_triase_pemeriksaan p ON p.kode_pemeriksaan = s4.kode_pemeriksaan
      WHERE d4.no_rawat = ?

      UNION ALL

      SELECT p.nama_pemeriksaan, s5.pengkajian_skala5 AS pengkajian
      FROM data_triase_igddetail_skala5 d5
      LEFT JOIN master_triase_skala5 s5 ON s5.kode_skala5 = d5.kode_skala5
      LEFT JOIN master_triase_pemeriksaan p ON p.kode_pemeriksaan = s5.kode_pemeriksaan
      WHERE d5.no_rawat = ?
      `,
                [
                    formattedNoRawat,
                    formattedNoRawat,
                    formattedNoRawat,
                    formattedNoRawat,
                    formattedNoRawat,
                ]
            );

            const hasil = {
                ...triase[0],
                pemeriksaan: pemeriksaan.map((r: any) => ({
                    nama_pemeriksaan: r.nama_pemeriksaan,
                    pengkajian: r.pengkajian,
                    tampilan: `${r.nama_pemeriksaan} : ${r.pengkajian}`,
                })),
            };

            return { data: hasil };
        } catch (error) {
            console.error("❌ Error mengambil data triase:", error);
            return {
                error: true,
                message: "Gagal mengambil data triase",
                detail: (error as Error).message,
            };
        }
    }, {
        params: t.Object({
            no_rawat: t.String(),
        }),
    })
    .get("/ranap/:no_rawat", async ({ params }) => {
        const noRawat = params.no_rawat.replace(/-/g, "/");

        const rows = await sql(
            `
        SELECT 
            pr.tgl_perawatan,
            pr.jam_rawat,
            pr.suhu_tubuh,
            pr.tensi,
            pr.nadi,
            pr.respirasi,
            pr.tinggi,
            pr.berat,
            pr.kesadaran,
            pr.keluhan,
            pr.pemeriksaan,
            pr.alergi,
            pr.penilaian,
            pr.rtl,
            pr.instruksi,
            pr.evaluasi,

            pg.nik AS nip,
            pg.nama AS nama_petugas

        FROM pemeriksaan_ranap pr
        LEFT JOIN pegawai pg
            ON pr.nip = pg.nik

        WHERE pr.no_rawat = ?
        ORDER BY pr.tgl_perawatan, pr.jam_rawat
        `,
            [noRawat]
        );

        return { data: rows };
    })

    .get("/ralan/:no_rawat", async ({ params }) => {
        const noRawat = params.no_rawat.replace(/-/g, "/");

        const rows = await sql(
            `
        SELECT 
            pr.tgl_perawatan,
            pr.jam_rawat,
            pr.suhu_tubuh,
            pr.tensi,
            pr.nadi,
            pr.respirasi,
            pr.tinggi,
            pr.berat,
            pr.kesadaran,
            pr.keluhan,
            pr.pemeriksaan,
            pr.alergi,
            pr.penilaian,
            pr.rtl,
            pr.instruksi,
            pr.evaluasi,

            pg.nik AS nip,
            pg.nama AS nama_petugas

        FROM pemeriksaan_ralan pr
        LEFT JOIN pegawai pg
            ON pr.nip = pg.nik

        WHERE pr.no_rawat = ?
        ORDER BY pr.tgl_perawatan DESC, pr.jam_rawat DESC

        `,
            [noRawat]
        );

        return { data: rows };
    })

    .get("/tindakan/:no_rawat", async ({ params }) => {
        const noRawat = params.no_rawat.replace(/-/g, "/");

        const rows = await sql(
            `
        SELECT 
            lt.no_rawat,
            lt.tanggal,
            lt.kd_dokter,
            d.nm_dokter,
            lt.diagnosa_pra_tindakan,
            lt.diagnosa_pasca_tindakan,
            lt.tindakan_medik,
            lt.uraian,
            lt.hasil,
            lt.kesimpulan
        FROM laporan_tindakan lt
        LEFT JOIN dokter d
            ON lt.kd_dokter = d.kd_dokter
        WHERE lt.no_rawat = ?
        ORDER BY lt.tanggal
        `,
            [noRawat]
        );


        return { data: rows };
    })

    .get("/igd/:no_rawat", async ({ params }) => {
        const noRawat = params.no_rawat.replace(/-/g, "/");

        const rows = await sql(
            `
        SELECT
            igd.keluhan_utama,
            igd.anamnesis,
            igd.rps,
            igd.tanggal,
            igd.gcs,
            igd.rpd,
            igd.rpk,
            igd.rpo,
            igd.alergi,
            igd.keadaan,
            igd.kesadaran,
            igd.kepala,
            igd.mata,
            igd.gigi,
            igd.leher,
            igd.thoraks,
            igd.abdomen,
            igd.genital,
            igd.ekstremitas,
            igd.ket_fisik,
            igd.ket_lokalis,
            igd.ekg,    
            igd.rad,
            igd.lab,
            igd.diagnosis,
            igd.tata,
            igd.td,
            igd.nadi,
            igd.rr,
            igd.suhu,
            igd.spo,
            igd.bb,
            igd.tb,
            igd.kd_dokter,
            d.nm_dokter
        FROM penilaian_medis_igd AS igd
        LEFT JOIN dokter AS d ON d.kd_dokter = igd.kd_dokter
        WHERE igd.no_rawat = ?
        `,
            [noRawat]
        );

        return { data: rows };
    })

    .get("/obat/:no_rawat", async ({ params }) => {
        const formattedNoRawat = params.no_rawat.replace(/-/g, "/");

        const raw = await sql(
            `SELECT 
        dpo.no_rawat,
        dpo.kode_brng,
        db.nama_brng,
        db.h_beli AS harga_beli,
        dpo.biaya_obat,
        dpo.jml AS jumlah,
        dpo.tgl_perawatan,
        dpo.jam,
        dpo.total,
        bpjs.no_sep,
        bpjs.kd_obat,
        bpjs.nm_obat,
        bpjs.no_srb
     FROM detail_pemberian_obat AS dpo
     LEFT JOIN databarang AS db ON db.kode_brng = dpo.kode_brng
     LEFT JOIN bridging_srb_bpjs_obat AS bpjs ON bpjs.kd_obat = dpo.kode_brng
     WHERE dpo.no_rawat = ?`,
            [formattedNoRawat]
        );

        return { success: true, data: raw };
    }, {
        params: t.Object({ no_rawat: t.String() })
    })
    .get("/operasi/:no_rawat", async ({ params }) => {
        const formattedNoRawat = params.no_rawat.replace(/-/g, "/");

        const raw = await sql(
            `SELECT 
            l.no_rawat,
            l.tanggal AS tanggal_laporan,
            l.diagnosa_preop,
            l.diagnosa_postop,
            l.jaringan_dieksekusi,
            l.selesaioperasi,
            l.permintaan_pa,
            l.laporan_operasi,

            o.tgl_operasi,
            o.kategori,

            o.operator1,
            d1.nm_dokter AS operator1_nama,

            o.operator2,
            d2.nm_dokter AS operator2_nama,

            o.operator3,
            d3.nm_dokter AS operator3_nama,

            o.dokter_anestesi,
            danes.nm_dokter AS dokter_anestesi_nama,

            o.dokter_umum,
            dumum.nm_dokter AS dokter_umum_nama,

            o.dokter_anak,
            danak.nm_dokter AS dokter_anak_nama,

            o.dokter_pjanak,
            dpjanak.nm_dokter AS dokter_pjanak_nama,

            o.asisten_operator1,
            p_aop1.nama AS asisten_operator1_nama,

            o.asisten_operator2,
            p_aop2.nama AS asisten_operator2_nama,

            o.asisten_operator3,
            p_aop3.nama AS asisten_operator3_nama,

            o.asisten_anestesi,
            p_aan.nama AS asisten_anestesi_nama,

            o.asisten_anestesi2,
            p_aan2.nama AS asisten_anestesi2_nama,

            o.perawaat_resusitas,
            p_res.nama AS perawat_resusitas_nama,

            o.bidan,
            p_bidan1.nama AS bidan1_nama,

            o.bidan2,
            p_bidan2.nama AS bidan2_nama,

            o.bidan3,
            p_bidan3.nama AS bidan3_nama,

            o.omloop,
            p_om1.nama AS omloop1_nama,

            o.omloop2,
            p_om2.nama AS omloop2_nama,

            o.omloop3,
            p_om3.nama AS omloop3_nama,

            o.omloop4,
            p_om4.nama AS omloop4_nama,

            o.omloop5,
            p_om5.nama AS omloop5_nama,

           o.instrumen,
            p_ins.nama AS instrumen_nama

        FROM laporan_operasi l
        LEFT JOIN operasi o ON l.no_rawat = o.no_rawat

        LEFT JOIN dokter d1 ON o.operator1 = d1.kd_dokter
        LEFT JOIN dokter d2 ON o.operator2 = d2.kd_dokter
        LEFT JOIN dokter d3 ON o.operator3 = d3.kd_dokter
        LEFT JOIN dokter danes ON o.dokter_anestesi = danes.kd_dokter
        LEFT JOIN dokter dumum ON o.dokter_umum = dumum.kd_dokter
        LEFT JOIN dokter danak ON o.dokter_anak = danak.kd_dokter
        LEFT JOIN dokter dpjanak ON o.dokter_pjanak = dpjanak.kd_dokter

        LEFT JOIN petugas p_aop1 ON o.asisten_operator1 = p_aop1.nip
        LEFT JOIN petugas p_aop2 ON o.asisten_operator2 = p_aop2.nip
        LEFT JOIN petugas p_aop3 ON o.asisten_operator3 = p_aop3.nip
        LEFT JOIN petugas p_ins ON o.instrumen = p_ins.nip
        
        LEFT JOIN petugas p_aan ON o.asisten_anestesi = p_aan.nip
        LEFT JOIN petugas p_aan2 ON o.asisten_anestesi2 = p_aan2.nip

        LEFT JOIN petugas p_res ON o.perawaat_resusitas = p_res.nip
        
        LEFT JOIN petugas p_bidan1 ON o.bidan = p_bidan1.nip
        LEFT JOIN petugas p_bidan2 ON o.bidan2 = p_bidan2.nip
        LEFT JOIN petugas p_bidan3 ON o.bidan3 = p_bidan3.nip

        LEFT JOIN petugas p_om1 ON o.omloop = p_om1.nip
        LEFT JOIN petugas p_om2 ON o.omloop2 = p_om2.nip
        LEFT JOIN petugas p_om3 ON o.omloop3 = p_om3.nip
        LEFT JOIN petugas p_om4 ON o.omloop4 = p_om4.nip
        LEFT JOIN petugas p_om5 ON o.omloop5 = p_om5.nip

        WHERE l.no_rawat = ?`,
            [formattedNoRawat]
        );

        if (!raw || raw.length === 0) {
            return { success: false, message: "Data operasi tidak ditemukan", data: null };
        }

        return { success: true, data: raw };
    }, {
        params: t.Object({ no_rawat: t.String() })
    })

    .get("/surat_kontrol/:no_rawat", async ({ params }) => {
        const formattedNoRawat = params.no_rawat.replace(/-/g, "/");

        const data = await sql(
            `SELECT 
            sk.no_sep,
            sk.tgl_surat,
            sk.tgl_rencana,
            sk.kd_dokter_bpjs,
            sk.nm_dokter_bpjs,
            sk.kd_poli_bpjs,
            sk.nm_poli_bpjs
        FROM bridging_surat_kontrol_bpjs sk
        INNER JOIN bridging_sep bs ON sk.no_sep = bs.no_sep
        WHERE bs.no_rawat = ?
        ORDER BY sk.tgl_surat DESC
        LIMIT 1`,
            [formattedNoRawat]
        );

        return data[0];
    }, {
        params: t.Object({ no_rawat: t.String() })
    })

    .get("/billing/:no_rawat", async ({ params }) => {
        const formattedNoRawat = params.no_rawat.replace(/-/g, "/");
        const raw = await sql(
            `SELECT no_rawat, tgl_byr, no, nm_perawatan, pemisah, biaya, jumlah, tambahan, totalbiaya, status
        FROM billing
        WHERE no_rawat = ?`,
            [formattedNoRawat]
        );

        return { success: true, data: raw };
    }, {
        params: t.Object({ no_rawat: t.String() })
    })

    .get("/medik/:no_rawat", async ({ params }) => {
        const formattedNoRawat = params.no_rawat.replace(/-/g, "/");

        const raw = await sql(
            `SELECT 
        km.no_rawat,
        km.no_permintaan,
        km.tanggal,
        km.jenis_permintaan,
        km.kd_dokter,
        d1.nm_dokter AS dokter_pengirim,
        km.kd_dokter_dikonsuli,
        d2.nm_dokter AS dokter_dikonsuli,
        km.diagnosa_kerja,
        km.uraian_konsultasi
     FROM konsultasi_medik km
     LEFT JOIN dokter d1 ON km.kd_dokter = d1.kd_dokter
     LEFT JOIN dokter d2 ON km.kd_dokter_dikonsuli = d2.kd_dokter
     WHERE km.no_rawat = ?`,
            [formattedNoRawat]
        );

        return raw;
    }, {
        params: t.Object({ no_rawat: t.String() })
    })

    .get("/tindakan_ralan/:no_rawat", async ({ params }) => {
        const noRawat = params.no_rawat.replace(/-/g, "/");

        const dokter = await sql(`
        SELECT 
            r.tgl_perawatan,
            r.jam_rawat,
            r.kd_jenis_prw,
            j.nm_perawatan,
            r.biaya_rawat,
            d.nm_dokter
        FROM rawat_jl_dr r
        LEFT JOIN jns_perawatan j ON r.kd_jenis_prw = j.kd_jenis_prw
        LEFT JOIN dokter d ON r.kd_dokter = d.kd_dokter
        WHERE r.no_rawat = ?
        ORDER BY r.tgl_perawatan, r.jam_rawat
    `, [noRawat]);


        const paramedis = await sql(`
        SELECT 
            r.tgl_perawatan,
            r.jam_rawat,
            r.kd_jenis_prw,
            j.nm_perawatan,
            r.biaya_rawat,
            p.nama AS nama_petugas
        FROM rawat_jl_pr r
        LEFT JOIN jns_perawatan j ON r.kd_jenis_prw = j.kd_jenis_prw
        LEFT JOIN petugas p ON r.nip = p.nip
        WHERE r.no_rawat = ?
        ORDER BY r.tgl_perawatan, r.jam_rawat
    `, [noRawat]);


        const dokterParamedis = await sql(`
        SELECT 
            r.tgl_perawatan,
            r.jam_rawat,
            r.kd_jenis_prw,
            j.nm_perawatan,
            r.biaya_rawat,
            d.nm_dokter,
            p.nama AS nama_petugas
        FROM rawat_jl_drpr r
        LEFT JOIN jns_perawatan j ON r.kd_jenis_prw = j.kd_jenis_prw
        LEFT JOIN dokter d ON r.kd_dokter = d.kd_dokter
        LEFT JOIN petugas p ON r.nip = p.nip
        WHERE r.no_rawat = ?
        ORDER BY r.tgl_perawatan, r.jam_rawat
    `, [noRawat]);


        return {
            dokter,
            paramedis,
            dokter_paramedis: dokterParamedis
        };

    }, {
        params: t.Object({ no_rawat: t.String() })
    })

    .get("/hemodialisa/:no_rawat", async ({ params }) => {
        const formattedNoRawat = params.no_rawat.replace(/-/g, "/");
        const raw = await sql(
            `SELECT no_rawat, tanggal, kd_dokter, lama, akses, dialist, transfusi, penarikan, qb, qd,ureum,hb,hbsag,creatinin,hiv,hcv,lain,kd_penyakit
        FROM hemodialisa
        WHERE no_rawat = ?`,
            [formattedNoRawat]
        );
        return { success: true, data: raw };
    }, {
        params: t.Object({ no_rawat: t.String() })
    })

    .get("/neonatus/:no_rawat", async ({ params }) => {
        const formattedNoRawat = params.no_rawat.replace(/-/g, "/");

        const raw = await sql(
            `SELECT 
            neo.*,
            rpp.*,
            d.nm_dokter,
            pak.intranatal_pb,
            pak.intranatal_bb,
            pak.intranatal_lk,
            pak.intranatal_ld,
            pak.intranatal_lp,
            p.nm_pasien AS nama_ibu,
            p.no_ktp AS ktp_ibu,
            p.tgl_lahir AS tgl_lahir_ibu

        FROM penilaian_medis_ranap_neonatus AS neo
        
        LEFT JOIN riwayat_persalinan_pasien AS rpp
            ON rpp.no_rkm_medis = neo.no_rkm_medis_ibu

        LEFT JOIN dokter AS d
            ON d.kd_dokter = neo.kd_dokter

        LEFT JOIN penilaian_awal_keperawatan_ranap_neonatus AS pak
            ON pak.no_rawat = neo.no_rawat

        LEFT JOIN pasien AS p
            ON p.no_rkm_medis = neo.no_rkm_medis_ibu

        WHERE neo.no_rawat = ?`,
            [formattedNoRawat]
        );

        return { success: true, data: raw };
    }, {
        params: t.Object({ no_rawat: t.String() })
    })


    .get(
        "/pasien/*",
        async ({ params }) => {
            const fields = `
      r.no_rawat,
      r.no_rkm_medis,
      r.kd_poli,
      DATE_FORMAT(r.tgl_registrasi, '%Y-%m-%d %H:%i:%s') AS tgl_registrasi,
      CASE WHEN status_lanjut = 'Ralan' THEN 'Rawat Jalan' ELSE 'Rawat Inap' END AS status,
      bs.no_sep,
      bs.no_kartu,
      bs.klsrawat,
      bs.klsnaik,
      bs.catatan,
      bs.notelep,
      bs.tglrujukan AS tgl_rujukan,
      bs.nmpolitujuan AS poli_tujuan,
      bs.noskdp AS no_spri,
      bs.nmdiagnosaawal AS diagnosa_awal,
      bs.peserta AS peserta_bpjs,
      p.nm_pasien,
      p.alamat AS alamat,
      p.pekerjaan,
      p.tgl_lahir,
      p.jk,
      p.no_ktp,
      pkl.nm_poli AS nama_poli,
      CASE WHEN n.bb IS NULL THEN '-' ELSE n.bb END AS berat,
      CASE WHEN tb.kesimpulan_skrining = 'Terduga TBC' THEN 1
           ELSE (CASE WHEN nomor_register_sitb IS NOT NULL THEN 1 ELSE 0 END)
      END AS tb,
      k.stts_pulang,
      d.nm_dokter AS dokter,
      cl.id AS claim_id,
      cl.status_claim,
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
      SUM(CASE WHEN b.status IN ('Ralan Dokter Paramedis','Ranap Dokter Paramedis')
               AND b.nm_perawatan NOT LIKE '%terapi%'
               THEN b.totalbiaya ELSE 0 END) AS prosedur_non_bedah,
      SUM(CASE WHEN b.status='Operasi' THEN b.totalbiaya ELSE 0 END) AS prosedur_bedah,
      SUM(CASE WHEN b.status IN ('Ralan Dokter','Ranap Dokter') THEN b.totalbiaya ELSE 0 END) AS konsultasi,
      0 AS tenaga_ahli,
      SUM(CASE WHEN b.status IN ('Ralan Paramedis','Ranap Paramedis') THEN b.totalbiaya ELSE 0 END) AS keperawatan,
      0 AS penunjang,
      SUM(CASE WHEN b.status = 'Radiologi' THEN b.totalbiaya ELSE 0 END) AS radiologi,
      SUM(CASE WHEN b.status = 'Laborat' THEN b.totalbiaya ELSE 0 END) AS laboratorium,
      0 AS pelayanan_darah,
      SUM(CASE WHEN b.status IN ('Ralan Dokter Paramedis','Ranap Dokter Paramedis')
               AND b.nm_perawatan LIKE '%terapi%' THEN b.totalbiaya ELSE 0 END) AS rehabilitasi,
      SUM(CASE WHEN b.status = 'Kamar' THEN b.totalbiaya ELSE 0 END)+r.biaya_reg AS kamar,
      0 AS rawat_intensif,
      SUM(CASE WHEN b.status IN ('Obat', 'Retur Obat', 'Resep Pulang')
               AND b.nm_perawatan NOT LIKE '%kemo%'
               AND b.nm_perawatan NOT LIKE '%kronis%'
               THEN b.totalbiaya ELSE 0 END) AS obat,
      SUM(CASE WHEN b.status = 'Obat' AND b.nm_perawatan LIKE '%kronis%' THEN b.totalbiaya ELSE 0 END) AS obat_kronis,
      SUM(CASE WHEN b.status = 'Obat' AND b.nm_perawatan LIKE '%kemo%' THEN b.totalbiaya ELSE 0 END) AS obat_kemoterapi,
      0 AS alkes,
      
      SUM(CASE WHEN b.status = 'Tambahan' THEN b.totalbiaya ELSE 0 END) AS bmhp,
      SUM(CASE WHEN b.status IN ('Harian','Service') THEN b.totalbiaya ELSE 0 END) AS sewa_alat,
      pl.noorder AS no_lab,
      ki.kd_kamar AS kamar_terakhir,
      bgs.nm_bangsal AS nama_bangsal
    `;

            try {
                const raw = await sql(`
        SELECT ${fields}
        FROM reg_periksa AS r
        LEFT JOIN pasien AS p ON r.no_rkm_medis = p.no_rkm_medis
        LEFT JOIN bridging_sep AS bs ON r.no_rawat = bs.no_rawat

       LEFT JOIN kamar_inap AS k ON r.no_rawat = k.no_rawat

LEFT JOIN (
  SELECT 
    k1.no_rawat,
    k1.kd_kamar
  FROM kamar_inap k1
  INNER JOIN (
      SELECT no_rawat, MAX(CONCAT(tgl_masuk,' ',jam_masuk)) AS max_masuk
      FROM kamar_inap
      GROUP BY no_rawat
  ) k2 ON k1.no_rawat = k2.no_rawat
     AND CONCAT(k1.tgl_masuk,' ',k1.jam_masuk) = k2.max_masuk
) AS ki ON ki.no_rawat = r.no_rawat

LEFT JOIN kamar km ON ki.kd_kamar = km.kd_kamar
LEFT JOIN bangsal bgs ON km.kd_bangsal = bgs.kd_bangsal
LEFT JOIN billing AS b ON r.no_rawat = b.no_rawat
LEFT JOIN penilaian_medis_ranap_neonatus AS n ON r.no_rawat = n.no_rawat
LEFT JOIN skrining_tbc AS tb ON r.no_rawat = tb.no_rawat
LEFT JOIN dokter AS d ON r.kd_dokter = d.kd_dokter
LEFT JOIN idrg.claims AS cl ON bs.no_sep = cl.nomor_sep
LEFT JOIN penilaian_medis_igd AS pi ON r.no_rawat = pi.no_rawat
LEFT JOIN penilaian_medis_ralan AS pr ON r.no_rawat = pr.no_rawat
LEFT JOIN idrg.sitb ON sitb.nomor_rm = r.no_rkm_medis
LEFT JOIN poliklinik AS pkl ON r.kd_poli = pkl.kd_poli
LEFT JOIN permintaan_lab AS pl ON pl.no_rawat = r.no_rawat
        WHERE r.kd_pj = 'BPJ'
        AND r.no_rawat = ?
      `, [params['*']]);

                return { data: raw };
            } catch (error) {
                console.log(error);
            }
        },
        {
            params: t.Object({
                '*': t.RegExp(/^\d{4}\/\d{2}\/\d{2}\/\d{6}$/)
            })
        }
    )

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
        async ({ params, query }) => {
            let diagnosa_idrg = await sql(`SELECT * FROM idrg.diagnosa WHERE claim_id = ?`, [params.id]);
            let prosedur_idrg = await sql(`SELECT * FROM idrg.procedures WHERE claim_id = ?`, [params.id]);
            const grouping_result: any = await sql(`SELECT * FROM idrg.grouping_results WHERE claim_id = ?`, [params.id]);
            let grouping_idrg = {};
            if (diagnosa_idrg.length === 0) {
                diagnosa_idrg = await sql(`select ${params.id} AS claim_id, kd_penyakit AS code, CONCAT(kd_penyakit," - ",description) AS display, prioritas as no, validcode from fastabiq.diagnosa_pasien LEFT JOIN idrg.icd_codes ON diagnosa_pasien.kd_penyakit = icd_codes.code where diagnosa_pasien.no_rawat=? order by diagnosa_pasien.prioritas asc`, [query.no_rawat]);
            }
            if (prosedur_idrg.length === 0) {
                prosedur_idrg = await sql(`select ${params.id} AS claim_id, kode AS code, CONCAT(kode," - ",description) AS display, prioritas as no, 1 as multiplicity, validcode from fastabiq.prosedur_pasien LEFT JOIN idrg.icd_codes ON prosedur_pasien.kode = icd_codes.code where prosedur_pasien.no_rawat=? order by prosedur_pasien.prioritas asc`, [query.no_rawat]);
            }
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
        params: t.Object({ id: t.Number() }),
        query: t.Object({ no_rawat: t.Optional(t.String()) })
    })
    .get(
        "/inacbg/:id",
        async ({ params, user }) => {
            const diagnosa_inacbg = await sql(`SELECT * FROM idrg.diagnosa_inacbg WHERE claim_id = ?`, [params.id]);
            const prosedur_inacbg = await sql(`SELECT * FROM idrg.procedures_inacbg WHERE claim_id = ?`, [params.id]);
            const grouping_inacbg: any = await sql(`SELECT * FROM idrg.grouping_inacbg WHERE claim_id = ?`, [params.id]);
            let special_cmg: any[] = [];
            let special_cmg_option: any[] = [];
            if (grouping_inacbg.length > 0) {
                special_cmg = await sql(`SELECT * FROM idrg.grouping_inacbg_special_cmg WHERE grouping_inacbg_id = ? GROUP BY code`, [grouping_inacbg[0].id]) || null;
                special_cmg_option = await sql(`SELECT * FROM idrg.grouping_inacbg_special_cmg_option WHERE grouping_inacbg_id = ?`, [grouping_inacbg[0].id]) || null;
            }
            const grouping = grouping_inacbg.map((item: any) => {
                item.info = `${user.nama} @${new Date(item.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })} pukul ${new Date(item.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.')} ** Kelas C ** Tarif: TARIF RS KELAS C SWASTA`
                item.cbg = {
                    code: item.cbg_code,
                    description: item.cbg_description,

                }
                item.special_cmg = special_cmg
                return item
            })
            return {
                diagnosa_inacbg,
                prosedur_inacbg,
                grouping_inacbg: grouping[0],
                special_cmg_option
            };
        }, {
        params: t.Object({ id: t.Number() })
    })
    .get("/berkas/:nomor_sep", async ({ params, status }) => {
        const claim: any = await sql(`SELECT patient_id,admission_id FROM idrg.claims WHERE nomor_sep = ?`, [params.nomor_sep]);
        if (claim.length === 0 || claim[0].patient_id === null) {
            let res = await forward({
                metadata: { "method": "get_claim_data" },
                data: { nomor_sep: params.nomor_sep }
            })

            if (res.metadata.code !== 200) {
                status(400);
                return { message: "Belum ada data klaim" }
            } else {
                return { url: `${Bun.env.BERKAS_URL}?pid=${res.response.data.patient_id}&adm=${res.response.data.admission_id}` }
            }

        } else {
            return { url: `${Bun.env.BERKAS_URL}?pid=${claim[0].patient_id}&adm=${claim[0].admission_id}` }
        }
    }, {
        params: t.Object({ nomor_sep: t.String() })
    })
    .get("/sitb/:nomor_rm", async ({ params, query }) => {
        const sitb: any = await sql(`SELECT nomor_register_sitb FROM idrg.sitb WHERE nomor_rm = ?`, [params.nomor_rm]);
        const disabled: any = await sql(`SELECT id FROM idrg.claim_details WHERE claim_id = ?`, [query.claim_id]);

        let res = sitb.length === 0 ? { nomor_register_sitb: "" } : sitb[0];
        return { ...res, isValidated: disabled.length === 0 };
    }, {
        params: t.Object({ nomor_rm: t.String() }),
        query: t.Object({ claim_id: t.Optional(t.Number()) })
    })
    .get("/cppt", async ({ query }) => {
        const fields = `tgl_perawatan,
    suhu_tubuh,
    tensi,
    nadi,
    respirasi,
    tinggi,
    berat,
    spo2,
    gcs,
    kesadaran,
    keluhan,
    pemeriksaan,
    alergi,
    rtl,
    penilaian,
    instruksi,
    evaluasi,
    nip
    `
        const cppt: any = await sql(`SELECT rn.no_rawat, rn.jam_rawat, ${fields}, '' as lingkar_perut, 'Rawat Inap' as tipe, CASE WHEN cu.no_rawat IS NOT NULL THEN true ELSE false END AS checked FROM fastabiq.pemeriksaan_ranap AS rn LEFT JOIN rsfs_vedika.cppt_unclaimed AS cu ON rn.no_rawat = cu.no_rawat AND rn.jam_rawat = cu.jam_rawat WHERE rn.no_rawat = ?
                                        UNION ALL
                                        SELECT rl.no_rawat, rl.jam_rawat, ${fields}, lingkar_perut,'Rawat Jalan' as tipe, CASE WHEN cu.no_rawat IS NOT NULL THEN true ELSE false END AS checked FROM fastabiq.pemeriksaan_ralan AS rl LEFT JOIN rsfs_vedika.cppt_unclaimed AS cu ON rl.no_rawat = cu.no_rawat AND rl.jam_rawat = cu.jam_rawat WHERE rl.no_rawat = ?
                `, [query.no_rawat, query.no_rawat]);

        return cppt;
    }, {
        query: t.Object({ no_rawat: t.Optional(t.String()) })
    })

export default get;