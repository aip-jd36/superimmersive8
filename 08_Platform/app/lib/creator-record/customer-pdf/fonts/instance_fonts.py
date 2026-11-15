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
        inst.save(f'{out}/{name}-{w}.ttf',reorderTables=True)
        print('wrote',name,w)
