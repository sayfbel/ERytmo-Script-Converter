import os, re

src_dir = r'c:\Users\saif\Desktop\convert script\frontend\src'
keys = set()
for root, _, files in os.walk(src_dir):
    for f in files:
        if f.endswith('.tsx') or f.endswith('.ts'):
            with open(os.path.join(root, f), 'r', encoding='utf-8') as file:
                content = file.read()
                matches = re.findall(r't\([\'"]([a-zA-Z0-9_\.]+)[\'"]\)', content)
                keys.update(matches)
print('Found keys:', len(keys))

with open(r'c:\Users\saif\Desktop\convert script\frontend\src\i18n\translations.ts', 'r', encoding='utf-8') as file:
    content = file.read()
    en_block_match = re.search(r'en:\s*\{([\s\S]*?)\},\s*(fr|ar):', content)
    if en_block_match:
        en_block = en_block_match.group(1)
        defined_keys = set(re.findall(r'[\'"]([a-zA-Z0-9_\.]+)[\'"]\s*:', en_block))
        missing_keys = keys - defined_keys
        print('Missing keys:')
        for k in sorted(missing_keys):
            print(k)
