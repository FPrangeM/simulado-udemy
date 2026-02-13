# Simulado Udemy - Documentação do Projeto

## Visão Geral
Aplicativo React para praticar simulados do estilo Udemy através de texto copiado. Permite carregar questões, responder com feedback imediato, revisar respostas e acompanhar histórico de tentativas.

## Stack Tecnológico
- **React 18** - Biblioteca de UI
- **Vite** - Build tool e dev server
- **Tailwind CSS** - Estilização
- **Lucide React** - Ícones
- **pnpm** - Gerenciador de pacotes
- **localStorage** - Persistência de dados

## Estrutura de Arquivos
```
simulado-udemy/
├── src/
│   ├── App.jsx        # Aplicação principal (870+ linhas)
│   ├── main.jsx       # Entry point
│   └── index.css      # Tailwind imports
├── index.html         # HTML entry
├── package.json       # Dependências
├── vite.config.js     # Config Vite
├── tailwind.config.js # Config Tailwind
├── postcss.config.js  # Config PostCSS
└── dist/             # Build de produção
```

## Comandos Úteis
```bash
# Instalar dependências
pnpm install

# Rodar em desenvolvimento
pnpm dev

# Build de produção
pnpm build
```

## Funcionalidades Atuais

### 1. Carregar Simulado
- Usuário cola texto do simulado em textarea
- Parser extrai perguntas, opções, respostas corretas e explicações
- Formato esperado do texto:
  ```
  Pergunta 1
  Correto/Incorreto
  Texto da pergunta...
  Sua resposta está correta
  Resposta correta
  Explicação
  Explicação da resposta...
  Resposta incorreta
  Explicação
  Domínio
  Nome do domínio
  ```

### 2. Modo Prática
- Responde uma pergunta por vez
- Botão "Conferir resposta" mostra feedback imediato
- Sidebar mostra lista de perguntas com status (correto/incorreto/ignorado)
- Barra de progresso no header

### 3. Resultados
- Dashboard com gráfico de rosca (acerto/erro)
- Estatísticas por domínio
- Lista de tentativas anteriores
- Botão para revisar perguntas

### 4. Revisão
- Lista todas as perguntas com status
- Expande para ver questão completa + opções + explicação
- Filtro por status

### 5. Persistência (localStorage)
- **simuladoState**: mode, questions, currentQIndex, draftAnswers, questionStatus, rawText, startTime
- **simuladoHistory**: Array de tentativas completas

## Problemas Conhecidos e Soluções

### Erro: "Rendered more hooks than during the previous render"
- **Causa**: Uso condicional de useEffect ou ordem inconsistente de hooks
- **Solução**: Usar `useState` com função inicializadora (`useState(() => valor)`) ao invés de useEffect para carregar dados do localStorage. Isso garante que os hooks sejam chamados na mesma ordem sempre.

### Erro: "Invalid time value" no formatDate
- **Causa**: Data do localStorage é string, não objeto Date
- **Solução**: Converter string para Date antes de formatar:
  ```javascript
  const d = typeof date === 'string' ? new Date(date) : date;
  ```

## Estado Atual do Código (App.jsx)

### useState com inicialização lazy (linha ~640):
```javascript
const App = () => {
  const [mode, setMode] = useState(() => {
    const saved = localStorage.getItem('simuladoState');
    return saved ? JSON.parse(saved).mode : 'input';
  });
  // ... outros states similar
}
```

### useEffect para salvar (linha ~728):
```javascript
useEffect(() => {
  const state = {
    mode, questions, currentQIndex, draftAnswers, questionStatus, rawText, startTime: startTimeRef.current
  };
  localStorage.setItem('simuladoState', JSON.stringify(state));
}, [mode, questions, currentQIndex, draftAnswers, questionStatus, rawText]);
```

### Helpers importantes:
- `parseQuizText(text)`: Parser do texto do simulado
- `formatDate(date)`: Formata data para pt-BR (lida com string ou Date)
- `formatDuration(ms)`: Formata duração em min/s

---

# Prompt para Nova Sessão

Para retomar o projeto corretamente, use:

```
Este é um projeto React/Vite chamado "Simulado Udemy" - um app para praticar simulados. 

Stack: React 18, Vite, Tailwind CSS, Lucide React, pnpm

O arquivo principal é src/App.jsx (~870 linhas). O app tem:
1. Carregar simulado (cola texto com formato específico)
2. Modo prática com sidebar e progresso
3. Resultados com dashboard e gráfico
4. Revisão de tentativas
5. Persistência via localStorage (simuladoState e simuladoHistory)

Problemas já corrigidos:
- Erro de "Hooks order" - solved com useState lazy initialization
- Erro de "Invalid time value" - solved com conversão de string para Date

Ao fazer mudanças, certifique-se que:
1. useState SEMPRE com função inicializadora quando usar localStorage
2. Todos os useRef declarados antes de qualquer useEffect
3. formatDate deve tratar string e Date

Comandos: pnpm install && pnpm dev
```

## Tarefas Pendentes (se houver)
- [ ] Testar persistência completa após múltiplos refreshes
- [ ] Verificar se histórico persiste corretamente
- [ ] Testar fluxo completo: criar simulado → responder → finalizar → refresh → continuar
