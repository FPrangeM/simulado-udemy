# Simulado Udemy

Aplicativo para praticar simulados do estilo Udemy através de texto copiado.

## Funcionalidades

- **Carregar simulado**: Cola o texto do simulado e gera perguntas interativas
- **Modo prática**: Responda perguntas uma por uma com feedback imediato
- **Revisão**: Veja as respostas corretas e explicações após finalizar
- **Resultados**: Dashboard com estatísticas por domínio
- **Histórico**: Todas as tentativas ficam salvas e podem ser revisadas
- **Persistência**: Estado do app persiste ao recarregar a página

## Como usar

1. Clone o repositório
2. Instale as dependências:
   ```bash
   pnpm install
   ```
3. Inicie o servidor de desenvolvimento:
   ```bash
   pnpm dev
   ```
4. Abra http://localhost:5173 no navegador

## Formato do texto

O aplicativo espera um formato específico de texto:

```
Pergunta 1
Correto
Texto da pergunta...
Sua resposta está correta
Resposta correta
Explicação
Explicação da resposta...
Reference: https://exemplo.com
Resposta incorreta
Explicação
Explicação da resposta incorreta...
Domínio
Nome do domínio
```

**Observações:**
- O parser suporta múltiplos formatos de status: "Sua resposta está correta", "Resposta correta", "Incorreto"
- "Reference:" é tratado como parte da explicação
- O status pode aparecer antes ou depois da alternativa

## Tecnologias

- React 18
- Vite
- Tailwind CSS
- Lucide React (ícones)
- pnpm (gerenciador de pacotes)

## Estado do Desenvolvimento

Projeto em desenvolvimento ativo. Ver `COMMITS.md` para histórico completo de alterações.

## Estrutura do Projeto

```
├── src/
│   ├── App.jsx      # Componente principal (todo o app)
│   ├── main.jsx     # Entry point do React
│   └── index.css    # Estilos Tailwind
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

## Limpar Cache Local

Se houver problemas de estado, limpe o localStorage:

```javascript
// No console do navegador
localStorage.clear()
```
