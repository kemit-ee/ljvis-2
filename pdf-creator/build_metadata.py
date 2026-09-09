from pathlib import Path
import json,re
root=Path(__file__).resolve().parent.parent
sql=(root/'DSL/Liquibase/changelog/20260907120000-adr-checkpoint-titles-maarus-lisa2.sql').read_text()
rows=[]
for code,name,ref in re.findall(r"\('(P\d+)',\s*'([^']+)',\s*(NULL|'[^']+')\)",sql):
 rows.append({'code':code,'title':name+(' ('+ref.strip("'")+')' if ref!='NULL' else ''),'group':{'P12':'Dokumendid','P16':'Vedu','P25':'Sõiduki varustus','P26':'Muu'}.get(code,'')})
(Path(__file__).resolve().parent / 'templates/adr-form/checkpoints.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
