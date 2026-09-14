# Supplied ERRU MoveHub XSD 3.5

These are ERRU message contracts shared by contract tests and future adapters. They are independent of the X-tee routing configuration in `DSL/xtr`.

Copied byte-for-byte on 2026-09-11 from the project's supplied ERRU technical specification bundle (directory labelled `ERRU 3.0 tehniline spetsifikatsioon/.../3.0`). All 19 schemas declare `https://webgate.ec.testa.eu/move-hub/erru/3.5`; `Global_Types.xsd` also fixes `Header.version` to `3.5`. `SHA256SUMS` records the supplied bytes. Do not hand-edit the schemas; replace a reviewed upstream bundle together with its provenance and checksums.

ERRU 3.0 functionality and MoveHub XML schema revisions are different version labels. [EUCARIS release history](https://www.eucaris.net/kb/erru/erru-extension/) documents ERRU 3.0 functionality in 2023 and the upgrade to MoveHub XSD 3.5 in SU-ERRU134 on 2024-11-20. [EUCARIS documentation downloads](https://www.eucaris.net/kb/erru/) require credentials from EUCARIS Operations.

The version is corroborated; the exact local bundle has not been compared with an authenticated upstream download, and this directory is not a claim that 3.5 is the latest deployed version. Pinning it makes CI reproducible. On upgrade, replace the tested bundle or point `SCHEMAS` in `tests/contract/check_erru_contract.py` to the new version directory. CI detects covered NU contract mismatches and rejects an unexpected namespace/version.

Only NU Request, ACK and related ErrorNotification are tested in this change. Other schemas are preserved as part of the supplied bundle, without claiming coverage for other ERRU modules.
