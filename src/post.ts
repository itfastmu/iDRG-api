import Elysia, { t } from "elysia";
import { sql } from "./connection";

const mode = Bun.env.MODE === "debug" ? "?mode=debug" : "";
const forward = async (body: unknown) => {
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
const post = new Elysia({ prefix: '/send' })
    .post("/sitb-validate", async ({ body }) => {
        const res = await forward({
            metadata: { "method": "sitb_validate" },
            data: body.data
        })
        if (res.metadata.code === 200) {
            await sql(`INSERT INTO idrg.sitb(nomor_register_sitb,nomor_sep) VALUES('${body.data.nomor_register_sitb}', '${body.data.nomor_sep}')`);
        }
        return res;
    }, {
        body: t.Object({ "data": t.Object({ "nomor_sep": t.String(), "nomor_register_sitb": t.String() }) })
    })
    .post(
        "/new-claim",
        async ({ body }) => {
            const res = await forward({
                metadata: {
                    "method": "new_claim"
                },
                data: body.data
            })
            console.log(res);
            if (res.metadata.code === 200) {
                // const claim: any = await sql(`INSERT INTO idrg.claims(nomor_kartu, nomor_sep, nomor_rm, nama_pasien, tgl_lahir, gender, status_claim) VALUES('${body.data.nomor_kartu}', '${body.data.nomor_sep}', '${body.data.nomor_rm}', '${body.data.nama_pasien}', '${body.data.tgl_lahir}', '${body.data.gender}', 'new claim') RETURNING id`);
                return { ...res.response };
            } else {
                return { error: res.metadata.message };
            }

        }, {
        body: t.Object({ "data": t.Object({ "nomor_kartu": t.String(), "nomor_sep": t.String(), "nomor_rm": t.String(), "nama_pasien": t.String(), "tgl_lahir": t.String(), "gender": t.String() }) })
    })

    .post(
        "/set-claim-data",
        async ({ body }) => {
            body.data.kode_tarif = 'CS'
            const res = await forward({
                metadata: {
                    "method": "set_claim_data",
                    "nomor_sep": body.data.nomor_sep
                },
                data: { ...body.data, coder_nik: '3315070211930002' }
            })
            const { tarif_rs, ...claimData } = body.data;
            const keys = Object.keys(claimData);
            const values = Object.values(claimData);
            const placeholders = keys.map(() => "?").join(",");
            if (res.metadata.code === 200) {
                // ambil key untuk tabel claims
                const claim: any = await sql(`INSERT INTO idrg.claims(${keys.join(",")}) VALUES(${placeholders}) RETURNING id`, values);
                // console.log(claim);
                if (tarif_rs) {
                    const tarifKeys = Object.keys(tarif_rs);
                    const tarifValues = Object.values(tarif_rs);

                    const tarifSql = `INSERT INTO idrg.tarif_rs (claim_id, ${tarifKeys.join(",")})
                    VALUES (?, ${tarifKeys.map(() => "?").join(",")})`;

                    await sql(tarifSql, [claim[0].id, ...tarifValues]);
                }
                return { ...res, claim_id: claim[0].id };
            } else {
                console.log(res)
                if (res.metadata.error_no === 'E2009') {
                    await sql(`INSERT INTO idrg.claims(${keys.join(",")},status_claim) VALUES(${placeholders},?) RETURNING id`, [...values, 7]);
                }
                return res
            }

        },
        {
            body: t.Object({
                data: t.Object({
                    nomor_sep: t.String(),
                    nomor_kartu: t.String(),

                    tgl_masuk: t.Optional(t.String()),
                    tgl_pulang: t.Optional(t.String()),
                    cara_masuk: t.Optional(t.String()),
                    jenis_rawat: t.Optional(t.String()),
                    kelas_rawat: t.Optional(t.String()),

                    adl_sub_acute: t.Optional(t.String()),
                    adl_chronic: t.Optional(t.String()),
                    icu_indikator: t.Optional(t.String()),
                    icu_los: t.Optional(t.String()),
                    upgrade_class_ind: t.Optional(t.String()),
                    add_payment_pct: t.Optional(t.String()),
                    birth_weight: t.Optional(t.String()),

                    sistole: t.Optional(t.Number()),
                    diastole: t.Optional(t.Number()),
                    discharge_status: t.Optional(t.String()),

                    // tarif_rs wajib, termasuk semua field di dalamnya
                    tarif_rs: t.Object({
                        prosedur_non_bedah: t.String(),
                        prosedur_bedah: t.String(),
                        konsultasi: t.String(),
                        tenaga_ahli: t.String(),
                        keperawatan: t.String(),
                        penunjang: t.String(),
                        radiologi: t.String(),
                        laboratorium: t.String(),
                        pelayanan_darah: t.String(),
                        rehabilitasi: t.String(),
                        kamar: t.String(),
                        rawat_intensif: t.String(),
                        obat: t.String(),
                        obat_kronis: t.String(),
                        obat_kemoterapi: t.String(),
                        alkes: t.String(),
                        bmhp: t.String(),
                        sewa_alat: t.String(),
                    }),

                    pemulasaraan_jenazah: t.Optional(t.String()),
                    kantong_jenazah: t.Optional(t.String()),
                    peti_jenazah: t.Optional(t.String()),
                    plastik_erat: t.Optional(t.String()),
                    desinfektan_jenazah: t.Optional(t.String()),
                    mobil_jenazah: t.Optional(t.String()),
                    desinfektan_mobil_jenazah: t.Optional(t.String()),

                    covid19_status_cd: t.Optional(t.String()),
                    nomor_kartu_t: t.Optional(t.String()),
                    episodes: t.Optional(t.String()),
                    akses_naat: t.Optional(t.String()),
                    isoman_ind: t.Optional(t.String()),

                    bayi_lahir_status_cd: t.Optional(t.Number()),
                    dializer_single_use: t.Optional(t.String()),
                    kantong_darah: t.Optional(t.Number()),
                    alteplase_ind: t.Optional(t.Number()),
                    tarif_poli_eks: t.Optional(t.String()),

                    nama_dokter: t.Optional(t.String()),
                    kode_tarif: t.Optional(t.String()),
                    payor_id: t.Optional(t.String()),
                    payor_cd: t.Optional(t.String()),
                    cob_cd: t.Optional(t.String())
                })

            })
        }
    )
    // .post(
    //     "/idrg-diagnosa-set",
    //     async ({ body }) => {
    //         const res = await forward({
    //             metadata: {
    //                 "method": "new_claim"
    //             },
    //             data: body.data
    //         })
    //         if (res.metadata.code === 200) {
    //             return res.response;
    //         } else {
    //             return { error: res.metadata.message };
    //         }

    //     },
    //     {
    //         body: t.Object({ "nomor_sep": t.String(), "data": t.Object({ "diagnosa": t.String() }) })
    //     }
    // )

    // .post(
    //     "/idrg-diagnosa-get",
    //     ({ body }) => forward(body),
    //     { body: t.Object({ "metadata": t.Object({ "method": t.String() }), "data": t.Object({ "nomor_sep": t.String() }) }) }
    // )

    // .post(
    //     "/idrg-procedure-set",
    //     ({ body }) => forward(body),
    //     { body: t.Object({ "metadata": t.Object({ "method": t.String(), "nomor_sep": t.String() }), "data": t.Object({ "procedure": t.String() }) }) }
    // )

    // .post(
    //     "/idrg-procedure-get",
    //     ({ body }) => forward(body),
    //     { body: t.Object({ "metadata": t.Object({ "method": t.String() }), "data": t.Object({ "nomor_sep": t.String() }) }) }
    // )

    .post(
        "/grouping-idrg",
        async ({ body }) => {
            try {

                const diagnosa = await forward({
                    metadata: { "method": "idrg_diagnosa_set", "nomor_sep": body.nomor_sep },
                    data: { "diagnosa": body.diagnosa.map((item: any) => item.code).join('#') }
                })
                if (diagnosa.metadata.code === 200) {
                    await sql(`DELETE FROM idrg.diagnosa WHERE claim_id='${body.claim_id}'`);
                    const diagnosa = body.diagnosa.map((item: any) => `('${body.claim_id}', '${item.code}', '${item.display}', ${item.no}, ${item.validcode})`).join(',');
                    await sql(`insert into idrg.diagnosa(claim_id, code, display, no, validcode) values${diagnosa}`);
                }
                const procedure = await forward({
                    metadata: { "method": "idrg_procedure_set", "nomor_sep": body.nomor_sep },
                    data: { "procedure": body.procedure.map((item: any) => item.code).join('#') }
                })
                if (procedure.metadata.code === 200) {
                    await sql(`DELETE FROM idrg.procedures WHERE claim_id='${body.claim_id}'`);
                    const procedure = body.procedure.map((item: any) => `('${body.claim_id}', '${item.code}', '${item.display}', ${item.no}, ${item.multiplicity}, ${item.validcode})`).join(',');
                    await sql(`insert into idrg.procedures(claim_id, code, display, no, multiplicity, validcode) values${procedure}`);
                }
                if (diagnosa.metadata.code === 200 && procedure.metadata.code === 200) {
                    const res = await forward({
                        metadata: {
                            "method": "grouper",
                            "stage": "1",
                            "grouper": "idrg"
                        },
                        data: { "nomor_sep": body.nomor_sep }
                    })
                    if (res.metadata.code === 200) {
                        await sql(`DELETE FROM idrg.grouping_results WHERE claim_id='${body.claim_id}'`);
                        await sql(`INSERT INTO idrg.grouping_results(claim_id, mdc_number,mdc_description,drg_code,drg_description) values('${body.claim_id}', '${res.response_idrg.mdc_number}', '${res.response_idrg.mdc_description}', '${res.response_idrg.drg_code}', '${res.response_idrg.drg_description}')`);
                        const date = new Date();
                        const options = { year: 'numeric' as const, month: 'long' as const, day: 'numeric' as const };
                        const formattedDate = date.toLocaleDateString('id-ID', options);

                        // Format waktu menjadi "10:05"
                        const hours = String(date.getHours()).padStart(2, '0');
                        const minutes = String(date.getMinutes()).padStart(2, '0');
                        const formattedTime = `${hours}.${minutes}`;
                        res.response_idrg.info = `iDRG @ ${formattedDate} pukul ${formattedTime}`;
                    }
                    return res;
                } else {
                    return { diagnosa, procedure };
                }
            } catch (error) {
                console.log(error)
            }
        },
        {
            body: t.Object({
                claim_id: t.Number(),
                "diagnosa": t.Array(t.Object({
                    code: t.String(),
                    display: t.String(),
                    no: t.Number(),
                    validcode: t.Number()
                })), "procedure": t.Array(t.Object({
                    code: t.String(),
                    display: t.String(),
                    no: t.Number(),
                    multiplicity: t.Number(),
                    validcode: t.Number()
                })),
                "nomor_sep": t.String()
            })
        }
    )

    .post(
        "/final-idrg",
        async ({ body }) => {
            const res: any = await forward({
                metadata: { "method": "idrg_grouper_final" },
                data: body.data
            })
            if (res.metadata.code === 200) {
                await sql(`update idrg.claims set status_claim = 3 where id = ${body.claim_id}`);
            }
            return res;
        },
        { body: t.Object({ "claim_id": t.Number(), "data": t.Object({ "nomor_sep": t.String() }) }) }
    )

    .post(
        "/re-edit-idrg",
        async ({ body }) => {
            const res = await forward({
                metadata: { "method": "idrg_grouper_reedit" },
                data: { nomor_sep: body.nomor_sep }
            })
            if (res.metadata.code === 200) {
                await sql(`update idrg.claims set status_claim = 2 where id = ${body.claim_id}`);
            }
            return res;
        },
        { body: t.Object({ claim_id: t.Number(), "nomor_sep": t.String() }) }
    )

    .post(
        "/idrg-to-inacbg-import",
        async ({ body }) => {
            const res = await forward({
                metadata: { "method": "idrg_to_inacbg_import" },
                data: { nomor_sep: body.nomor_sep }
            })
            // if (res.metadata.code === 200) {
            //     await sql(`update idrg.claims set status_claim = 'Import to Inacbg' where id = ${body.claim_id}`);
            // }
            return res;
        },
        { body: t.Object({ claim_id: t.Number(), "nomor_sep": t.String() }) }
    )

    // .post(
    //     "/inacbg-diagnosa-get",
    //     ({ body }) => forward(body),
    //     { body: t.Object({ "metadata": t.Object({ "method": t.String() }), "data": t.Object({ "nomor_sep": t.String() }) }) }
    // )

    // .post(
    //     "/inacbg-diagnosa-set",
    //     ({ body }) => forward(body),
    //     { body: t.Object({ "metadata": t.Object({ "method": t.String(), "nomor_sep": t.String() }), "data": t.Object({ "diagnosa": t.String() }) }) }
    // )

    // .post(
    //     "/inacbg-procedure-set",
    //     ({ body }) => forward(body),
    //     { body: t.Object({ "metadata": t.Object({ "method": t.String(), "nomor_sep": t.String() }), "data": t.Object({ "procedure": t.String() }) }) }
    // )

    // .post(
    //     "/inacbg-procedure-get",
    //     ({ body }) => forward(body),
    //     { body: t.Object({ "metadata": t.Object({ "method": t.String() }), "data": t.Object({ "nomor_sep": t.String() }) }) }
    // )

    .post(
        "/grouping-inacbg-stage-1",
        async ({ body }) => {
            const diagnosa = await forward({
                metadata: { "method": "inacbg_diagnosa_set", "nomor_sep": body.nomor_sep },
                data: { "diagnosa": body.diagnosa.map((item: any) => item.code).join('#') }
            })
            if (diagnosa.metadata.code === 200) {
                await sql(`DELETE FROM idrg.diagnosa_inacbg WHERE claim_id='${body.claim_id}'`);
                const diagnosa = body.diagnosa.map((item: any) => `('${body.claim_id}', '${item.code}','${item.display}', ${item.no}, ${item.validcode})`).join(',');
                await sql(`insert into idrg.diagnosa_inacbg(claim_id, code, display, no, validcode) values${diagnosa}`);
            }
            const procedure = await forward({
                metadata: { "method": "inacbg_procedure_set", "nomor_sep": body.nomor_sep },
                data: { "procedure": body.procedure.map((item: any) => item.code).join('#') }
            })
            if (procedure.metadata.code === 200) {
                await sql(`DELETE FROM idrg.procedures_inacbg WHERE claim_id='${body.claim_id}'`);
                const procedure = body.procedure.map((item: any) => `('${body.claim_id}', '${item.code}', '${item.display}', ${item.no}, ${item.validcode})`).join(',');
                await sql(`insert into idrg.procedures_inacbg(claim_id, code, display, no, validcode) values${procedure}`);
            }
            if (diagnosa.metadata.code === 200 && procedure.metadata.code === 200) {
                const res = await forward({
                    metadata: {
                        "method": "grouper",
                        "stage": "1",
                        "grouper": "inacbg"
                    },
                    data: { "nomor_sep": body.nomor_sep }
                })
                if (res.metadata.code === 200) {

                    await sql(`DELETE FROM idrg.grouping_inacbg WHERE claim_id='${body.claim_id}'`);
                    const inacbgGroup: any = await sql(`INSERT INTO idrg.grouping_inacbg(claim_id, stage,cbg_code,cbg_description,base_tariff,tariff,kelas,inacbg_version) values('${body.claim_id}',1, '${res.response_inacbg.cbg.code}', '${res.response_inacbg.cbg.description}', ${res.response_inacbg.base_tariff}, ${res.response_inacbg.tariff}, '${res.response_inacbg.kelas}', '${res.response_inacbg.inacbg_version}') RETURNING id`);
                    if (res.special_cmg_option) {
                        const cmgOption = res.special_cmg_option.map((item: any) => `('${inacbgGroup[0].id}', '${item.code}', '${item.description}','${item.type}')`).join(',');
                        await sql(`INSERT INTO idrg.grouping_inacbg_special_cmg_option(grouping_inacbg_id, code, description, type) values${cmgOption}`);
                    }
                }
                return {
                    ...res,
                    info: `MOCHAMMAD SAIFUDDIN NOVIANTO SAPUTRA, AMD.RMIK @ ${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })} pukul ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.')} ** Kelas C ** Tarif: TARIF RS KELAS C SWASTA`
                };
            } else {
                return { error: "Failed to set diagnosa or procedure" };
            }
        },
        {
            body: t.Object({
                claim_id: t.Number(),
                "diagnosa": t.Array(t.Object({
                    code: t.String(),
                    display: t.String(),
                    no: t.Number(),
                    validcode: t.Number()
                })),
                "procedure": t.Array(t.Object({
                    code: t.String(),
                    display: t.String(),
                    no: t.Number(),
                    validcode: t.Number()
                })),
                "nomor_sep": t.String()
            })
        }
    )

    .post(
        "/grouping-inacbg-stage-2",
        async ({ body }) => {
            const res: any = await forward({
                metadata: { "method": "grouper", "stage": "2", "grouper": "inacbg" },
                data: { nomor_sep: body.nomor_sep, special_cmg: body.special_cmg.map((item: any) => item.code).join('#') }
            })
            console.log(res);
            if (res.metadata.code === 200) {
                sql(`update idrg.grouping_inacbg set stage=2 where claim_id='${body.claim_id}'`);
                if (res.response_inacbg.special_cmg) {
                    const cmg = res.response_inacbg.special_cmg.map((item: any) => `((select id from idrg.grouping_inacbg where claim_id='${body.claim_id}'), '${item.code}', '${item.description}', ${item.tariff},'${item.type}')`).join(',');
                    sql(`INSERT INTO idrg.grouping_inacbg_special_cmg(grouping_inacbg_id, code, description,tariff,type) values${cmg}`);
                    return res;
                }
            }
        },
        {
            body: t.Object({
                claim_id: t.Number(),
                "nomor_sep": t.String(),
                "special_cmg": t.Array(t.Object({
                    code: t.String(),
                    description: t.String(),
                    type: t.String()
                }))
            })
        }
    )

    .post(
        "/final-inacbg",
        ({ body }) => forward({
            metadata: { "method": "inacbg_grouper_final" },
            data: { nomor_sep: body.nomor_sep }
        }),
        { body: t.Object({ "nomor_sep": t.String() }) }
    )

    .post(
        "/re-edit-inacbg",
        ({ body }) => forward({
            metadata: { "method": "inacbg_grouper_reedit" },
            data: { nomor_sep: body.nomor_sep }
        }),
        { body: t.Object({ "nomor_sep": t.String() }) }
    )

    .post(
        "/claim-final",
        ({ body }) => forward({
            metadata: { "method": "claim_final" },
            data: { nomor_sep: body.nomor_sep },
            coder_nik: "3315070211930002"
        }),
        { body: t.Object({ "nomor_sep": t.String() }) }
    )

    .post(
        "/claim-re-edit",
        ({ body }) => forward({
            metadata: { "method": "reedit_claim" },
            data: { nomor_sep: body.nomor_sep }
        }),
        { body: t.Object({ "nomor_sep": t.String() }) }
    )

    .post(
        "/claim-send",
        ({ body }) => forward({
            metadata: { "method": "send_claim_individual" },
            data: { nomor_sep: body.nomor_sep }
        }),
        { body: t.Object({ "nomor_sep": t.String() }) }
    )

    .post(
        "/get-claim-data",
        ({ body }) => forward({
            metadata: { "method": "get_claim_data" },
            data: { nomor_sep: body.nomor_sep }
        }),
        { body: t.Object({ "nomor_sep": t.String() }) }
    )

export default post;