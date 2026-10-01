"""Prepare a fillable template from the supplied school HWPX, preserving its styles/assets.
Usage: python scripts/prepare-haneulbit-hwpx.py ORIGINAL.hwpx OUTPUT.json
"""
import base64
import copy
import json
import sys
from pathlib import Path
from zipfile import ZipFile
from lxml import etree as E

HP = 'http://www.hancom.co.kr/hwpml/2011/paragraph'
NS = {'hp': HP}
def tag(name): return f'{{{HP}}}{name}'

def prepare(source, target):
    with ZipFile(source) as z:
        root = E.fromstring(z.read('Contents/section0.xml'))
        # The school source repeats the same blank form five times; use its first form.
        first = root[0]
        for child in list(root)[1:]: root.remove(child)
        table = first.find('.//hp:tbl', NS)
        cells = {(int(c.find('hp:cellAddr', NS).get('rowAddr')), int(c.find('hp:cellAddr', NS).get('colAddr'))): c for c in table.findall('.//hp:tc', NS)}
        def fill(row, col, token):
            sub = cells[row, col].find('hp:subList', NS)
            p = sub[0]
            for child in list(sub)[1:]: sub.remove(child)
            run = p.find('hp:run', NS)
            char_id = run.get('charPrIDRef')
            for child in list(p): p.remove(child)
            run = E.SubElement(p, tag('run'), charPrIDRef=char_id)
            E.SubElement(run, tag('t')).text = '{{' + token + '}}'
        fill(1, 1, 'program'); fill(1, 8, 'period'); fill(2, 0, 'identity')
        greeting = cells[4, 0].find('hp:subList', NS)
        last_text = greeting.findall('.//hp:t', NS)[-1]
        last_text.text = ' 지도 강사 {{instructor}} 드림'
        for t in greeting.findall('.//hp:t', NS):
            if t.text: t.text = t.text.replace('3분기', '{{quarter}}분기').replace('2분기', '{{quarter}}분기')
        for i, (row, col) in enumerate(( (row,col) for row in range(6,9) for col in [2,3,7,11] )): fill(row, col, f'activity.{i}')
        for row, key in enumerate(['readiness','participation','concentration','completion'],10):
            for i,col in enumerate([4,6,9,10,12]): fill(row,col,f'{key}.{i}')
        fill(14,2,'comment')
        # Cached line positions describe the empty form, so Hancom must reflow the filled text.
        for e in root.findall('.//hp:linesegarray',NS): e.getparent().remove(e)
        section = E.tostring(root, encoding='unicode')
        paragraph = E.tostring(first, encoding='unicode')
        # Subsequent student forms begin on a new page within the same section.
        next_p = copy.deepcopy(first); next_p.set('pageBreak','1')
        for e in next_p.findall('.//hp:secPr',NS): e.getparent().remove(e)
        # Keep the original dimensions, borders, fonts, picture and greeting intact.
        files = [{ 'name':name, 'base64':base64.b64encode(z.read(name)).decode() } for name in z.namelist() if name not in ['Contents/section0.xml','Preview/PrvText.txt','Preview/PrvImage.png']]
        # Never include the source's stale preview image/text in a filled document.
        result = {'sourceName':Path(source).name,'sectionOpen':section[:section.index('>')+1], 'firstParagraph':paragraph,'nextParagraph':E.tostring(next_p,encoding='unicode'),'files':files}
        Path(target).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')

if __name__ == '__main__': prepare(sys.argv[1],sys.argv[2])
