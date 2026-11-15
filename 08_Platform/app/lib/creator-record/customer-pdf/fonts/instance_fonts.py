import sys
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
src, out = sys.argv[1], sys.argv[2]
for vf in ['Fraunces-VF.ttf','Inter-VF.ttf']:
    f=TTFont(f'{src}/{vf}'); print(vf,[(a.axisTag,a.minValue,a.defaultValue,a.maxValue) for a in f['fvar'].axes])
JOBS=[('Fraunces-VF.ttf','Fraunces',{'SOFT':0,'WONK':0,'opsz':36},[400,500,600]),
      ('Inter-VF.ttf','Inter',{'opsz':14},[400,500,600])]
for vf,name,fixed,weights in JOBS:
    for w in weights:
        f=TTFont(f'{src}/{vf}')
        inst=instancer.instantiateVariableFont(f,{**fixed,'wght':w},updateFontNames=False)
        # deterministic: fixed head timestamps
        inst['head'].created=inst['head'].modified=0; inst.recalcTimestamp=False
        # Glyph substitutions (contextual alternates, ligatures) produce glyphs with no character mapping, which breaks the PDF
        # text layer (copy, search, screen readers). Text is printed one character per glyph instead. Kerning (GPOS) is kept.
        if 'GSUB' in inst: del inst['GSUB']
        # Each instance needs its own PostScript and full name: PDF writers key embedded fonts by name, so instances sharing the
        # variable font's default name would overwrite one another's subsets (wrong text layer).
        ps=f'SI8{name}-{w}'
        for rec in inst['name'].names:
            if rec.nameID in (3, 4, 6): rec.string = ps
        if 'CFF ' in inst: raise SystemExit('unexpected CFF')
        inst.save(f'{out}/{name}-{w}.ttf',reorderTables=True)
        print('wrote',name,w)
