"""Read generated documents independently with Python ZIP/XML implementations."""
import sys
from pathlib import Path
from zipfile import ZipFile, ZIP_STORED
from lxml import etree as E
ns={'hp':'http://www.hancom.co.kr/hwpml/2011/paragraph','hh':'http://www.hancom.co.kr/hwpml/2011/head','opf':'http://www.idpf.org/2007/opf/'}
for f in Path(sys.argv[1]).glob('*.hwpx'):
 with ZipFile(f) as z:
  assert z.testzip() is None
  assert z.namelist()[0]=='mimetype' and z.getinfo('mimetype').compress_type==ZIP_STORED
  assert z.read('mimetype')==b'application/hwp+zip'
  xmls={n:E.fromstring(z.read(n)) for n in z.namelist() if n.endswith(('.xml','.hpf','.rdf'))}
  for item in xmls['Contents/content.hpf'].findall('.//opf:item',ns): assert item.get('href') in z.namelist()
  sec=xmls['Contents/section0.xml']; head=xmls['Contents/header.xml']; ps=list(sec)
  count=22 if f.name=='combined-q3.hwpx' else 2 if f.name=='api-combined.hwpx' else 1
  assert len(ps)==count and len(sec.findall('.//hp:tbl',ns))==count
  assert len(sec.findall('.//hp:secPr',ns))==1 and head.get('secCnt')=='1'
  assert [p.get('pageBreak') for p in ps]==['0']+['1']*(count-1)
  assert len({p.get('id') for p in sec.findall('.//hp:p',ns)})==len(sec.findall('.//hp:p',ns))
  assert len({p.get('id') for p in sec.findall('.//hp:tbl',ns)})==count
  assert len({p.get('instid') for p in sec.findall('.//hp:pic',ns)})==count
  assert len(sec.findall('.//hp:pic',ns))==count and z.read('BinData/image1.gif').startswith(b'GIF')
  char_ids={c.get('id') for c in head.findall('.//hh:charPr',ns)}
  assert all(run.get('charPrIDRef') in char_ids for run in sec.findall('.//hp:run',ns))
  texts=[''.join(p.itertext()) for p in ps]
  assert all('{{' not in t for t in texts)
  if f.name=='api-combined.hwpx':
   assert '둘째학생' in texts[0] and '첫학생' in texts[1] and '미완료학생' not in ''.join(texts)
  else:
   for i,p in enumerate(ps):
    table=p.find('.//hp:tbl',ns)
    cells={(int(c.find('hp:cellAddr',ns).get('rowAddr')),int(c.find('hp:cellAddr',ns).get('colAddr'))):c for c in table.findall('.//hp:tc',ns)}
    assert f'시험학생{i+1}' in ''.join(cells[2,0].itertext())
    assert f'학생{i+1} 의견 <&>다음 줄 😀'==''.join(cells[14,2].itertext())
    assert cells[14,2].find('.//hp:lineBreak',ns) is not None
    for j,(row,col) in enumerate((r,c) for r in range(6,9) for c in [2,3,7,11]): assert f'{j+1}주차 · {j//4+7}호 활동' in ''.join(cells[row,col].itertext())
    for row in range(10,14): assert sum('○' in ''.join(cells[row,col].itertext()) for col in [4,6,9,10,12])==1
   assert ('2분기' if f.name=='single-q2.hwpx' else '3분기') in texts[0]
   if f.name=='extra-lines.hwpx': assert '13번째 추가내용' in texts[0]
  assert 'Preview/PrvImage.png' not in z.namelist()
 print(f'{f.name}: ZIP integrity, XML relationships, native tables and student data passed')
