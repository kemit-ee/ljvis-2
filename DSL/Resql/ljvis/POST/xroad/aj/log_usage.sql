/*
declaration:
  version: 0.1
  description: >-
    Lisa kirje andmejälgija kasutusteabe tabelisse (xroad.aj_usage_log).
    Append-only — kirjeid ei uuendata ega kustutata (IKS § 19, § 25).
  method: post
  namespace: xroad
  returns: json
  allowlist:
    body:
      - field: user_code
        type: string
        description: "Isiku isikukood kelle andmeid töödeldi (EE formaat, 11 numbrit)."
      - field: action
        type: string
        description: "Inimloetav kirjeldus andmetöötluse põhjusest (eesti keeles)."
      - field: receiver_code
        type: string
        description: "X-tee kliendi member_code — asutus kes andmeid sai."
      - field: receiver_name
        type: string
        description: "Asutuse nimi (valikuline)."
      - field: receiver_system
        type: string
        description: "X-tee kliendi subsystem (valikuline)."
  response:
    fields:
      - field: id
        type: string
*/
INSERT INTO xroad.aj_usage_log (user_code, action, receiver_code, receiver_name, receiver_system)
VALUES (:user_code, :action, :receiver_code, NULLIF(:receiver_name, ''), NULLIF(:receiver_system, ''))
RETURNING id;
