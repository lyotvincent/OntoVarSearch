import json
import numpy as np


class MyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (np.int_, np.intc, np.intp, np.int8,
                            np.int16, np.int32, np.int64, np.uint8,
                            np.uint16, np.uint32, np.uint64)):
            return int(obj)
        elif isinstance(obj, (np.float_, np.float16, np.float32,
                              np.float64)):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return list(obj)
        elif isinstance(obj, np.bool_):
            return bool(obj)
        else:
            return json.JSONEncoder.default(self, obj)

if __name__ == '__main__':
    filename = "F:\data\Homo_sapiens.GRCh38.94.chr.gtf"
    outputfile = "F:\data\Homo_sapiens.GRCh38.94.chr.json"
    Fields = ['seqname', 'source', 'feature', 'start', 'end', 'score', 'strand', 'frame']
    attributePos = 8
    i = 0
    with open(outputfile, 'a') as outfp:
        with open(filename, 'r') as fp:
            for line in fp:
                if line[0] == '#':
                    continue
                tabstr = line.strip('\n').split('\t')
                record1 = {
                    item : tabstr[i] for item,i in zip(Fields,range(len(Fields)))
                }
                semicolonstr = tabstr[attributePos].strip('\n')[:-1].split('; ')
                record2 = {
                    semicolonstr[i].split(' ')[0] : semicolonstr[i].split(' ')[1][1:-1] for i in range(len(semicolonstr))
                }
                record3 = {
                    'attribute' : record2
                }
                record = dict(record1, **record3)
                recordstring = json.dumps(record, cls=MyEncoder) + '\n'
                outfp.write(recordstring)
                # i += 1
                # if (i == 100):
                #     break