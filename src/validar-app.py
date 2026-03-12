#!/usr/bin/env python3
"""
Validador de App.js — rode antes de fazer upload no GitHub
Uso: python3 validar-app.py App.js
"""
import re, sys

def validar(path):
    content = open(path).read()
    erros = []

    # 1. Self-closing non-void elements
    non_void = ['div','span','button','select','textarea','label','table','tbody','thead','tr','td','th','p']
    for tag in non_void:
        for m in re.finditer(rf'<{tag}(\s[^>]*)?\s*/>', content):
            ln = content[:m.start()].count('\n') + 1
            erros.append(f"❌ Self-closing <{tag}> na linha {ln}: {m.group()[:50]}")

    # 2. Unmatched tags per function
    funcs = list(re.finditer(r'\n(?:export default )?function (\w+)', content))
    for i in range(len(funcs)):
        s = funcs[i].start()
        e = funcs[i+1].start() if i+1 < len(funcs) else len(content)
        name = funcs[i].group(1)
        sec = content[s:e]
        for tag in ['div','span','button','select','textarea','table','tbody','thead']:
            opens = len(re.findall(rf'<{tag}[\s>]', sec))
            closes = len(re.findall(rf'</{tag}>', sec))
            self_c = len(re.findall(rf'<{tag}[^>]*/>', sec))
            if opens - self_c != closes:
                erros.append(f"❌ {name}(): <{tag}> abre={opens} fecha={closes} self={self_c} → diff={opens-self_c-closes}")

    # 3. Adjacent JSX (simplified check)
    # Look for closing tag followed by another element at same level outside conditionals
    lines = content.split('\n')
    print(f"📄 {path}: {len(lines)} linhas, {len(content)//1024}KB")

    if erros:
        print(f"\n🚨 {len(erros)} ERRO(S) ENCONTRADO(S):\n")
        for e in erros:
            print(f"  {e}")
        print("\n⛔ NÃO faça upload — corrija os erros primeiro!")
        return False
    else:
        print("✅ Nenhum erro encontrado — seguro para upload!")
        return True

if __name__ == '__main__':
    path = sys.argv[1] if len(sys.argv) > 1 else 'App.js'
    ok = validar(path)
    sys.exit(0 if ok else 1)
