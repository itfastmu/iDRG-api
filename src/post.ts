import Elysia, { t } from "elysia";
import { sql } from "./connection";

const mode = Bun.env.MODE === "debug" ? "?mode=debug" : "";
const forward = async (body: unknown) => {
    if (!Bun.env.EKLAIM_URL) {
        throw new Error("EKLAIM_URL environment variable is not defined");
    }
    const res = await fetch(Bun.env.EKLAIM_URL + mode, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    return await res.json();
};
const post = new Elysia({ prefix: '/send' })
    .post("/sitb-validate", async ({ body }) => {
        const res = await forward({
            metadata: { "method": "sitb_validate" },
            data: body.data
        })
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
            if (res.metadata.code === 200) {
                const claim: any = await sql(`INSERT INTO idrg.claims(nomor_kartu,nomor_sep,nomor_rm,nama_pasien,tgl_lahir,gender,status_claim) VALUES('${body.data.nomor_kartu}', '${body.data.nomor_sep}', '${body.data.nomor_rm}', '${body.data.nama_pasien}', '${body.data.tgl_lahir}', '${body.data.gender}','new claim') RETURNING id`);
                return { ...res.response, id_claim: claim.id };
            } else {
                return { error: res.metadata.message };
            }

        }, {
        body: t.Object({ "data": t.Object({ "nomor_kartu": t.String(), "nomor_sep": t.String(), "nomor_rm": t.String(), "nama_pasien": t.String(), "tgl_lahir": t.String(), "gender": t.String() }) })
    })

    .post(
        "/set-claim-data",
        async ({ body }) => {
            const res = await forward({
                metadata: {
                    "method": "set_claim_data",
                    "nomor_sep": body.data.nomor_sep
                },
                data: body.data
            })
            if (res.metadata.code === 200) {
                return res.response;
            } else {
                return { error: res.metadata.message };
            }

        },
        {
            body: t.Object({
                claim_id: t.Number(),
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
                    cob_cd: t.Optional(t.Number()),

                    // coder_nik wajib
                    coder_nik: t.String(),
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
            const diagnosa = await forward({
                metadata: { "method": "idrg_diagnosa_set", "nomor_sep": body.nomor_sep },
                data: { "diagnosa": body.diagnosa.map((item: any) => item.code).join('#') }
            })
            if (diagnosa.metadata.code === 200) {
                await sql(`insert into idrg.diagnosa(nomor_sep,diagnosa) values('${body.nomor_sep}','${body.diagnosa}')`);
            }
            const procedure = await forward({
                metadata: { "method": "idrg_procedure_set", "nomor_sep": body.nomor_sep },
                data: { "procedure": body.procedure.map((item: any) => item.code).join('#') }
            })
            if (procedure.metadata.code === 200) {
                await sql(`insert into idrg.procedure(nomor_sep,procedure) values('${body.nomor_sep}','${body.procedure}')`);
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
                await sql(`INSERT INTO idrg.grouping_results(nomor_sep,hasil) values('${body.nomor_sep}','${JSON.stringify(res.response)}')`);
                return res;
            } else {
                return { error: "Failed to set diagnosa or procedure" };
            }
        },
        {
            body: t.Object({
                claim_id: t.Number(),
                "diagnosa": t.Array(t.Object({
                    claim_id: t.Number(),
                    code: t.String(),
                    display: t.String(),
                    no: t.Number(),
                    validcode: t.Number()
                })), "procedure": t.Array(t.Object({
                    claim_id: t.Number(),
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
            const res: any = forward({
                metadata: { "method": "idrg_grouper_final" },
                data: body.data
            })
            if (res.metadata.code === 200) {
                await sql(`update idrg.claims set status_claim='Final Idrg' where id=${body.claim_id}`);
            }
            return res.response;
        },
        { body: t.Object({ "claim_id": t.Number(), "data": t.Object({ "nomor_sep": t.String() }) }) }
    )

    .post(
        "/re-edit-idrg",
        ({ body }) => forward(body),
        { body: t.Object({ "metadata": t.Object({ "method": t.String() }), "data": t.Object({ "nomor_sep": t.String() }) }) }
    )

    .post(
        "/idrg-to-inacbg-import",
        ({ body }) => forward(body),
        { body: t.Object({ "metadata": t.Object({ "method": t.String() }), "data": t.Object({ "nomor_sep": t.String() }) }) }
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
                await sql(`insert into idrg.diagnosa_inacbg(nomor_sep,diagnosa) values('${body.nomor_sep}','${body.diagnosa}')`);
            }
            const procedure = await forward({
                metadata: { "method": "inacbg_procedure_set", "nomor_sep": body.nomor_sep },
                data: { "procedure": body.procedure.map((item: any) => item.code).join('#') }
            })
            if (procedure.metadata.code === 200) {
                await sql(`insert into idrg.procedure_inacbg(nomor_sep,procedure) values('${body.nomor_sep}','${body.procedure}')`);
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
                return res;
            } else {
                return { error: "Failed to set diagnosa or procedure" };
            }
        },
        {
            body: t.Object({
                "diagnosa": t.Array(t.Object({
                    claim_id: t.Number(),
                    code: t.String(),
                    display: t.String(),
                    no: t.Number(),
                    validcode: t.Number()
                })),
                "procedure": t.Array(t.Object({
                    claim_id: t.Number(),
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
        ({ body }) => forward(body),
        { body: t.Object({ "metadata": t.Object({ "method": t.String(), "stage": t.String(), "grouper": t.String() }), "data": t.Object({ "nomor_sep": t.String(), "special_cmg": t.String() }) }) }
    )

    .post(
        "/final-inacbg",
        ({ body }) => forward(body),
        { body: t.Object({ "metadata": t.Object({ "method": t.String() }), "data": t.Object({ "nomor_sep": t.String() }) }) }
    )

    .post(
        "/re-edit-inacbg",
        ({ body }) => forward(body),
        { body: t.Object({ "metadata": t.Object({ "method": t.String() }), "data": t.Object({ "nomor_sep": t.String() }) }) }
    )

    .post(
        "/claim-final",
        ({ body }) => forward(body),
        { body: t.Object({ "metadata": t.Object({ "method": t.String() }), "data": t.Object({ "nomor_sep": t.String(), "coder_nik": t.String() }) }) }
    )

    .post(
        "/claim-re-edit",
        ({ body }) => forward(body),
        { body: t.Object({ "metadata": t.Object({ "method": t.String() }), "data": t.Object({ "nomor_sep": t.String() }) }) }
    )

    .post(
        "/claim-send",
        ({ body }) => forward(body),
        { body: t.Object({ "metadata": t.Object({ "method": t.String() }), "data": t.Object({ "nomor_sep": t.String() }) }) }
    )

    .post(
        "/get-claim-data",
        ({ body }) => forward(body),
        { body: t.Object({ "metadata": t.Object({ "method": t.String() }), "data": t.Object({ "nomor_sep": t.String() }) }) }
    )

export default post;