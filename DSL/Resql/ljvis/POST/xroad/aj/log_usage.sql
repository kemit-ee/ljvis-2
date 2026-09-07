/*
description: Lisa kirje andmejälgija kasutusteabe tabelisse (xroad.aj_usage_log). Append-only — kirjeid
  ei uuendata ega kustutata (IKS § 19, § 25).
namespace: xroad
params:
  user_code:
    type: string
    required: false
    description: Isiku isikukood kelle andmeid töödeldi (EE formaat, 11 numbrit).
  action:
    type: string
    required: false
    description: Inimloetav kirjeldus andmetöötluse põhjusest (eesti keeles).
  receiver_code:
    type: string
    required: false
    description: X-tee kliendi member_code — asutus kes andmeid sai.
  receiver_name:
    type: string
    required: false
    description: Asutuse nimi (valikuline).
  receiver_system:
    type: string
    required: false
    description: X-tee kliendi subsystem (valikuline).
returns:
- name: id
  type: string
  nullable: true
*/
INSERT INTO xroad.aj_usage_log (user_code, action, receiver_code, receiver_name, receiver_system)
VALUES (:user_code, :action, :receiver_code, NULLIF(:receiver_name, ''), NULLIF(:receiver_system, ''))
RETURNING id;
