# Simulado Udemy

Aplicativo para praticar simulados do estilo Udemy através de texto copiado.

## Funcionalidades

- **Carregar simulado**: Cola o texto do simulado e gera perguntas interativas
- **Modo prática**: Responda perguntas uma por uma com feedback imediato
- **Revisão**: Veja as respostas corretas e explicações após finalizar
- **Resultados**: Dashboard com estatísticas por domínio

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
Resposta incorreta
Explicação
Explicação da resposta incorreta...
Domínio
Nome do domínio
```

## Tecnologias

- React 18
- Vite
- Tailwind CSS
- Lucide React (ícones)
