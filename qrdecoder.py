import argparse

try:
    import cv2
    import numpy as np
    from pyzbar.pyzbar import decode
except ImportError:
    dummyMode = True

parser = argparse.ArgumentParser(
                    prog='qrdecoder',
                    description='Decode QR code of the input image',
                    epilog='made for command line, by Naoto')

parser.add_argument('filename')
parser.add_argument('-d', '--dummy')
args = parser.parse_args()

if args.dummy:
  print(args.dummy)
  quit()

img = cv2.imread(args.filename)
codes = decode(img)
for code in codes:
  print(code.data.decode('UTF-8'))