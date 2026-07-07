import json, sys
d = json.load(sys.stdin)

# learnable_moves structure
lm = d.get('learnable_moves', [])
print(f'=== learnable_moves ({len(lm)}) ===')
for entry in lm:
    form = entry.get('form', '')
    data = entry.get('data', [])
    print(f'  form={form} count={len(data)}')
    for m in data[:3]:
        print(f'    {dict(list(m.items())[:5])}')
    if len(data) > 3:
        print(f'    ... (+{len(data)-3} more)')

print()
# Also check machine_moves and egg_moves
for key in ['machine_moves', 'egg_moves']:
    mm = d.get(key, [])
    print(f'=== {key} ({len(mm)}) ===')
    for entry in mm:
        form = entry.get('form', '')
        data = entry.get('data', [])
        print(f'  form={form} count={len(data)}')
