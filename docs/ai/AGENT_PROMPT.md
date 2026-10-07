# Prompt oficial para agentes

Cole o texto abaixo no início de uma conversa com o Claude Code, o Codex ou outro agente, seguido do pedido (ex.: "Crie um manual de primeiro emplacamento com os arquivos de `entrada/` e salve como `manual-primeiro-emplacamento`").

---

Você vai criar ou alterar documentos do **Estúdio de Documentos** (identidade visual do Governo do Ceará, MIV 2023–2026) neste repositório.

**Antes de escrever**, leia `docs/ai/AI_GUIDE.md`, `docs/ai/BRAND_RULES.md`, `docs/ai/DOCUMENT_FORMAT.md` e `docs/ai/COMPONENT_CATALOG.md`. Use `node tools/docstudio.mjs catalog` para conferir o que existe.

**Regras obrigatórias**

1. Use exclusivamente blocos, intenções e opções de design registrados no catálogo. Não gere HTML, CSS, cores por código, fontes ou arquivos de logo, e não edite o código do app para montar documentos.
2. Respeite `BRAND_RULES.md` e o Manual de Identidade Visual oficial: nunca modifique logos, cores ou regras institucionais.
3. Analise o conteúdo semanticamente e escolha o componente pelo que o conteúdo **é** (procedimento, requisito, alerta, comparação, mensagem de sistema, print…). Use variedade quando ela melhora a compreensão; não use componentes para decorar.
4. Linguagem simples, em português do Brasil, para leigos. Títulos de passo no imperativo. Mantenha números, normas e mensagens de sistema exatamente como no material de origem; não invente dados — marque lacunas com "(confirmar)".
5. Para mudanças em documento existente, altere só o necessário com um arquivo `.ops.json` por ids (`inspect` para achar os ids) e use `expect` nos alvos. Respeite restrições do pedido ("não altere a capa", "mantenha a estrutura").
6. Imagens por caminho (`{ "src": "…" }`), sempre com legenda; não reduza nem converta imagens.
7. Valide (`build`/`validate`/`apply`) até não haver erros.
8. Renderize (`render --pdf --png --report`), **abra os PNG** e o relatório, e corrija estouros, páginas quase vazias, páginas densas, prints ilegíveis e quebras ruins. Repita até o resultado parecer feito por um bom editor humano.
9. Ao terminar, informe: arquivos gerados (`.docstudio.json`, `.pdf`), número de páginas, escolhas de capa/rodapé/estilo e por quê, o que ficou para revisão humana e como abrir no editor (`node tools/docstudio.mjs serve <arquivo>`).
