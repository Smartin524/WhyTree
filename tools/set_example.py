"""批量改写 topics/*.js 里某个节点的 example 字段（单行 JS 字符串）。
用法（在脚本里）：set_example(path, node_id, 多行文本)。节点没有 example 时，插在 points 之前。"""
import json, re

def set_example(path, node_id, text):
    s = open(path, encoding="utf-8").read()
    start = s.index(f'id: "{node_id}"')
    nxt = s.find('\n    {\n      id: "', start + 1)
    end = len(s) if nxt == -1 else nxt
    block = s[start:end]
    lit = json.dumps(text, ensure_ascii=False)
    line = f'      example: {lit},\n'
    m = re.search(r'      example: ".*?(?<!\\)",\n', block)
    if m:
        block = block[:m.start()] + line + block[m.end():]
    else:
        k = block.index('      points:') if '      points:' in block else block.index('      causedBy:' if 'causedBy:' in block else '      solves:')
        block = block[:k] + line + block[k:]
    open(path, "w", encoding="utf-8").write(s[:start] + block + s[end:])
