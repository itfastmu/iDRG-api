
import { Elysia, t } from "elysia";

const EKLAIM_URL = "http://192.168.1.45/E-Klaim/ws.php?mode=debug";

const forward = async (body: unknown) => {
  const res = await fetch(EKLAIM_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return await res.json();
};

const app = new Elysia()

  .post(
    "/new-claim",
    ({ body }) => forward(body),
    { body: t.Object({ "metadata": t.Object({ "method": t.String() }), "data": t.Object({ "nomor_kartu": t.String(), "nomor_sep": t.String(), "nomor_rm": t.String(), "nama_pasien": t.String(), "tgl_lahir": t.String(), "gender": t.String() }) }) }
  )

  .post(
    "/set-claim-data",
    ({ body }) => forward(body),
    { body: t.Object({ "metadata": t.Object({ "method": t.String(), "nomor_sep": t.String() }), "data": t.Object({ "nomor_sep": t.String(), "nomor_kartu": t.String(), "tgl_masuk": t.String(), "tgl_pulang": t.String(), "cara_masuk": t.String(), "jenis_rawat": t.String(), "kelas_rawat": t.String(), "adl_sub_acute": t.String(), "adl_chronic": t.String(), "icu_indikator": t.String(), "icu_los": t.String(), "upgrade_class_ind": t.String(), "add_payment_pct": t.String(), "birth_weight": t.String(), "sistole": t.Number(), "diastole": t.Number(), "discharge_status": t.String(), "tarif_rs": t.Object({ "prosedur_non_bedah": t.String(), "prosedur_bedah": t.String(), "konsultasi": t.String(), "tenaga_ahli": t.String(), "keperawatan": t.String(), "penunjang": t.String(), "radiologi": t.String(), "laboratorium": t.String(), "pelayanan_darah": t.String(), "rehabilitasi": t.String(), "kamar": t.String(), "rawat_intensif": t.String(), "obat": t.String(), "obat_kronis": t.String(), "obat_kemoterapi": t.String(), "alkes": t.String(), "bmhp": t.String(), "sewa_alat": t.String() }), "pemulasaraan_jenazah": t.String(), "kantong_jenazah": t.String(), "peti_jenazah": t.String(), "plastik_erat": t.String(), "desinfektan_jenazah": t.String(), "mobil_jenazah": t.String(), "desinfektan_mobil_jenazah": t.String(), "covid19_status_cd": t.String(), "nomor_kartu_t": t.String(), "episodes": t.String(), "akses_naat": t.String(), "isoman_ind": t.String(), "bayi_lahir_status_cd": t.Number(), "dializer_single_use": t.String(), "kantong_darah": t.Number(), "alteplase_ind": t.Number(), "tarif_poli_eks": t.String(), "nama_dokter": t.String(), "kode_tarif": t.String(), "payor_id": t.String(), "payor_cd": t.String(), "cob_cd": t.Number(), "coder_nik": t.String() }) }) }
  )

  .post(
    "/idrg-diagnosa-set",
    ({ body }) => forward(body),
    { body: t.Object({ "metadata": t.Object({ "method": t.String(), "nomor_sep": t.String() }), "data": t.Object({ "diagnosa": t.String() }) }) }
  )

  .post(
    "/idrg-diagnosa-get",
    ({ body }) => forward(body),
    { body: t.Object({ "metadata": t.Object({ "method": t.String() }), "data": t.Object({ "nomor_sep": t.String() }) }) }
  )

  .post(
    "/idrg-procedure-set",
    ({ body }) => forward(body),
    { body: t.Object({ "metadata": t.Object({ "method": t.String(), "nomor_sep": t.String() }), "data": t.Object({ "procedure": t.String() }) }) }
  )

  .post(
    "/idrg-procedure-get",
    ({ body }) => forward(body),
    { body: t.Object({ "metadata": t.Object({ "method": t.String() }), "data": t.Object({ "nomor_sep": t.String() }) }) }
  )

  .post(
    "/grouping-idrg",
    ({ body }) => forward(body),
    { body: t.Object({ "metadata": t.Object({ "method": t.String(), "stage": t.String(), "grouper": t.String() }), "data": t.Object({ "nomor_sep": t.String() }) }) }
  )

  .post(
    "/final-idrg",
    ({ body }) => forward(body),
    { body: t.Object({ "metadata": t.Object({ "method": t.String() }), "data": t.Object({ "nomor_sep": t.String() }) }) }
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

  .post(
    "/inacbg-diagnosa-get",
    ({ body }) => forward(body),
    { body: t.Object({ "metadata": t.Object({ "method": t.String() }), "data": t.Object({ "nomor_sep": t.String() }) }) }
  )

  .post(
    "/inacbg-diagnosa-set",
    ({ body }) => forward(body),
    { body: t.Object({ "metadata": t.Object({ "method": t.String(), "nomor_sep": t.String() }), "data": t.Object({ "diagnosa": t.String() }) }) }
  )

  .post(
    "/inacbg-procedure-set",
    ({ body }) => forward(body),
    { body: t.Object({ "metadata": t.Object({ "method": t.String(), "nomor_sep": t.String() }), "data": t.Object({ "procedure": t.String() }) }) }
  )

  .post(
    "/inacbg-procedure-get",
    ({ body }) => forward(body),
    { body: t.Object({ "metadata": t.Object({ "method": t.String() }), "data": t.Object({ "nomor_sep": t.String() }) }) }
  )

  .post(
    "/grouping-inacbg-stage-1",
    ({ body }) => forward(body),
    { body: t.Object({ "metadata": t.Object({ "method": t.String(), "stage": t.String(), "grouper": t.String() }), "data": t.Object({ "nomor_sep": t.String() }) }) }
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
  .listen(3000);

console.log("🦊 Elysia API siap di http://192.168.1.45:3000");
