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
    filename = "/home/qz/Downloads/Homo_sapiens.GRCh38.95.gff3"
    outputfile = "/home/qz/Downloads/Homo_sapiens.GRCh38.95.gff3.json"
    Fields = ['seqid', 'source', 'type', 'start', 'end', 'score', 'strand', 'phase']
    attributePos = 8
    i = 0
    isContent = False
    with open(outputfile, 'a') as outfp:
        with open(filename, 'r') as fp:
            for line in fp:
                if line[0:3] != '###' and not isContent:
                    continue
                elif line[0:3] == '###':
                    isContent = True
                    continue
                elif isContent:
                    tabstr = line.strip('\n').split('\t')
                    record1 = {
                        item: tabstr[i] for item, i in zip(Fields, range(len(Fields)))
                    }
                    semicolonstr = tabstr[attributePos].strip('\n').split(';')
                    record2 = {
                        semicolonstr[i].split('=')[0] : semicolonstr[i].split('=')[1] for i in range(len(semicolonstr))
                    }
                    record3 = {
                        'attributes': record2
                    }
                    record = dict(record1, **record3)
                    recordstring = json.dumps(record, cls=MyEncoder) + '\n'
                    outfp.write(recordstring)
        print("done!")